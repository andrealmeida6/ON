/* ============================================================================
   portal-sharepoint.js - estrutura de pastas no SharePoint para os ficheiros

   Hoje os ficheiros ficam no browser (IndexedDB) e, no ambiente de testes, no
   Supabase. Em Power Pages, um flow (Power Automate) leva cada ficheiro
   carregado para o SharePoint, para a pasta que esta funcao calcula.
   Cada ficheiro guarda o seu caminho (x.sp) no momento do upload, para nao
   mudar de sitio se depois se renomear um indicador ou uma empresa.

   Biblioteca "Reporting" do site ESG Data Hub:
     Reporting/<Ano>/<Empresa>/<Periodo>/<Tema>/<KPI - Nome>/ficheiro
     Reporting/<Ano>/<Empresa>/<Periodo>/_Task documents/<Departamento>/ficheiro
     Reporting/<Ano>/_To classify/ficheiro
   Ano > Empresa > Periodo de report > Tema > Indicador (pedido do Andre a 13/11/2026).
   Um ficheiro de varios KPIs fica uma vez, na pasta do primeiro; os outros
   ficam na coluna de metadados "KPIs" (pesquisa e vistas no SharePoint).
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal;
  if (!P) return;
  var S = P.S;

  P.SP = { site: 'ESG Data Hub', biblioteca: 'Reporting', tarefas: '_Task documents', classificar: '_To classify' };
  /* Nomes validos no SharePoint: sem " * : < > ? / \ | # % & { } ~, sem pontos ou espacos no fim, curtos */
  var limpa = function (t, max) {
    var s = String(t || '').replace(/["*:<>?\/\\|#%&{}~]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
    if (s.length > (max || 60)) s = s.slice(0, max || 60).trim().replace(/[. ]+$/, '');
    return s || '_';
  };
  P.limpaSP = limpa;
  /* Pasta do periodo: T1 a T4, ou Ano */
  var pastaPeriodo = function (pid) { var p = P.periodo(pid); return !p ? limpa(pid) : p.tipo === 'trimestre' ? 'T' + p.t : 'Ano'; };
  var anoDe = function (pid) { var p = P.periodo(pid); return p ? String(p.ano) : String(S.ciclo.ano); };
  P.pastaTaskSP = function (ano, empresa, per, dep) { return [P.SP.biblioteca, ano, limpa(empresa), per, P.SP.tarefas, limpa(dep)].join('/'); };
  /* Caminhos gravados com a ordem antiga (Ano/Empresa/Tema/KPI/Periodo e Ano/Empresa/_Task documents/Dep/Periodo) passam a nova */
  var PERS = ['T1', 'T2', 'T3', 'T4', 'Ano'];
  P.caminhoSPNovo = function (sp) {
    var ps = String(sp || '').split('/');
    if (ps.length !== 6 || PERS.indexOf(ps[5]) < 0 || PERS.indexOf(ps[3]) > -1) return sp;
    return [ps[0], ps[1], ps[2], ps[5], ps[3], ps[4]].join('/');
  };
  P.pastaKpiSP = function (ano, empresa, id, per) {
    var c = P.cat(id);
    return [P.SP.biblioteca, ano, limpa(empresa), per, limpa(c && c.tema ? c.tema : 'Other'), limpa(id + ' - ' + (c ? c.nome : ''), 80)].join('/');
  };
  /* Pasta de um ficheiro: o primeiro KPI, a task, ou por classificar */
  P.pastaSP = function (m, kpis) {
    if (m && kpis && kpis.length) return P.pastaKpiSP(anoDe(m.periodo), m.empresa, kpis[0], pastaPeriodo(m.periodo));
    if (m) return P.pastaTaskSP(anoDe(m.periodo), m.empresa, pastaPeriodo(m.periodo), m.unidade);
    return [P.SP.biblioteca, String(S.ciclo.ano), P.SP.classificar].join('/');
  };
  P.urlSP = function (caminho, nome) { return caminho + '/' + limpa(nome, 120); };
  /* Endereco do site SharePoint (Backoffice > Data and storage), por exemplo https://empresa.sharepoint.com/sites/ESGDataHub.
     O caminho da pasta junta-se ao site: <site>/Reporting/2026/Entidade A/... abre a pasta na biblioteca. */
  P.siteSP = function () { return ((S.sp && S.sp.site) || '').replace(/\/+$/, ''); };
  P.definirSiteSP = function (url, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var v = String(url || '').trim().replace(/\/+$/, '');
    if (v && !/^https:\/\/[\w.-]+\.sharepoint\.com(\/.*)?$/i.test(v)) return { erro: 'Use the address of the SharePoint site, for example https://company.sharepoint.com/sites/ESGDataHub.' };
    S.sp = { site: v };
    if (P.eventoGlobal) P.eventoGlobal('SharePoint site ' + (v ? 'set to ' + v : 'removed') + '.', u.nome, 'Change');
    if (P.guardar) P.guardar();
    return { ok: true };
  };
  P.urlPastaSP = function (caminho) {
    var site = P.siteSP();
    if (!site || !caminho) return '';
    return site + '/' + String(caminho).split('/').map(encodeURIComponent).join('/');
  };
  /* Pasta de um ficheiro: a que ficou gravada no upload; senao, a calculada pela task e pelos KPIs */
  P.pastaDeFich = function (ref, m, kpis) { return (ref && ref.sp) || (m ? P.pastaSP(m, kpis || []) : ''); };

  /* Esqueleto: uma pasta por empresa, tema, KPI e periodo, para criar antes do arranque do ciclo */
  P.esqueletoSP = function (ano) {
    ano = String(ano || S.ciclo.ano);
    var l = [], vistos = {};
    var junta = function (o) { if (!vistos[o.caminho]) { vistos[o.caminho] = 1; l.push(o); } };
    S.cat.forEach(function (c) {
      if (P.indAtivo && !P.indAtivo(c)) return;
      var emps = P.empresasInd ? P.empresasInd(c) : S.ent, pers = (P.momentosDe(c.id).per || []).map(function (k) { return k === 'A' ? 'Ano' : k; });
      /* O Ano existe sempre: a task anual (consolidacao) tambem recebe evidencias dos KPIs trimestrais */
      if (pers.indexOf('Ano') < 0) pers.push('Ano');
      emps.forEach(function (x) { pers.forEach(function (pe) { junta({ caminho: P.pastaKpiSP(ano, x.nome, c.id, pe), ano: ano, empresa: x.nome, tema: c.tema || 'Other', kpi: c.id, kpi_nome: c.nome, periodo: pe, tipo: 'KPI' }); }); });
    });
    S.ent.forEach(function (x) {
      (P.depsDaEmpresa ? P.depsDaEmpresa(x.nome) : P.UNIDADES).forEach(function (d) { ['T1', 'T2', 'T3', 'T4', 'Ano'].forEach(function (pe) { junta({ caminho: P.pastaTaskSP(ano, x.nome, pe, d), ano: ano, empresa: x.nome, tema: '', kpi: '', kpi_nome: '', periodo: pe, tipo: 'Task documents', departamento: d }); }); });
    });
    junta({ caminho: [P.SP.biblioteca, ano, P.SP.classificar].join('/'), ano: ano, empresa: '', tema: '', kpi: '', kpi_nome: '', periodo: '', tipo: 'To classify' });
    return l.sort(function (a, b) { return a.caminho.localeCompare(b.caminho); });
  };
  /* Excel com o esqueleto (para o flow ou para quem cria as pastas) e as colunas de metadados */
  P.exportarEsqueletoSP = function () {
    var l = P.esqueletoSP(), ano = S.ciclo.ano;
    if (!P.livroObjetos) return;
    return P.livroObjetos('sharepoint-folders-' + ano + '.xlsx', {
      folders: l.map(function (x) { return { path: x.caminho, company: x.empresa, topic: x.tema, kpi: x.kpi, kpi_name: x.kpi_nome, period: x.periodo, type: x.tipo, department: x.departamento || '' }; }),
      metadata_columns: [
        { column: 'KPIs', type: 'Text (codes separated by ;)', example: 'E01;E03', why: 'A file that supports several KPIs is stored once and found from all of them.' },
        { column: 'Task ID', type: 'Text', example: 'M05-T4', why: 'Links the file to the task in the platform.' },
        { column: 'Company', type: 'Choice', example: 'Entidade A', why: 'Views and permissions by company.' },
        { column: 'Reporting period', type: 'Text', example: '2026-T4', why: 'Views by period.' },
        { column: 'Document type', type: 'Choice', example: 'KPI evidence / Task document / Invoice / Requested file', why: 'Filter by kind of document.' },
        { column: 'Uploaded by', type: 'Person', example: 'Paulo Serra', why: 'Who uploaded it in the platform (the flow writes as a service account).' },
        { column: 'Uploaded in platform', type: 'Date and time', example: '2026-11-11 17:06', why: 'When it was uploaded.' },
        { column: 'Platform file ID', type: 'Text', example: 'f1a2b3c4', why: 'Links back to the record in Dataverse.' },
        { column: 'Invoice data', type: 'Multiple lines (JSON)', example: '{"consumo":{"energia_ativa_kwh":31000}}', why: 'Values read from an invoice (esquema-fatura-energia.json).' }
      ]
    }, { titulo: 'SharePoint folders ' + ano, descricoes: { folders: 'Year, company, reporting period, topic and KPI, plus task documents per period and department and a folder to classify. Library: ' + P.SP.biblioteca + ' in the site ' + P.SP.site + '.', metadata_columns: 'Columns to create in the library. The flow fills them when it saves each file.' } });
  };
})();
