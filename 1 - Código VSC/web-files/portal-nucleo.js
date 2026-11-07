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
  P.fmtNum = function (v, casas) {
    if (v === null || v === undefined || v === '') return '-';
    var c = casas === undefined ? (String(v).split('.')[1] || '').length : casas;
    var neg = v < 0;
    var partes = Math.abs(Number(v)).toFixed(c).split('.');
    var int = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '-' : '') + int + (partes[1] ? ',' + partes[1] : '');
  };
  P.fmtData = function (iso) {
    if (!iso) return '-';
    var d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Lisbon' }).format(d);
  };
  P.fmtDataAno = function (iso) {
    if (!iso) return '-';
    var d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Lisbon' }).format(d);
  };
  P.fmtDataHora = function (iso) {
    if (!iso) return '-';
    return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }).format(new Date(iso));
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
    kpim: 'esg_kpi_master', puxados: 'esg_source_pulls', periodos: 'esg_periods', relatorios: 'esg_reports', dpdec: 'esg_dp_decisions', gloss: 'esg_glossary', rq: 'esg_report_tables', doc: 'esg_report_doc'
  };
  var VERSAO_DADOS = 6;
  var S = (P.S = {});
  var memoria = {};
  var ler = function (k) {
    try { var v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); }
    catch (e) { return memoria[k] === undefined ? null : memoria[k]; }
  };
  var escrever = function (k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { memoria[k] = v; }
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
    S.ms = []; S.items = {}; S.wfbase = []; S.ext = []; S.aud = []; S.mat = []; S.docs = []; S.ent = []; S.deps = []; S.janelas = []; S.periodos = []; S.relatorios = []; S.amostra = []; S.users = []; S.areas = []; S.cat = []; S.metas = []; S.atrib = {}; S.regrasEnt = {}; S.fatores = []; S.apis = []; S.evg = []; S.selos = [];
    S.marca = S.marca || clone(P.MARCA_BASE);
  };
  P.estadoVazio = estadoVazio;

  /* --- Dados iniciais ---------------------------------------------------- */
  P.TEMAS = { 'Água e saneamento': '#0091DA', 'Energia e clima': '#EAAA00', 'Pessoas': '#C6007E', 'Governance': '#483698', 'Comunidade e cliente': '#00A3A1' };
  P.QUADROS = ['Desempenho', 'Ambientais', 'Sociais', 'Governance', 'ESRS'];
  P.TIPOS_PASSO = { recolha: 'Collection and submission', validacao: 'Automatic validation', revisao: 'Review', parecer: 'Opinion from another area', aprovacao: 'Approval', publicacao: 'Report publication' };
  P.PERFIS = { admin: 'Administrator', esg: 'Sustainability team', resp: 'Data owner', auditor: 'Auditor', ext: 'External entity' };
  var DEPARTAMENTOS = ['Operações', 'Qualidade e Laboratório', 'Comercial e Relação com o Cliente', 'Ambiente, Saúde e Segurança', 'Recursos Humanos', 'Financeira', 'Jurídico e Compliance', 'Compras', 'Frota', 'Sistemas de Informação', 'I&D, CSR e ESG'];
  /* Os departamentos geridos no backoffice sao as unidades de negocio */
  Object.defineProperty(P, 'UNIDADES', { get: function () { return (S.deps || []).map(function (d) { return d.nome; }); } });
  P.MARCA_BASE = { nome: 'Record to Report (R2R)', subtitulo: '', logotipo: '', cores: { primary: '#00338D', secondary: '#0091DA', accent: '#1E49E2', bg: '#F4F7FC', text: '#0C233C' } };
  P.PALETAS = [
    { nome: 'Blue', cores: { primary: '#00338D', secondary: '#0091DA', accent: '#1E49E2', bg: '#F4F7FC', text: '#0C233C' } },
    { nome: 'Teal', cores: { primary: '#0B4F6C', secondary: '#01A7A3', accent: '#0F7C8F', bg: '#F2F8F9', text: '#10282F' } },
    { nome: 'Green', cores: { primary: '#14573F', secondary: '#2E9E6B', accent: '#1F7A55', bg: '#F3F8F5', text: '#12261E' } },
    { nome: 'Violet', cores: { primary: '#3F2A8C', secondary: '#7A5AF8', accent: '#5B3FD6', bg: '#F6F5FC', text: '#1D1740' } },
    { nome: 'Graphite', cores: { primary: '#2B3545', secondary: '#5B7083', accent: '#44546A', bg: '#F5F6F8', text: '#161C25' } }
  ];

  var WF_BASE = function () {
    return [
      { nome: 'Recolha e submissão dos dados', tipo: 'recolha', responsavel: 'unidade' },
      { nome: 'Validação automática', tipo: 'validacao', responsavel: 'sistema' },
      { nome: 'Revisão pela equipa de sustentabilidade', tipo: 'revisao', responsavel: 'esg' },
      { nome: 'Aprovação final', tipo: 'aprovacao', responsavel: 'esg' },
      { nome: 'Publicação nos quadros do relatório', tipo: 'publicacao', responsavel: 'sistema' }
    ];
  };
  var UTILIZADORES = [
    ['admin', 'Administrador da plataforma', 'admin', ''], ['esg', 'Equipa de sustentabilidade', 'esg', 'I&D, CSR e ESG'],
    ['operacoes', 'Marta Lopes', 'resp', 'Operações'], ['qualidade', 'Rui Antunes', 'resp', 'Qualidade e Laboratório'],
    ['comercial', 'Sofia Reis', 'resp', 'Comercial e Relação com o Cliente'], ['ass', 'Tiago Moura', 'resp', 'Ambiente, Saúde e Segurança'],
    ['rh', 'Inês Faria', 'resp', 'Recursos Humanos'], ['financeira', 'Paulo Serra', 'resp', 'Financeira'],
    ['juridico', 'Joana Pinto', 'resp', 'Jurídico e Compliance'], ['compras', 'Carlos Neves', 'resp', 'Compras'],
    ['frota', 'Ana Duarte', 'resp', 'Frota'], ['si', 'Miguel Costa', 'resp', 'Sistemas de Informação'],
    ['auditor', 'Auditor externo (assurance)', 'auditor', ''], ['ext-energia', 'Comercializador de eletricidade', 'ext', ''],
    ['ext-frota', 'Gestora de frota em renting', 'ext', ''], ['ext-reagentes', 'Fornecedor de reagentes químicos', 'ext', '']
  ];
  var MATERIALIDADE = [
    ['E1', 'Alterações climáticas', 'material', 'Prioridade "Clima" da dupla materialidade.'], ['E2', 'Poluição', 'por avaliar', 'Descargas de águas residuais tratadas.'],
    ['E3', 'Água e recursos marinhos', 'material', 'Prioridade "Água".'], ['E4', 'Biodiversidade e ecossistemas', 'por avaliar', 'Levantamento de áreas sensíveis em curso.'],
    ['E5', 'Uso de recursos e economia circular', 'por avaliar', 'Valorização de lamas.'], ['S1', 'Trabalhadores próprios', 'material', 'Prioridade "Colaboradores".'],
    ['S2', 'Trabalhadores na cadeia de valor', 'por avaliar', ''], ['S3', 'Comunidades afetadas', 'por avaliar', ''],
    ['S4', 'Consumidores e utilizadores finais', 'material', 'Prioridade "Clientes, consumidores e utilizadores finais".'], ['G1', 'Conduta empresarial', 'por avaliar', '']
  ];
  var ENTIDADES = [
    ['Sede do grupo', 1, 1], ['Serviços ambientais', 1, 1], ['Concessão Vale', 1, 1], ['Concessão Rio', 1, 1], ['Concessão Litoral Centro', 1, 1], ['Concessão Planalto', 1, 1],
    ['Laboratório central', 1, 1], ['Manutenção industrial', 1, 1], ['Serviços urbanos', 1, 1], ['Tratamento de efluentes', 1, 1],
    ['Concessão Costa', 1, 0], ['Concessão Norte', 1, 0], ['Concessão Sul', 1, 0], ['Concessão Foz', 1, 0], ['Concessão Serra', 1, 0], ['Agrupamento Algarve', 1, 0]
  ];
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
  P.chave = function (m) { return P.trimestral(m) ? m.periodo : m.ano; };
  P.rotPeriodo = function (m) { var p = P.periodo(m && m.periodo); return p ? p.nome : String(m ? m.ano : ''); };
  P.rotAnterior = function (chave) { var x = /^(\d{4})-T(\d)$/.exec(String(chave)); return x ? 'T' + x[2] + ' ' + (x[1] - 1) : String(chave - 1); };
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
  P.relatoriosDe = function (m) {
    var per = P.periodo(m.periodo), ano = m.ano, l = [];
    var add = function (id) { var r = (S.relatorios || []).filter(function (x) { return x.id === id; })[0]; if (r && l.indexOf(r) < 0) l.push(r); };
    m.indicadores.forEach(function (id) {
      var c = P.cat(id), us = (c && c.utilizado_por) || [];
      if (/^A1[23]$/.test(id)) { if (per && per.tipo === 'trimestre') add('QA-' + per.id); add('PCQA-' + ano); }
      else if (us.indexOf('ERSAR') > -1) add('RQS-' + ano);
      if (us.indexOf('APA') > -1) add(id === 'N04' ? 'GF-' + ano : 'MIRR-' + ano);
      if (us.indexOf('CONT') > -1) add('RC-' + ano);
      if (us.indexOf('REL') > -1 || /^N/.test(id)) add('RS-' + ano);
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
  var passosDe = function (lista) {
    return lista.map(function (p, i) { return { id: 'p' + i + '_' + Math.random().toString(36).slice(2, 7), nome: p.nome, tipo: p.tipo, responsavel: p.responsavel, concluido_em: null, concluido_por: null }; });
  };
  var passoDeNome = function (n, unidade) {
    if (/^Recolha/.test(n)) return { nome: n, tipo: 'recolha', responsavel: 'unidade' };
    if (/^Validação automática/.test(n)) return { nome: n, tipo: 'validacao', responsavel: 'sistema' };
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
    S.users = UTILIZADORES.map(function (u) { return { login: u[0], nome: u[1], perfil: u[2], unidade: u[3] }; });
    S.mat = MATERIALIDADE.map(function (m) { return { norma: m[0], tema: m[1], avaliacao: m[2], justificacao: m[3] }; });
    S.ent = ENTIDADES.map(function (e) { return { id: e[0], nome: e[0], perimetro_grupo: !!e[1], perimetro_maioritario: !!e[2] }; });
    S.deps = DEPARTAMENTOS.map(function (n) { return { id: n, nome: n }; });
    S.periodos = periodosAno(2026); S.relatorios = relatoriosAno(2026);
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
      { id: 'D1', tipo: 'eletricidade', fornecedor: 'Comercializador de eletricidade', periodo: 'Set 2026', instalacao: 'ETA Central', entidade: 'Concessão Vale', consumo: 412300, valor_sem_iva: 49476, iva: 11379.48, percentagem_renovavel: 100, centro_custo: 'CC-1200', leitura_telemetria: 409850, estado: 'distribuída' },
      { id: 'D2', tipo: 'eletricidade', fornecedor: 'Comercializador de eletricidade', periodo: 'Out 2026', instalacao: 'ETAR Sul', entidade: 'Tratamento de efluentes', consumo: 298400, valor_sem_iva: 35808, iva: 8235.84, percentagem_renovavel: 100, centro_custo: 'CC-1310', leitura_telemetria: 268000, estado: 'em conferência' },
      { id: 'D3', tipo: 'água', fornecedor: 'Entidade gestora em alta', periodo: 'Out 2026', instalacao: 'Reservatório Norte', entidade: 'Concessão Rio', consumo: 185200, valor_sem_iva: 74080, iva: 4444.8, percentagem_renovavel: null, centro_custo: 'CC-2050', leitura_telemetria: 183900, estado: 'em conferência' },
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
    var EMPRESAS_DEMO = ['Sede do grupo', 'Concessão Vale', 'Concessão Rio', 'Serviços ambientais'];
    var pessoaDe = function (un) { var x = UTILIZADORES.filter(function (l) { return l[2] === 'resp' && l[3] === un; })[0]; return x || null; };
    var nomeDe = function (un) { var x = pessoaDe(un); return x ? x[1] : 'Equipa de sustentabilidade'; };
    /* Uma milestone por trimestre para o que e mensal ou trimestral, uma para o ano para o resto,
       e uma consolidacao anual por departamento que junta os trimestres */
    var inst = [], trimPorUn = {};
    window.PORTAL_PLANO.forEach(function (pl, ixPlano) {
      var trim = pl.periodicidade === 'Mensal' || pl.periodicidade === 'Trimestral';
      if (trim) {
        [1, 2, 3, 4].forEach(function (t) { inst.push({ pl: pl, ix: ixPlano, id: pl.id + '-T' + t, periodo: '2026-T' + t, t: t }); });
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
      var lista = pl.workflow.length ? pl.workflow.map(function (n) { return passoDeNome(n, pl.unidade); }) : WF_BASE();
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
      m.eventos.push({ texto: 'Milestone created in the 2026 cycle for ' + per.nome + '.', em: new Date(abre + 'T09:00:00').toISOString(), por: 'System', wf: 'criada' });
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
        m.eventos.push({ texto: (k === 0 ? 'Milestone submitted' : 'Step completed: ' + m.passos[k].nome) + '.', em: t, por: m.passos[k].concluido_por, wf: m.passos[k].responsavel === 'sistema' ? 'auto' : 'avanco', passo: m.passos[k].nome });
      }
      m.passo_atual = cfg.i;
      /* O que ja passou da recolha entregou os ficheiros pedidos */
      if (cfg.i > 0) (FICHEIROS_BASE[pl.unidade] || []).forEach(function (f, ixF) { m.documentos_gerais.push({ ficheiro: f[3] + '-' + x.id.toLowerCase() + '-2026.' + f[2][0], por: nomeDe(pl.unidade), em: quando(-8), pedido: 'base:' + ixF }); });
      if (cfg.dev) {
        m.comentarios.push({ autor: 'Equipa de sustentabilidade', texto: 'A percentagem de veículos verdes parece baixa. Confirmem com a gestora da frota, por favor.', em: new Date(Date.now() - 86400000).toISOString() });
        m.eventos.splice(1, 0, { texto: 'Milestone submitted.', em: new Date(Date.now() - 86400000 * 6).toISOString(), por: nomeDe(m.unidade), wf: 'avanco', passo: m.passos[0].nome }, { texto: 'Automatic validation completed: 1 indicator(s) with alerts.', em: new Date(Date.now() - 86400000 * 6 + 60000).toISOString(), por: 'System', wf: 'auto', passo: m.passos[1].nome });
        m.eventos.push({ texto: 'Returned to the unit.', em: new Date(Date.now() - 86400000).toISOString(), por: 'Sustainability team', wf: 'devolucao', passo: m.passos[2].nome });
      }
    });
    S.ext = [
      { id: 'X1', indicador_id: 'E03', milestone_id: 'M17', entidade_externa: 'Comercializador de eletricidade', descricao: 'Percentagem de eletricidade com garantias de origem renovável no ano.', prazo: diasDe(9), estado: 'pendente', valor: null, evidencia: '', respondido_em: null },
      { id: 'X2', indicador_id: 'E09', milestone_id: 'M12-T3', entidade_externa: 'Gestora de frota em renting', descricao: 'Percentagem de viaturas elétricas ou híbridas plug-in na frota em renting a 31/12.', prazo: diasDe(2), estado: 'recebido', valor: 6.4, evidencia: 'frota-renting-dezembro.pdf', respondido_em: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: 'X3', indicador_id: 'N02', milestone_id: 'M20', entidade_externa: 'Fornecedor de reagentes químicos', descricao: 'Toneladas de reagentes fornecidos às ETA e ETAR do perímetro no ano.', prazo: diasDe(30), estado: 'pendente', valor: null, evidencia: '', respondido_em: null }
    ];
    if (P.semearControlo) P.semearControlo();
    guardar();
  };

  P.carregar = function () {
    if (P.online()) { estadoVazio(); return; }
    if (!ler(CHAVES.ms) || ler('esg_versao') !== VERSAO_DADOS) { P.cat = catBoot; semear(); escrever('esg_versao', VERSAO_DADOS); return; }
    Object.keys(CHAVES).forEach(function (n) { S[n] = ler(CHAVES[n]); });
    if (P.garantirEsrs) P.garantirEsrs();
  };
  /* Gera os dados de demonstracao sem tocar no armazenamento: serve o carregamento inicial do Supabase */
  P.dadosDemonstracao = function () { semear(); return S; };
  P.reporDemonstracao = function () {
    Object.keys(CHAVES).forEach(function (n) { try { localStorage.removeItem(CHAVES[n]); } catch (e) { delete memoria[CHAVES[n]]; } });
    semear();
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
    try { l = sessionStorage.getItem('esg_sess'); } catch (e) { l = memoria.sess; }
    return l ? P.user(l) : null;
  };
  P.entrar = function (login) { try { sessionStorage.setItem('esg_sess', login); } catch (e) { memoria.sess = login; } };
  P.sair = function () { try { sessionStorage.removeItem('esg_sess'); } catch (e) { delete memoria.sess; } };

  P.valorAnterior = function (id, ano) {
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
      return m && P.concluida(m) ? it.valor : null;
    }
    if (a === 2025) { var c = P.cat(id); return c ? c.ano_anterior : null; }
    return null;
  };

  /* --- Validacao (secao 7) ----------------------------------------------- */
  P.validar = function (c, valor, ano) {
    var r = { erros: [], alertas: [], variacao: null };
    if (valor === null || valor === undefined) return r;
    if (c.unidade_medida === '%') { if (valor < 0 || valor > 100) r.erros.push('Percentage outside 0 to 100.'); }
    else if (valor < 0) r.erros.push('Negative values are not accepted for this indicator.');
    if (r.erros.length) return r;
    var ant = P.valorAnterior(c.id, ano);
    if (ant !== null && ant !== undefined && ant !== 0) {
      r.variacao = ((valor - ant) / Math.abs(ant)) * 100;
      if (Math.abs(r.variacao) > c.limiar_variacao_pct) {
        r.alertas.push('Change of ' + (r.variacao > 0 ? '+' : '') + P.fmtNum(r.variacao, 1) + '% against ' + P.rotAnterior(ano) + ', above the ' + c.limiar_variacao_pct + '% threshold.');
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
  P.faltasSubmissao = function (m) {
    var f = [];
    m.indicadores.forEach(function (id) {
      var it = P.item(id, P.chave(m)), c = P.cat(id), v = P.validarItem(it);
      if (it.valor === null && !it.rascunho) f.push({ id: id, campo: 'val', msg: c.nome + ': value missing.' });
      v.erros.forEach(function (e) { f.push({ id: id, campo: 'val', msg: c.nome + ': ' + e }); });
      if (v.alertas.length && !String(it.justificacao || '').trim()) f.push({ id: id, campo: 'just', msg: c.nome + ': alert justification missing.' });
      if (it.qualidade === 'estimado' && !String(it.metodo || '').trim()) f.push({ id: id, campo: 'met', msg: c.nome + ': estimation method missing.' });
      if (c.evidencia_obrigatoria && !it.evidencias.length) f.push({ id: id, campo: 'evi', msg: c.nome + ': required evidence missing.' });
    });
    P.ficheirosPedidos(m).forEach(function (x) { if (x.obrigatorio && !x.indicador && !x.entregues.length) f.push({ id: x.id, campo: 'fic', msg: x.nome + ': requested file missing.' }); });
    return f;
  };

  /* --- Pedido de dados: ficheiros pedidos em cada milestone ------------------ */
  /* [nome, porque e pedido, formatos aceites, prefixo do ficheiro de exemplo] */
  var FICHEIROS_BASE = {
    'Operações': [['Extrato de telemetria do período', 'Sustenta os volumes e as ocorrências reportados.', ['xlsx', 'csv'], 'extrato-telemetria']],
    'Qualidade e Laboratório': [['Boletins de análise do período', 'Sustentam os resultados de qualidade reportados.', ['pdf', 'xlsx'], 'boletins-analise']],
    'Comercial e Relação com o Cliente': [['Extrato de faturação do período', 'Sustenta os volumes faturados e o número de clientes.', ['xlsx', 'csv'], 'extrato-faturacao']],
    'Ambiente, Saúde e Segurança': [['Registo de resíduos e de acidentes', 'Sustenta os indicadores de ambiente e de segurança.', ['xlsx', 'pdf'], 'registo-ass']],
    'Recursos Humanos': [['Mapa de pessoal e de formação', 'Sustenta os indicadores de pessoas.', ['xlsx', 'csv'], 'mapa-pessoal']],
    'Financeira': [['Balancete e mapa de custos', 'Sustenta os valores financeiros e de energia.', ['xlsx', 'pdf'], 'balancete']],
    'Jurídico e Compliance': [['Registo de ocorrências de conformidade', 'Sustenta os indicadores de governance.', ['xlsx', 'pdf'], 'registo-conformidade']],
    'Compras': [['Lista de compras e de fornecedores', 'Sustenta os indicadores da cadeia de valor.', ['xlsx', 'csv'], 'lista-compras']],
    'Frota': [['Mapa de frota e de abastecimentos', 'Sustenta os consumos e a composição da frota.', ['xlsx', 'csv'], 'mapa-frota']],
    'Sistemas de Informação': [['Registo de incidentes de segurança', 'Sustenta os indicadores de cibersegurança.', ['xlsx', 'pdf'], 'registo-incidentes']],
    'I&D, CSR e ESG': [['Relatório de atividades do período', 'Sustenta os indicadores de comunidade.', ['pdf', 'xlsx'], 'relatorio-atividades']]
  };
  P.ficheirosPedidos = function (m) {
    var docs = m.documentos_gerais || [], l = [];
    var entregues = function (pid) { return docs.filter(function (d) { return d.pedido === pid; }); };
    (FICHEIROS_BASE[m.unidade] || []).forEach(function (f, i) { l.push({ id: 'base:' + i, nome: f[0], motivo: f[1], formatos: f[2], prefixo: f[3], obrigatorio: true, entregues: entregues('base:' + i) }); });
    (m.ficheiros_pedidos || []).forEach(function (f) { l.push({ id: f.id, nome: f.nome, motivo: f.motivo || '', formatos: [], obrigatorio: !!f.obrigatorio, proprio: true, entregues: entregues(f.id) }); });
    m.indicadores.forEach(function (id) {
      var c = P.cat(id);
      if (c.evidencia_obrigatoria) l.push({ id: 'ev:' + id, nome: 'Evidência de ' + c.nome, motivo: 'Obrigatória para este indicador.', formatos: [], obrigatorio: true, indicador: id, entregues: P.item(id, P.chave(m)).evidencias });
    });
    return l;
  };
  P.entregarFicheiro = function (m, pid, nome, u) {
    if (!P.podePreencher(m, u)) return { erro: 'This milestone is not with you right now.' };
    var f = P.ficheirosPedidos(m).filter(function (x) { return x.id === pid; })[0];
    if (!f) return { erro: 'That file is no longer requested.' };
    var ext = String(nome).split('.').pop().toLowerCase();
    if (f.formatos.length && f.formatos.indexOf(ext) < 0) return { erro: 'This request accepts ' + f.formatos.join(', ') + ' files.' };
    if (f.indicador) P.anexar(P.item(f.indicador, P.chave(m)), nome, u);
    else m.documentos_gerais.push({ ficheiro: nome, por: u.nome, em: agora(), pedido: pid });
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
  P.atribuiveis = function (m) { return S.users.filter(function (x) { return x.perfil === 'resp' && x.unidade === m.unidade; }); };
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
    if (c.unidade_negocio === u.unidade) return true;
    var m = P.msDoIndicador(c.id);
    return !!m && m.unidade === u.unidade;
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
    if (p.tipo === 'parecer') return { cod: 'parecer', txt: 'Awaiting opinion', cls: 'warn' };
    if (p.tipo === 'aprovacao') return { cod: 'aprovacao', txt: 'In approval', cls: 'rev' };
    return { cod: 'revisao', txt: 'In review', cls: 'rev' };
  };
  P.estadoIndicador = function (m, id) {
    var it = P.item(id, P.chave(m));
    if (P.concluida(m)) return { txt: 'Approved', cls: 'ok' };
    if (P.passoAtual(m).tipo === 'recolha') {
      if (m.devolvida) return { txt: 'Returned', cls: 'err' };
      return it.valor === null ? { txt: 'To collect', cls: '' } : { txt: 'In progress', cls: 'info' };
    }
    return P.validarItem(it).alertas.length ? { txt: 'With alerts', cls: 'warn' } : { txt: 'In review', cls: 'rev' };
  };
  P.nomeResp = function (m, resp) {
    if (resp === 'unidade') return m ? m.unidade : 'Milestone unit';
    if (resp === 'esg') return 'Sustainability team';
    if (resp === 'admin') return 'Administrator';
    if (resp === 'sistema') return 'Automatic';
    return resp.indexOf('area:') === 0 ? resp.slice(5) : resp;
  };
  P.podeAgir = function (m, u) {
    var p = P.passoAtual(m);
    if (!p || !u || p.responsavel === 'sistema') return false;
    if (u.perfil === 'admin') return true;
    if (p.responsavel === 'esg') return u.perfil === 'esg';
    if (p.responsavel === 'unidade') return u.perfil === 'resp' && u.unidade === m.unidade;
    if (p.responsavel.indexOf('area:') === 0) return u.perfil === 'resp' && u.unidade === p.responsavel.slice(5);
    return false;
  };
  P.podePreencher = function (m, u) { var p = P.passoAtual(m); return !!p && p.tipo === 'recolha' && P.podeAgir(m, u); };
  P.gereTudo = function (u) { return !!u && (u.perfil === 'admin' || u.perfil === 'esg'); };
  P.acompanha = function (m, u) { return !!u && (P.gereTudo(u) || (u.perfil === 'resp' && u.unidade === m.unidade)); };
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
    if (!P.podePreencher(m, u)) return { erro: 'This milestone is not with you right now.' };
    var f = P.faltasSubmissao(m);
    if (f.length) return { faltas: f };
    var p = P.passoAtual(m);
    p.concluido_em = agora(); p.concluido_por = u.nome;
    m.devolvida = false;
    ev(m, 'Milestone submitted.', u.nome, 'avanco', p.nome);
    m.passo_atual++;
    correrAutomaticos(m);
    guardar();
    return { ok: true };
  };
  P.concluirPasso = function (m, u, comentario) {
    if (!P.podeAgir(m, u)) return { erro: 'This step is not with you.' };
    var p = P.passoAtual(m);
    if (p.tipo === 'recolha') return P.submeter(m, u);
    if (P.violaSegregacao && P.violaSegregacao(m, u)) return { erro: 'Segregation of duties: you submitted this milestone, so someone else has to decide on it.' };
    p.concluido_em = agora(); p.concluido_por = u.nome;
    var verbo = p.tipo === 'parecer' ? 'Favourable opinion given' : p.tipo === 'aprovacao' ? 'Values approved and locked' : 'Review completed';
    ev(m, verbo + ': ' + p.nome + '.', u.nome, 'avanco', p.nome);
    if (comentario && comentario.trim()) m.comentarios.push({ autor: u.nome, texto: comentario.trim(), em: agora() });
    m.passo_atual++;
    correrAutomaticos(m);
    guardar();
    return { ok: true };
  };
  P.devolver = function (m, u, comentario) {
    if (!P.podeAgir(m, u) || P.passoAtual(m).tipo === 'recolha') return { erro: 'This step is not with you.' };
    if (!comentario || !comentario.trim()) return { erro: 'Write a comment to return the milestone.' };
    var deOnde = P.passoAtual(m).nome;
    m.passos.forEach(function (p) { p.concluido_em = null; p.concluido_por = null; });
    m.passo_atual = 0;
    m.devolvida = true;
    if (P.diasAte(m.prazo) < 3) m.prazo = diasDe(3);
    m.comentarios.push({ autor: u.nome, texto: comentario.trim(), em: agora() });
    ev(m, 'Returned to the unit. Due: ' + P.fmtData(m.prazo) + '.', u.nome, 'devolucao', deOnde);
    guardar();
    return { ok: true };
  };
  /* Regras do editor (6.4). Devolve a mensagem do que falha, ou null. */
  P.validarWorkflow = function (m, passos) {
    if (!passos.length || passos[0].tipo !== 'recolha') return 'The first step is always collection.';
    if (!passos.some(function (p) { return ['revisao', 'parecer', 'aprovacao'].indexOf(p.tipo) > -1; })) return 'The workflow needs at least one review, opinion or approval step.';
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
    var ordem = ['recolha', 'validacao', 'revisao', 'parecer', 'aprovacao', 'publicacao'];
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
    if (!P.concluida(m)) return { erro: 'Only approved values can be restated.' };
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
  P.anexar = function (it, nome, u) { it.evidencias.push({ id: 'ev' + Date.now() + Math.random().toString(36).slice(2, 5), ficheiro: nome, por: u.nome, em: agora() }); guardar(); };

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
  P.usarExterno = function (x, u) {
    var m = P.ms(x.milestone_id), it = P.item(x.indicador_id, P.chave(m));
    if (!P.podePreencher(m, u)) return { erro: 'Only during collection, by whoever has it.' };
    it.valor = x.valor; it.rascunho = null; it.qualidade = 'medido'; it.metodo = '';
    it.versoes.push({ valor: x.valor, em: agora(), por: u.nome, origem: 'external: ' + x.entidade_externa, motivo: '' });
    if (x.evidencia) it.evidencias.push({ id: 'ev' + Date.now(), ficheiro: x.evidencia, por: x.entidade_externa, em: agora() });
    x.estado = 'aplicado';
    ev(m, 'External contribution applied to ' + P.cat(x.indicador_id).nome + '.', u.nome);
    guardar();
    return { ok: true };
  };

  /* --- Auditoria (secao 12) ---------------------------------------------- */
  P.aprovados = function (ano) {
    var r = [];
    P.msCiclo(ano).forEach(function (m) { if (P.concluida(m)) m.indicadores.forEach(function (id) { r.push({ id: id, m: m }); }); });
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
    if (!P.podePreencher(m, u)) return { erro: 'This milestone is read only for you right now.' };
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
    if (m) { m.comentarios.push({ autor: u.nome, texto: 'Information request on ' + P.cat(indId).nome + ': ' + texto.trim(), em: agora(), sistema: true }); ev(m, 'Auditor information request on ' + P.cat(indId).nome + '.', u.nome); }
    guardar();
    return { ok: true };
  };
  P.podeResponderAuditor = function (a, u) {
    if (!u) return false;
    if (P.gereTudo(u)) return true;
    var m = P.msDoIndicador(a.indicador_id);
    return u.perfil === 'resp' && !!m && m.unidade === u.unidade;
  };
  P.responderAuditor = function (a, texto, u) {
    if (!P.podeResponderAuditor(a, u)) return { erro: 'This request is not for your unit.' };
    if (!texto || !texto.trim()) return { erro: 'Write the answer.' };
    a.resposta = { texto: texto.trim(), por: u.nome, em: agora() }; a.estado = 'respondido';
    var m = P.msDoIndicador(a.indicador_id);
    if (m) m.comentarios.push({ autor: u.nome, texto: 'Answer to the auditor: ' + texto.trim(), em: agora() });
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
      if (['xlsx', 'csv', 'json'].indexOf(ext) < 0) return ok({ nome: nome, erro: 'Format not supported. Use .xlsx, .csv or .json.' });
      var r = new FileReader();
      r.onerror = function () { ok({ nome: nome, erro: 'The file could not be read.' }); };
      r.onload = function () {
        try {
          if (ext === 'xlsx') {
            if (!window.XLSX) return ok({ nome: nome, erro: 'The Excel library did not load.' });
            var wb = window.XLSX.read(new Uint8Array(r.result), { type: 'array' });
            var folha = wb.Sheets.dados || wb.Sheets[wb.SheetNames[0]];
            return ok({ nome: nome, linhas: window.XLSX.utils.sheet_to_json(folha, { defval: '' }) });
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
  P.validarImportacao = function (m, linhas) {
    var rel = { linhas: [], desconhecidas: [], erroFormato: null, emFalta: [] };
    if (!linhas || !linhas.length) { rel.erroFormato = 'The file has no data rows.'; return rel; }
    var cols = {};
    linhas.forEach(function (l) { Object.keys(l).forEach(function (k) { cols[k] = 1; }); });
    var falta = OBRIG.filter(function (c) { return !cols[c]; });
    if (falta.length) { rel.erroFormato = 'Required columns missing: ' + falta.join(', ') + '.'; return rel; }
    rel.desconhecidas = Object.keys(cols).filter(function (c) { return COLS.indexOf(c) < 0; });
    var vistos = {};
    linhas.forEach(function (l, i) {
      var id = String(l.indicator_id === undefined ? '' : l.indicator_id).trim();
      var r = { n: i + 2, indicador: id, valor: l.value, estado: 'valida', motivos: [], dados: l };
      var sem = l.value === '' || l.value === null || l.value === undefined;
      if (sem && m.indicadores.indexOf(id) > -1 && !vistos[id]) { r.estado = 'vazia'; rel.linhas.push(r); return; }
      var rej = function (t) { r.estado = 'rejeitada'; r.motivos.push(t); };
      /* 2. Milestone e indicadores */
      if (String(l.milestone_id).trim() !== m.id) rej('milestone_id must be ' + m.id + '.');
      if (m.indicadores.indexOf(id) < 0) rej('Indicator ' + (id || '(empty)') + ' does not belong to this milestone.');
      else if (vistos[id]) rej('Indicator repeated in the file.');
      var c = P.cat(id), n = lerNumero(l.value);
      /* 3. Tipos, ano e unidades */
      if (n === null) rej('value must be numeric.');
      if (String(l.period).trim() !== String(m.ano)) rej('period must be ' + m.ano + '.');
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
      }
      if (id) vistos[id] = 1;
      rel.linhas.push(r);
    });
    rel.emFalta = m.indicadores.filter(function (id) { return !rel.linhas.some(function (r) { return r.indicador === id && (r.estado === 'valida' || r.estado === 'alerta'); }); });
    return rel;
  };
  P.aplicarImportacao = function (m, rel, ficheiro, u) {
    var QUAL = { measured: 'medido', calculated: 'calculado', estimated: 'estimado' }, n = 0;
    rel.linhas.forEach(function (r) {
      if (r.estado !== 'valida' && r.estado !== 'alerta') return;
      var l = r.dados, it = P.item(r.indicador, P.chave(m));
      P.gravarValor(m, r.indicador, l.value, u, 'file import ' + ficheiro);
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
    l.push({ milestone_id: m.id, indicator_id: m.indicadores.indexOf('G01') > -1 ? 'A01' : 'G01', indicator_name: 'Indicator from another milestone', entity: 'Consolidado', period: String(m.ano), value: 10, unit: '€', justification: '', source_system: 'ERP', evidence_ref: '', data_quality: 'measured', estimation_method: '' });
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
    window.XLSX.writeFile(wb, nome);
    return wb;
  };
  P.folhasTemplate = function (m) {
    return {
      dados: linhasTemplate(m),
      instrucoes: m.indicadores.map(function (id) {
        var c = P.cat(id), ant = P.valorAnterior(id, P.chave(m));
        return { indicador: id, nome: c.nome, unidade: c.unidade_medida, ano_anterior: ant === null || ant === undefined ? '' : ant, limiar_pct: c.limiar_variacao_pct, evidencia_obrigatoria: c.evidencia_obrigatoria ? 'Yes' : 'No', regra: 'period = ' + m.ano + '; unit as stated; numeric value; justification required when there is an alert; estimation_method required when data_quality is estimated.' };
      })
    };
  };
  P.templateExcel = function (m) { return escreverLivro('template-' + m.id + '-' + m.ano + '.xlsx', P.folhasTemplate(m)); };
  P.paraCSV = function (linhas) {
    var esc = function (v) { var s = String(v === null || v === undefined ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var cols = COLS;
    return '﻿' + [cols.join(';')].concat(linhas.map(function (l) { return cols.map(function (c) { return esc(l[c]); }).join(';'); })).join('\r\n');
  };
  P.templateCSV = function (m) { P.descarregar('template-' + m.id + '-' + m.ano + '.csv', P.paraCSV(linhasTemplate(m)), 'text/csv;charset=utf-8'); };
  P.jsonSchema = function (m) {
    var uni = m.indicadores.map(function (id) { return { const: id, title: P.cat(id).nome }; });
    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Milestone submission ' + m.id, type: 'object', required: ['milestone_id', 'records'],
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
  P.exportarDataRoom = function () { return escreverLivro('data-room-' + S.ciclo.ano + '.xlsx', P.folhasDataRoom()); };
  P.quadrosRelatorio = function () {
    var ano = S.ciclo.ano, folhas = {};
    P.QUADROS.forEach(function (q) {
      folhas[q] = S.cat.filter(function (c) { return c.quadro === q; }).map(function (c) {
        var m = P.msDoIndicador(c.id, ano), it = P.item(c.id, ano), apr = m && P.concluida(m);
        var o = { indicador: c.nome, unidade: c.unidade_medida, perimetro: c.perimetro };
        o[String(ano)] = apr ? it.valor : ''; o[String(ano - 1)] = P.valorAnterior(c.id, ano);
        o.estado = m ? P.estadoIndicador(m, c.id).txt : 'To collect'; o.qualidade = apr ? QUALIDADE_TXT[it.qualidade] : ''; o.esrs = c.esrs_requisito; o.esrs_id = P.esrsDe ? P.esrsDe(c.id).dps.join(', ') : ''; o.gri = c.gri;
        return o;
      });
    });
    return folhas;
  };
  P.exportarRelatorio = function () { return escreverLivro('relatorio-' + S.ciclo.ano + '.xlsx', P.quadrosRelatorio()); };
  P.valoresAprovados = function () {
    var o = [];
    Object.keys(S.items).forEach(function (k) {
      var it = S.items[k], m = P.ms(it.milestone_id);
      if (m && P.concluida(m)) o.push({ indicador_id: it.id, ano: it.ano, valor: it.valor, unidade: P.cat(it.id).unidade_medida, qualidade: it.qualidade, reexpresso: it.reexpresso, milestone_id: m.id });
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
      ev(m, 'Milestone created in the ' + ano + ' cycle.', u.nome);
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
    if (usos) return { erro: 'This company is in use by ' + usos + ' milestones or invoices.' };
    S.ent.splice(S.ent.indexOf(x), 1);
    guardar(); return { ok: true };
  };
  var usosDepartamento = function (nome) {
    return S.users.filter(function (u) { return u.unidade === nome; }).length + S.cat.filter(function (c) { return c.unidade_negocio === nome; }).length +
      S.ms.filter(function (m) { return m.unidade === nome || m.departamentos.indexOf(nome) > -1 || m.passos.some(function (p) { return p.responsavel === 'area:' + nome; }); }).length;
  };
  P.usosDepartamento = usosDepartamento;
  P.criarDepartamento = function (nome) {
    var e = erroNome(nome, S.deps); if (e) return { erro: e };
    S.deps.push({ id: 'dep' + Date.now(), nome: nome });
    guardar(); return { ok: true };
  };
  P.renomearDepartamento = function (x, nome) {
    var e = erroNome(nome, S.deps, x); if (e) return { erro: e };
    var antigo = x.nome;
    x.nome = nome;
    S.users.forEach(function (u) { if (u.unidade === antigo) u.unidade = nome; });
    S.cat.forEach(function (c) { if (c.unidade_negocio === antigo) c.unidade_negocio = nome; });
    S.ms.forEach(function (m) {
      if (m.unidade === antigo) m.unidade = nome;
      m.departamentos = m.departamentos.map(function (d) { return d === antigo ? nome : d; });
      m.passos.forEach(function (p) { if (p.responsavel === 'area:' + antigo) p.responsavel = 'area:' + nome; });
    });
    guardar(); return { ok: true };
  };
  P.apagarDepartamento = function (x) {
    var usos = usosDepartamento(x.nome);
    if (usos) return { erro: 'This department is in use by ' + usos + ' users, indicators or milestones.' };
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
      var minha = u.perfil === 'resp' && u.unidade === m.unidade;
      if (minha || P.gereTudo(u)) {
        if (est.cod === 'devolvida') add('err', m.nome + ' was returned', 'Correct and resubmit', r);
        if (est.cod === 'atraso') add('err', m.nome + ' is overdue', 'Due ' + P.fmtData(m.prazo), r);
        if (est.cod === 'recolha' && P.diasAte(m.prazo) <= 5) add('warn', m.nome + ' due soon', 'Due ' + P.fmtData(m.prazo), r);
      }
      if (P.podeAgir(m, u) && ['revisao', 'parecer', 'aprovacao'].indexOf(est.cod) > -1) add('info', m.nome + ' awaiting decision', P.passoAtual(m).nome, r);
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
