/* ============================================================================
   portal-nucleo.js - regras da plataforma, sem desenho
   Estado, permissoes, workflow, validacao, importacao, exportacoes e marca.
   Sem backend, o estado vive no localStorage. Com backend, portal-supabase.js
   trata do login e da gravacao.
   ============================================================================ */
(function () {
  'use strict';
  var P = (window.Portal = {});

  /* --- Utilitarios ------------------------------------------------------- */
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var agora = function () { return new Date().toISOString(); };
  var diasDe = function (n) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  var hojeISO = function () { return diasDe(0); };
  P.hojeISO = hojeISO;
  P.diasDe = diasDe;
  P.diasAte = function (iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(hojeISO() + 'T12:00:00')) / 86400000); };

  /* Numeros em pt-PT: virgula decimal, espaco nos milhares */
  /* Regra unica da plataforma: espaco nos milhares; inteiros sem casas, decimais sempre com 2 casas.
     O argumento casas fica por compatibilidade e ja nao muda o numero de casas mostradas. */
  P.casasNum = function (v) { var n = Number(v); return isFinite(n) && Math.round(n * 100) % 100 !== 0 ? 2 : 0; };
  P.fmtNum = function (v, casas) {
    if (v === null || v === undefined || v === '') return '-';
    if (!isFinite(Number(v))) return String(v);
    var c = P.casasNum(v);
    var neg = Number(v) < 0 && Math.abs(Number(v)).toFixed(c) !== (0).toFixed(c);
    var partes = Math.abs(Number(v)).toFixed(c).split('.');
    var int = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '-' : '') + int + (partes[1] ? ',' + partes[1] : '');
  };
  /* Excel: o mesmo formato (milhares separados, inteiros sem casas, decimais com 2).
     O separador dos milhares segue o Excel de quem abre (em pt-PT e um espaco). */
  P.numFmtExcel = function (v) { return P.casasNum(v) ? '#,##0.00' : '#,##0'; };
  /* Colunas que sao codigos e nao quantidades: anos, IDs, numeros de ordem */
  var COL_SEM_FMT = /^(year|ano|y|id|row|linha|order|ordem|n\.?º|nº|#|code|codigo|código|nif|vat|period|periodo|período|version|versao|versão)\b/i;
  P.colSemFmt = function (t) { return COL_SEM_FMT.test(String(t || '').trim()); };
  /* SheetJS: formato em cada celula numerica sem formato proprio */
  P.formatarNumerosXLSX = function (wb) {
    var U = window.XLSX && window.XLSX.utils;
    if (!U || !wb) return wb;
    (wb.SheetNames || []).forEach(function (n) {
      var ws = wb.Sheets[n]; if (!ws || !ws['!ref']) return;
      var r = U.decode_range(ws['!ref']), rot = {};
      for (var R = r.s.r; R <= r.e.r; R++) for (var Cc = r.s.c; Cc <= r.e.c; Cc++) {
        var cel = ws[U.encode_cell({ r: R, c: Cc })]; if (!cel) continue;
        if (cel.t === 's') { if (isNaN(Number(cel.v))) rot[Cc] = cel.v; continue; }
        if (cel.t === 'n' && !cel.z && !P.colSemFmt(rot[Cc])) cel.z = P.numFmtExcel(cel.v);
      }
    });
    return wb;
  };
  /* ExcelJS: o mesmo, folha a folha */
  P.formatarNumerosExcelJS = function (wb) {
    if (!wb || !wb.eachSheet) return wb;
    wb.eachSheet(function (ws) {
      var rot = {};
      ws.eachRow({ includeEmpty: false }, function (row) {
        row.eachCell({ includeEmpty: false }, function (cel, col) {
          var v = cel.value;
          if (typeof v === 'string') { if (isNaN(Number(v))) rot[col] = v; return; }
          if (typeof v === 'number' && (!cel.numFmt || cel.numFmt === 'General' || cel.numFmt === '#,##0.##') && !P.colSemFmt(rot[col])) cel.numFmt = P.numFmtExcel(v);
        });
      });
    });
    return wb;
  };
  /* Datas sempre em dd/mm/aaaa */
  P.fmtData = function (iso) {
    if (!iso) return '-';
    var d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Lisbon' }).format(d);
  };
  P.fmtDataAno = function (iso) {
    if (!iso) return '-';
    var d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Lisbon' }).format(d);
  };
  P.fmtDataHora = function (iso) {
    if (!iso) return '-';
    return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }).format(new Date(iso)).replace(',', '');
  };
  /* Aceita "1 181,5", "1.181,5", "1181.5" e "17,11". Devolve null se nao for numero. */
  var lerNumero = function (bruto) {
    if (typeof bruto === 'number') return isFinite(bruto) ? bruto : null;
    var s = String(bruto === null || bruto === undefined ? '' : bruto).replace(/[\s ]/g, '');
    if (!s) return null;
    var virg = s.lastIndexOf(','), pont = s.lastIndexOf('.');
    if (virg > -1 && pont > -1) {
      s = virg > pont ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (virg > -1) {
      s = s.replace(',', '.');
    }
    return /^-?\d*\.?\d+$/.test(s) ? Number(s) : null;
  };
  P.lerNumero = lerNumero;

  /* --- Armazenamento ----------------------------------------------------- */
  var CHAVES = {
    ciclo: 'esg_cycle', ms: 'esg_ms', items: 'esg_items', wfbase: 'esg_wfbase', ext: 'esg_ext', aud: 'esg_aud', mat: 'esg_mat',
    docs: 'esg_docs', ent: 'esg_ent', janelas: 'esg_windows', marca: 'esg_brand', amostra: 'esg_sample', users: 'esg_users',
    areas: 'esg_areas', cat: 'esg_catalog', metas: 'esg_metas', deps: 'esg_deps',
    atrib: 'esg_assign', regrasEnt: 'esg_entity_rules', fatores: 'esg_factors', apis: 'esg_connections', evg: 'esg_config_log', selos: 'esg_seals',
    kpim: 'esg_kpi_master', puxados: 'esg_source_pulls', periodos: 'esg_periods', relatorios: 'esg_reports', tipos: 'esg_data_types', dpdec: 'esg_dp_decisions', gloss: 'esg_glossary', rq: 'esg_report_tables', doc: 'esg_report_doc', defs: 'esg_definitions', saidas: 'esg_outputs', sp: 'esg_sharepoint'
  };
  var VERSAO_DADOS = 10;
  P.CHAVES = CHAVES;
  var S = (P.S = {});
  var memoria = {};
  /* Ambiente de testes: as mesmas pessoas, empresas, indicadores e configuracao, sem milestones nem valores.
     Guarda-se com chaves proprias (prefixo tst_), por isso nunca mexe nos dados do ambiente principal.
     Entra-se com ?ambiente=teste e sai-se com ?ambiente=principal, ou pelo menu da conta. */
  var TESTE = (function () {
    try {
      var q = location.search + location.hash;
      if (/[?&]ambiente=teste\b/.test(q)) localStorage.setItem('esg_ambiente', 'teste');
      else if (/[?&]ambiente=principal\b/.test(q)) localStorage.removeItem('esg_ambiente');
      return localStorage.getItem('esg_ambiente') === 'teste';
    } catch (e) { return false; }
  })();
  var PFX = TESTE ? 'tst_' : '';
  P.teste = function () { return TESTE; };
  P.prefixo = PFX;
  P.mudarAmbiente = function (teste) {
    try { if (teste) localStorage.setItem('esg_ambiente', 'teste'); else localStorage.removeItem('esg_ambiente'); } catch (e) { /* sem armazenamento, fica no principal */ }
    location.href = location.pathname + location.search.replace(/[?&]ambiente=\w+/, '').replace(/^&/, '?');
  };
  var ler = function (k) {
    try { var v = localStorage.getItem(PFX + k); return v === null ? null : JSON.parse(v); }
    catch (e) { return memoria[k] === undefined ? null : memoria[k]; }
  };
  var escrever = function (k, v) {
    try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { memoria[k] = v; }
  };
  var B = window.PortalBackend;
  P.online = function () { return !!(B && B.ativo); };
  var guardar = (P.guardar = function () {
    if (P.aoGuardar) P.aoGuardar();
    if (P.online()) { B.sincronizar(S); return; }
    Object.keys(CHAVES).forEach(function (n) { escrever(CHAVES[n], S[n]); });
  });
  /* Online: o estado vem do Supabase depois do login. Ate la, fica vazio e com a marca publica. */
  var estadoVazio = function () {
    S.ciclo = { ano: new Date().getFullYear(), estado: 'aberto', data_abertura: null, fechados: [] };
    S.ms = []; S.items = {}; S.wfbase = []; S.ext = []; S.aud = []; S.mat = []; S.docs = []; S.ent = []; S.deps = []; S.janelas = []; S.periodos = []; S.relatorios = []; S.tipos = []; S.amostra = []; S.users = []; S.areas = []; S.cat = []; S.metas = []; S.atrib = {}; S.regrasEnt = {}; S.fatores = []; S.apis = []; S.evg = []; S.selos = [];
    S.defs = {}; S.saidas = [];
    S.marca = S.marca || clone(P.MARCA_BASE);
  };
  P.estadoVazio = estadoVazio;

  /* --- Dados iniciais ---------------------------------------------------- */
  P.TEMAS = { 'Água e saneamento': '#0091DA', 'Energia e clima': '#EAAA00', 'Pessoas': '#C6007E', 'Governance': '#483698', 'Comunidade e cliente': '#00A3A1' };
  P.QUADROS = ['Desempenho', 'Ambientais', 'Sociais', 'Governance', 'ESRS'];
  P.TIPOS_PASSO = { recolha: 'Collection and submission', area: 'Area head approval', validacao: 'Automatic validation', revisao: 'Review', parecer: 'Opinion from another area', aprovacao: 'Approval', publicacao: 'Report publication' };
  /* Perfis: Data provider (focal point) preenche e submete; Data reviewer (superior) aprova a area; Data approver (equipa de
     sustentabilidade) aprova no fim; Auditor le; Administrator gere tudo */
  P.PERFIS = { admin: 'Administrator', esg: 'Data approver (sustainability team)', resp: 'Data provider (focal point)', revisor: 'Data reviewer (superior)', auditor: 'Auditor', ext: 'External entity' };
  /* Pessoas de um departamento (data provider ou data reviewer): veem e acompanham as tasks desse departamento */
  P.daUnidade = function (u) { return !!u && (u.perfil === 'resp' || u.perfil === 'revisor'); };
  var DEPARTAMENTOS = ['Operações', 'Qualidade e Laboratório', 'Comercial e Relação com o Cliente', 'Ambiente, Saúde e Segurança', 'Recursos Humanos', 'Financeira', 'Jurídico e Compliance', 'Compras', 'Frota', 'Sistemas de Informação', 'I&D, CSR e ESG'];
  /* Os departamentos geridos no backoffice sao as unidades de negocio */
  Object.defineProperty(P, 'UNIDADES', { get: function () { return (S.deps || []).map(function (d) { return d.nome; }); } });
  P.MARCA_BASE = { nome: 'ESG Data Hub', subtitulo: '', logotipo: '', cores: { primary: '#00338D', secondary: '#0091DA', accent: '#1E49E2', bg: '#F4F7FC', text: '#0C233C' } };
  P.PALETAS = [
    { nome: 'Blue', cores: { primary: '#00338D', secondary: '#0091DA', accent: '#1E49E2', bg: '#F4F7FC', text: '#0C233C' } },
    { nome: 'Teal', cores: { primary: '#0B4F6C', secondary: '#01A7A3', accent: '#0F7C8F', bg: '#F2F8F9', text: '#10282F' } },
    { nome: 'Green', cores: { primary: '#14573F', secondary: '#2E9E6B', accent: '#1F7A55', bg: '#F3F8F5', text: '#12261E' } },
    { nome: 'Violet', cores: { primary: '#3F2A8C', secondary: '#7A5AF8', accent: '#5B3FD6', bg: '#F6F5FC', text: '#1D1740' } },
    { nome: 'Graphite', cores: { primary: '#2B3545', secondary: '#5B7083', accent: '#44546A', bg: '#F5F6F8', text: '#161C25' } }
  ];

  var WF_BASE = function () {
    return [
      /* Workflow de base: quem esta atribuido submete; o responsavel da area aprova (passa sozinho se foi ele a
         submeter); a equipa de sustentabilidade aprova ou devolve; aprovado, publica-se. A validacao automatica
         so entra se alguem a acrescentar ao workflow; as regras de validacao correm na mesma ao preencher. */
      { nome: 'Recolha e submissão dos dados', tipo: 'recolha', responsavel: 'unidade' },
      { nome: 'Aprovação do responsável de área', tipo: 'area', responsavel: 'chefe' },
      { nome: 'Aprovação pela equipa de sustentabilidade', tipo: 'aprovacao', responsavel: 'esg' },
      { nome: 'Publicação nos quadros do relatório', tipo: 'publicacao', responsavel: 'sistema' }
    ];
  };
  /* So para posicionar as tasks de demonstracao no passo certo (o estado de cada uma esta escrito para 5 passos) */
  var WF_DEMO = function () {
    return [
      { nome: 'Recolha e submissão dos dados', tipo: 'recolha', responsavel: 'unidade' },
      { nome: 'Validação automática', tipo: 'validacao', responsavel: 'sistema' },
      { nome: 'Aprovação do responsável de área', tipo: 'area', responsavel: 'chefe' },
      { nome: 'Aprovação pela equipa de sustentabilidade', tipo: 'aprovacao', responsavel: 'esg' },
      { nome: 'Publicação nos quadros do relatório', tipo: 'publicacao', responsavel: 'sistema' }
    ];
  };
  var UTILIZADORES = [
    /* So pessoas: o papel (administrador, equipa de sustentabilidade, auditor) vem do perfil. A unidade pode ser varias, separadas por "|". */
    /* A conta de servico e o utilizador por omissao (entrada direta no site): administrador, sem departamento */
    ['admin', 'Service account', 'admin', ''], ['esg', 'Rita Sousa', 'esg', 'I&D, CSR e ESG'],
    ['operacoes', 'Marta Lopes', 'resp', 'Operações'], ['qualidade', 'Rui Antunes', 'resp', 'Qualidade e Laboratório'],
    ['comercial', 'Sofia Reis', 'resp', 'Comercial e Relação com o Cliente'], ['ass', 'Tiago Moura', 'resp', 'Ambiente, Saúde e Segurança'],
    ['rh', 'Inês Faria', 'resp', 'Recursos Humanos'], ['financeira', 'Paulo Serra', 'resp', 'Financeira'],
    ['juridico', 'Joana Pinto', 'resp', 'Jurídico e Compliance'], ['compras', 'Carlos Neves', 'resp', 'Compras'],
    ['frota', 'Ana Duarte', 'resp', 'Frota|Compras'], ['si', 'Miguel Costa', 'resp', 'Sistemas de Informação'],
    ['auditor', 'Nuno Ferreira', 'auditor', ''], ['ext-energia', 'Comercializador de eletricidade', 'ext', ''],
    ['ext-frota', 'Gestora de frota em renting', 'ext', ''], ['ext-reagentes', 'Fornecedor de reagentes químicos', 'ext', '']
  ];
  var NOME_ESG = 'Rita Sousa';
  P.NOME_ESG = NOME_ESG;
  /* Departamentos de uma pessoa: pode ter varios (tags). u.unidade fica sempre igual ao primeiro, para o que so mostra um. */
  /* Departamentos de uma pessoa; com a empresa, os dessa empresa (u.unidadesEmp[idDaEmpresa]). Sem a separacao por
     empresa, os mesmos departamentos valem em todas as empresas onde a pessoa trabalha. */
  var entPorNome = function (n) { return (S.ent || []).filter(function (y) { return y.nome === n || y.id === n; })[0] || null; };
  P.unidadesDe = function (u, empresa) {
    if (!u) return [];
    if (empresa && u.unidadesEmp) { var x = entPorNome(empresa); if (x && u.unidadesEmp[x.id]) return u.unidadesEmp[x.id]; }
    return u.unidades && u.unidades.length ? u.unidades : u.unidade ? [u.unidade] : [];
  };
  P.temUnidade = function (u, un, empresa) { return !!un && P.unidadesDe(u, empresa).indexOf(un) > -1; };
  /* Departamentos de uma pessoa numa empresa; o conjunto de todas as empresas fica em u.unidades */
  P.renomearUser = function (u, novo, quem) {
    var n = String(novo || '').trim().replace(/\s+/g, ' ');
    if (n.split(' ').length < 2) return { erro: 'Write the first and last name.' };
    if (S.users.some(function (x) { return x !== u && String(x.nome).toLowerCase() === n.toLowerCase(); })) return { erro: 'There is already a user called ' + n + '.' };
    var antigo = u.nome;
    if (antigo === n) return { ok: true };
    u.nome = n;
    (S.ms || []).forEach(function (m) {
      m.passos.forEach(function (p) { if (p.concluido_por === antigo) p.concluido_por = n; });
      m.indicadores.forEach(function (id) { var it = P.item(id, P.chave(m)); if (!it) return; ['submetido', 'revisto', 'aprovadoArea'].forEach(function (k) { if (it[k] && it[k].por === antigo) it[k].por = n; }); });
    });
    if (P.eventoGlobal) P.eventoGlobal('User renamed from ' + antigo + ' to ' + n + '.', quem, 'Change');
    guardar();
    return { ok: true, antes: antigo };
  };
  P.definirUnidadesEmp = function (u, empresa, l) {
    var x = entPorNome(empresa);
    if (!x) return;
    if (!u.unidadesEmp) { u.unidadesEmp = {}; (P.empresasUser ? P.empresasUser(u) : S.ent).forEach(function (y) { u.unidadesEmp[y.id] = P.unidadesDe(u).slice(); }); }
    var ok = []; (l || []).forEach(function (d) { if (d && ok.indexOf(d) < 0) ok.push(d); });
    u.unidadesEmp[x.id] = ok;
    var todas = []; Object.keys(u.unidadesEmp).forEach(function (k) { u.unidadesEmp[k].forEach(function (d) { if (todas.indexOf(d) < 0) todas.push(d); }); });
    u.unidades = todas; u.unidade = todas[0] || '';
  };
  P.definirUnidades = function (u, l) {
    var ok = []; (l || []).forEach(function (x) { if (x && ok.indexOf(x) < 0) ok.push(x); });
    u.unidades = ok; u.unidade = ok[0] || '';
  };
  P.unidadesTxt = function (u) { return P.unidadesDe(u).join(', '); };
  /* Nome de utilizador gerado a partir do nome (ja nao se escreve a mao) */
  P.loginDe = function (nome) {
    var base = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/), b = (base.length > 1 ? base[0] + '.' + base[base.length - 1] : base[0] || 'user').replace(/[^a-z0-9.]/g, '') || 'user', l = b, i = 2;
    while (P.user(l)) l = b + i++;
    return l;
  };
  var MATERIALIDADE = [
    ['E1', 'Alterações climáticas', 'material', 'Prioridade "Clima" da dupla materialidade.'], ['E2', 'Poluição', 'por avaliar', 'Descargas de águas residuais tratadas.'],
    ['E3', 'Água e recursos marinhos', 'material', 'Prioridade "Água".'], ['E4', 'Biodiversidade e ecossistemas', 'por avaliar', 'Levantamento de áreas sensíveis em curso.'],
    ['E5', 'Uso de recursos e economia circular', 'por avaliar', 'Valorização de lamas.'], ['S1', 'Trabalhadores próprios', 'material', 'Prioridade "Colaboradores".'],
    ['S2', 'Trabalhadores na cadeia de valor', 'por avaliar', ''], ['S3', 'Comunidades afetadas', 'por avaliar', ''],
    ['S4', 'Consumidores e utilizadores finais', 'material', 'Prioridade "Clientes, consumidores e utilizadores finais".'], ['G1', 'Conduta empresarial', 'por avaliar', '']
  ];
  /* Para ja so duas empresas (pedido do André, 10 de novembro de 2026) */
  var ENTIDADES = [['Entidade A', 1, 1], ['Entidade B', 1, 1]];
  var JANELAS = [
    ['Recolha mensal de operação e energia', 'Água e saneamento', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 1, 10], ['Revisão mensal', 'Governance', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 11, 15],
    ['Recolha trimestral de pessoas, segurança e compras', 'Pessoas', [1, 4, 7, 10], 1, 20], ['Recolha anual de formação, ética, comunidade e NPS', 'Comunidade e cliente', [1, 2], 1, 28],
    ['Consolidação e revisão final do relatório', 'Energia e clima', [3, 4], 1, 30]
  ];
  var AREAS = [
    ['REL', 'Relatório de sustentabilidade', 'Quadros anuais do relatório e futura informação ESRS'], ['CONT', 'Contabilidade', 'Custos, acréscimos e centros de custo a partir das mesmas faturas'],
    ['ERSAR', 'ERSAR', 'Indicadores de qualidade de serviço reportados ao regulador'], ['APA', 'APA', 'Lamas, descargas e licenças ambientais'], ['OPS', 'Operações', 'Eficiência energética e gestão das instalações']
  ];
  var nomeMs = function (per, ano, un, t) {
    if (t) return 'Entrega T' + t + ' ' + ano + ' de ' + un;
    return per === 'Novos dados ESRS' ? 'Novos dados ESRS ' + ano + ' de ' + un : 'Entrega ' + (per === 'Mensal' || per === 'Trimestral' ? 'anual' : per.toLowerCase()) + ' ' + ano + ' de ' + un;
  };

  /* --- Periodos de reporte -------------------------------------------------- */
  /* Quatro trimestres e o ano. O fecho interno de cada trimestre e 45 dias depois do fim; o do ano, fim de fevereiro. */
  var periodosAno = function (ano) {
    var fim = ['03-31', '06-30', '09-30', '12-31'], ini = ['01-01', '04-01', '07-01', '10-01'], fecho = [ano + '-05-15', ano + '-08-14', ano + '-11-13', (ano + 1) + '-02-12'];
    var l = [1, 2, 3, 4].map(function (t) { return { id: ano + '-T' + t, nome: 'T' + t + ' ' + ano, tipo: 'trimestre', ano: ano, t: t, ini: ano + '-' + ini[t - 1], fim: ano + '-' + fim[t - 1], fecho: fecho[t - 1] }; });
    l.push({ id: ano + '-A', nome: 'Ano ' + ano, tipo: 'ano', ano: ano, t: 0, ini: ano + '-01-01', fim: ano + '-12-31', fecho: (ano + 1) + '-02-26' });
    return l;
  };
  /* Entregas externas de uma entidade gestora de agua, com a base legal de cada prazo */
  var relatoriosAno = function (ano) {
    var n = ano + 1, qa = ['-06-29', '-09-22', '-12-29'];
    var l = [1, 2, 3, 4].map(function (t) {
      return { id: 'QA-' + ano + '-T' + t, sigla: 'QA T' + t, nome: 'Publicação trimestral da qualidade da água, T' + t + ' ' + ano, entidade: 'ERSAR', periodo: ano + '-T' + t, data: t < 4 ? ano + qa[t - 1] : n + '-03-29', base: 'DL 152/2017, art. 17.º: 60 dias úteis após o fim do trimestre (sistemas em baixa)' };
    });
    return l.concat([
      { id: 'PCQA-' + ano, sigla: 'PCQA', nome: 'Resultados anuais do PCQA ' + ano, entidade: 'ERSAR', periodo: ano + '-A', data: n + '-03-31', base: 'DL 152/2017, art. 15.º, n.º 5: até 31 de março do ano seguinte' },
      { id: 'RQS-' + ano, sigla: 'RQS', nome: 'Relatório de Qualidade do Serviço ' + ano, entidade: 'ERSAR', periodo: ano + '-A', data: n + '-03-31', base: 'Regulamento ERSAR n.º 446/2024: até ao fim de março' },
      { id: 'MIRR-' + ano, sigla: 'MIRR', nome: 'Mapa Integrado de Registo de Resíduos ' + ano, entidade: 'APA', periodo: ano + '-A', data: n + '-03-31', base: 'SILiAmb: até 31 de março do ano seguinte' },
      { id: 'GF-' + ano, sigla: 'GF', nome: 'Relatório de gases fluorados ' + ano, entidade: 'APA', periodo: ano + '-A', data: n + '-03-31', base: 'SILiAmb: até 31 de março do ano seguinte' },
      { id: 'RC-' + ano, sigla: 'R&C', nome: 'Relatório e Contas consolidado ' + ano, entidade: 'Acionistas', periodo: ano + '-A', data: n + '-05-31', base: 'Código das Sociedades Comerciais, art. 65.º: contas consolidadas até 5 meses após o fim do exercício' },
      { id: 'RS-' + ano, sigla: 'RS', nome: 'Relatório de Sustentabilidade ' + ano, entidade: 'Público', periodo: ano + '-A', data: n + '-06-30', base: 'Calendário interno, depois do Relatório e Contas' }
    ]);
  };
  P.periodosAno = periodosAno; P.relatoriosAno = relatoriosAno;
  P.periodo = function (id) { return (S.periodos || []).filter(function (p) { return p.id === id; })[0] || null; };
  P.trimestral = function (m) { return !!m && /-T\d$/.test(m.periodo || ''); };
  /* Chave dos valores: o trimestre para as milestones trimestrais, o ano para as anuais (o que vai para o relatorio) */
  /* Chave dos valores de uma task: o periodo (ano ou trimestre). Nas tasks divididas por empresa (m.porEmpresa)
     junta-se a empresa ('2026-T4@E2'), para cada empresa ter o seu valor do mesmo indicador. */
  P.chave = function (m) {
    var b = P.trimestral(m) ? m.periodo : m.ano;
    if (m && m.porEmpresa) { var x = (S.ent || []).filter(function (y) { return y.nome === m.empresa; })[0]; return b + '@' + (x ? x.id : m.empresa); }
    return b;
  };
  /* So o periodo de uma chave (sem a empresa) */
  P.chavePer = function (ch) { var s = String(ch); if (s.indexOf('@') < 0) return ch; var b = s.split('@')[0]; return /^\d{4}$/.test(b) ? Number(b) : b; };
  P.rotPeriodo = function (m) { var p = P.periodo(m && m.periodo); return p ? p.nome : String(m ? m.ano : ''); };
  P.rotAnterior = function (chave) { chave = P.chavePer(chave); var x = /^(\d{4})-T(\d)$/.exec(String(chave)); return x ? 'T' + x[2] + ' ' + (x[1] - 1) : String(chave - 1); };
  /* Como se junta um indicador ao longo do ano: soma (volumes, horas), ultimo valor (efetivos, ativos) ou media (taxas) */
  P.agregacao = function (id) {
    var c = P.cat(id);
    if (!c) return 'soma';
    if (c.agregacao) return c.agregacao;
    if (c.unidade_medida === '%' || c.tipo === 'derivado' || /\//.test(c.unidade_medida)) return 'media';
    if (/31\/12|extens|clientes|colaborador|força de trabalho|estagi|em operação|frota|instalações|cobertura|declaração|NPS|Net Promoter/i.test(c.nome) || ['km', 'milhares'].indexOf(c.unidade_medida) > -1) return 'ultimo';
    return 'soma';
  };
  P.AGREG_TXT = { soma: 'Sum of the quarters', media: 'Average of the quarters', ultimo: 'Value of the last quarter' };
  /* --- Momentos de report de cada indicador ----------------------------------
     Em que periodos entra (T1 a T4, Ano) e que entregas externas alimenta.
     Por omissao: a frequencia decide os periodos e as regras abaixo decidem as entregas.
     O que se marcar em Backoffice > Reporting moments fica em c.momentos e passa a mandar. */
  P.MOMENTOS_PER = [['T1', 'T1'], ['T2', 'T2'], ['T3', 'T3'], ['T4', 'T4'], ['A', 'Year']];
  P.TIPOS_ENTREGA = [['QA', 'QA', 'Quarterly water quality, ERSAR'], ['PCQA', 'PCQA', 'PCQA annual results, ERSAR'], ['RQS', 'RQS', 'Service quality report, ERSAR'], ['MIRR', 'MIRR', 'Waste register, APA'], ['GF', 'GF', 'Fluorinated gases, APA'], ['RC', 'R&C', 'Annual report and accounts'], ['RS', 'RS', 'Sustainability report']];
  P.FREQUENCIAS = [['Mensal', 'Monthly'], ['Trimestral', 'Quarterly'], ['Anual', 'Annual']];
  var trimestralFreq = function (f) { return f === 'Mensal' || f === 'Trimestral'; };
  var perPadrao = function (f) { return trimestralFreq(f) ? ['T1', 'T2', 'T3', 'T4'] : ['A']; };
  /* Quem entrega o indicador: o departamento do plano, ou o dono no catalogo */
  P.donoIndicador = function (id) {
    var pl = (window.PORTAL_PLANO || []).filter(function (x) { return x.indicadores.indexOf(id) > -1; })[0], c = P.cat(id);
    /* O departamento escolhido na pagina Indicators do Backoffice ganha ao plano de origem */
    if (c && c.unidade_reporte) return c.unidade_reporte;
    return pl ? pl.unidade : c ? c.unidade_negocio : '';
  };
  P.entregasPadrao = function (id) {
    var c = P.cat(id), us = (c && c.utilizado_por) || [], l = [];
    if (/^A1[23]$/.test(id)) l.push('QA', 'PCQA');
    else if (us.indexOf('ERSAR') > -1) l.push('RQS');
    if (id === 'N04') l.push('GF');
    else if (us.indexOf('APA') > -1 && /^(R09|R10|R11|R12|N03)$/.test(id)) l.push('MIRR');
    var q = P.idsQuadros ? P.idsQuadros() : [];
    if (q.length ? q.indexOf(id) > -1 : us.indexOf('CONT') > -1) l.push('RC');
    if (us.indexOf('REL') > -1 || /^N/.test(id)) l.push('RS');
    return l;
  };
  P.momentosDe = function (id) {
    var c = P.cat(id), mo = c && c.momentos;
    return { per: mo && mo.per ? mo.per.slice() : perPadrao(c && c.periodicidade), ent: mo && mo.ent ? mo.ent.slice() : P.entregasPadrao(id), proprio: !!mo };
  };
  /* Milestones abertas que tem o indicador: e o que fica por rever quando se muda a configuracao */
  P.msAbertasCom = function (id) { return S.ms.filter(function (m) { return m.indicadores.indexOf(id) > -1 && !P.concluida(m); }); };
  P.mudarFrequencia = function (id, freq, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var c = P.cat(id);
    if (!c) return { erro: 'Indicator not found.' };
    if (c.periodicidade === freq) return { ok: true, abertas: [] };
    var antes = c.periodicidade;
    c.periodicidade = freq;
    if (c.momentos) c.momentos.per = perPadrao(freq);
    if (P.eventoGlobal) P.eventoGlobal('Frequency of ' + id + ' ' + c.nome + ' changed from ' + antes + ' to ' + freq + '.', u.nome);
    guardar();
    return { ok: true, abertas: P.msAbertasCom(id) };
  };
  P.definirMomento = function (id, grupo, k, ligado, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var c = P.cat(id);
    if (!c) return { erro: 'Indicator not found.' };
    var mo = P.momentosDe(id), l = mo[grupo].filter(function (x) { return x !== k; });
    if (ligado) l.push(k);
    if (grupo === 'per' && !l.length) return { erro: 'An indicator needs at least one reporting period.' };
    var ordem = (grupo === 'per' ? P.MOMENTOS_PER : P.TIPOS_ENTREGA).map(function (x) { return x[0]; });
    mo[grupo] = ordem.filter(function (x) { return l.indexOf(x) > -1; });
    c.momentos = { per: mo.per, ent: mo.ent };
    if (P.eventoGlobal) P.eventoGlobal(id + ' ' + (ligado ? 'added to ' : 'removed from ') + k + '.', u.nome);
    guardar();
    return { ok: true };
  };
  P.reporMomentos = function (id, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var c = P.cat(id);
    if (!c) return { erro: 'Indicator not found.' };
    delete c.momentos;
    if (P.eventoGlobal) P.eventoGlobal('Reporting moments of ' + id + ' back to the default.', u.nome);
    guardar();
    return { ok: true };
  };
  /* Que indicadores entram numa entrega externa */
  P.indicadoresEntrega = function (rel) {
    var t = rel.id.split('-')[0], per = P.periodo(rel.periodo), chaveP = per && per.tipo === 'trimestre' ? 'T' + per.t : null;
    return S.cat.filter(function (c) { var mo = P.momentosDe(c.id); return mo.ent.indexOf(t) > -1 && (!chaveP || mo.per.indexOf(chaveP) > -1); }).map(function (c) { return c.id; });
  };
  /* Titulo de uma task: o topico dos indicadores, o periodo e as referencias dos reports que alimenta.
     Ex.: "Energia e clima · T4 2026 · RQS, MIRR" */
  P.nomeTask = function (m) {
    var temas = []; (m.indicadores || []).forEach(function (id) { var c = P.cat(id), t = c && c.tema ? c.tema : 'Other'; if (temas.indexOf(t) < 0) temas.push(t); });
    /* Titulo: topico e periodo (T1 a T4 ou Year). Sem as siglas dos reports (RQS, RS, MIRR...), por decisao do Andre */
    var per = P.periodo(m.periodo);
    var t = !temas.length ? (m.unidade || 'Task') : temas.length === 1 ? temas[0] : temas.length === 2 ? temas.join(' + ') : temas[0] + ' + ' + (temas.length - 1) + ' topics';
    return t + ' · ' + (per ? per.nome : String(m.ano));
  };
  P.relatoriosDe = function (m) {
    var per = P.periodo(m.periodo), ano = m.ano, l = [];
    var add = function (id) { var r = (S.relatorios || []).filter(function (x) { return x.id === id; })[0]; if (r && l.indexOf(r) < 0) l.push(r); };
    m.indicadores.forEach(function (id) {
      P.momentosDe(id).ent.forEach(function (t) {
        if (t === 'QA') { if (per && per.tipo === 'trimestre') add('QA-' + per.id); }
        else add(t + '-' + ano);
      });
    });
    return l.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
  };
  /* Na milestone anual: o que ja foi reportado em cada trimestre */
  P.trimestresDe = function (m, id) {
    return (S.periodos || []).filter(function (p) { return p.tipo === 'trimestre' && p.ano === m.ano; }).map(function (p) {
      var it = S.items[p.id + ':' + id], ms = it ? P.ms(it.milestone_id) : null;
      return { p: p, it: it || null, m: ms, valor: it && it.valor !== null ? it.valor : null, aprovado: !!(ms && P.concluida(ms)) };
    });
  };
  P.anualDosTrimestres = function (m, id) {
    var l = P.trimestresDe(m, id), ag = P.agregacao(id), c = P.cat(id), com = l.filter(function (x) { return x.valor !== null; });
    if (!com.length) return null;
    var s = com.reduce(function (a, x) { return a + x.valor; }, 0), v = ag === 'ultimo' ? com[com.length - 1].valor : ag === 'media' ? s / com.length : s;
    return { valor: Number(v.toFixed(c.casas_decimais)), n: com.length, total: l.length, aprovados: l.filter(function (x) { return x.aprovado; }).length, agreg: ag, trimestres: com.map(function (x) { return 'T' + x.p.t; }), l: l };
  };
  /* Tira o passo de validacao automatica de uma task (workflow de base); o passo atual acompanha */
  var semValidacao = function (m) {
    var antes = m.passos.length, atual = m.passos[m.passo_atual];
    m.passos = m.passos.filter(function (p) { return p.tipo !== 'validacao'; });
    if (m.passos.length === antes) return false;
    var ix = atual ? m.passos.indexOf(atual) : -1;
    m.passo_atual = ix > -1 ? ix : Math.min(m.passos.filter(function (p) { return p.concluido_em; }).length, m.passos.length);
    m.eventos = m.eventos.filter(function (x) { return !/^Automatic validation completed/.test(x.texto); });
    return true;
  };
  var passosDe = function (lista) {
    return lista.map(function (p, i) { return { id: 'p' + i + '_' + Math.random().toString(36).slice(2, 7), nome: p.nome, tipo: p.tipo, responsavel: p.responsavel, concluido_em: null, concluido_por: null }; });
  };
  var passoDeNome = function (n, unidade) {
    if (/^Recolha/.test(n)) return { nome: n, tipo: 'recolha', responsavel: 'unidade' };
    if (/^Validação automática/.test(n)) return { nome: n, tipo: 'validacao', responsavel: 'sistema' };
    if (/^Aprovação do responsável/.test(n)) return { nome: n, tipo: 'area', responsavel: 'chefe' };
    if (/^Revisão/.test(n)) return { nome: n, tipo: 'revisao', responsavel: 'esg' };
    if (/^Aprovação/.test(n)) return { nome: n, tipo: 'aprovacao', responsavel: 'esg' };
    if (/^Publicação/.test(n)) return { nome: n, tipo: 'publicacao', responsavel: 'sistema' };
    if (/Operações/.test(n)) return { nome: n, tipo: 'parecer', responsavel: 'area:Operações' };
    if (/Financeira/.test(n)) return { nome: n, tipo: 'parecer', responsavel: 'area:Financeira' };
    return { nome: n, tipo: 'parecer', responsavel: 'area:' + unidade };
  };
  var novoItem = function (id, ano, msId, tipo) {
    return { id: id, ano: ano, milestone_id: msId, valor: null, rascunho: null, qualidade: tipo === 'derivado' ? 'calculado' : 'medido', metodo: '', justificacao: '', evidencias: [], reexpresso: false, versoes: [], entidade: 'Consolidado', fonte: '' };
  };
  /* Valor de demonstracao de um trimestre, coerente com o valor anual */
  var valorTrimestre = function (c, t) {
    var v = valorDemo(c), ag = P.agregacao(c.id);
    if (v === null || v === undefined) return v;
    var q = ag === 'soma' ? v / 4 * (0.94 + 0.03 * t) : ag === 'ultimo' ? v * (0.985 + 0.005 * t) : v * (t % 2 ? 1.004 : 0.996);
    if (c.unidade_medida === '%') q = Math.min(q, 100);
    return Number(q.toFixed(c.casas_decimais));
  };
  /* Valor de demonstracao estavel: ano anterior com pequena variacao */
  var valorDemo = function (c) {
    var soma = c.id.split('').reduce(function (a, ch) { return a + ch.charCodeAt(0); }, 0);
    var fator = 1 + ((soma % 5) - 2) / 100;
    var base = c.ano_anterior;
    if (base === null || base === undefined) base = { C01: 12, C03: 450000, E02: 8000, P17: 0 }[c.id];
    if (base === undefined) base = 100;
    var v = base * fator;
    if (c.unidade_medida === '%') v = Math.min(v, 100);
    return Number(v.toFixed(c.casas_decimais));
  };

  var semear = function () {
    S.ciclo = { ano: 2026, estado: 'aberto', data_abertura: diasDe(-300), fechados: [2025] };
    S.cat = clone(window.PORTAL_CATALOGO);
    S.wfbase = WF_BASE();
    S.users = UTILIZADORES.map(function (u) { var l = u[3] ? u[3].split('|') : []; return { login: u[0], nome: u[1], perfil: u[2], unidades: l, unidade: l[0] || '' }; });
    S.mat = MATERIALIDADE.map(function (m) { return { norma: m[0], tema: m[1], avaliacao: m[2], justificacao: m[3] }; });
    S.ent = ENTIDADES.map(function (e) { return { id: e[0], nome: e[0], perimetro_grupo: !!e[1], perimetro_maioritario: !!e[2] }; });
    S.deps = DEPARTAMENTOS.map(function (n) { return { id: n, nome: n }; });
    S.deps.forEach(function (d) { var x = S.users.filter(function (u) { return u.perfil === 'revisor' && P.temUnidade(u, d.nome); })[0] || S.users.filter(function (u) { return u.perfil === 'resp' && P.temUnidade(u, d.nome); })[0]; if (x) d.chefe = x.login; });
    S.periodos = periodosAno(2026); S.relatorios = relatoriosAno(2026); S.tipos = tiposBase();
    S.janelas = JANELAS.map(function (j) { return { nome: j[0], tema: j[1], meses: j[2], dia_inicio: j[3], dia_fim: j[4] }; });
    S.areas = AREAS.map(function (a) { return { codigo: a[0], nome: a[1], uso: a[2] }; });
    S.marca = clone(P.MARCA_BASE);
    S.amostra = [];
    S.aud = [];
    S.metas = [
      { indicador_id: 'E03', nome: 'Eletricidade de fontes renováveis', valor_meta: 100, ano_meta: 2030, sentido: 'subir', unidade: '%' },
      { indicador_id: 'R10', nome: 'Lamas valorizadas, rumo a um modelo circular integral', valor_meta: 100, ano_meta: 2030, sentido: 'subir', unidade: '%' },
      { indicador_id: 'E06', nome: 'Emissões diretas de GHG (Âmbito 1), Net Zero', valor_meta: 0, ano_meta: 2050, sentido: 'descer', unidade: 'tCO2e' }
    ];
    S.docs = [
      { id: 'D1', tipo: 'eletricidade', fornecedor: 'Comercializador de eletricidade', periodo: 'Set 2026', instalacao: 'ETA Central', entidade: 'Entidade A', consumo: 412300, valor_sem_iva: 49476, iva: 11379.48, percentagem_renovavel: 100, centro_custo: 'CC-1200', leitura_telemetria: 409850, estado: 'distribuída' },
      { id: 'D2', tipo: 'eletricidade', fornecedor: 'Comercializador de eletricidade', periodo: 'Out 2026', instalacao: 'ETAR Sul', entidade: 'Tratamento de efluentes', consumo: 298400, valor_sem_iva: 35808, iva: 8235.84, percentagem_renovavel: 100, centro_custo: 'CC-1310', leitura_telemetria: 268000, estado: 'em conferência' },
      { id: 'D3', tipo: 'água', fornecedor: 'Entidade gestora em alta', periodo: 'Out 2026', instalacao: 'Reservatório Norte', entidade: 'Entidade B', consumo: 185200, valor_sem_iva: 74080, iva: 4444.8, percentagem_renovavel: null, centro_custo: 'CC-2050', leitura_telemetria: 183900, estado: 'em conferência' },
      { id: 'D4', tipo: 'combustível', fornecedor: 'Cartões de combustível', periodo: 'Out 2026', instalacao: 'Frota de recolha', entidade: 'Serviços urbanos', consumo: 18420, valor_sem_iva: 27630, iva: 6354.9, percentagem_renovavel: 0, centro_custo: 'CC-3100', leitura_telemetria: null, estado: 'distribuída' }
    ];
    S.items = {};
    S.ms = [];
    var estados = {
      M01: { i: 2, d: 12 }, M02: { i: 2, d: 9 }, M03: { i: 2, d: 10 }, M04: { i: 5, d: -20 }, M05: { i: 0, d: 3 }, M06: { i: 0, d: -5 }, M07: { i: 0, d: 25 },
      M08: { i: 5, d: -32 }, M09: { i: 0, d: -2 }, M10: { i: 0, d: 6 }, M11: { i: 3, d: 8 }, M12: { i: 0, d: 4, dev: true }, M13: { i: 2, d: 15 }, M14: { i: 5, d: -45 },
      M15: { i: 3, d: 14 }, M16: { i: 0, d: 18 }, M17: { i: 0, d: 12 }, M18: { i: 5, d: -38 }, M19: { i: 5, d: -60 },
      M20: { i: 0, d: 42 }, M21: { i: 0, d: 45 }, M22: { i: 0, d: 48 }, M23: { i: 0, d: 42 }, M24: { i: 0, d: 50 }, M25: { i: 0, d: 55 }
    };
    var EMPRESAS_DEMO = ['Entidade A', 'Entidade B'];
    var pessoaDe = function (un) { var x = UTILIZADORES.filter(function (l) { return l[2] === 'resp' && l[3].split('|')[0] === un; })[0]; return x || null; };
    var nomeDe = function (un) { var x = pessoaDe(un); return x ? x[1] : NOME_ESG; };
    /* Uma milestone por trimestre para o que e mensal ou trimestral, uma para o ano para o resto,
       e uma consolidacao anual por departamento que junta os trimestres */
    var inst = [], trimPorUn = {};
    window.PORTAL_PLANO.forEach(function (pl, ixPlano) {
      var trim = pl.periodicidade === 'Mensal' || pl.periodicidade === 'Trimestral';
      if (trim) {
        /* Frota e Compras ainda nao tem o T4 lancado: fica para lancar no Backoffice */
        [1, 2, 3, 4].forEach(function (t) { if (t === 4 && ['M06', 'M11', 'M12'].indexOf(pl.id) > -1) return; inst.push({ pl: pl, ix: ixPlano, id: pl.id + '-T' + t, periodo: '2026-T' + t, t: t }); });
        trimPorUn[pl.unidade] = (trimPorUn[pl.unidade] || []).concat(pl.indicadores.filter(function (id) { return (trimPorUn[pl.unidade] || []).indexOf(id) < 0; }));
      } else inst.push({ pl: pl, ix: ixPlano, id: pl.id, periodo: '2026-A' });
    });
    Object.keys(trimPorUn).forEach(function (un, k) {
      var id = 'M' + (26 + k);
      inst.push({ pl: { id: id, periodicidade: 'Anual', unidade: un, indicadores: trimPorUn[un], workflow: [] }, ix: 25 + k, id: id, periodo: '2026-A', consolida: true });
    });
    var feito = function (lista) { return lista.length; };
    inst.forEach(function (x) {
      var pl = x.pl, ixPlano = x.ix, per = P.periodo(x.periodo);
      var lista = pl.workflow.length ? pl.workflow.map(function (n) { return passoDeNome(n, pl.unidade); }) : WF_DEMO();
      /* Q1 e Q2 aprovados, Q3 no estado de demonstracao, Q4 a recolher. A consolidacao espera pelo Q4. */
      var cfg = x.t === 1 || x.t === 2 ? { i: feito(lista), d: P.diasAte(per.fecho) } : x.t === 4 || x.consolida ? { i: 0, d: P.diasAte(per.fecho) } : estados[pl.id];
      var m = {
        id: x.id, nome: x.consolida ? 'Consolidação anual 2026 de ' + pl.unidade : nomeMs(pl.periodicidade, 2026, pl.unidade, x.t), ano: 2026, periodo: x.periodo, consolida: !!x.consolida,
        empresa: EMPRESAS_DEMO[ixPlano % EMPRESAS_DEMO.length], departamentos: [pl.unidade], atribuido_a: ixPlano % 2 === 0 && pessoaDe(pl.unidade) ? pessoaDe(pl.unidade)[0] : null, ficheiros_pedidos: [], unidade: pl.unidade, periodicidade: pl.periodicidade, prazo: diasDe(cfg.d),
        indicadores: pl.indicadores.slice(), passos: passosDe(lista), passo_atual: 0, devolvida: !!cfg.dev, workflow_ajustado: pl.workflow.length > 0,
        documentos_gerais: [], comentarios: [], eventos: []
      };
      /* A recolha de um trimestre abre no fim do trimestre (ou no inicio, se ainda esta a decorrer); a do ano, a 1 de janeiro */
      var abre = per.tipo === 'trimestre' && P.diasAte(per.fim) < 0 ? diasDe(P.diasAte(per.fim) + 1) : per.ini;
      m.eventos.push({ texto: 'Task created in the 2026 cycle for ' + per.nome + '.', em: new Date(abre + 'T09:00:00').toISOString(), por: 'System', wf: 'criada' });
      S.ms.push(m);
      var preencher = cfg.i > 0 || cfg.dev, chave = P.chave(m), quando = function (dias) { return new Date(new Date(m.prazo + 'T12:00:00').getTime() + 86400000 * dias).toISOString(); };
      pl.indicadores.forEach(function (id, ix) {
        var c = P.cat(id), it = novoItem(id, chave, m.id, c.tipo);
        S.items[chave + ':' + id] = it;
        var parcial = (x.t === 3 && pl.id === 'M10' && ix < 2) || (pl.id === 'M16' && ix < 3);
        if (!x.consolida && (preencher || parcial)) {
          it.valor = x.t ? valorTrimestre(c, x.t) : valorDemo(c);
          it.versoes.push({ valor: it.valor, em: quando(-8), por: nomeDe(pl.unidade), origem: 'manual', motivo: '' });
          if (preencher && c.evidencia_obrigatoria) it.evidencias.push({ id: 'ev-' + id + '-' + chave, ficheiro: 'suporte-' + id.toLowerCase() + '-' + String(chave).toLowerCase() + '.pdf', por: nomeDe(pl.unidade), em: quando(-8) });
          if (preencher && P.validar(c, it.valor, chave).alertas.length) it.justificacao = 'Diferença confirmada pela unidade: perímetro e fórmula iguais aos do ano anterior.';
        }
      });
      if (x.id === 'M01-T3') {
        var a = S.items[chave + ':A01'];
        a.valor = Number((a.valor * 1.11).toFixed(2)); a.versoes.push({ valor: a.valor, em: quando(-7), por: nomeDe('Operações'), origem: 'file import telemetria-setembro.xlsx', motivo: '' });
        a.justificacao = 'Nova ligação de adução em serviço desde março.';
        var b = S.items[chave + ':A09']; b.qualidade = 'estimado'; b.metodo = 'Extrapolação a partir dos registos do trimestre.';
      }
      for (var k = 0; k < cfg.i; k++) {
        var t = x.t === 1 || x.t === 2 ? quando(-6 + k * 2) : new Date(Date.now() - 86400000 * (Math.max(2, 30 - cfg.d / 3) - k * 2)).toISOString();
        m.passos[k].concluido_em = t;
        m.passos[k].concluido_por = m.passos[k].responsavel === 'sistema' ? 'System' : m.passos[k].responsavel === 'unidade' ? nomeDe(m.unidade) : m.passos[k].responsavel.indexOf('area:') === 0 ? nomeDe(m.passos[k].responsavel.slice(5)) : 'Sustainability team';
        m.eventos.push({ texto: (k === 0 ? 'Task submitted' : 'Step completed: ' + m.passos[k].nome) + '.', em: t, por: m.passos[k].concluido_por, wf: m.passos[k].responsavel === 'sistema' ? 'auto' : 'avanco', passo: m.passos[k].nome });
      }
      m.passo_atual = cfg.i;
      /* O que ja passou da recolha entregou os ficheiros pedidos */
      if (cfg.i > 0) (FICHEIROS_BASE[pl.unidade] || []).forEach(function (f, ixF) { m.documentos_gerais.push({ ficheiro: f[3] + '-' + x.id.toLowerCase() + '-2026.' + f[2][0], por: nomeDe(pl.unidade), em: quando(-8), pedido: 'tipo:' + f[3] }); });
      if (cfg.dev) {
        m.comentarios.push({ autor: NOME_ESG, texto: 'A percentagem de veículos verdes parece baixa. Confirmem com a gestora da frota, por favor.', em: new Date(Date.now() - 86400000).toISOString(), passo: m.passos[3].nome, indicador: 'E09' });
        m.eventos.splice(1, 0, { texto: 'Task submitted.', em: new Date(Date.now() - 86400000 * 6).toISOString(), por: nomeDe(m.unidade), wf: 'avanco', passo: m.passos[0].nome }, { texto: 'Automatic validation completed: 1 indicator(s) with alerts.', em: new Date(Date.now() - 86400000 * 6 + 60000).toISOString(), por: 'System', wf: 'auto', passo: m.passos[1].nome });
        m.eventos.push({ texto: 'Returned to the unit.', em: new Date(Date.now() - 86400000).toISOString(), por: 'Sustainability team', wf: 'devolucao', passo: m.passos[3].nome });
      }
      if (!m.workflow_ajustado) semValidacao(m);
    });
    /* Conversas de demonstracao: cada comentario com o passo em que foi escrito e, quando e o caso, o indicador */
    var com = function (id, autor, texto, horas, passo, ind) {
      var m = S.ms.filter(function (x) { return x.id === id; })[0];
      if (!m) return;
      var c = { autor: autor, texto: texto, em: new Date(Date.now() - 3600000 * horas).toISOString(), passo: passo };
      if (ind) c.indicador = ind;
      m.comentarios.push(c);
      m.comentarios.sort(function (a, b) { return a.em < b.em ? -1 : 1; });
    };
    com('M01-T3', 'Marta Lopes', 'Submeti o T3. O volume de entrada subiu por causa da nova adução que entrou em serviço em março.', 600, 'Recolha e submissão dos dados', 'A01');
    com('M01-T3', NOME_ESG, 'Obrigado, Marta. Consegues anexar o extrato de setembro da telemetria para confirmarmos o A01?', 50, 'Revisão pela equipa de sustentabilidade', 'A01');
    com('M01-T3', 'Marta Lopes', 'Anexado. O A09 está estimado porque faltam os registos de 12 a 15 de setembro.', 20, 'Revisão pela equipa de sustentabilidade', 'A09');
    com('M02-T3', 'Rui Antunes', 'Os boletins de setembro já estão carregados.', 70, 'Validação técnica pela Direção de Operações');
    com('M02-T3', 'Marta Lopes', 'Valido os resultados da ETA Central amanhã de manhã.', 30, 'Validação técnica pela Direção de Operações', 'A13');
    com('M11-T3', 'Paulo Serra', 'O valor de compras bate com o balancete do T3. Dou o parecer até sexta.', 3, 'Parecer da Direção Financeira', 'G01');
    com('M17', 'Paulo Serra', 'Ainda aguardamos as garantias de origem do comercializador de eletricidade.', 96, 'Recolha e submissão dos dados', 'E03');
    com('M17', NOME_ESG, 'Já enviei o pedido externo ao comercializador. O prazo é 16/11/2026.', 72, 'Recolha e submissão dos dados', 'E03');
    com('M26', NOME_ESG, 'Quando o T3 estiver aprovado, usem os trimestres para fechar o ano.', 26, 'Recolha e submissão dos dados');
    S.ext = [
      { id: 'X1', indicador_id: 'E03', milestone_id: 'M17', entidade_externa: 'Comercializador de eletricidade', descricao: 'Percentagem de eletricidade com garantias de origem renovável no ano.', prazo: diasDe(9), estado: 'pendente', valor: null, evidencia: '', respondido_em: null },
      { id: 'X2', indicador_id: 'E09', milestone_id: 'M12-T3', entidade_externa: 'Gestora de frota em renting', descricao: 'Percentagem de viaturas elétricas ou híbridas plug-in na frota em renting a 31/12.', prazo: diasDe(2), estado: 'recebido', valor: 6.4, evidencia: 'frota-renting-dezembro.pdf', respondido_em: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: 'X3', indicador_id: 'N02', milestone_id: 'M20', entidade_externa: 'Fornecedor de reagentes químicos', descricao: 'Toneladas de reagentes fornecidos às ETA e ETAR do perímetro no ano.', prazo: diasDe(30), estado: 'pendente', valor: null, evidencia: '', respondido_em: null }
    ];
    if (P.semearControlo) P.semearControlo();
    if (P.semearDefinicoes) P.semearDefinicoes();
    if (P.semearSaidas) P.semearSaidas();
    guardar();
  };

  /* Ambiente de testes: parte da configuracao completa e tira tudo o que e trabalho feito */
  var semearTeste = function () {
    semear();
    S.ms = []; S.items = {}; S.ext = []; S.aud = []; S.docs = []; S.amostra = [];
    S.puxados = {}; S.saidas = []; S.evg = []; S.selos = []; S.rq = {};
    S.ciclo.data_abertura = hojeISO();
    guardar();
  };
  var semearAmbiente = function () { if (TESTE) semearTeste(); else semear(); };
  /* Acertos aos dados gravados antes das mudancas do workflow. Corre ao carregar e quando chegam alteracoes
     de outras pessoas no ambiente de testes partilhado (que substituem o estado sem passar pelo carregar). */
  var WF_NOVO_DESDE = '2026-11-11T12:39:33Z';
  P.migrarDados = function () {
    /* Workflow de base novo (area head e equipa de sustentabilidade). O base gravado que era o antigo passa ao novo,
       e as tasks no base perdem a validacao automatica; as que ainda estao na recolha passam ao workflow novo. */
    var NOMES_ANTIGOS = 'Recolha e submissão dos dados|Validação automática|Revisão pela equipa de sustentabilidade|Aprovação final|Publicação nos quadros do relatório';
    if (Array.isArray(S.wfbase) && (S.wfbase.map(function (p) { return p.nome; }).join('|') === NOMES_ANTIGOS || S.wfbase.map(function (p) { return p.nome; }).join('|') === NOMES_ANTIGOS.replace('Validação automática|', ''))) S.wfbase = WF_BASE();
    (S.ms || []).forEach(function (m) {
      if (m.workflow_ajustado || !m.passos) return;
      semValidacao(m);
      if (m.passo_atual === 0 && !m.passos.some(function (p) { return p.tipo === 'area'; })) m.passos = passosDe(WF_BASE());
    });
    (S.deps || []).forEach(function (d) { if (d.chefe === undefined) { var x = (S.users || []).filter(function (u) { return u.perfil === 'resp' && P.temUnidade(u, d.nome); })[0]; d.chefe = x ? x.login : ''; } });
    /* O nome da task nao leva a pessoa (muda quando se reatribui ou quando o processo avanca): tira ", Nome" do fim */
    var nomesPessoas = (S.users || []).map(function (u) { return u.nome; });
    (S.ms || []).forEach(function (m) { nomesPessoas.forEach(function (n) { var suf = ', ' + n; if (m.nome && m.nome.length > suf.length && m.nome.slice(-suf.length) === suf) m.nome = m.nome.slice(0, -suf.length); }); });
    /* Titulo das tasks: topico e periodo, sem referencias dos reports (as consolidacoes anuais mantem o nome) */
    (S.ms || []).forEach(function (m) { if (!m.consolida && m.periodicidade !== 'Novos dados ESRS' && P.nomeTask) m.nome = P.nomeTask(m); });
    /* Pastas do SharePoint gravadas nos ficheiros: passam a ordem Ano > Empresa > Periodo > Tema > Indicador */
    if (P.caminhoSPNovo) {
      var acertaSP = function (o, fundo) {
        if (!o || typeof o !== 'object' || fundo > 6) return;
        if (Array.isArray(o)) { o.forEach(function (x) { acertaSP(x, fundo + 1); }); return; }
        if (typeof o.sp === 'string') o.sp = P.caminhoSPNovo(o.sp);
        Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') acertaSP(o[k], fundo + 1); });
      };
      Object.keys(S.items || {}).forEach(function (k) { acertaSP(S.items[k].evidencias, 0); });
      (S.ms || []).forEach(function (m) { acertaSP(m.documentos_gerais, 0); acertaSP(m.ficheiros_pedidos, 0); acertaSP(m.ficheiros, 0); });
      acertaSP(S.docs, 0);
    }
    /* So momentos de report: a frequencia mensal deixou de existir (T1 a T4 e Year) */
    (S.cat || []).forEach(function (c) { if (c.periodicidade === 'Mensal') c.periodicidade = 'Trimestral'; });
    (S.ms || []).forEach(function (m) { if (m.periodicidade === 'Mensal') m.periodicidade = 'Trimestral'; });
    /* Pegada de carbono sempre como input (tambem nos dados ja gravados) */
    (S.cat || []).forEach(function (c) { if (P.eCarbono(c)) { c.tipo = 'base'; c.calc_codigos = ''; } });
    /* Indicadores submetidos um a um antes de existir o passo do responsavel de area: iam direto para a
       sustentabilidade, por isso esse passo fica dado como passado */
    Object.keys(S.items || {}).forEach(function (k) {
      var it = S.items[k];
      if (it && it.submetido && !it.aprovadoArea && !it.revisto && String(it.submetido.em) < WF_NOVO_DESDE) it.aprovadoArea = { em: it.submetido.em, por: 'System (submitted before the area head step)', auto: true };
    });
  };
  P.carregar = function () {
    if (P.online()) { estadoVazio(); return; }
    if (!ler(CHAVES.ms) || ler('esg_versao') !== VERSAO_DADOS) { P.cat = catBoot; semearAmbiente(); P.migrarDados(); escrever('esg_versao', VERSAO_DADOS); return; }
    Object.keys(CHAVES).forEach(function (n) { S[n] = ler(CHAVES[n]); });
    /* A validacao automatica saiu do workflow de base: sai do base gravado e das tasks que seguem o base */
    P.migrarDados();
    /* Os pedidos de dados aceitam so Excel, tambem nos dados ja gravados neste navegador */
    (S.tipos || []).forEach(function (t) { t.formatos = ['xlsx']; });
    /* Ligacoes gravadas antes de terem estado: passam a ter o estado de base */
    if ((S.apis || []).length && !S.apis.some(function (a) { return a.db; }) && P.ligacoesBase) S.apis = P.ligacoesBase();
    /* O sistema de RH passou a estar ligado; so fica por ligar se o administrador o mudou */
    (S.apis || []).forEach(function (a) { if (a.id === 'api2' && a.estado === 'pendente' && !a.mudado) a.estado = 'ligada'; });
    /* Pessoas com varios departamentos, e os perfis de sistema passam a pessoas com nome */
    var NOMES_NOVOS = { admin: [['Administrador da plataforma', 'Helena Martins'], 'Service account'], esg: ['Equipa de sustentabilidade', 'Rita Sousa'], auditor: ['Auditor externo (assurance)', 'Nuno Ferreira'] };
    (S.users || []).forEach(function (u) {
      if (!u.unidades) P.definirUnidades(u, u.unidade ? [u.unidade] : []);
      var nv = NOMES_NOVOS[u.login]; if (nv && [].concat(nv[0]).indexOf(u.nome) > -1) u.nome = nv[1];
    });
    /* A plataforma passou a chamar-se ESG Data Hub: a marca gravada com o nome antigo acompanha a mudanca */
    if (S.marca && /^(Record to Report \(R2R\)|Portal de Sustentabilidade)$/.test(S.marca.nome || '')) { S.marca.nome = P.MARCA_BASE.nome; escrever(CHAVES.marca, S.marca); }
    if (P.garantirEsrs) P.garantirEsrs();
  };
  /* Gera os dados de demonstracao sem tocar no armazenamento: serve o carregamento inicial do Supabase */
  P.dadosDemonstracao = function () { semear(); return S; };
  P.reporDemonstracao = function () {
    Object.keys(CHAVES).forEach(function (n) { try { localStorage.removeItem(PFX + CHAVES[n]); } catch (e) { delete memoria[CHAVES[n]]; } });
    try { localStorage.removeItem(PFX + 'esg_chat_read'); } catch (e) { /* nada a limpar */ }
    semearAmbiente();
  };
  P.exportarTudo = function () { var o = {}; Object.keys(CHAVES).forEach(function (n) { o[CHAVES[n]] = S[n]; }); return o; };
  P.importarTudo = function (o) {
    if (!o || !o.esg_ms || !o.esg_items || !o.esg_cycle) return 'The file is not a complete copy of the data.';
    Object.keys(CHAVES).forEach(function (n) { if (o[CHAVES[n]] !== undefined) S[n] = o[CHAVES[n]]; });
    guardar();
    P.aplicarMarca();
    return null;
  };

  /* --- Acesso a dados ---------------------------------------------------- */
  var catBoot = function (id) {
    var lista = S.cat || window.PORTAL_CATALOGO;
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  };
  P.cat = catBoot;
  P.ms = function (id) { return S.ms.filter(function (m) { return m.id === id; })[0] || null; };
  P.msCiclo = function (ano) { var a = ano || S.ciclo.ano; return S.ms.filter(function (m) { return m.ano === a; }); };
  P.item = function (id, ano) { return S.items[(ano || S.ciclo.ano) + ':' + id] || null; };
  P.user = function (login) { return S.users.filter(function (u) { return u.login === login; })[0] || null; };

  /* Sessao: sem backend entra-se sem palavra-passe. Online, o login vem da conta autenticada (P.entrar depois de B.carregar). */
  P.sessao = function () {
    var l = null;
    try { l = sessionStorage.getItem(PFX + 'esg_sess'); } catch (e) { l = memoria.sess; }
    return l ? P.user(l) : null;
  };
  P.entrar = function (login) { try { sessionStorage.setItem(PFX + 'esg_sess', login); } catch (e) { memoria.sess = login; } };
  P.sair = function () { try { sessionStorage.removeItem(PFX + 'esg_sess'); } catch (e) { delete memoria.sess; } };

  P.valorAnterior = function (id, ano) {
    ano = P.chavePer(ano);
    var tri = /^(\d{4})-T(\d)$/.exec(String(ano));
    if (tri) {
      /* Trimestre: o mesmo trimestre do ano anterior; sem ele, a quarta parte do ano anterior nas somas */
      var itT = S.items[(tri[1] - 1) + '-T' + tri[2] + ':' + id];
      if (itT) { var mT = P.ms(itT.milestone_id); return mT && P.concluida(mT) ? itT.valor : null; }
      var cT = P.cat(id), anoAnt = cT ? cT.ano_anterior : null;
      if (+tri[1] - 1 !== 2025 || anoAnt === null || anoAnt === undefined) return null;
      return P.agregacao(id) === 'soma' ? anoAnt / 4 : anoAnt;
    }
    var a = ano - 1, it = S.items[a + ':' + id];
    if (it) {
      var m = P.ms(it.milestone_id);
      return m && P.indAprovado(m, id) ? it.valor : null;
    }
    if (a === 2025) { var c = P.cat(id); return c ? c.ano_anterior : null; }
    return null;
  };

  /* --- Validacao (secao 7) ----------------------------------------------- */
  /* Contagens (pessoas, instalacoes, ocorrencias, projetos) so aceitam numeros inteiros.
     Por omissao, sao inteiros os indicadores em n.º; o campo inteiro do catalogo sobrepoe-se. */
  P.inteiro = function (c) {
    if (!c) return false;
    if (c.inteiro === true || c.inteiro === false) return c.inteiro;
    return /^(n\.?\s?º|nº|n\.?o|número|number|count)$/i.test(String(c.unidade_medida || '').trim());
  };
  /* Limiar de variacao: o de cada indicador, se foi definido no Backoffice; senao, o limiar por omissao (50%) */
  P.LIMIAR_BASE = 50;
  P.limiarPadrao = function () { var v = S.ciclo && S.ciclo.limiar_padrao; return v === undefined || v === null || v === '' ? P.LIMIAR_BASE : Number(v); };
  P.limiarDe = function (c) { return c && c.limiar_proprio && c.limiar_variacao_pct !== undefined && c.limiar_variacao_pct !== null ? Number(c.limiar_variacao_pct) : P.limiarPadrao(); };
  P.validar = function (c, valor, ano) {
    ano = P.chavePer(ano);
    var r = { erros: [], alertas: [], variacao: null };
    if (valor === null || valor === undefined) return r;
    if (c.unidade_medida === '%') { if (valor < 0 || valor > 100) r.erros.push('Percentage outside 0 to 100.'); }
    else if (valor < 0) r.erros.push('Negative values are not accepted for this indicator.');
    if (!r.erros.length && P.inteiro(c) && Math.round(valor) !== valor) r.erros.push('Whole numbers only. This indicator counts units, so it cannot have decimals.');
    if (r.erros.length) return r;
    var ant = P.valorAnterior(c.id, ano);
    if (ant !== null && ant !== undefined && ant !== 0) {
      r.variacao = ((valor - ant) / Math.abs(ant)) * 100;
      if (Math.abs(r.variacao) > P.limiarDe(c)) {
        r.alertas.push('Change of ' + (r.variacao > 0 ? '+' : '') + P.fmtNum(r.variacao, 1) + '% against ' + P.rotAnterior(ano) + ', above the ' + P.limiarDe(c) + '% threshold.');
      }
    }
    (c.regras_coerencia || []).forEach(function (t) { r.alertas.push(t); });
    return r;
  };
  P.validarItem = function (it) {
    var c = P.cat(it.id);
    if (it.rascunho !== null && it.rascunho !== undefined && it.rascunho !== '') return { erros: ['Value is not numeric.'], alertas: [], variacao: null };
    return P.validar(c, it.valor, it.ano);
  };
  /* O que falta para submeter. Cada entrada leva o campo onde o cursor deve ir. */
  /* --- Outputs: indicadores calculados pelos codigos de outros (ex.: A01 + A02) -----------
     Input: dado que alguem tem de colocar. Output: calculado pela plataforma a partir dos inputs,
     logo que todos os inputs desse periodo estao submetidos. */
  /* Linguagem do calculo: codigos de KPI (A01), fatores de emissao da biblioteca (fator.gas),
     inputs que ainda nao existem como KPI ([Perdas reais]), numeros e + - * / ( ). */
  var RE_TOK = /\[[^\]]*\]|fator\.[A-Za-z0-9_]+|[A-Za-z]{1,4}\d{1,3}[A-Za-z]?(?![A-Za-z0-9])|\d+(?:[.,]\d+)?|[-+*/()]|\s+|[^\s]/g;
  P.tokensCalc = function (txt) {
    return (String(txt || '').match(RE_TOK) || []).filter(function (t) { return !/^\s+$/.test(t); }).map(function (t) {
      if (t.charAt(0) === '[') return { t: 'falta', v: t.slice(1, -1).trim() };
      if (/^fator\./i.test(t)) return { t: 'fator', v: t.slice(6).toLowerCase() };
      if (/^[A-Za-z]{1,4}\d/.test(t)) return { t: 'kpi', v: t.toUpperCase() };
      if (/^\d/.test(t)) return { t: 'num', v: t.replace(',', '.') };
      if (/^[-+*/()]$/.test(t)) return { t: 'op', v: t };
      return { t: 'mau', v: t };
    });
  };
  P.textoCalc = function (toks) { return toks.map(function (k) { return k.t === 'falta' ? '[' + k.v + ']' : k.t === 'fator' ? 'fator.' + k.v : k.v; }).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')'); };
  P.codigosCalc = function (txt) { var l = P.tokensCalc(txt).filter(function (k) { return k.t === 'kpi'; }).map(function (k) { return k.v; }); return l.filter(function (x, i) { return l.indexOf(x) === i; }); };
  P.faltasCalc = function (txt) { return P.tokensCalc(txt).filter(function (k) { return k.t === 'falta'; }).map(function (k) { return k.v; }); };
  var fatorDe = function (id) { var f = (S.fatores || []).filter(function (x) { return x.id === id; })[0]; return f ? Number(f.fator) : null; };
  /* Valida a expressao; os inputs em falta ([..]) sao aceites mas o calculo so corre quando ja nao houver nenhum */
  P.validarCalc = function (txt, idProprio, idsExtra) {
    var s = String(txt || '').trim();
    if (!s) return null;
    var toks = P.tokensCalc(s), mau = toks.filter(function (k) { return k.t === 'mau'; });
    if (mau.length) return 'Use only KPI codes, emission factors (fator.gas), [missing inputs], numbers and + - * / ( ). Not understood: ' + mau.map(function (k) { return k.v; }).join(' ') + '.';
    var cods = P.codigosCalc(s);
    if (!cods.length && !P.faltasCalc(s).length) return 'The calculation needs at least one KPI code, for example A01 + A02.';
    if (idProprio && cods.indexOf(String(idProprio).toUpperCase()) > -1) return 'An indicator cannot use itself in its calculation.';
    if (idProprio && P.eCarbono(P.cat(idProprio) || idProprio)) return 'GHG emissions are always an input: calculate them outside the platform and enter the result.';
    var mal = cods.filter(function (k) { return !P.cat(k) && (!idsExtra || idsExtra.indexOf(k) < 0); });
    if (mal.length) return 'Unknown KPI code(s) in the calculation: ' + mal.join(', ') + '.';
    var fmal = toks.filter(function (k) { return k.t === 'fator' && fatorDe(k.v) === null; });
    if (fmal.length) return 'Unknown emission factor: ' + fmal[0].v + '. See Calculations, emission factor library.';
    var teste = toks.map(function (k) { return k.t === 'op' ? k.v : k.t === 'num' ? k.v : '1'; }).join(' ');
    try { var r = Function('"use strict";return (' + teste + ');')(); if (typeof r !== 'number') throw 0; } catch (x) { return 'The calculation is not a valid expression: ' + s + '.'; }
    return null;
  };
  /* Avalia um calculo com uma funcao que da o valor de cada codigo (por empresa, consolidado, por periodo).
     Devolve null se faltar algum valor ou houver inputs em falta. */
  P.avaliarCalc = function (txt, ler) {
    var toks = P.tokensCalc(txt), falta = false;
    if (!toks.length || toks.some(function (k) { return k.t === 'falta' || k.t === 'mau'; })) return null;
    var expr = toks.map(function (k) {
      if (k.t === 'kpi') { var v = ler(k.v); if (v === null || v === undefined || isNaN(v)) { falta = true; return '0'; } return '(' + v + ')'; }
      if (k.t === 'fator') { var f = fatorDe(k.v); if (f === null) { falta = true; return '0'; } return '(' + f + ')'; }
      return k.v;
    }).join(' ');
    if (falta) return null;
    try { var r = Function('"use strict";return (' + expr + ');')(); return typeof r === 'number' && isFinite(r) ? r : null; } catch (x) { return null; }
  };
  /* Pegada de carbono: as emissoes sao sempre um input. Quem reporta calcula fora (com os seus fatores e metodo)
     e coloca o resultado; pode juntar o calculo como evidencia. A plataforma nunca as calcula. */
  P.INPUT_CARBONO = ['E06', 'E07', 'E08', 'N01'];
  P.eCarbono = function (c) { var id = c && c.id ? c.id : c; return P.INPUT_CARBONO.indexOf(id) > -1 || (!!c && /CO2e/i.test(c.unidade_medida || '')); };
  P.eOutput = function (c) { return !!c && c.tipo === 'derivado' && !!String(c.calc_codigos || '').trim() && !P.eCarbono(c); };
  /* O input conta quando tem valor e a sua task ja saiu da recolha (submetida) */
  var inputSubmetido = function (id, ch) {
    var it = S.items[ch + ':' + id];
    if (!it || it.valor === null) return null;
    if (P.eOutput(P.cat(id))) return it.valor;
    if (it.submetido) return it.valor;
    var m = it.milestone_id ? P.ms(it.milestone_id) : null;
    if (m && !P.concluida(m) && P.passoAtual(m) && P.passoAtual(m).tipo === 'recolha') return null;
    return it.valor;
  };
  P.calcularOutputs = function (ch, usr) {
    var n = 0, quem = (usr && usr.nome) || 'System';
    /* Varias passagens, para outputs que usam outros outputs */
    for (var volta = 0; volta < 4; volta++) {
      var mudou = 0;
      S.cat.forEach(function (c) {
        if (!P.eOutput(c)) return;
        if (P.faltasCalc(c.calc_codigos).length) return;
        var cods = P.codigosCalc(c.calc_codigos), vals = {}, falta = false;
        cods.forEach(function (k) { var v = inputSubmetido(k, ch); if (v === null) falta = true; vals[k] = v; });
        var it = S.items[ch + ':' + c.id];
        if (falta) return;
        var expr = P.tokensCalc(c.calc_codigos).map(function (k) { return k.t === 'kpi' ? '(' + vals[k.v] + ')' : k.t === 'fator' ? '(' + fatorDe(k.v) + ')' : k.v; }).join(' '), r;
        try { r = Function('"use strict";return (' + expr + ');')(); } catch (x) { r = null; }
        if (typeof r !== 'number' || !isFinite(r)) return;
        r = Number(r.toFixed(c.casas_decimais === undefined ? 2 : c.casas_decimais));
        if (!it) it = S.items[ch + ':' + c.id] = novoItem(c.id, ch, null, 'derivado');
        if (it.valor === r && it.daCalculo) return;
        it.valor = r; it.rascunho = null; it.daCalculo = true; it.qualidade = 'calculado';
        it.versoes.push({ valor: r, em: agora(), por: quem, origem: 'calculated: ' + c.calc_codigos, motivo: '' });
        mudou++;
      });
      n += mudou;
      if (!mudou) break;
    }
    if (n) guardar();
    return n;
  };
  P.faltasSubmissao = function (m) {
    var f = [];
    m.indicadores.forEach(function (id) {
      /* Um output e calculado pela plataforma: nao se pede a quem preenche */
      if (P.eOutput(P.cat(id))) return;
      var it = P.item(id, P.chave(m)), c = P.cat(id), v = P.validarItem(it);
      if (it.valor === null && !it.rascunho) f.push({ id: id, campo: 'val', msg: c.nome + ': value missing.' });
      v.erros.forEach(function (e) { f.push({ id: id, campo: 'val', msg: c.nome + ': ' + e }); });
      if (v.alertas.length && !String(it.justificacao || '').trim()) f.push({ id: id, campo: 'just', msg: c.nome + ': alert justification missing.' });
      if (it.qualidade === 'estimado' && !String(it.metodo || '').trim()) f.push({ id: id, campo: 'met', msg: c.nome + ': estimation method missing.' });
      if (P.evidenciaPrecisa(m, id) && !it.evidencias.length) f.push({ id: id, campo: 'evi', msg: c.nome + ': required evidence missing.' });
    });
    P.ficheirosPedidos(m).forEach(function (x) { if (x.obrigatorio && x.preciso && !x.indicador && !x.entregues.length) f.push({ id: x.id, campo: 'fic', msg: x.nome + ': requested file missing.' }); });
    return f;
  };

  /* --- Submeter indicadores um a um --------------------------------------------------------
     Cada indicador pode ser submetido logo que esta completo, sem esperar pelos outros da task.
     Fica bloqueado para edicao, conta como submetido nos calculos dos outputs, e a task mostra
     sempre quantos faltam. A task avanca no workflow com "Submit task", quando estiver tudo. */
  P.faltasIndicador = function (m, id) { return P.faltasSubmissao(m).filter(function (f) { return f.id === id; }); };
  /* Aprovado: a task esta concluida, ou o indicador foi aprovado sozinho pela equipa de sustentabilidade.
     Um indicador aprovado fica fechado e conta como publicado (relatorios, outputs, data room). */
  P.indAprovado = function (m, id) { if (!m) return false; if (P.concluida(m)) return true; var it = P.item(id, P.chave(m)); return !!(it && it.revisto); };
  /* Submetido: o indicador foi submetido sozinho, ou a task ja saiu da recolha (todos foram com ela) */
  P.indSubmetido = function (m, id) { var it = P.item(id, P.chave(m)), pa = P.passoAtual(m); if (P.concluida(m) || (pa && pa.tipo !== 'recolha')) return true; return !!(it && it.submetido); };
  P.estadoSubmissao = function (m) {
    var ids = m.indicadores.filter(function (id) { return !P.eOutput(P.cat(id)); });
    var sub = ids.filter(function (id) { return P.indSubmetido(m, id); });
    var prontos = ids.filter(function (id) { return !P.indSubmetido(m, id) && !P.faltasIndicador(m, id).length; });
    return { total: ids.length, submetidos: sub.length, prontos: prontos, faltam: ids.length - sub.length };
  };
  P.submeterIndicadores = function (m, ids, u) {
    if (!P.podePreencher(m, u)) return { erro: 'This task is not with you right now.' };
    var feitos = [], recusados = [];
    ids.forEach(function (id) {
      if (P.indSubmetido(m, id) || P.eOutput(P.cat(id))) return;
      var f = P.faltasIndicador(m, id);
      if (f.length) { recusados.push(f[0].msg); return; }
      var itS = P.item(id, P.chave(m)); itS.submetido = { em: agora(), por: u.nome }; delete itS.devolvidoInd;
      /* Quem submete e o responsavel da area (ou a area nao tem responsavel): a aprovacao da area passa sozinha */
      if (P.eChefe(u, m.unidade, m.empresa) || !P.chefeDe(m.unidade, m.empresa)) itS.aprovadoArea = { em: agora(), por: u.nome, auto: true };
      feitos.push(id);
    });
    if (feitos.length) {
      ev(m, (feitos.length === 1 ? 'Indicator ' + feitos[0] + ' submitted.' : feitos.length + ' indicators submitted: ' + feitos.join(', ') + '.'), u.nome);
      var nc = P.calcularOutputs(P.chave(m), u);
      if (nc) ev(m, nc + ' output indicator(s) calculated from the submitted inputs.', 'System');
      guardar();
    }
    return { feitos: feitos, recusados: recusados };
  };
  P.reabrirIndicador = function (m, id, u) {
    if (!P.podePreencher(m, u)) return { erro: 'This task is not with you right now.' };
    var it = P.item(id, P.chave(m));
    if (!it || !it.submetido) return { erro: 'This indicator is not submitted.' };
    if (it.revisto) return { erro: 'This indicator is approved and published. It only changes by restatement.' };
    delete it.submetido; delete it.revisto; delete it.aprovadoArea;
    ev(m, 'Indicator ' + id + ' reopened for changes.', u.nome);
    guardar();
    return { ok: true };
  };
  /* --- Revisao por indicador -----------------------------------------------------------------
     Um indicador submetido antes da task segue logo para a equipa de sustentabilidade, que o pode aprovar
     ou devolver sem esperar pelo resto. Quem o submeteu nao o pode rever (segregacao de funcoes). */
  /* Etapa de um indicador submetido antes da task: 'area' (responsavel de area), 'esg' (equipa de sustentabilidade) ou '' */
  P.etapaInd = function (m, id) { var it = P.item(id, P.chave(m)), pa = P.passoAtual(m); if (!it || !it.submetido || it.revisto || P.concluida(m) || !pa || pa.tipo !== 'recolha') return ''; return it.aprovadoArea ? 'esg' : 'area'; };
  P.podeReverInd = function (m, id, u) {
    var it = P.item(id, P.chave(m)), et = P.etapaInd(m, id);
    if (!u || !et || P.concluida(m) || it.submetido.por === u.nome) return false;
    if (et === 'area') return P.eChefe(u, m.unidade, m.empresa) || u.perfil === 'admin';
    return P.gereTudo(u);
  };
  P.indParaRever = function (m) { if (P.concluida(m)) return []; var pa = P.passoAtual(m); if (!pa || pa.tipo !== 'recolha') return []; return m.indicadores.filter(function (id) { var it = P.item(id, P.chave(m)); return it && it.submetido && !it.revisto; }); };
  P.revParaMim = function (u) {
    var l = [];
    if (!u) return l;
    P.msCiclo().forEach(function (m) { P.indParaRever(m).forEach(function (id) { if (P.podeReverInd(m, id, u)) l.push({ m: m, id: id }); }); });
    return l;
  };
  P.aprovarIndicador = function (m, id, u) {
    if (!P.podeReverInd(m, id, u)) return { erro: P.item(id, P.chave(m)).submetido && P.item(id, P.chave(m)).submetido.por === u.nome ? 'Segregation of duties: you submitted this indicator, so someone else has to review it.' : 'This indicator is not waiting for your review.' };
    var itA = P.item(id, P.chave(m));
    if (P.etapaInd(m, id) === 'area') { itA.aprovadoArea = { em: agora(), por: u.nome }; ev(m, 'Indicator ' + id + ' approved by the area head. It goes to the sustainability team.', u.nome); }
    else { itA.revisto = { em: agora(), por: u.nome }; itA.publicado = { em: agora() }; ev(m, 'Indicator ' + id + ' approved by the sustainability team ahead of the task and published to the report tables. It is closed.', u.nome); }
    guardar();
    return { ok: true };
  };
  P.devolverIndicador = function (m, id, u, comentario) {
    if (!P.podeReverInd(m, id, u)) return { erro: 'This indicator is not waiting for your review.' };
    if (!comentario || !String(comentario).trim()) return { erro: 'Write what needs to change.' };
    var it = P.item(id, P.chave(m));
    it.devolvidoInd = { em: agora(), por: u.nome, comentario: String(comentario).trim() };
    delete it.submetido; delete it.aprovadoArea;
    m.comentarios.push({ autor: u.nome, texto: P.cat(id).nome + ' (' + id + ') returned: ' + String(comentario).trim(), em: agora(), passo: P.passoAtual(m).nome, ind: id });
    ev(m, 'Indicator ' + id + ' returned for changes: ' + String(comentario).trim(), u.nome, 'devolucao');
    guardar();
    return { ok: true };
  };
  /* Guardar sem submeter: os valores ja ficam gravados; isto deixa o registo de quando se guardou */
  P.guardarTrabalho = function (m, u) {
    m.guardado = { em: agora(), por: u.nome };
    var ult = m.eventos[m.eventos.length - 1];
    if (!(ult && /^Work saved/.test(ult.texto || ult.t || '') )) ev(m, 'Work saved, not submitted yet.', u.nome);
    guardar();
    return { ok: true };
  };

  /* --- Pedido de dados: ficheiros pedidos em cada milestone ------------------ */
  /* [nome, porque e pedido, formatos aceites, prefixo do ficheiro de exemplo] */
  var FICHEIROS_BASE = {
    'Operações': [['Extrato de telemetria do período', 'Sustenta os volumes e as ocorrências reportados.', ['xlsx'], 'extrato-telemetria']],
    'Qualidade e Laboratório': [['Boletins de análise do período', 'Sustentam os resultados de qualidade reportados.', ['xlsx'], 'boletins-analise']],
    'Comercial e Relação com o Cliente': [['Extrato de faturação do período', 'Sustenta os volumes faturados e o número de clientes.', ['xlsx'], 'extrato-faturacao']],
    'Ambiente, Saúde e Segurança': [['Registo de resíduos e de acidentes', 'Sustenta os indicadores de ambiente e de segurança.', ['xlsx'], 'registo-ass']],
    'Recursos Humanos': [['Mapa de pessoal e de formação', 'Sustenta os indicadores de pessoas.', ['xlsx'], 'mapa-pessoal']],
    'Financeira': [['Balancete e mapa de custos', 'Sustenta os valores financeiros e de energia.', ['xlsx'], 'balancete']],
    'Jurídico e Compliance': [['Registo de ocorrências de conformidade', 'Sustenta os indicadores de governance.', ['xlsx'], 'registo-conformidade']],
    'Compras': [['Lista de compras e de fornecedores', 'Sustenta os indicadores da cadeia de valor.', ['xlsx'], 'lista-compras']],
    'Frota': [['Mapa de frota e de abastecimentos', 'Sustenta os consumos e a composição da frota.', ['xlsx'], 'mapa-frota']],
    'Sistemas de Informação': [['Registo de incidentes de segurança', 'Sustenta os indicadores de cibersegurança.', ['xlsx'], 'registo-incidentes']],
    'I&D, CSR e ESG': [['Relatório de atividades do período', 'Sustenta os indicadores de comunidade.', ['xlsx'], 'relatorio-atividades']]
  };
  /* --- Tipos de dados: o que se pede, em que formato, com que colunas e granularidade --- */
  /* Comecam nos ficheiros base de cada departamento e editam-se no Backoffice, sem codigo */
  var tiposBase = function () {
    var l = [];
    Object.keys(FICHEIROS_BASE).forEach(function (un) {
      FICHEIROS_BASE[un].forEach(function (f) {
        l.push({ id: f[3], nome: f[0], motivo: f[1], formatos: f[2].slice(), prefixo: f[3], unidade: un, colunas: null, granularidade: 'mensal', obrigatorio: true, instrucoes: '', ativo: true, versao: 1, alterado_em: '2026-01-05T10:00:00.000Z', alterado_por: 'Equipa de sustentabilidade' });
      });
    });
    return l;
  };
  P.GRANULARIDADES = { mensal: 'Monthly rows', trimestral: 'Quarterly rows', anual: 'One row for the year' };
  P.FORMATOS = ['xlsx', 'pdf'];
  /* Os dados entram so em Excel; PDF so para faturas e outros documentos de suporte */
  P.ACEITA_DADOS = '.xlsx';
  P.ACEITA_SUPORTE = '.xlsx,.pdf';
  P.tipo = function (id) { return (S.tipos || []).filter(function (t) { return t.id === id; })[0] || null; };
  /* Os tipos de uma milestone: os escolhidos ao lancar, ou os ativos do departamento */
  P.tiposDe = function (m) {
    if (m.tipos) return m.tipos.map(P.tipo).filter(function (t) { return t && t.ativo; });
    return (S.tipos || []).filter(function (t) { return t.ativo && t.unidade === m.unidade; });
  };
  P.usosTipo = function (id) { return S.ms.filter(function (m) { return P.tiposDe(m).some(function (t) { return t.id === id; }); }); };
  P.guardarTipo = function (dados, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var nome = String(dados.nome || '').trim();
    if (!nome) return { erro: 'Give the data type a name.' };
    if (!dados.unidade) return { erro: 'Choose the department that delivers it.' };
    if (!dados.formatos || !dados.formatos.length) return { erro: 'Choose at least one accepted format.' };
    var t = dados.id ? P.tipo(dados.id) : null, novo = !t;
    if (novo) {
      var id = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'tipo';
      while (P.tipo(id)) id += '-2';
      t = { id: id, prefixo: id, versao: 0, ativo: true };
      S.tipos.push(t);
    }
    ['nome', 'motivo', 'formatos', 'unidade', 'colunas', 'granularidade', 'obrigatorio', 'instrucoes'].forEach(function (k) { if (dados[k] !== undefined) t[k] = k === 'nome' ? nome : dados[k]; });
    t.versao = (t.versao || 0) + 1; t.alterado_em = agora(); t.alterado_por = u.nome;
    guardar();
    return { ok: true, tipo: t, novo: novo };
  };
  P.arquivarTipo = function (id, ativo, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var t = P.tipo(id);
    if (!t) return { erro: 'Data type not found.' };
    t.ativo = !!ativo; t.alterado_em = agora(); t.alterado_por = u.nome;
    guardar();
    return { ok: true };
  };

  /* --- Lancar milestones a partir do Backoffice ------------------------------ */
  /* Indicadores sugeridos: os do departamento que tem este periodo nos seus momentos de report
     (vem da frequencia de cada indicador, ou do que se marcou em Reporting moments) */
  P.indicadoresSugeridos = function (un, pid) {
    var per = P.periodo(pid);
    if (!per) return [];
    var k = per.tipo === 'trimestre' ? 'T' + per.t : 'A', ordem = [];
    (window.PORTAL_PLANO || []).forEach(function (pl) { pl.indicadores.forEach(function (id) { if (ordem.indexOf(id) < 0) ordem.push(id); }); });
    var pos = function (id) { var i = ordem.indexOf(id); return i < 0 ? 9999 : i; };
    return S.cat.filter(function (c) { return P.donoIndicador(c.id) === un && P.momentosDe(c.id).per.indexOf(k) > -1; })
      .map(function (c) { return c.id; }).sort(function (a, b) { return pos(a) - pos(b); });
  };
  P.msExistente = function (un, pid) { return S.ms.filter(function (m) { return m.unidade === un && m.periodo === pid && !m.consolida; })[0] || null; };
  /* Apagar uma task enviada (ainda nao concluida): sai com os valores e ficheiros dela; fica no registo geral */
  /* Tirar um indicador de uma task enviada (reverter o envio desse indicador). Sai com o valor e os ficheiros dele nessa task.
     Uma task que fica sem indicadores e apagada. Aprovados nao se tiram: so mudam por reexpressao. */
  P.tirarIndTask = function (msId, id, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var m = P.ms(msId);
    if (!m || m.indicadores.indexOf(id) < 0) return { erro: 'This indicator is no longer in the task.' };
    if (P.concluida(m)) return { erro: 'The task is completed: its values stay in the history.' };
    if (P.indAprovado(m, id)) return { erro: 'This indicator is approved. It only changes by restatement.' };
    if (m.indicadores.length === 1) { var r0 = P.apagarTask(msId, u); if (r0.erro) return r0; return { ok: true, taskApagada: true, nome: m.nome }; }
    var k = P.chave(m) + ':' + id, it = S.items[k];
    if (it && (it.milestone_id === m.id || !it.milestone_id)) { (it.evidencias || []).forEach(function (x) { if (x.fid && P.apagarConteudo) P.apagarConteudo(x.fid); }); delete S.items[k]; }
    m.indicadores.splice(m.indicadores.indexOf(id), 1);
    if (P.nomeTask && !m.consolida) m.nome = P.nomeTask(m);
    ev(m, 'Indicator ' + id + ' removed from the task in the Backoffice. It can be sent again.', u.nome);
    if (P.eventoGlobal) P.eventoGlobal('Indicator ' + id + ' removed from ' + m.nome + ' (' + m.id + ', ' + m.empresa + ').', u.nome, 'Change');
    guardar();
    return { ok: true, nome: m.nome };
  };
  P.apagarTask = function (id, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var m = P.ms(id);
    if (!m) return { erro: 'This task no longer exists.' };
    if (P.concluida(m)) return { erro: 'Completed tasks stay in the history and cannot be deleted.' };
    var ch = P.chave(m), n = 0;
    m.indicadores.forEach(function (i) { var k = ch + ':' + i, it = S.items[k]; if (it && (it.milestone_id === m.id || !it.milestone_id)) { (it.evidencias || []).forEach(function (x) { if (x.fid && P.apagarConteudo) P.apagarConteudo(x.fid); }); delete S.items[k]; n++; } });
    (m.documentos_gerais || []).forEach(function (x) { if (x.fid && P.apagarConteudo) P.apagarConteudo(x.fid); });
    S.ms.splice(S.ms.indexOf(m), 1);
    P.eventoGlobal('Task deleted: ' + m.nome + ' (' + m.id + ', ' + m.empresa + ', ' + P.rotPeriodo(m) + '), with ' + m.indicadores.length + ' indicator(s).', u.nome, 'Change');
    guardar();
    return { ok: true, nome: m.nome };
  };
  P.lancarMilestones = function (cfg, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    if (!cfg.periodos.length || !cfg.unidades.length) return { erro: 'Choose at least one period and one department.' };
    var criadas = [], ignoradas = [], num = S.ms.reduce(function (mx, m) { var n = parseInt(String(m.id).replace(/^M/, ''), 10); return isNaN(n) ? mx : Math.max(mx, n); }, 0);
    cfg.unidades.forEach(function (un) {
      num++;
      cfg.periodos.forEach(function (pid) {
        var per = P.periodo(pid);
        if (!per) return;
        if (P.msExistente(un, pid)) { ignoradas.push(un + ': ' + per.nome); return; }
        var inds = (cfg.indicadores && cfg.indicadores[un]) || P.indicadoresSugeridos(un, pid);
        if (!inds.length) { ignoradas.push(un + ': ' + per.nome + ' (no indicators)'); return; }
        var id = 'M' + String(num).padStart(2, '0') + (per.tipo === 'trimestre' ? '-T' + per.t : '');
        while (P.ms(id)) id += 'b';
        var m = {
          id: id, nome: per.tipo === 'trimestre' ? 'Entrega T' + per.t + ' ' + per.ano + ' de ' + un : 'Entrega anual ' + per.ano + ' de ' + un, ano: per.ano, periodo: pid, consolida: false,
          empresa: cfg.empresa || (S.ent[0] && S.ent[0].nome) || '', departamentos: [un], atribuido_a: cfg.atribuido && cfg.atribuido[un] || null, ficheiros_pedidos: [], unidade: un,
          periodicidade: per.tipo === 'trimestre' ? 'Trimestral' : 'Anual', prazo: cfg.prazo === 'fecho' || !cfg.prazo ? per.fecho : cfg.prazo,
          indicadores: inds.slice(), tipos: cfg.tipos && cfg.tipos[un] ? cfg.tipos[un].slice() : null, passos: passosDe(WF_BASE()), passo_atual: 0, devolvida: false, workflow_ajustado: false,
          documentos_gerais: [], comentarios: [], eventos: []
        };
        if (!m.tipos) delete m.tipos;
        m.nome = P.nomeTask(m);
        S.ms.push(m);
        m.indicadores.forEach(function (i) { var ch = P.chave(m); if (!S.items[ch + ':' + i]) S.items[ch + ':' + i] = novoItem(i, ch, m.id, P.cat(i).tipo); });
        ev(m, 'Task assigned from the Backoffice for ' + per.nome + '.', u.nome, 'criada');
        if (m.atribuido_a && P.user(m.atribuido_a)) ev(m, 'Assigned to ' + P.user(m.atribuido_a).nome + '.', u.nome);
        criadas.push(m);
      });
    });
    if (criadas.length) guardar();
    return { criadas: criadas, ignoradas: ignoradas };
  };

  /* --- Indicadores geridos no Backoffice: empresas, responsavel e envio de tasks ---- */
  /* Empresas abrangidas pelo indicador (por omissao, todo o perimetro do grupo) e empresa que o reporta */
  P.empresasInd = function (c) {
    var l = c && c.empresas && c.empresas.length ? S.ent.filter(function (x) { return c.empresas.indexOf(x.id) > -1; }) : [];
    if (l.length) return l;
    var r = P.reportaInd(c);
    return r ? [r] : [];
  };
  /* Linhas por empresa (Data entry e Excel offline): as empresas escolhidas no indicador, ou todo o perimetro do grupo */
  P.empresasLinhas = function (c) { var l = c && c.empresas && c.empresas.length > 1 ? P.empresasInd(c) : []; return l.length ? l : P.empresasGrupo(); };
  P.reportaInd = function (c) {
    var x = c && c.reporta ? S.ent.filter(function (y) { return y.id === c.reporta; })[0] : null;
    if (x) return x;
    var m = c ? S.ms.filter(function (y) { return y.indicadores.indexOf(c.id) > -1; }).sort(function (a, b) { return a.prazo < b.prazo ? 1 : -1; })[0] : null;
    var x2 = c && c.empresas && c.empresas.length ? S.ent.filter(function (y) { return c.empresas.indexOf(y.id) > -1; })[0] : null;
    return (m && S.ent.filter(function (y) { return y.nome === m.empresa; })[0]) || x2 || S.ent[0] || null;
  };
  P.indAtivo = function (c) { return !!c && c.ativo !== false; };
  /* Responsavel: uma pessoa (quem submete na atribuicao) ou o grupo, que e o departamento inteiro */
  /* Responsavel de um indicador; com empresa, o dessa empresa (c.resp_emp), que pode ser outro departamento e outra pessoa */
  P.responsavelInd = function (id, empId) {
    var c = P.cat(id), re = empId && c && c.resp_emp ? c.resp_emp[empId] : null;
    if (re && re.dep) { var px = re.pessoa ? P.user(re.pessoa) : null; return px ? { tipo: 'pessoa', login: px.login, nome: px.nome, dep: re.dep } : { tipo: 'grupo', login: '', nome: re.dep, dep: re.dep }; }
    var a = (S.atrib || {})[id], x = a && a.submete ? P.user(a.submete) : null, dep = P.donoIndicador(id);
    return x ? { tipo: 'pessoa', login: x.login, nome: x.nome, dep: dep } : { tipo: 'grupo', login: '', nome: dep, dep: dep };
  };
  /* Task de um indicador num periodo: a milestone desse periodo que o tem (sem as consolidacoes) */
  P.tarefaInd = function (id, pid, empresa) { var l = S.ms.filter(function (m) { return m.periodo === pid && m.indicadores.indexOf(id) > -1 && (!empresa || m.empresa === empresa); }); return l.filter(function (m) { return !m.consolida; })[0] || l[0] || null; };
  P.estadoTarefaInd = function (id, pid) {
    var m = P.tarefaInd(id, pid);
    if (!m) return { cod: 'nao', txt: 'Not sent', cls: '', m: null };
    if (P.concluida(m)) return { cod: 'feito', txt: 'Approved', cls: 'ok', m: m };
    var p = P.passoAtual(m), it = P.item(id, P.chave(m));
    if (p.tipo !== 'recolha') return { cod: 'revisao', txt: 'In review', cls: 'rev', m: m };
    if (m.devolvida) return { cod: 'aberta', txt: 'Returned', cls: 'err', m: m };
    if (P.diasAte(m.prazo) < 0) return { cod: 'atraso', txt: 'Overdue', cls: 'err', m: m };
    return it && it.valor !== null ? { cod: 'aberta', txt: 'Filled in', cls: 'info', m: m } : { cod: 'aberta', txt: 'Sent', cls: 'warn', m: m };
  };
  /* O que o envio vai fazer, sem gravar: um grupo por empresa que reporta, departamento e pessoa */
  P.planoEnvio = function (ids, pid) {
    var per = P.periodo(pid), grupos = {}, fora = [];
    ids.forEach(function (id) {
      var c = P.cat(id);
      if (!c) return;
      if (!P.indAtivo(c)) return fora.push({ id: id, t: 'inactive' });
      /* Uma task por empresa: um indicador de varias empresas vai para a task de cada uma, com o responsavel dessa empresa */
      var emps = P.empresasInd(c);
      if (!emps.length) return fora.push({ id: id, t: 'no company covered' });
      emps.forEach(function (emp) {
        var ja = P.tarefaInd(id, pid, emp.nome);
        if (ja) return fora.push({ id: id, t: 'already sent in ' + ja.nome + ' (' + emp.nome + ')', empresa: emp.nome });
        var r = P.responsavelInd(id, emp.id);
        if (!r.dep) return fora.push({ id: id, t: 'no responsible department in ' + emp.nome, empresa: emp.nome });
        var tema = c.tema || 'Other', k = emp.id + '|' + r.dep + '|' + r.login + '|' + tema, g = grupos[k] || (grupos[k] = { empresa: emp, dep: r.dep, resp: r, tema: tema, ids: [], ms: null });
        g.ids.push(id);
      });
    });
    var l = Object.keys(grupos).map(function (k) { return grupos[k]; }).sort(function (a, b) { return a.empresa.nome.localeCompare(b.empresa.nome); });
    l.forEach(function (g) {
      /* Junta-se a uma task aberta do mesmo departamento, empresa e pessoa; senao cria-se uma nova */
      g.ms = S.ms.filter(function (m) { return m.periodo === pid && !m.consolida && m.unidade === g.dep && m.empresa === g.empresa.nome && (m.atribuido_a || '') === g.resp.login && !P.concluida(m) && P.passoAtual(m).tipo === 'recolha' && m.indicadores.every(function (i) { return ((P.cat(i) || {}).tema || 'Other') === g.tema; }); })[0] || null;
    });
    return { per: per, grupos: l, fora: fora, n: l.reduce(function (a, g) { return a + g.ids.length; }, 0) };
  };
  P.enviarTarefas = function (cfg, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var per = P.periodo(cfg.periodo);
    if (!per) return { erro: 'Choose a reporting period.' };
    var pl = P.planoEnvio(cfg.ids || [], cfg.periodo), prazo = cfg.prazo || per.fecho, ch = per.tipo === 'trimestre' ? per.id : per.ano, criadas = 0, juntas = 0;
    if (!pl.n) return { erro: 'Nothing to send: the selected indicators are inactive or were already sent for ' + per.nome + '.' };
    var num = S.ms.reduce(function (mx, m) { var n = parseInt(String(m.id).replace(/^M/, ''), 10); return isNaN(n) ? mx : Math.max(mx, n); }, 0);
    pl.grupos.forEach(function (g) {
      var m = g.ms;
      if (m) {
        g.ids.forEach(function (i) { m.indicadores.push(i); });
        m.nome = P.nomeTask(m);
        ev(m, g.ids.length + ' indicator(s) added from the Backoffice: ' + g.ids.join(', ') + '.', u.nome);
        juntas++;
      } else {
        num++;
        var id = 'M' + String(num).padStart(2, '0') + (per.tipo === 'trimestre' ? '-T' + per.t : '');
        while (P.ms(id)) id += 'b';
        m = {
          id: id, nome: (per.tipo === 'trimestre' ? 'Entrega T' + per.t + ' ' + per.ano : 'Entrega anual ' + per.ano) + ' de ' + g.dep, ano: per.ano, periodo: per.id, consolida: false, porEmpresa: true,
          empresa: g.empresa.nome, departamentos: [g.dep], atribuido_a: g.resp.login || null, ficheiros_pedidos: [], unidade: g.dep,
          periodicidade: per.tipo === 'trimestre' ? 'Trimestral' : 'Anual', prazo: prazo, indicadores: g.ids.slice(), passos: passosDe(WF_BASE()), passo_atual: 0, devolvida: false, workflow_ajustado: false,
          documentos_gerais: [], comentarios: [], eventos: []
        };
        m.nome = P.nomeTask(m);
        S.ms.push(m);
        ev(m, 'Task sent from the Backoffice for ' + per.nome + ', due ' + prazo + '.', u.nome, 'criada');
        if (g.resp.tipo === 'pessoa') ev(m, 'Assigned to ' + g.resp.nome + '.', u.nome);
        criadas++;
      }
      if (cfg.nota && String(cfg.nota).trim()) ev(m, 'Note to the assignee: ' + String(cfg.nota).trim(), u.nome);
      var chM = P.chave(m);
      g.ids.forEach(function (i) { if (!S.items[chM + ':' + i]) S.items[chM + ':' + i] = novoItem(i, chM, m.id, P.cat(i).tipo); else S.items[chM + ':' + i].milestone_id = m.id; });
    });
    if (P.eventoGlobal) P.eventoGlobal('Tasks sent for ' + per.nome + ': ' + pl.n + ' indicator(s) in ' + (criadas + juntas) + ' task(s).', u.nome, 'Creation');
    guardar();
    return { ok: true, n: pl.n, criadas: criadas, juntas: juntas, fora: pl.fora };
  };
  /* Lembrete: fica no historico da task e na conversa de quem a tem */
  P.lembrarTarefas = function (ids, pid, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var vistos = {}, n = 0;
    ids.forEach(function (id) {
      var m = P.tarefaInd(id, pid);
      if (!m || vistos[m.id] || P.concluida(m) || P.passoAtual(m).tipo !== 'recolha') return;
      vistos[m.id] = 1; n++;
      m.lembrado_em = agora();
      ev(m, 'Reminder sent by the Backoffice: due ' + m.prazo + '.', u.nome);
    });
    if (n) guardar();
    return { ok: true, n: n };
  };

  P.ficheirosPedidos = function (m) {
    var docs = m.documentos_gerais || [], l = [];
    var entregues = function (pid) { return docs.filter(function (d) { return d.pedido === pid; }); };
    P.tiposDe(m).forEach(function (t) { l.push({ id: 'tipo:' + t.id, nome: t.nome, motivo: t.motivo, formatos: t.formatos, prefixo: t.prefixo, obrigatorio: t.obrigatorio !== false, colunas: t.colunas, granularidade: t.granularidade || 'mensal', instrucoes: t.instrucoes || '', tipo: t, entregues: entregues('tipo:' + t.id) }); });
    (m.ficheiros_pedidos || []).forEach(function (f) { l.push({ id: f.id, nome: f.nome, motivo: f.motivo || '', formatos: [], obrigatorio: !!f.obrigatorio, proprio: true, entregues: entregues(f.id) }); });
    m.indicadores.forEach(function (id) {
      var c = P.cat(id);
      if (c.evidencia_obrigatoria) l.push({ id: 'ev:' + id, nome: 'Evidência de ' + c.nome, motivo: 'Obrigatória para este indicador.', formatos: [], obrigatorio: true, indicador: id, entregues: P.item(id, P.chave(m)).evidencias });
    });
    l.forEach(function (f) { var p = precisoFicheiro(m, f); f.preciso = p.preciso; f.porque = p.porque; f.faltam = p.faltam; });
    return l;
  };
  /* A evidencia obrigatoria so e dispensada quando o valor veio do sistema */
  /* Valor vindo do sistema: calculado da fonte e sem nenhum dado de origem escrito a mao */
  P.doSistema = function (m, id) {
    if (!P.item(id, P.chave(m)).daFonte) return false;
    var px = (S.puxados || {})[m.id], ed = (px && px.editados) || {}, x = P.expressaoDe ? P.expressaoDe(id) : null;
    return !(x && P.camposDaFormula(x).some(function (k) { return ed[k]; }));
  };
  P.evidenciaPrecisa = function (m, id) { return !!P.cat(id).evidencia_obrigatoria && !P.doSistema(m, id); };
  /* Um ficheiro so e preciso quando os dados nao chegam do sistema nem foram preenchidos no ecra.
     Os ficheiros de dados cobrem os indicadores que usam as suas colunas; deixam de ser precisos quando todos tem valor. */
  var precisoFicheiro = function (m, f) {
    if (f.indicador) {
      var it = P.item(f.indicador, P.chave(m));
      if (P.doSistema(m, f.indicador)) return { preciso: false, porque: 'The value came from the system, so no evidence is needed.', faltam: [] };
      return { preciso: true, porque: it.valor === null ? 'Required evidence for this indicator.' : 'The value was typed in, so it needs supporting evidence.', faltam: [] };
    }
    if (f.proprio) return { preciso: true, porque: f.motivo || 'Requested specifically for this task.', faltam: [] };
    var cols = P.colunasFolha ? P.colunasFolha(m, f) : [], cobre = [];
    cols.forEach(function (c) { (c.usa || []).forEach(function (id) { if (cobre.indexOf(id) < 0) cobre.push(id); }); });
    if (!cobre.length) cobre = m.indicadores.slice();
    var faltam = cobre.filter(function (id) { return P.item(id, P.chave(m)).valor === null; });
    if (!faltam.length) return { preciso: false, porque: 'All its data already came from the system or was filled in on screen.', faltam: [] };
    return { preciso: true, porque: faltam.length + ' indicator' + (faltam.length === 1 ? ' has' : 's have') + ' no value from the system or on screen yet.', faltam: faltam };
  };
  P.entregarFicheiro = function (m, pid, nome, u, fid) {
    if (!P.podePreencher(m, u)) return { erro: 'This task is not with you right now.' };
    var f = P.ficheirosPedidos(m).filter(function (x) { return x.id === pid; })[0];
    if (!f) return { erro: 'That file is no longer requested.' };
    var ext = String(nome).split('.').pop().toLowerCase();
    if (f.formatos.length && f.formatos.indexOf(ext) < 0) return { erro: 'This request accepts ' + f.formatos.join(', ') + ' files.' };
    if (f.indicador) P.anexar(P.item(f.indicador, P.chave(m)), nome, u, fid);
    else { var dg = { ficheiro: nome, por: u.nome, em: agora(), pedido: pid }; if (fid) dg.fid = fid; m.documentos_gerais.push(dg); }
    ev(m, 'File delivered for "' + f.nome + '": ' + nome + '.', u.nome);
    guardar();
    return { ok: true };
  };
  P.pedirFicheiro = function (m, nome, obrigatorio, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    if (!String(nome || '').trim()) return { erro: 'Enter the name of the file.' };
    m.ficheiros_pedidos = m.ficheiros_pedidos || [];
    m.ficheiros_pedidos.push({ id: 'fp' + Date.now(), nome: nome.trim(), obrigatorio: !!obrigatorio });
    ev(m, 'File requested: ' + nome.trim() + '.', u.nome);
    guardar();
    return { ok: true };
  };
  P.retirarPedidoFicheiro = function (m, pid, u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    m.ficheiros_pedidos = (m.ficheiros_pedidos || []).filter(function (f) { return f.id !== pid; });
    guardar();
    return { ok: true };
  };

  /* --- Atribuicao: a pessoa escolhida ou a tag de quem tem o passo atual ----- */
  P.atribuido = function (m) {
    var p = P.passoAtual(m);
    if (!p) return null;
    var x = p.tipo === 'recolha' && m.atribuido_a ? P.user(m.atribuido_a) : null;
    return x ? { tipo: 'pessoa', nome: x.nome } : { tipo: 'tag', nome: P.nomeResp(m, p.responsavel) };
  };
  P.atribuiveis = function (m) { return S.users.filter(function (x) { return P.daUnidade(x) && P.temUnidade(x, m.unidade, m.empresa) && (!P.userNaEmpresa || P.userNaEmpresa(x, m.empresa)); }); };
  P.atribuir = function (m, login, u) {
    if (!P.acompanha(m, u)) return { erro: 'No permission.' };
    m.atribuido_a = login || null;
    ev(m, login ? 'Assigned to ' + P.user(login).nome + '.' : 'Assigned to the ' + m.unidade + ' department.', u.nome);
    guardar();
    return { ok: true };
  };

  /* --- Acessos aos dados no explorador --------------------------------------- */
  P.podeVerIndicador = function (c, u) {
    if (!u) return false;
    if (P.gereTudo(u) || u.perfil === 'auditor') return true;
    if (u.perfil !== 'resp') return false;
    if (P.temUnidade(u, c.unidade_negocio) || P.temUnidade(u, P.donoIndicador(c.id))) return true;
    var m = P.msDoIndicador(c.id);
    return !!m && P.temUnidade(u, m.unidade);
  };

  /* --- Estados e permissoes ---------------------------------------------- */
  P.concluida = function (m) { return m.passo_atual >= m.passos.length; };
  P.passoAtual = function (m) { return P.concluida(m) ? null : m.passos[m.passo_atual]; };
  P.estadoMs = function (m) {
    if (P.concluida(m)) return { cod: 'concluida', txt: 'Completed', cls: 'ok' };
    var p = P.passoAtual(m);
    if (p.tipo === 'recolha') {
      if (m.devolvida) return { cod: 'devolvida', txt: 'Returned', cls: 'err' };
      if (P.diasAte(m.prazo) < 0) return { cod: 'atraso', txt: 'Overdue', cls: 'err' };
      return { cod: 'recolha', txt: 'In collection', cls: 'info' };
    }
    if (p.tipo === 'area') return { cod: 'revisao', txt: 'With the area head', cls: 'rev' };
    if (p.tipo === 'parecer') return { cod: 'parecer', txt: 'Awaiting opinion', cls: 'warn' };
    if (p.tipo === 'aprovacao') return { cod: 'aprovacao', txt: 'In approval', cls: 'rev' };
    return { cod: 'revisao', txt: 'In review', cls: 'rev' };
  };
  P.estadoIndicador = function (m, id) {
    var it = P.item(id, P.chave(m));
    if (P.indAprovado(m, id)) return { txt: 'Approved', cls: 'ok' };
    if (P.passoAtual(m).tipo === 'recolha') {
      if (m.devolvida) return { txt: 'Returned', cls: 'err' };
      return it.valor === null ? { txt: 'To collect', cls: '' } : { txt: 'In progress', cls: 'info' };
    }
    return P.validarItem(it).alertas.length ? { txt: 'With alerts', cls: 'warn' } : { txt: 'In review', cls: 'rev' };
  };
  P.nomeResp = function (m, resp) {
    if (resp === 'unidade') return m ? m.unidade : 'Task unit';
    if (resp === 'esg') return 'Sustainability team';
    if (resp === 'chefe') { var ch = m ? P.chefeDe(m.unidade, m.empresa) : null; return ch ? ch.nome + ' (area head)' : 'Area head'; }
    if (resp === 'admin') return 'Administrator';
    if (resp === 'sistema') return 'Automatic';
    return resp.indexOf('area:') === 0 ? resp.slice(5) : resp;
  };
  P.podeAgir = function (m, u) {
    var p = P.passoAtual(m);
    if (!p || !u || p.responsavel === 'sistema') return false;
    if (u.perfil === 'admin') return true;
    if (p.responsavel === 'esg') return u.perfil === 'esg';
    if (p.responsavel === 'chefe') { var ch = P.chefeDe(m.unidade, m.empresa); return ch ? ch.login === u.login : P.daUnidade(u) && P.temUnidade(u, m.unidade, m.empresa); }
    /* Recolha: atribuida a uma pessoa, so ela; atribuida ao departamento, as pessoas do departamento que trabalham na empresa da task */
    if (p.responsavel === 'unidade') return m.atribuido_a ? m.atribuido_a === u.login : P.daUnidade(u) && P.temUnidade(u, m.unidade, m.empresa) && (!P.userNaEmpresa || P.userNaEmpresa(u, m.empresa));
    if (p.responsavel.indexOf('area:') === 0) return P.daUnidade(u) && P.temUnidade(u, p.responsavel.slice(5));
    return false;
  };
  /* "Waiting on you": o administrador pode agir em tudo, mas so lhe espera o que e mesmo dele */
  P.esperaPor = function (m, u) {
    if (!P.podeAgir(m, u)) return false;
    /* Quem submeteu nao decide sobre o que submeteu: a task nao fica "a espera" dessa pessoa */
    var pa = P.passoAtual(m);
    if (pa && pa.tipo !== 'recolha' && P.violaSegregacao && P.violaSegregacao(m, u)) return false;
    if (u.perfil !== 'admin') return true;
    return P.passoAtual(m).responsavel === 'admin' || (!!m.atribuido_a && m.atribuido_a === u.login);
  };
  /* Responsavel de area: definido em Backoffice, Departments */
  /* Responsavel de area por departamento e empresa: d.chefes[idDaEmpresa]; d.chefe fica como o responsavel por omissao */
  P.chefeDe = function (dep, empresa) {
    var d = (S.deps || []).filter(function (x) { return x.nome === dep; })[0];
    if (!d) return null;
    var x = empresa ? (S.ent || []).filter(function (y) { return y.nome === empresa || y.id === empresa; })[0] : null, lg = (x && d.chefes && d.chefes[x.id]) || d.chefe;
    return lg ? P.user(lg) : null;
  };
  P.eChefe = function (u, dep, empresa) { var ch = P.chefeDe(dep, empresa); return !!u && !!ch && ch.login === u.login; };
  /* Onde uma pessoa e responsavel de area: [{dep, empresa}] */
  P.chefiasDe = function (u) {
    var l = [];
    (S.deps || []).forEach(function (d) { (P.empresasDoDep ? P.empresasDoDep(d) : S.ent).forEach(function (x) { var lg = (d.chefes && d.chefes[x.id]) || d.chefe; if (lg === u.login) l.push({ dep: d.nome, empresa: x.nome }); }); });
    return l;
  };
  /* Passo do responsavel de area: passa sozinho quando foi o proprio a submeter, ou quando todos os indicadores
     ja foram aprovados por ele um a um */
  var bypassArea = function (m, u) {
    var p = P.passoAtual(m);
    if (!p || p.tipo !== 'area' || P.concluida(m)) return false;
    var ch = P.chefeDe(m.unidade, m.empresa), todos = m.indicadores.filter(function (id) { return !P.eOutput(P.cat(id)); }).every(function (id) { var it = P.item(id, P.chave(m)); return it && it.aprovadoArea; });
    var motivo = ch && u && ch.login === u.login ? 'submitted by the area head' : !ch ? 'no area head set for ' + m.unidade : todos ? 'every indicator was already approved by the area head' : '';
    if (!motivo) return false;
    p.concluido_em = agora(); p.concluido_por = (ch ? ch.nome : 'System') + ' (automatic: ' + motivo + ')';
    ev(m, 'Area head approval passed automatically: ' + motivo + '.', ch ? ch.nome : 'System', 'auto', p.nome);
    m.passo_atual++;
    return true;
  };
  /* Quem pode decidir o passo atual sem ser quem submeteu (para dizer a quem a task esta entregue) */
  P.quemDecide = function (m) {
    var r = m.passos.filter(function (p) { return p.tipo === 'recolha'; })[0], sub = r && r.concluido_por;
    return S.users.filter(function (x) { return x.perfil !== 'ext' && P.podeAgir(m, x) && x.nome !== sub; });
  };
  P.podePreencher = function (m, u) { var p = P.passoAtual(m); return !!p && p.tipo === 'recolha' && P.podeAgir(m, u); };
  P.gereTudo = function (u) { return !!u && (u.perfil === 'admin' || u.perfil === 'esg'); };
  P.acompanha = function (m, u) { return !!u && (P.gereTudo(u) || (P.daUnidade(u) && P.temUnidade(u, m.unidade, m.empresa) && (!P.userNaEmpresa || P.userNaEmpresa(u, m.empresa)))); };
  P.podeAlterarWorkflow = function (m, u) { return !P.concluida(m) && P.acompanha(m, u); };
  P.podeReexpressar = function (u) { return P.gereTudo(u); };

  /* --- Workflow (secao 6) ------------------------------------------------ */
  /* wf marca os eventos do workflow (criada, avanco, auto, devolucao) e passo o nome do passo, para o historico */
  var ev = (P.evento = function (m, texto, por, wf, passo) { var x = { texto: texto, em: agora(), por: por }; if (wf) { x.wf = wf; x.passo = passo; } m.eventos.push(x); });
  var correrAutomaticos = function (m) {
    while (!P.concluida(m) && P.passoAtual(m).responsavel === 'sistema') {
      var p = P.passoAtual(m);
      p.concluido_em = agora(); p.concluido_por = 'System';
      if (p.tipo === 'validacao') {
        var n = m.indicadores.filter(function (id) { return P.validarItem(P.item(id, P.chave(m))).alertas.length; }).length;
        ev(m, 'Automatic validation completed: ' + n + ' indicator(s) with alerts.', 'System', 'auto', p.nome);
      } else if (p.tipo === 'publicacao') {
        ev(m, 'Values published to the report tables.', 'System', 'auto', p.nome);
      } else {
        ev(m, 'Automatic step completed: ' + p.nome + '.', 'System', 'auto', p.nome);
      }
      m.passo_atual++;
    }
  };
  P.submeter = function (m, u) {
    if (!P.podePreencher(m, u)) return { erro: 'This task is not with you right now.' };
    var f = P.faltasSubmissao(m);
    if (f.length) return { faltas: f };
    var p = P.passoAtual(m);
    p.concluido_em = agora(); p.concluido_por = u.nome;
    m.devolvida = false;
    ev(m, 'Task submitted.', u.nome, 'avanco', p.nome);
    m.indicadores.forEach(function (id) { var it = P.item(id, P.chave(m)); if (it && !it.submetido && !P.eOutput(P.cat(id))) it.submetido = { em: agora(), por: u.nome }; });
    m.passo_atual++;
    correrAutomaticos(m);
    if (bypassArea(m, u)) correrAutomaticos(m);
    var nc = P.calcularOutputs(P.chave(m), u);
    if (nc) ev(m, nc + ' output indicator(s) calculated from the submitted inputs.', 'System');
    guardar();
    return { ok: true };
  };
  P.concluirPasso = function (m, u, comentario) {
    if (!P.podeAgir(m, u)) return { erro: 'This step is not with you.' };
    var p = P.passoAtual(m);
    if (p.tipo === 'recolha') return P.submeter(m, u);
    if (P.violaSegregacao && P.violaSegregacao(m, u)) return { erro: 'Segregation of duties: you submitted this task, so someone else has to decide on it.' };
    p.concluido_em = agora(); p.concluido_por = u.nome;
    var verbo = p.tipo === 'parecer' ? 'Favourable opinion given' : p.tipo === 'aprovacao' ? 'Values approved and locked' : p.tipo === 'area' ? 'Approved by the area head' : 'Review completed';
    ev(m, verbo + ': ' + p.nome + '.', u.nome, 'avanco', p.nome);
    if (comentario && comentario.trim()) m.comentarios.push({ autor: u.nome, texto: comentario.trim(), em: agora(), passo: p.nome });
    m.passo_atual++;
    correrAutomaticos(m);
    guardar();
    return { ok: true };
  };
  P.devolver = function (m, u, comentario) {
    if (!P.podeAgir(m, u) || P.passoAtual(m).tipo === 'recolha') return { erro: 'This step is not with you.' };
    if (!comentario || !comentario.trim()) return { erro: 'Write a comment to return the task.' };
    var deOnde = P.passoAtual(m).nome;
    m.passos.forEach(function (p) { p.concluido_em = null; p.concluido_por = null; });
    m.passo_atual = 0;
    m.indicadores.forEach(function (id) { var it = P.item(id, P.chave(m)); if (it) { delete it.submetido; delete it.revisto; delete it.aprovadoArea; } });
    m.devolvida = true;
    if (P.diasAte(m.prazo) < 3) m.prazo = diasDe(3);
    m.comentarios.push({ autor: u.nome, texto: comentario.trim(), em: agora(), passo: deOnde });
    ev(m, 'Returned to the unit. Due: ' + P.fmtData(m.prazo) + '.', u.nome, 'devolucao', deOnde);
    guardar();
    return { ok: true };
  };
  /* Regras do editor (6.4). Devolve a mensagem do que falha, ou null. */
  P.validarWorkflow = function (m, passos) {
    if (!passos.length || passos[0].tipo !== 'recolha') return 'The first step is always collection.';
    if (!passos.some(function (p) { return ['area', 'revisao', 'parecer', 'aprovacao'].indexOf(p.tipo) > -1; })) return 'The workflow needs at least one review, opinion or approval step.';
    for (var i = 0; i < passos.length; i++) {
      if (!String(passos[i].nome || '').trim()) return 'All steps need a name.';
      if (passos[i].tipo === 'publicacao' && i < passos.length - 1) return 'Publication must be the last step.';
    }
    if (m) {
      for (var k = 0; k < m.passo_atual && k < m.passos.length; k++) {
        if (!passos[k] || passos[k].id !== m.passos[k].id) return 'Completed steps cannot change.';
      }
      var at = P.passoAtual(m);
      if (at && (!passos[m.passo_atual] || passos[m.passo_atual].id !== at.id || passos[m.passo_atual].tipo !== at.tipo)) return 'The current step can only change its name and owner.';
    }
    return null;
  };
  P.guardarWorkflow = function (m, passos, u) {
    var e = P.validarWorkflow(m, passos);
    if (e) return { erro: e };
    m.passos = passos;
    m.workflow_ajustado = true;
    ev(m, 'Workflow changed: ' + passos.map(function (p) { return p.nome; }).join(' > ') + '.', u.nome);
    guardar();
    return { ok: true };
  };
  P.passoNovo = function (tipo) {
    return { id: 'p_' + Math.random().toString(36).slice(2, 9), nome: 'Parecer de outra área', tipo: tipo || 'parecer', responsavel: 'area:Financeira', concluido_em: null, concluido_por: null };
  };
  P.repostoDoBase = function (m) {
    var fixos = m.passos.slice(0, m.passo_atual + 1);
    var tipoAtual = fixos.length ? fixos[fixos.length - 1].tipo : null;
    var ordem = ['recolha', 'validacao', 'area', 'revisao', 'parecer', 'aprovacao', 'publicacao'];
    var resto = S.wfbase.filter(function (p) { return ordem.indexOf(p.tipo) > ordem.indexOf(tipoAtual); });
    return fixos.concat(passosDe(resto));
  };
  P.guardarWorkflowBase = function (lista, aplicar) {
    var e = P.validarWorkflow(null, lista);
    if (e) return { erro: e };
    S.wfbase = lista.map(function (p) { return { nome: p.nome, tipo: p.tipo, responsavel: p.responsavel }; });
    var n = 0;
    if (aplicar) {
      P.msCiclo().forEach(function (m) {
        var porComecar = m.passo_atual === 0 && !m.workflow_ajustado && !m.devolvida && !m.indicadores.some(function (id) { return P.item(id, P.chave(m)).valor !== null; });
        if (porComecar) { m.passos = passosDe(S.wfbase); n++; ev(m, 'Updated base workflow applied.', 'Backoffice'); }
      });
    }
    guardar();
    return { ok: true, aplicadas: n };
  };

  /* --- Valores ----------------------------------------------------------- */
  P.gravarValor = function (m, id, bruto, u, origem) {
    var it = P.item(id, P.chave(m)), s = String(bruto === null || bruto === undefined ? '' : bruto).trim();
    if (s === '') { if (it.valor !== null || it.rascunho) { it.valor = null; it.rascunho = null; guardar(); } return; }
    var n = lerNumero(s);
    if (n === null) { it.rascunho = s; it.valor = null; guardar(); return; }
    it.rascunho = null;
    /* Uma importacao gera sempre versao (8.4), mesmo com o valor igual */
    if (it.valor !== n || origem) {
      it.valor = n;
      it.versoes.push({ valor: n, em: agora(), por: u.nome, origem: origem || 'manual', motivo: '' });
    }
    guardar();
  };
  P.reexpressar = function (m, id, bruto, motivo, u) {
    if (!P.podeReexpressar(u)) return { erro: 'Only the sustainability team and the administrator can restate.' };
    if (!P.indAprovado(m, id)) return { erro: 'Only approved values can be restated.' };
    var n = lerNumero(bruto), c = P.cat(id), it = P.item(id, P.chave(m));
    if (n === null) return { erro: 'Enter a numeric value.' };
    if (!motivo || !motivo.trim()) return { erro: 'A reason is required to restate.' };
    var v = P.validar(c, n, P.chave(m));
    if (v.erros.length) return { erro: v.erros[0] };
    var ant = it.valor;
    it.valor = n; it.reexpresso = true;
    it.versoes.push({ valor: n, em: agora(), por: u.nome, origem: 'restatement', motivo: motivo.trim() });
    ev(m, 'Value restated in ' + c.nome + ': from ' + P.fmtNum(ant, c.casas_decimais) + ' to ' + P.fmtNum(n, c.casas_decimais) + '. Reason: ' + motivo.trim(), u.nome);
    guardar();
    return { ok: true };
  };
  /* O que vem do Excel: tira o simbolo de percentagem e trata os traços como vazio */
  P.limparColado = function (bruto) {
    var s = String(bruto === null || bruto === undefined ? '' : bruto).replace(/\u00a0/g, ' ').trim();
    if (/^(-|–|—|n\/a|n\.a\.?|na)$/i.test(s)) return '';
    return s.replace(/\s*%$/, '');
  };
  P.lerQualidade = function (bruto) {
    var s = String(bruto || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return { measured: 'medido', medido: 'medido', calculated: 'calculado', calculado: 'calculado', estimated: 'estimado', estimado: 'estimado' }[s] || null;
  };
  /* Ficheiro de uma milestone pela chave: evidencia de um indicador ou documento geral */
  P.acharFicheiro = function (m, k) {
    for (var i = 0; i < m.indicadores.length; i++) {
      var it = P.item(m.indicadores[i], P.chave(m)), l = (it && it.evidencias) || [];
      for (var j = 0; j < l.length; j++) if (P.chaveFich(l[j]) === k) return { lista: l, x: l[j], ind: m.indicadores[i] };
    }
    var d = m.documentos_gerais || [];
    for (var n = 0; n < d.length; n++) if (P.chaveFich(d[n]) === k) return { lista: d, x: d[n], ind: null };
    return null;
  };
  P.removerFicheiro = function (m, k, u) {
    if (!P.podePreencher(m, u)) return { erro: 'Files can only be removed while the task is in collection with you.' };
    var r = P.acharFicheiro(m, k);
    if (!r) return { erro: 'This file is no longer in the task.' };
    r.lista.splice(r.lista.indexOf(r.x), 1);
    if (P.apagarConteudo) P.apagarConteudo(r.x.fid);
    ev(m, (r.ind ? 'Evidence removed from ' + P.cat(r.ind).nome : 'Document removed') + ': ' + r.x.ficheiro + ' (uploaded by ' + (r.x.por || 'unknown') + (r.x.em ? ' on ' + P.fmtDataHora(r.x.em) : '') + ').', u.nome);
    guardar();
    return { ok: true, nome: r.x.ficheiro };
  };
  /* x.sp: a pasta do SharePoint para onde o flow leva o ficheiro (fica fixa desde o upload) */
  P.anexar = function (it, nome, u, fid) { var x = { id: 'ev' + Date.now() + Math.random().toString(36).slice(2, 5), ficheiro: nome, por: u.nome, em: agora() }; if (fid) x.fid = fid; if (P.pastaSP) x.sp = P.pastaSP(it.milestone_id ? P.ms(it.milestone_id) : null, [it.id]); it.evidencias.push(x); guardar(); };

  /* --- Contributos externos (secao 9) ------------------------------------ */
  P.criarPedidoExterno = function (m, indId, entidade, descricao, prazo, u) {
    if (!entidade || !String(descricao || '').trim() || !prazo) return { erro: 'Enter the entity, the description and the due date.' };
    S.ext.push({ id: 'X' + Date.now(), indicador_id: indId, milestone_id: m.id, entidade_externa: entidade, descricao: descricao.trim(), prazo: prazo, estado: 'pendente', valor: null, evidencia: '', respondido_em: null });
    ev(m, 'External request created for ' + entidade + ': ' + P.cat(indId).nome + '.', u.nome);
    guardar();
    return { ok: true };
  };
  P.responderExterno = function (x, bruto, evidencia, u) {
    if (x.entidade_externa !== u.nome) return { erro: 'This request is not for your organisation.' };
    var n = lerNumero(bruto), c = P.cat(x.indicador_id);
    if (n === null) return { erro: 'Enter a numeric value.' };
    var m = P.ms(x.milestone_id), v = P.validar(c, n, P.chave(m));
    if (v.erros.length) return { erro: v.erros[0] };
    x.valor = n; x.evidencia = evidencia || ''; x.estado = 'recebido'; x.respondido_em = agora();
    ev(m, 'Value received from ' + x.entidade_externa + ' for ' + c.nome + '.', x.entidade_externa);
    guardar();
    return { ok: true };
  };
  /* Pedido de ajuda a qualquer pessoa da empresa: fica nos contributos da milestone e a mensagem vai para a conversa */
  P.pedirAjuda = function (m, indId, login, mensagem, prazo, u) {
    var quem = P.user(login), txt = String(mensagem || '').trim();
    if (!quem || quem.perfil === 'ext') return { erro: 'Choose who you are asking for assistance.' };
    if (quem.login === u.login) return { erro: 'Choose someone other than yourself.' };
    if (!txt) return { erro: 'Write a message for ' + quem.nome + '.' };
    if (!prazo) return { erro: 'Enter the due date.' };
    S.ext.push({ id: 'X' + Date.now(), tipo: 'ajuda', para: quem.login, pedido_por: u.nome, indicador_id: indId, milestone_id: m.id, entidade_externa: quem.nome, descricao: txt, prazo: prazo, estado: 'pendente', valor: null, evidencia: '', respondido_em: null });
    m.comentarios.push({ autor: u.nome, texto: '@' + quem.nome + ' ' + txt, em: agora(), passo: P.passoAtual(m) ? P.passoAtual(m).nome : 'Completed', indicador: indId, para: quem.login });
    ev(m, 'Assistance requested from ' + quem.nome + ': ' + P.cat(indId).nome + '.', u.nome);
    guardar();
    return { ok: true, nome: quem.nome };
  };
  P.responderAjuda = function (x, bruto, nota, u) {
    if (x.tipo !== 'ajuda' || x.para !== u.login) return { erro: 'This request is not for you.' };
    if (x.estado !== 'pendente') return { erro: 'This request was already answered.' };
    var n = lerNumero(bruto), c = P.cat(x.indicador_id);
    if (n === null) return { erro: 'Enter a numeric value.' };
    var m = P.ms(x.milestone_id), v = P.validar(c, n, P.chave(m));
    if (v.erros.length) return { erro: v.erros[0] };
    x.valor = n; x.nota = String(nota || '').trim(); x.estado = 'recebido'; x.respondido_em = agora();
    ev(m, u.nome + ' added a value for ' + c.nome + '.', u.nome);
    guardar();
    return { ok: true };
  };
  P.usarExterno = function (x, u) {
    var m = P.ms(x.milestone_id), it = P.item(x.indicador_id, P.chave(m)), ajuda = x.tipo === 'ajuda';
    if (!P.podePreencher(m, u)) return { erro: 'Only during collection, by whoever has it.' };
    it.valor = x.valor; it.rascunho = null; it.qualidade = 'medido'; it.metodo = '';
    it.versoes.push({ valor: x.valor, em: agora(), por: u.nome, origem: (ajuda ? 'assistance: ' : 'external: ') + x.entidade_externa, motivo: '' });
    if (x.evidencia) it.evidencias.push({ id: 'ev' + Date.now(), ficheiro: x.evidencia, por: x.entidade_externa, em: agora() });
    x.estado = 'aplicado';
    ev(m, (ajuda ? 'Value from ' + x.entidade_externa + ' applied to ' : 'External contribution applied to ') + P.cat(x.indicador_id).nome + '.', u.nome);
    guardar();
    return { ok: true };
  };

  /* --- Auditoria (secao 12) ---------------------------------------------- */
  P.aprovados = function (ano) {
    var r = [];
    P.msCiclo(ano).forEach(function (m) { m.indicadores.forEach(function (id) { if (P.indAprovado(m, id)) r.push({ id: id, m: m }); }); });
    return r;
  };
  P.sortearAmostra = function (u) {
    var a = P.aprovados();
    if (a.length < 5) return { erro: 'At least 5 approved indicators are needed. There are ' + a.length + '.' };
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    var sel = a.slice(0, 5);
    S.amostra = sel.map(function (x) { return x.id; });
    sel.forEach(function (x) { ev(x.m, 'Indicator in the auditor sample: ' + P.cat(x.id).nome + '.', u.nome); });
    guardar();
    return { ok: true };
  };
  P.msDoIndicador = function (id, ano) { var l = P.msCiclo(ano).filter(function (m) { return m.indicadores.indexOf(id) > -1; }); return l.filter(function (m) { return !P.trimestral(m); })[0] || l[0] || null; };
  /* Historico do workflow: o que ja aconteceu (incluindo devolucoes), onde esta agora e o que falta, com os tempos entre etapas */
  var WF_RE = [[/^Milestone created/, 'criada'], [/^Milestone submitted/, 'avanco'], [/^(Step completed|Review completed|Favourable opinion given|Values approved and locked): (.+)\.$/, 'avanco'], [/^(Automatic validation completed|Values published|Automatic step completed)/, 'auto'], [/^Returned to the unit/, 'devolucao']];
  P.historicoWf = function (m) {
    var agoraMs = Date.now(), l = [];
    m.eventos.forEach(function (x) {
      var wf = x.wf, passo = x.passo;
      if (!wf) WF_RE.forEach(function (r) { var mt = !wf && r[0].exec(x.texto); if (mt) { wf = r[1]; passo = mt[2] || ''; } });
      if (wf) l.push({ wf: wf, passo: passo || '', por: x.por, em: x.em, texto: x.texto });
    });
    l.sort(function (a, b) { return a.em < b.em ? -1 : a.em > b.em ? 1 : 0; });
    l.forEach(function (x, i) { x.dur = i ? new Date(x.em) - new Date(l[i - 1].em) : null; });
    l.forEach(function (x) { if (x.wf !== 'devolucao') return; var c = (m.comentarios || []).filter(function (y) { return Math.abs(new Date(y.em) - new Date(x.em)) < 5000 || (y.em <= x.em && new Date(x.em) - new Date(y.em) < 86400000 * 2); }).pop(); x.motivo = c ? c.texto : ''; });
    var ult = l.length ? l[l.length - 1] : null, atual = P.passoAtual(m);
    var r = { feito: l, atual: null, futuro: [], prazo: m.prazo, devolucoes: l.filter(function (x) { return x.wf === 'devolucao'; }).length };
    if (atual) {
      r.atual = { passo: atual.nome, tipo: atual.tipo, resp: P.nomeResp(m, atual.responsavel), desde: ult ? ult.em : null, dur: ult ? agoraMs - new Date(ult.em) : null, devolvida: !!m.devolvida };
      r.futuro = m.passos.slice(m.passo_atual + 1).map(function (p) { return { passo: p.nome, resp: P.nomeResp(m, p.responsavel), auto: p.responsavel === 'sistema' }; });
    }
    var etapas = l.filter(function (x) { return (x.wf === 'avanco' || x.wf === 'auto') && x.dur !== null; });
    r.total = l.length ? (atual ? agoraMs : new Date(ult.em)) - new Date(l[0].em) : 0;
    r.maisLonga = etapas.filter(function (x) { return x.wf === 'avanco'; }).sort(function (a, b) { return b.dur - a.dur; })[0] || null;
    return r;
  };
  P.fmtDur = function (ms) {
    if (ms === null || ms === undefined) return '';
    var h = ms / 3600000;
    if (h < 1) return 'under 1 h';
    if (h < 24) return Math.round(h) + ' h';
    var d = Math.round(h / 24);
    return d + (d === 1 ? ' day' : ' days');
  };
  P.msPeriodo = function (pid) { return S.ms.filter(function (m) { return m.periodo === pid; }); };
  P.usarTrimestres = function (m, u, ids) {
    if (!P.podePreencher(m, u)) return { erro: 'This task is read only for you right now.' };
    var n = 0, parciais = 0;
    (ids || m.indicadores).forEach(function (id) {
      var r = P.anualDosTrimestres(m, id);
      if (!r) return;
      P.gravarValor(m, id, String(r.valor).replace('.', ','), u, 'from quarters ' + r.trimestres.join(', '));
      n++; if (r.n < r.total) parciais++;
    });
    if (n) { ev(m, n + ' value(s) calculated from the quarters' + (parciais ? ', ' + parciais + ' still without all four quarters' : '') + '.', u.nome); guardar(); }
    return { n: n, parciais: parciais };
  };
  P.criarPedidoAuditor = function (indId, texto, u) {
    if (!texto || !texto.trim()) return { erro: 'Write the request.' };
    var m = P.msDoIndicador(indId);
    S.aud.push({ id: 'A' + Date.now(), indicador_id: indId, texto: texto.trim(), por: u.nome, em: agora(), estado: 'aberto', resposta: null });
    if (m) { m.comentarios.push({ autor: u.nome, texto: 'Information request on ' + P.cat(indId).nome + ': ' + texto.trim(), em: agora(), sistema: true, passo: P.passoAtual(m) ? P.passoAtual(m).nome : 'Completed', indicador: indId }); ev(m, 'Auditor information request on ' + P.cat(indId).nome + '.', u.nome); }
    guardar();
    return { ok: true };
  };
  P.podeResponderAuditor = function (a, u) {
    if (!u) return false;
    if (P.gereTudo(u)) return true;
    var m = P.msDoIndicador(a.indicador_id);
    return P.daUnidade(u) && !!m && P.temUnidade(u, m.unidade);
  };
  P.responderAuditor = function (a, texto, u) {
    if (!P.podeResponderAuditor(a, u)) return { erro: 'This request is not for your unit.' };
    if (!texto || !texto.trim()) return { erro: 'Write the answer.' };
    a.resposta = { texto: texto.trim(), por: u.nome, em: agora() }; a.estado = 'respondido';
    var m = P.msDoIndicador(a.indicador_id);
    if (m) m.comentarios.push({ autor: u.nome, texto: 'Answer to the auditor: ' + texto.trim(), em: agora(), passo: P.passoAtual(m) ? P.passoAtual(m).nome : 'Completed' });
    guardar();
    return { ok: true };
  };
  P.resolverAuditor = function (a, u) {
    if (u.perfil !== 'auditor' && u.perfil !== 'admin') return { erro: 'Only the auditor can resolve the request.' };
    a.estado = 'resolvido';
    var m = P.msDoIndicador(a.indicador_id);
    if (m) ev(m, 'Auditor request resolved: ' + P.cat(a.indicador_id).nome + '.', u.nome);
    guardar();
    return { ok: true };
  };

  /* --- Importacao (secao 8) ---------------------------------------------- */
  var COLS = ['milestone_id', 'indicator_id', 'indicator_name', 'entity', 'period', 'value', 'unit', 'justification', 'source_system', 'evidence_ref', 'data_quality', 'estimation_method'];
  var OBRIG = ['milestone_id', 'indicator_id', 'period', 'value', 'unit'];
  P.COLS_IMPORT = COLS;
  /* Colunas so de leitura do ficheiro offline: ajudam a preencher e sao ignoradas ao importar */
  var COLS_INFO = ['perimeter', 'period_name', 'deadline', 'prior_value', 'threshold_pct', 'status'];
  var lerCSV = function (texto) {
    var t = texto.replace(/^﻿/, ''), primeira = t.split(/\r?\n/)[0] || '';
    var sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
    var linhas = [], campo = '', linha = [], asp = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (asp) {
        if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
        else if (ch === '"') asp = false;
        else campo += ch;
      } else if (ch === '"') asp = true;
      else if (ch === sep) { linha.push(campo); campo = ''; }
      else if (ch === '\n') { linha.push(campo.replace(/\r$/, '')); linhas.push(linha); linha = []; campo = ''; }
      else campo += ch;
    }
    if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
    linhas = linhas.filter(function (l) { return l.join('').trim() !== ''; });
    if (!linhas.length) return [];
    var cab = linhas[0].map(function (c) { return c.trim(); });
    return linhas.slice(1).map(function (l) { var o = {}; cab.forEach(function (c, k) { o[c] = l[k] === undefined ? '' : l[k]; }); return o; });
  };
  P.lerFicheiro = function (file) {
    var nome = file.name, ext = (nome.split('.').pop() || '').toLowerCase();
    return new Promise(function (ok) {
      if (ext === 'xls') return ok({ nome: nome, erro: 'The old .xls format is not accepted. Save the file as .xlsx and try again.' });
      if (ext !== 'xlsx') return ok({ nome: nome, erro: 'Format not supported. Use an Excel file (.xlsx).' });
      var r = new FileReader();
      r.onerror = function () { ok({ nome: nome, erro: 'The file could not be read.' }); };
      r.onload = function () {
        try {
          if (ext === 'xlsx') {
            if (!window.XLSX) return ok({ nome: nome, erro: 'The Excel library did not load.' });
            var wb = window.XLSX.read(new Uint8Array(r.result), { type: 'array' });
            var folha = wb.Sheets.dados || wb.Sheets.data || wb.Sheets[wb.SheetNames[0]];
            /* O cabecalho e a primeira linha com pelo menos duas celulas: os ficheiros da plataforma tem o titulo e a explicacao por cima */
            var aoa = window.XLSX.utils.sheet_to_json(folha, { header: 1, defval: '' }), h = 0;
            for (var hi = 0; hi < Math.min(15, aoa.length); hi++) { if (aoa[hi].filter(function (x) { return String(x).trim() !== ''; }).length >= 2) { h = hi; break; } }
            var cab = (aoa[h] || []).map(function (x) { return String(x).trim(); });
            var linhas = aoa.slice(h + 1).filter(function (l) { return l.some(function (x) { return String(x).trim() !== ''; }); }).map(function (l) { var o = {}; cab.forEach(function (k, i) { if (k) o[k] = l[i] === undefined ? '' : l[i]; }); return o; });
            return ok({ nome: nome, linhas: linhas });
          }
          if (ext === 'csv') return ok({ nome: nome, linhas: lerCSV(r.result) });
          var j = JSON.parse(r.result);
          var regs = Array.isArray(j) ? j : j && Array.isArray(j.records) ? j.records.map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; if (o.milestone_id === undefined && j.milestone_id) o.milestone_id = j.milestone_id; return o; }) : null;
          if (!regs) return ok({ nome: nome, erro: 'The JSON must be a list of records or an object with "records".' });
          return ok({ nome: nome, linhas: regs });
        } catch (e) { ok({ nome: nome, erro: 'Invalid file: ' + e.message }); }
      };
      if (ext === 'xlsx') r.readAsArrayBuffer(file); else r.readAsText(file, 'utf-8');
    });
  };
  /* Livro inteiro: cada folha como lista de linhas (celulas em bruto), para detetar cabecalhos fora da linha 1.
     Aceita .xlsx, .xls e .csv, porque os ficheiros master chegam em qualquer um. */
  P.lerLivro = function (file) {
    var nome = file.name, ext = (nome.split('.').pop() || '').toLowerCase();
    return new Promise(function (ok) {
      if (['xlsx', 'xls', 'csv'].indexOf(ext) < 0) return ok({ nome: nome, erro: 'Format not supported. Use an Excel file (.xlsx, .xls) or .csv.' });
      if (!window.XLSX) return ok({ nome: nome, erro: 'The Excel library did not load.' });
      var r = new FileReader();
      r.onerror = function () { ok({ nome: nome, erro: 'The file could not be read.' }); };
      r.onload = function () {
        try {
          var wb = ext === 'csv' ? window.XLSX.read(String(r.result).replace(/^﻿/, ''), { type: 'string' }) : window.XLSX.read(new Uint8Array(r.result), { type: 'array' });
          ok({ nome: nome, folhas: wb.SheetNames.map(function (n) { return { nome: n, aoa: window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', blankrows: true }) }; }) });
        } catch (e) { ok({ nome: nome, erro: 'Invalid file: ' + e.message }); }
      };
      if (ext === 'csv') r.readAsText(file, 'utf-8'); else r.readAsArrayBuffer(file);
    });
  };
  /* O periodo pode vir como o ano, o id do periodo (2026-T1) ou o nome (T1 2026) */
  var periodoAceite = function (m, v) { var s = String(v === undefined || v === null ? '' : v).trim().toLowerCase(); return [String(m.ano), String(m.periodo || ''), P.rotPeriodo(m)].some(function (x) { return x && x.toLowerCase() === s; }); };
  P.periodoAceite = periodoAceite;
  /* Varias linhas do mesmo indicador com empresas diferentes: uma por empresa, juntas pela regra do indicador */
  var ENT_TOTAL = ['', 'consolidado', 'consolidated', 'total', 'group', 'grupo'];
  var juntarPorEmpresa = function (m, linhas) {
    var porId = {}, ordem = [];
    linhas.forEach(function (l, i) {
      var id = String(l.indicator_id === undefined ? '' : l.indicator_id).trim();
      if (!porId[id]) { porId[id] = []; ordem.push(id); }
      porId[id].push({ l: l, i: i });
    });
    var saida = [];
    ordem.forEach(function (id) {
      var g = porId[id], ents = g.map(function (x) { return String(x.l.entity || '').trim(); });
      var separada = g.length > 1 && ents.every(function (x) { return ENT_TOTAL.indexOf(x.toLowerCase()) < 0; }) && ents.filter(function (x, k) { return ents.indexOf(x) === k; }).length === ents.length;
      if (!separada) { g.forEach(function (x) { saida.push({ l: x.l, ns: [x.i] }); }); return; }
      var cheias = g.filter(function (x) { return String(x.l.value === undefined || x.l.value === null ? '' : x.l.value).trim() !== ''; });
      var base = {}; Object.keys(g[0].l).forEach(function (k) { base[k] = g[0].l[k]; });
      var agreg = P.regraEnt && P.regraEnt(m.empresa, id).multi ? P.regraEnt(m.empresa, id).agreg : P.agregacao(id);
      var ent = cheias.map(function (x) { return { local: String(x.l.entity).trim(), doc: String(x.l.evidence_ref || '').trim(), valor: String(x.l.value).trim(), peso: agreg === 'media' ? '1' : '' }; });
      var mal = ent.filter(function (x) { return lerNumero(x.valor) === null; });
      base.entity = ents.join(', ');
      base.value = !cheias.length ? '' : mal.length ? mal[0].valor : P.agregar ? P.agregar(ent, agreg) : '';
      base.justification = g.map(function (x) { return String(x.l.justification || '').trim(); }).filter(Boolean).join(' ');
      base.evidence_ref = (cheias.filter(function (x) { return String(x.l.evidence_ref || '').trim(); })[0] || { l: {} }).l.evidence_ref || '';
      saida.push({ l: base, ns: g.map(function (x) { return x.i; }), entradas: cheias.length && !mal.length ? ent : null, agreg: agreg, nEnt: g.length });
    });
    return saida;
  };
  P.validarImportacao = function (m, linhas) {
    var rel = { linhas: [], desconhecidas: [], erroFormato: null, emFalta: [] };
    if (!linhas || !linhas.length) { rel.erroFormato = 'The file has no data rows.'; return rel; }
    var cols = {};
    linhas.forEach(function (l) { Object.keys(l).forEach(function (k) { cols[k] = 1; }); });
    var falta = OBRIG.filter(function (c) { return !cols[c]; });
    if (falta.length) { rel.erroFormato = 'Required columns missing: ' + falta.join(', ') + '.'; return rel; }
    rel.desconhecidas = Object.keys(cols).filter(function (c) { return COLS.indexOf(c) < 0 && COLS_INFO.indexOf(c) < 0; });
    var vistos = {}, juntas = juntarPorEmpresa(m, linhas);
    juntas.forEach(function (jx) {
      var l = jx.l, i = jx.ns[0];
      var id = String(l.indicator_id === undefined ? '' : l.indicator_id).trim();
      var r = { n: i + 2, ns: jx.ns.map(function (k) { return k + 2; }), indicador: id, valor: l.value, estado: 'valida', motivos: [], dados: l, entradas: jx.entradas || null, agreg: jx.agreg, nEnt: jx.nEnt || 0 };
      var sem = l.value === '' || l.value === null || l.value === undefined;
      if (sem && m.indicadores.indexOf(id) > -1 && !vistos[id]) { r.estado = 'vazia'; rel.linhas.push(r); return; }
      var rej = function (t) { r.estado = 'rejeitada'; r.motivos.push(t); };
      /* 2. Milestone e indicadores */
      if (String(l.milestone_id).trim() !== m.id) rej('milestone_id must be ' + m.id + '.');
      if (m.indicadores.indexOf(id) < 0) rej('Indicator ' + (id || '(empty)') + ' does not belong to this task.');
      else if (vistos[id]) rej('Indicator repeated in the file.');
      var c = P.cat(id), n = lerNumero(l.value);
      /* 3. Tipos, ano e unidades */
      if (n === null) rej('value must be numeric.');
      if (!periodoAceite(m, l.period)) rej('period must be ' + P.rotPeriodo(m) + '.');
      if (c && String(l.unit).trim() !== c.unidade_medida) rej('unit must be ' + c.unidade_medida + '.');
      var q = String(l.data_quality || '').trim() || 'measured';
      if (['measured', 'calculated', 'estimated'].indexOf(q) < 0) rej('data_quality must be measured, calculated or estimated.');
      if (r.estado === 'valida' && c) {
        /* 4. Intervalos e 5. regras de negocio */
        var v = P.validar(c, n, P.chave(m));
        v.erros.forEach(rej);
        var it = P.item(id, P.chave(m));
        if (q === 'estimated' && !String(l.estimation_method || '').trim()) rej('estimation_method is required when data_quality is estimated.');
        if (c.evidencia_obrigatoria && !String(l.evidence_ref || '').trim() && !it.evidencias.length) rej('evidence_ref is required for this indicator.');
        if (r.estado === 'valida' && v.alertas.length) {
          r.estado = 'alerta';
          r.motivos = v.alertas.slice();
          if (!String(l.justification || '').trim()) r.motivos.push('justification missing: fill it in before submitting.');
        }
        /* O ficheiro offline vem com os valores ja gravados: o que nao mudou nao gera versao nova */
        var mesmasEnt = !r.entradas || JSON.stringify((it.entradas || []).map(function (x) { return [x.local, lerNumero(x.valor)]; })) === JSON.stringify(r.entradas.map(function (x) { return [x.local, lerNumero(x.valor)]; }));
        if ((r.estado === 'valida' || r.estado === 'alerta') && it.valor === Number(n.toFixed(c.casas_decimais)) && mesmasEnt && !String(l.justification || '').trim() && !String(l.evidence_ref || '').trim()) r.estado = 'igual';
      }
      if (id) vistos[id] = 1;
      rel.linhas.push(r);
    });
    rel.emFalta = m.indicadores.filter(function (id) { return !rel.linhas.some(function (r) { return r.indicador === id && (r.estado === 'valida' || r.estado === 'alerta' || r.estado === 'igual'); }); });
    return rel;
  };
  P.aplicarImportacao = function (m, rel, ficheiro, u) {
    var QUAL = { measured: 'medido', calculated: 'calculado', estimated: 'estimado' }, n = 0;
    rel.linhas.forEach(function (r) {
      if (r.estado !== 'valida' && r.estado !== 'alerta') return;
      var l = r.dados, it = P.item(r.indicador, P.chave(m));
      if (it.submetido) return;
      if (r.entradas && P.gravarEntradas) {
        var nv = it.versoes.length;
        P.gravarEntradas(m, r.indicador, r.entradas, r.agreg, u);
        if (it.versoes.length > nv) it.versoes[it.versoes.length - 1].origem = 'file import ' + ficheiro + ': ' + r.entradas.length + ' companies';
      } else { it.entradas = []; P.gravarValor(m, r.indicador, l.value, u, 'file import ' + ficheiro); }
      it.qualidade = QUAL[String(l.data_quality || '').trim() || 'measured'];
      it.metodo = String(l.estimation_method || '').trim();
      if (String(l.justification || '').trim()) it.justificacao = String(l.justification).trim();
      if (String(l.source_system || '').trim()) it.fonte = String(l.source_system).trim();
      if (String(l.entity || '').trim()) it.entidade = String(l.entity).trim();
      if (String(l.evidence_ref || '').trim() && !it.evidencias.some(function (e) { return e.ficheiro === String(l.evidence_ref).trim(); })) it.evidencias.push({ id: 'ev' + Date.now() + r.n, ficheiro: String(l.evidence_ref).trim(), por: u.nome, em: agora() });
      n++;
    });
    ev(m, 'Import of ' + ficheiro + ': ' + n + ' row(s) applied.', u.nome);
    guardar();
    return n;
  };
  var linhasTemplate = function (m) {
    return m.indicadores.map(function (id) {
      var c = P.cat(id);
      return { milestone_id: m.id, indicator_id: id, indicator_name: c.nome, entity: 'Consolidado', period: String(m.ano), value: '', unit: c.unidade_medida, justification: '', source_system: '', evidence_ref: '', data_quality: 'measured', estimation_method: '' };
    });
  };
  P.exemploImportacao = function (m) {
    var l = linhasTemplate(m);
    l.forEach(function (x) { var c = P.cat(x.indicator_id); x.value = valorDemo(c); if (c.evidencia_obrigatoria) x.evidence_ref = 'DOC-' + m.ano + '-0001'; x.justification = c.regras_coerencia.length ? 'Confirmed with the area.' : ''; });
    if (l[0]) l[0].unit = 'unidade-errada';
    if (l[1]) l[1].period = String(m.ano - 1);
    l.push({ milestone_id: m.id, indicator_id: m.indicadores.indexOf('G01') > -1 ? 'A01' : 'G01', indicator_name: 'Indicator from another task', entity: 'Consolidado', period: String(m.ano), value: 10, unit: '€', justification: '', source_system: 'financial-system', evidence_ref: '', data_quality: 'measured', estimation_method: '' });
    if (l[2]) { l[2].data_quality = 'estimated'; l[2].estimation_method = ''; }
    return l;
  };
  P.descarregar = function (nome, conteudo, tipo) {
    var url = URL.createObjectURL(new Blob([conteudo], { type: tipo || 'text/plain;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };
  var COLUNAS_EN = {
    dados: 'data', instrucoes: 'instructions', rastreabilidade: 'traceability', historico_valores: 'value_history', pedidos_auditor: 'auditor_requests', workflow: 'workflow', materialidade: 'materiality',
    Desempenho: 'Performance', Ambientais: 'Environmental', Sociais: 'Social', indicador: 'indicator', indicador_id: 'indicator_id', nome: 'name', unidade: 'unit', ano_anterior: 'prior_year', limiar_pct: 'threshold_pct', evidencia_obrigatoria: 'required_evidence', regra: 'rule',
    valor: 'value', unidade_medida: 'unit_of_measure', qualidade: 'quality', metodo: 'method', milestone: 'milestone', submetido_por: 'submitted_by', submetido_em: 'submitted_at', aprovado_por: 'approved_by', aprovado_em: 'approved_at', evidencias: 'evidence', reexpresso: 'restated', na_amostra: 'in_sample', estado: 'status',
    em: 'at', por: 'by', origem: 'source', motivo: 'reason', pedido: 'request', resposta: 'answer', respondido_por: 'answered_by', ordem: 'order', passo: 'step', tipo: 'type', responsavel: 'owner', concluido_por: 'completed_by', concluido_em: 'completed_at', norma: 'standard', tema: 'topic', avaliacao: 'assessment', justificacao: 'justification', perimetro: 'perimeter'
  };
  var escreverLivro = function (nome, folhas) {
    var wb = window.XLSX.utils.book_new();
    var txt = function (k) { return COLUNAS_EN[k] || k; };
    Object.keys(folhas).forEach(function (n) {
      var linhas = Array.isArray(folhas[n]) ? folhas[n].map(function (l) { var o = {}; Object.keys(l).forEach(function (k) { o[txt(k)] = l[k]; }); return o; }) : [];
      var ws = linhas.length ? window.XLSX.utils.json_to_sheet(linhas) : window.XLSX.utils.aoa_to_sheet([['No data']]);
      window.XLSX.utils.book_append_sheet(wb, ws, txt(n).slice(0, 31));
    });
    P.formatarNumerosXLSX(wb);
    window.XLSX.writeFile(wb, nome);
    return wb;
  };
  P.folhasTemplate = function (m) {
    return {
      dados: linhasTemplate(m),
      instrucoes: m.indicadores.map(function (id) {
        var c = P.cat(id), ant = P.valorAnterior(id, P.chave(m));
        return { indicador: id, nome: c.nome, unidade: c.unidade_medida, ano_anterior: ant === null || ant === undefined ? '' : ant, limiar_pct: P.limiarDe(c), evidencia_obrigatoria: c.evidencia_obrigatoria ? 'Yes' : 'No', regra: 'period = ' + m.ano + '; unit as stated; numeric value; justification required when there is an alert; estimation_method required when data_quality is estimated.' };
      })
    };
  };
  /* Ficheiro offline dos KPIs de uma pessoa: o formato do import, ja com o que esta gravado.
     porEmpresa: uma linha por empresa do perimetro do grupo, para quem reporta o grupo inteiro empresa a empresa. */
  P.empresasGrupo = function () { return S.ent.filter(function (x) { return x.perimetro_grupo; }); };
  P.folhasOffline = function (lista, porEmpresa) {
    var dados = [], instr = [], fmt = function (v) { return v === null || v === undefined ? '' : v; };
    lista.forEach(function (m) {
      m.indicadores.forEach(function (id) {
        var c = P.cat(id), it = P.item(id, P.chave(m)), ant = P.valorAnterior(id, P.chave(m));
        var base = { milestone_id: m.id, indicator_id: id, indicator_name: c.nome, perimeter: m.empresa, period: P.rotPeriodo(m), deadline: m.prazo, entity: m.empresa, value: fmt(it.valor), unit: c.unidade_medida, prior_value: fmt(ant), threshold_pct: P.limiarDe(c), justification: it.justificacao || '', data_quality: ({ medido: 'measured', calculado: 'calculated', estimado: 'estimated' })[it.qualidade] || 'measured', estimation_method: it.metodo || '', evidence_ref: '', source_system: it.fonte || '' };
        if (!porEmpresa) { dados.push(base); return; }
        var ents = it.entradas || [];
        /* As empresas sao as que o indicador abrange (Backoffice, Indicators); por omissao, o perimetro do grupo */
        P.empresasLinhas(c).forEach(function (x) {
          var l = {}; Object.keys(base).forEach(function (k) { l[k] = base[k]; });
          var e0 = ents.filter(function (y) { return y.local === x.nome; })[0];
          l.entity = x.nome; l.value = e0 ? e0.valor : ''; l.justification = ''; l.prior_value = '';
          dados.push(l);
        });
      });
      instr.push({ milestone_id: m.id, milestone: m.nome, perimeter: m.empresa, period: P.rotPeriodo(m), deadline: m.prazo, indicators: m.indicadores.length });
    });
    var ajuda = [
      { step: 1, what: 'Fill in the value column. Leave a row empty if you have no value yet.' },
      { step: 2, what: 'Do not change milestone_id, indicator_id, period or unit. They tell the platform where each value goes.' },
      { step: 3, what: 'If the change against prior_value is above threshold_pct, write a justification.' },
      { step: 4, what: porEmpresa ? 'Each indicator has one row per company. The platform adds them up (or takes the latest value or the average, as the indicator says) and keeps the value of each company.' : 'For estimated values, set data_quality to estimated and describe the estimation_method.' },
      { step: 5, what: 'Upload the file in Home, Tasks, Excel (offline). Rows that did not change are skipped.' }
    ];
    return { dados: dados, milestones: instr, instructions: ajuda };
  };
  /* Template com o layout da plataforma: so value, justification, source, evidence, quality e method ficam editaveis */
  var EDITA_TPL = { entity: 1, value: 1, justification: 1, source_system: 1, evidence_ref: 1, data_quality: 1, estimation_method: 1 };
  var LARG_TPL = { indicator_name: 260, justification: 220, estimation_method: 180, regra: 300, nome: 260 };
  P.templateExcel = function (m) {
    var f = P.folhasTemplate(m), txt = function (k) { return COLUNAS_EN[k] || k; };
    if (!P.livroExcel) return escreverLivro('template-' + m.id + '-' + m.ano + '.xlsx', f);
    var folha = function (nome, titulo, lista, edita) {
      var ks = lista.length ? Object.keys(lista[0]) : ['info'];
      return { nome: nome, titulo: titulo, sub: m.nome + ', ' + P.rotPeriodo(m) + '.', cols: ks.map(function (k) { return { t: txt(k), larg: LARG_TPL[k] || (k.length > 12 ? 130 : 100), edita: edita && !!EDITA_TPL[k], dir: k === 'value' || k === 'ano_anterior', lista: k === 'data_quality' ? ['measured', 'calculated', 'estimated'] : null }; }), linhas: lista.map(function (l) { return ks.map(function (k) { return l[k]; }); }) };
    };
    return P.livroExcel('template-' + m.id + '-' + m.ano + '.xlsx', [folha('data', 'Data template', f.dados, true), folha('instructions', 'Instructions', f.instrucoes, false)]);
  };
  P.paraCSV = function (linhas) {
    var esc = function (v) { var s = String(v === null || v === undefined ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var cols = COLS;
    return '﻿' + [cols.join(';')].concat(linhas.map(function (l) { return cols.map(function (c) { return esc(l[c]); }).join(';'); })).join('\r\n');
  };
  P.templateCSV = function (m) { P.descarregar('template-' + m.id + '-' + m.ano + '.csv', P.paraCSV(linhasTemplate(m)), 'text/csv;charset=utf-8'); };
  P.jsonSchema = function (m) {
    var uni = m.indicadores.map(function (id) { return { const: id, title: P.cat(id).nome }; });
    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Task submission ' + m.id, type: 'object', required: ['milestone_id', 'records'],
      properties: {
        milestone_id: { const: m.id }, submitted_by: { type: 'string' }, source_system: { type: 'string' },
        records: { type: 'array', minItems: 1, items: { type: 'object', required: ['indicator_id', 'period', 'value', 'unit'], properties: {
          indicator_id: { oneOf: uni }, indicator_name: { type: 'string' }, entity: { type: 'string', default: 'Consolidado' }, period: { const: String(m.ano) }, value: { type: 'number' },
          unit: { type: 'string', description: 'Must match the indicator unit.' }, justification: { type: 'string' }, source_system: { type: 'string' }, evidence_ref: { type: 'string' },
          data_quality: { enum: ['measured', 'calculated', 'estimated'], default: 'measured' }, estimation_method: { type: 'string' }
        } } }
      }
    };
  };

  /* --- Exportacoes (secao 18) -------------------------------------------- */
  var submissao = function (m) { var p = m.passos.filter(function (x) { return x.tipo === 'recolha'; })[0]; return p || {}; };
  var aprovacao = function (m) { var a = m.passos.filter(function (x) { return x.tipo === 'aprovacao'; }); return a[a.length - 1] || {}; };
  var QUALIDADE_TXT = { medido: 'Measured', calculado: 'Calculated', estimado: 'Estimated' };
  P.QUALIDADE_TXT = QUALIDADE_TXT;
  P.rastreabilidade = function (mFiltro) {
    var r = [];
    P.msCiclo().forEach(function (m) {
      if (mFiltro && m.id !== mFiltro.id) return;
      m.indicadores.forEach(function (id) {
        var c = P.cat(id), it = P.item(id, P.chave(m)), s = submissao(m), a = aprovacao(m);
        r.push({ indicador_id: id, indicador: c.nome, valor: it.valor, unidade_medida: c.unidade_medida, qualidade: QUALIDADE_TXT[it.qualidade], metodo: it.metodo, esrs: c.esrs_requisito, esrs_id: P.esrsDe ? P.esrsDe(id).dps.join(', ') : '', gri: c.gri, unidade: m.unidade, milestone: m.nome,
          submetido_por: s.concluido_por || '', submetido_em: s.concluido_em ? P.fmtDataHora(s.concluido_em) : '', aprovado_por: a.concluido_por || '', aprovado_em: a.concluido_em ? P.fmtDataHora(a.concluido_em) : '',
          evidencias: it.evidencias.map(function (e) { return e.ficheiro; }).join(', '), reexpresso: it.reexpresso ? 'Yes' : 'No', na_amostra: S.amostra.indexOf(id) > -1 ? 'Yes' : 'No', estado: P.estadoIndicador(m, id).txt });
      });
    });
    return r;
  };
  P.folhasDataRoom = function () {
    var hist = [], wf = [];
    P.msCiclo().forEach(function (m) {
      m.indicadores.forEach(function (id) { P.item(id, P.chave(m)).versoes.forEach(function (v) { hist.push({ indicador_id: id, indicador: P.cat(id).nome, valor: v.valor, em: P.fmtDataHora(v.em), por: v.por, origem: v.origem, motivo: v.motivo || '' }); }); });
      m.passos.forEach(function (p, i) { wf.push({ milestone_id: m.id, milestone: m.nome, ordem: i + 1, passo: p.nome, tipo: P.TIPOS_PASSO[p.tipo], responsavel: P.nomeResp(m, p.responsavel), concluido_por: p.concluido_por || '', concluido_em: p.concluido_em ? P.fmtDataHora(p.concluido_em) : '' }); });
    });
    return {
      rastreabilidade: P.rastreabilidade(), historico_valores: hist,
      pedidos_auditor: S.aud.map(function (a) { return { indicador_id: a.indicador_id, indicador: P.cat(a.indicador_id).nome, pedido: a.texto, por: a.por, em: P.fmtDataHora(a.em), estado: a.estado, resposta: a.resposta ? a.resposta.texto : '', respondido_por: a.resposta ? a.resposta.por : '' }; }),
      workflow: wf, materialidade: S.mat.map(function (x) { return { norma: x.norma, tema: x.tema, avaliacao: x.avaliacao, justificacao: x.justificacao }; })
    };
  };
  /* Data room com o layout da plataforma: indice, uma folha por tema, tudo so de leitura */
  P.exportarDataRoom = function () {
    if (!P.livroObjetos) return escreverLivro('data-room-' + S.ciclo.ano + '.xlsx', P.folhasDataRoom());
    return P.livroObjetos('data-room-' + S.ciclo.ano + '.xlsx', P.folhasDataRoom(), { titulo: 'Data room ' + S.ciclo.ano, traduz: function (k) { return COLUNAS_EN[k] || k; }, descricoes: {
      rastreabilidade: 'Each indicator with its ESRS and GRI references, value, who submitted and approved it, and the evidence.',
      historico_valores: 'Every version of every value: when, who, where it came from and why it changed.',
      pedidos_auditor: 'Information requests from the auditors and the answers.',
      workflow: 'The workflow steps of each task, who owns them and when they were completed.',
      materialidade: 'Double materiality assessment by ESRS standard.' } });
  };
  P.quadrosRelatorio = function () {
    var ano = S.ciclo.ano, folhas = {};
    P.QUADROS.forEach(function (q) {
      folhas[q] = S.cat.filter(function (c) { return c.quadro === q; }).map(function (c) {
        var m = P.msDoIndicador(c.id, ano), it = P.item(c.id, ano), apr = m && P.indAprovado(m, c.id);
        /* Segue a vista do Report: consolidado, com uma coluna por empresa, ou uma empresa so */
        var emp = P.ext && P.ext.U && P.ext.U.rep ? P.ext.U.rep.emp : '', r = P.valorVista ? P.valorVista(c.id, ano, emp) : { valor: it && it.valor, partes: {} };
        var o = { indicador: c.nome, unidade: c.unidade_medida, perimetro: emp || 'Consolidated' };
        if (!emp) S.ent.forEach(function (x) { o[x.nome] = apr && r.partes[x.nome] !== undefined ? r.partes[x.nome] : ''; });
        o[String(ano)] = apr && r.valor !== null ? r.valor : ''; o[String(ano - 1)] = P.anteriorVista ? P.anteriorVista(c.id, ano, emp) : P.valorAnterior(c.id, ano);
        o.estado = m ? P.estadoIndicador(m, c.id).txt : 'To collect'; o.qualidade = apr ? QUALIDADE_TXT[it.qualidade] : ''; o.esrs = c.esrs_requisito; o.esrs_id = P.esrsDe ? P.esrsDe(c.id).dps.join(', ') : ''; o.gri = c.gri;
        return o;
      });
    });
    return folhas;
  };
  P.exportarRelatorio = function () { var v = P.nomeVistaReporte ? P.nomeVistaReporte() : 'Consolidated'; return escreverLivro('report-' + S.ciclo.ano + '-' + String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.xlsx', P.quadrosRelatorio()); };
  P.valoresAprovados = function () {
    var o = [];
    Object.keys(S.items).forEach(function (k) {
      var it = S.items[k], m = P.ms(it.milestone_id);
      if (m && P.indAprovado(m, it.id)) o.push({ indicador_id: it.id, ano: it.ano, valor: it.valor, unidade: P.cat(it.id).unidade_medida, qualidade: it.qualidade, reexpresso: it.reexpresso, milestone_id: m.id });
    });
    return o;
  };

  /* --- Novo ciclo (secoes 5.1 e 17) -------------------------------------- */
  P.abrirCiclo = function (u) {
    if (!P.gereTudo(u)) return { erro: 'No permission.' };
    var antigo = S.ciclo.ano, ano = antigo + 1, sufixo = '_' + ano;
    var offset = { Mensal: 30, Trimestral: 60, Anual: 90, 'Novos dados ESRS': 120 };
    P.msCiclo(antigo).forEach(function (a) {
      var id = a.id.split('_')[0] + sufixo;
      var m = { id: id, nome: a.nome.split(String(antigo)).join(String(ano)), ano: ano, periodo: (a.periodo || antigo + '-A').replace(String(antigo), String(ano)), consolida: !!a.consolida, empresa: a.empresa, departamentos: a.departamentos.slice(), atribuido_a: a.atribuido_a || null, ficheiros_pedidos: (a.ficheiros_pedidos || []).slice(), unidade: a.unidade, periodicidade: a.periodicidade, prazo: diasDe(offset[a.periodicidade] || 90), indicadores: a.indicadores.slice(), passos: passosDe(S.wfbase), passo_atual: 0, devolvida: false, workflow_ajustado: false, documentos_gerais: [], comentarios: [], eventos: [] };
      ev(m, 'Task created in the ' + ano + ' cycle.', u.nome);
      S.ms.push(m);
      m.indicadores.forEach(function (i) { S.items[P.chave(m) + ':' + i] = novoItem(i, P.chave(m), id, P.cat(i).tipo); });
    });
    if (!P.periodo(ano + '-A')) { S.periodos = (S.periodos || []).concat(periodosAno(ano)); S.relatorios = (S.relatorios || []).concat(relatoriosAno(ano)); }
    S.ciclo.fechados = (S.ciclo.fechados || []).concat([antigo]);
    S.ciclo.ano = ano; S.ciclo.data_abertura = hojeISO(); S.amostra = [];
    guardar();
    return { ok: true, ano: ano, criadas: P.msCiclo(ano).length };
  };

  /* --- Empresas e departamentos --------------------------------------------- */
  var erroNome = function (nome, lista, proprio) {
    if (!nome) return 'Enter a name.';
    return lista.some(function (x) { return x !== proprio && x.nome === nome; }) ? 'That name already exists.' : null;
  };
  P.criarEmpresa = function (nome) {
    var e = erroNome(nome, S.ent); if (e) return { erro: e };
    S.ent.push({ id: 'ent' + Date.now(), nome: nome, perimetro_grupo: true, perimetro_maioritario: false, pais: 'Portugal', detencao: 100, metodo: 'integral', instalacoes: 0, nace: '', nipc: '', moeda: 'EUR' });
    guardar(); return { ok: true };
  };
  P.renomearEmpresa = function (x, nome) {
    var e = erroNome(nome, S.ent, x); if (e) return { erro: e };
    var antigo = x.nome;
    x.nome = nome;
    S.ms.forEach(function (m) { if (m.empresa === antigo) m.empresa = nome; });
    S.docs.forEach(function (d) { if (d.entidade === antigo) d.entidade = nome; });
    guardar(); return { ok: true };
  };
  P.apagarEmpresa = function (x) {
    var usos = S.ms.filter(function (m) { return m.empresa === x.nome; }).length + S.docs.filter(function (d) { return d.entidade === x.nome; }).length;
    if (usos) return { erro: 'This company is in use by ' + usos + ' tasks or invoices.' };
    S.ent.splice(S.ent.indexOf(x), 1);
    guardar(); return { ok: true };
  };
  /* Onde se usa um departamento: pessoas (tags), indicadores (quem reporta) e milestones (dono, tags ou passo do workflow) */
  P.usosDepartamentoDet = function (nome) {
    return { pessoas: S.users.filter(function (u) { return P.temUnidade(u, nome); }).length, indicadores: S.cat.filter(function (c) { return c.unidade_negocio === nome || c.unidade_reporte === nome; }).length,
      milestones: S.ms.filter(function (m) { return m.unidade === nome || m.departamentos.indexOf(nome) > -1 || m.passos.some(function (p) { return p.responsavel === 'area:' + nome; }); }).length };
  };
  var usosDepartamento = function (nome) { var d = P.usosDepartamentoDet(nome); return d.pessoas + d.indicadores + d.milestones; };
  P.usosDepartamento = usosDepartamento;
  /* Departamentos de cada empresa: d.empresas tem os ids; vazio quer dizer todas as empresas */
  P.empresasDoDep = function (d) { return d && d.empresas && d.empresas.length ? S.ent.filter(function (x) { return d.empresas.indexOf(x.id) > -1; }) : S.ent.slice(); };
  /* Empresas de uma pessoa: cada empresa tem as suas pessoas. Sem nenhuma marcada, a pessoa trabalha em todas. */
  P.empresasUser = function (x) { return x && x.empresas && x.empresas.length ? S.ent.filter(function (y) { return x.empresas.indexOf(y.id) > -1; }) : S.ent.slice(); };
  P.userNaEmpresa = function (x, empresa) { if (!empresa) return true; return P.empresasUser(x).some(function (y) { return y.nome === empresa || y.id === empresa; }); };
  P.depsDaEmpresa = function (empresa) {
    var x = !empresa ? null : typeof empresa === 'string' ? S.ent.filter(function (y) { return y.nome === empresa || y.id === empresa; })[0] : empresa;
    return S.deps.filter(function (d) { return !x || !d.empresas || !d.empresas.length || d.empresas.indexOf(x.id) > -1; }).map(function (d) { return d.nome; });
  };
  P.criarDepartamento = function (nome, empresas) {
    var e = erroNome(nome, S.deps); if (e) return { erro: e };
    S.deps.push({ id: 'dep' + Date.now(), nome: nome, empresas: (empresas || []).slice() });
    guardar(); return { ok: true };
  };
  P.renomearDepartamento = function (x, nome) {
    var e = erroNome(nome, S.deps, x); if (e) return { erro: e };
    var antigo = x.nome;
    x.nome = nome;
    S.users.forEach(function (u) { if (P.temUnidade(u, antigo)) P.definirUnidades(u, P.unidadesDe(u).map(function (d) { return d === antigo ? nome : d; })); });
    S.cat.forEach(function (c) { if (c.unidade_negocio === antigo) c.unidade_negocio = nome; if (c.unidade_reporte === antigo) c.unidade_reporte = nome; });
    S.ms.forEach(function (m) {
      if (m.unidade === antigo) m.unidade = nome;
      m.departamentos = m.departamentos.map(function (d) { return d === antigo ? nome : d; });
      m.passos.forEach(function (p) { if (p.responsavel === 'area:' + antigo) p.responsavel = 'area:' + nome; });
    });
    guardar(); return { ok: true };
  };
  P.apagarDepartamento = function (x) {
    var usos = usosDepartamento(x.nome);
    if (usos) return { erro: 'This department is in use by ' + usos + ' users, indicators or tasks.' };
    S.deps.splice(S.deps.indexOf(x), 1);
    guardar(); return { ok: true };
  };

  /* --- Notificacoes (secao 14.13) ---------------------------------------- */
  P.notificacoes = function (u) {
    var n = [];
    if (!u) return n;
    var add = function (cls, texto, sub, rota) { n.push({ cls: cls, texto: texto, sub: sub, rota: rota }); };
    if (u.perfil === 'ext') {
      S.ext.filter(function (x) { return x.entidade_externa === u.nome && x.estado === 'pendente'; }).forEach(function (x) { add('warn', 'Data request: ' + P.cat(x.indicador_id).nome, 'Due ' + P.fmtData(x.prazo), 'Pedidos'); });
      return n;
    }
    P.msCiclo().forEach(function (m) {
      var est = P.estadoMs(m), r = 'Milestone/' + m.id;
      var minha = P.daUnidade(u) && P.temUnidade(u, m.unidade);
      if (minha || P.gereTudo(u)) {
        if (est.cod === 'devolvida') add('err', m.nome + ' was returned', 'Correct and resubmit', r);
        if (est.cod === 'atraso') add('err', m.nome + ' is overdue', 'Due ' + P.fmtData(m.prazo), r);
        if (est.cod === 'recolha' && P.diasAte(m.prazo) <= 5) add('warn', m.nome + ' due soon', 'Due ' + P.fmtData(m.prazo), r);
        if (minha && m.lembrado_em && (est.cod === 'recolha' || est.cod === 'atraso' || est.cod === 'devolvida') && (Date.now() - new Date(m.lembrado_em).getTime()) < 7 * 86400000) add('warn', 'Reminder: ' + m.nome, 'The sustainability team asked for this, due ' + P.fmtData(m.prazo), r);
      }
      if (P.esperaPor(m, u) && ['revisao', 'parecer', 'aprovacao'].indexOf(est.cod) > -1) add('info', m.nome + ' awaiting decision', P.passoAtual(m).nome, r);
    });
    S.ext.filter(function (x) { return x.tipo === 'ajuda' && x.para === u.login && x.estado === 'pendente'; }).forEach(function (x) {
      add('warn', 'Assistance requested by ' + x.pedido_por + ': ' + P.cat(x.indicador_id).nome, x.descricao.length > 90 ? x.descricao.slice(0, 87) + '...' : x.descricao, 'Milestone/' + x.milestone_id + '?sep=externos');
    });
    S.aud.forEach(function (a) {
      var m = P.msDoIndicador(a.indicador_id), r = m ? 'Milestone/' + m.id + '?sep=auditoria' : 'Auditoria';
      if (a.estado === 'aberto' && P.podeResponderAuditor(a, u)) add('warn', 'Auditor request: ' + P.cat(a.indicador_id).nome, 'Open', r);
      if (a.estado === 'respondido' && u.perfil === 'auditor') add('ok', 'Request answered: ' + P.cat(a.indicador_id).nome, 'You can resolve it', r);
    });
    S.ext.filter(function (x) { return x.estado === 'recebido'; }).forEach(function (x) {
      var m = P.ms(x.milestone_id);
      if (m && P.acompanha(m, u)) add('ok', 'Value received from ' + x.entidade_externa, P.cat(x.indicador_id).nome, 'Milestone/' + m.id + '?sep=externos');
    });
    return n;
  };

  /* --- Marca (secao 14.14, separador 9) ---------------------------------- */
  var HEX = /^#[0-9a-fA-F]{6}$/;
  P.urlLogoValida = function (url) {
    if (!url) return true;
    try { var u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:'; } catch (e) { return false; }
  };
  P.aplicarMarca = function (marca) {
    var mc = marca || S.marca, raiz = document.documentElement;
    ['primary', 'secondary', 'accent', 'bg', 'text'].forEach(function (k) { if (HEX.test(mc.cores[k])) raiz.style.setProperty('--' + k, mc.cores[k]); });
    document.title = mc.nome || P.MARCA_BASE.nome;
    var f = window.PortalAoMudarMarca;
    if (f) f(mc);
  };
  P.validarMarca = function (o) {
    if (!o || typeof o !== 'object' || !o.cores) return 'The file does not have the brand colours.';
    var cores = ['primary', 'secondary', 'accent', 'bg', 'text'];
    for (var i = 0; i < cores.length; i++) if (!HEX.test(o.cores[cores[i]] || '')) return 'Colour ' + cores[i] + ' is not valid.';
    if (!P.urlLogoValida(o.logotipo)) return 'The logo link must start with http:// or https://.';
    return null;
  };
  P.contraste = function (a, b) {
    var lum = function (h) {
      var c = [1, 3, 5].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  P.guardarMarca = function (m) { var e = P.validarMarca(m); if (e) return { erro: e }; S.marca = m; guardar(); P.aplicarMarca(); return { ok: true }; };
})();
