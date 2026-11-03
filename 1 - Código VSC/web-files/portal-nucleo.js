/* ============================================================================
   portal-nucleo.js - regras da plataforma, sem desenho
   Estado, permissoes, workflow, validacao, importacao, exportacoes e marca.
   No mockup o estado vive no localStorage. Em producao, troca-se so a secao
   "Armazenamento" por chamadas a Web API do portal.
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
    areas: 'esg_areas', cat: 'esg_catalog', metas: 'esg_metas'
  };
  var S = (P.S = {});
  var memoria = {};
  var ler = function (k) {
    try { var v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); }
    catch (e) { return memoria[k] === undefined ? null : memoria[k]; }
  };
  var escrever = function (k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { memoria[k] = v; }
  };
  var guardar = (P.guardar = function () {
    Object.keys(CHAVES).forEach(function (n) { escrever(CHAVES[n], S[n]); });
  });

  /* --- Dados iniciais ---------------------------------------------------- */
  P.TEMAS = { 'Água e saneamento': '#0091DA', 'Energia e clima': '#EAAA00', 'Pessoas': '#C6007E', 'Governance': '#483698', 'Comunidade e cliente': '#00A3A1' };
  P.QUADROS = ['Desempenho', 'Ambientais', 'Sociais', 'Governance', 'ESRS'];
  P.TIPOS_PASSO = { recolha: 'Recolha e submissão', validacao: 'Validação automática', revisao: 'Revisão', parecer: 'Parecer de outra área', aprovacao: 'Aprovação', publicacao: 'Publicação no relatório' };
  P.PERFIS = { admin: 'Administrador', esg: 'Equipa de sustentabilidade', resp: 'Responsável pelos dados', auditor: 'Auditor', ext: 'Entidade externa' };
  P.UNIDADES = ['Operações', 'Qualidade e Laboratório', 'Comercial e Relação com o Cliente', 'Ambiente, Saúde e Segurança', 'Recursos Humanos', 'Financeira', 'Jurídico e Compliance', 'Compras', 'Frota', 'Sistemas de Informação', 'I&D, CSR e ESG'];
  P.MARCA_BASE = { nome: 'Portal de Sustentabilidade', subtitulo: 'Dados e relatório', logotipo: '', cores: { primary: '#00338D', secondary: '#0091DA', accent: '#1E49E2', bg: '#F4F7FC', text: '#0C233C' } };
  P.PALETAS = [
    { nome: 'Azul', cores: { primary: '#00338D', secondary: '#0091DA', accent: '#1E49E2', bg: '#F4F7FC', text: '#0C233C' } },
    { nome: 'Azul-petróleo', cores: { primary: '#0B4F6C', secondary: '#01A7A3', accent: '#0F7C8F', bg: '#F2F8F9', text: '#10282F' } },
    { nome: 'Verde', cores: { primary: '#14573F', secondary: '#2E9E6B', accent: '#1F7A55', bg: '#F3F8F5', text: '#12261E' } },
    { nome: 'Violeta', cores: { primary: '#3F2A8C', secondary: '#7A5AF8', accent: '#5B3FD6', bg: '#F6F5FC', text: '#1D1740' } },
    { nome: 'Grafite', cores: { primary: '#2B3545', secondary: '#5B7083', accent: '#44546A', bg: '#F5F6F8', text: '#161C25' } }
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
    ['operacoes', 'Resp. Operações', 'resp', 'Operações'], ['qualidade', 'Resp. Qualidade e Laboratório', 'resp', 'Qualidade e Laboratório'],
    ['comercial', 'Resp. Comercial e Cliente', 'resp', 'Comercial e Relação com o Cliente'], ['ass', 'Resp. Ambiente, Saúde e Segurança', 'resp', 'Ambiente, Saúde e Segurança'],
    ['rh', 'Resp. Recursos Humanos', 'resp', 'Recursos Humanos'], ['financeira', 'Resp. Financeira', 'resp', 'Financeira'],
    ['juridico', 'Resp. Jurídico e Compliance', 'resp', 'Jurídico e Compliance'], ['compras', 'Resp. Compras (a confirmar)', 'resp', 'Compras'],
    ['frota', 'Resp. Frota (a confirmar)', 'resp', 'Frota'], ['si', 'Resp. Sistemas de Informação', 'resp', 'Sistemas de Informação'],
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
  var nomeMs = function (per, ano, un) {
    return per === 'Novos dados ESRS' ? 'Novos dados ESRS ' + ano + ' de ' + un : 'Entrega ' + per.toLowerCase() + ' ' + ano + ' de ' + un;
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
    S.ent = ENTIDADES.map(function (e) { return { nome: e[0], perimetro_grupo: !!e[1], perimetro_maioritario: !!e[2] }; });
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
    window.PORTAL_PLANO.forEach(function (pl) {
      var cfg = estados[pl.id];
      var lista = pl.workflow.length ? pl.workflow.map(function (n) { return passoDeNome(n, pl.unidade); }) : WF_BASE();
      var m = {
        id: pl.id, nome: nomeMs(pl.periodicidade, 2026, pl.unidade), ano: 2026, unidade: pl.unidade, periodicidade: pl.periodicidade, prazo: diasDe(cfg.d),
        indicadores: pl.indicadores.slice(), passos: passosDe(lista), passo_atual: 0, devolvida: !!cfg.dev, workflow_ajustado: pl.workflow.length > 0,
        documentos_gerais: [], comentarios: [], eventos: []
      };
      m.eventos.push({ texto: 'Milestone criada no ciclo 2026.', em: new Date(Date.now() - 86400000 * 300).toISOString(), por: 'Sistema' });
      S.ms.push(m);
      var preencher = cfg.i > 0 || cfg.dev;
      pl.indicadores.forEach(function (id, ix) {
        var c = P.cat(id), it = novoItem(id, 2026, m.id, c.tipo);
        S.items['2026:' + id] = it;
        var parcial = (pl.id === 'M10' && ix < 2) || (pl.id === 'M16' && ix < 3);
        if (preencher || parcial) {
          it.valor = valorDemo(c);
          it.versoes.push({ valor: it.valor, em: new Date(Date.now() - 86400000 * 25).toISOString(), por: 'Resp. ' + pl.unidade, origem: 'manual', motivo: '' });
          if (preencher && c.evidencia_obrigatoria) it.evidencias.push({ id: 'ev-' + id, ficheiro: 'suporte-' + id.toLowerCase() + '-2026.pdf', por: 'Resp. ' + pl.unidade, em: new Date(Date.now() - 86400000 * 25).toISOString() });
          if (preencher && P.validar(c, it.valor, 2026).alertas.length) it.justificacao = 'Diferença confirmada pela unidade: perímetro e fórmula iguais aos do ano anterior.';
        }
      });
      if (pl.id === 'M01') {
        var a = S.items['2026:A01'];
        a.valor = 49.72; a.versoes.push({ valor: 49.72, em: new Date(Date.now() - 86400000 * 24).toISOString(), por: 'Resp. Operações', origem: 'importação de ficheiro telemetria-setembro.xlsx', motivo: '' });
        a.justificacao = 'Nova ligação de adução em serviço desde março.';
        var b = S.items['2026:A09']; b.qualidade = 'estimado'; b.metodo = 'Extrapolação a partir de nove meses de registos.';
      }
      for (var k = 0; k < cfg.i; k++) {
        var t = new Date(Date.now() - 86400000 * (Math.max(2, 30 - cfg.d / 3) - k * 2)).toISOString();
        m.passos[k].concluido_em = t;
        m.passos[k].concluido_por = m.passos[k].responsavel === 'sistema' ? 'Sistema' : m.passos[k].responsavel === 'unidade' ? 'Resp. ' + m.unidade : m.passos[k].responsavel.indexOf('area:') === 0 ? 'Resp. ' + m.passos[k].responsavel.slice(5) : 'Equipa de sustentabilidade';
        m.eventos.push({ texto: 'Passo concluído: ' + m.passos[k].nome + '.', em: t, por: m.passos[k].concluido_por });
      }
      m.passo_atual = cfg.i;
      if (cfg.dev) {
        m.comentarios.push({ autor: 'Equipa de sustentabilidade', texto: 'A percentagem de veículos verdes parece baixa. Confirmem com a gestora da frota, por favor.', em: new Date(Date.now() - 86400000).toISOString() });
        m.eventos.push({ texto: 'Devolvida à unidade.', em: new Date(Date.now() - 86400000).toISOString(), por: 'Equipa de sustentabilidade' });
      }
    });
    S.ext = [
      { id: 'X1', indicador_id: 'E03', milestone_id: 'M17', entidade_externa: 'Comercializador de eletricidade', descricao: 'Percentagem de eletricidade com garantias de origem renovável no ano.', prazo: diasDe(9), estado: 'pendente', valor: null, evidencia: '', respondido_em: null },
      { id: 'X2', indicador_id: 'E09', milestone_id: 'M12', entidade_externa: 'Gestora de frota em renting', descricao: 'Percentagem de viaturas elétricas ou híbridas plug-in na frota em renting a 31/12.', prazo: diasDe(2), estado: 'recebido', valor: 6.4, evidencia: 'frota-renting-dezembro.pdf', respondido_em: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: 'X3', indicador_id: 'N02', milestone_id: 'M20', entidade_externa: 'Fornecedor de reagentes químicos', descricao: 'Toneladas de reagentes fornecidos às ETA e ETAR do perímetro no ano.', prazo: diasDe(30), estado: 'pendente', valor: null, evidencia: '', respondido_em: null }
    ];
    guardar();
  };

  P.carregar = function () {
    if (!ler(CHAVES.ms)) { P.cat = catBoot; semear(); return; }
    Object.keys(CHAVES).forEach(function (n) { S[n] = ler(CHAVES[n]); });
  };
  P.reporDemonstracao = function () {
    Object.keys(CHAVES).forEach(function (n) { try { localStorage.removeItem(CHAVES[n]); } catch (e) { delete memoria[CHAVES[n]]; } });
    semear();
  };
  P.exportarTudo = function () { var o = {}; Object.keys(CHAVES).forEach(function (n) { o[CHAVES[n]] = S[n]; }); return o; };
  P.importarTudo = function (o) {
    if (!o || !o.esg_ms || !o.esg_items || !o.esg_cycle) return 'O ficheiro não é uma cópia completa dos dados.';
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

  /* Sessao: no mockup entra-se sem palavra-passe, em producao vem da autenticacao do portal */
  P.sessao = function () {
    var l = null;
    try { l = sessionStorage.getItem('esg_sess'); } catch (e) { l = memoria.sess; }
    return l ? P.user(l) : null;
  };
  P.entrar = function (login) { try { sessionStorage.setItem('esg_sess', login); } catch (e) { memoria.sess = login; } };
  P.sair = function () { try { sessionStorage.removeItem('esg_sess'); } catch (e) { delete memoria.sess; } };

  P.valorAnterior = function (id, ano) {
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
    if (c.unidade_medida === '%') { if (valor < 0 || valor > 100) r.erros.push('Percentagem fora de 0 a 100.'); }
    else if (valor < 0) r.erros.push('Valor negativo não é aceite neste indicador.');
    if (r.erros.length) return r;
    var ant = P.valorAnterior(c.id, ano);
    if (ant !== null && ant !== undefined && ant !== 0) {
      r.variacao = ((valor - ant) / Math.abs(ant)) * 100;
      if (Math.abs(r.variacao) > c.limiar_variacao_pct) {
        r.alertas.push('Variação de ' + (r.variacao > 0 ? '+' : '') + P.fmtNum(r.variacao, 1) + '% face a ' + (ano - 1) + ', acima do limiar de ' + c.limiar_variacao_pct + '%.');
      }
    }
    (c.regras_coerencia || []).forEach(function (t) { r.alertas.push(t); });
    return r;
  };
  P.validarItem = function (it) {
    var c = P.cat(it.id);
    if (it.rascunho !== null && it.rascunho !== undefined && it.rascunho !== '') return { erros: ['Valor não numérico.'], alertas: [], variacao: null };
    return P.validar(c, it.valor, it.ano);
  };
  /* O que falta para submeter. Cada entrada leva o campo onde o cursor deve ir. */
  P.faltasSubmissao = function (m) {
    var f = [];
    m.indicadores.forEach(function (id) {
      var it = P.item(id, m.ano), c = P.cat(id), v = P.validarItem(it);
      if (it.valor === null && !it.rascunho) f.push({ id: id, campo: 'val', msg: c.nome + ': falta o valor.' });
      v.erros.forEach(function (e) { f.push({ id: id, campo: 'val', msg: c.nome + ': ' + e }); });
      if (v.alertas.length && !String(it.justificacao || '').trim()) f.push({ id: id, campo: 'just', msg: c.nome + ': falta a justificação do alerta.' });
      if (it.qualidade === 'estimado' && !String(it.metodo || '').trim()) f.push({ id: id, campo: 'met', msg: c.nome + ': falta o método de estimativa.' });
      if (c.evidencia_obrigatoria && !it.evidencias.length) f.push({ id: id, campo: 'evi', msg: c.nome + ': falta a evidência obrigatória.' });
    });
    return f;
  };

  /* --- Estados e permissoes ---------------------------------------------- */
  P.concluida = function (m) { return m.passo_atual >= m.passos.length; };
  P.passoAtual = function (m) { return P.concluida(m) ? null : m.passos[m.passo_atual]; };
  P.estadoMs = function (m) {
    if (P.concluida(m)) return { cod: 'concluida', txt: 'Concluída', cls: 'ok' };
    var p = P.passoAtual(m);
    if (p.tipo === 'recolha') {
      if (m.devolvida) return { cod: 'devolvida', txt: 'Devolvida', cls: 'err' };
      if (P.diasAte(m.prazo) < 0) return { cod: 'atraso', txt: 'Em atraso', cls: 'err' };
      return { cod: 'recolha', txt: 'Em recolha', cls: 'info' };
    }
    if (p.tipo === 'parecer') return { cod: 'parecer', txt: 'A aguardar parecer', cls: 'warn' };
    if (p.tipo === 'aprovacao') return { cod: 'aprovacao', txt: 'Em aprovação', cls: 'rev' };
    return { cod: 'revisao', txt: 'Em revisão', cls: 'rev' };
  };
  P.estadoIndicador = function (m, id) {
    var it = P.item(id, m.ano);
    if (P.concluida(m)) return { txt: 'Aprovado', cls: 'ok' };
    if (P.passoAtual(m).tipo === 'recolha') {
      if (m.devolvida) return { txt: 'Devolvido', cls: 'err' };
      return it.valor === null ? { txt: 'Por recolher', cls: '' } : { txt: 'Em preenchimento', cls: 'info' };
    }
    return P.validarItem(it).alertas.length ? { txt: 'Com alertas', cls: 'warn' } : { txt: 'Em revisão', cls: 'rev' };
  };
  P.nomeResp = function (m, resp) {
    if (resp === 'unidade') return m ? m.unidade : 'Unidade responsável pela milestone';
    if (resp === 'esg') return 'Equipa de sustentabilidade';
    if (resp === 'admin') return 'Administrador';
    if (resp === 'sistema') return 'Automático';
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
  var ev = (P.evento = function (m, texto, por) { m.eventos.push({ texto: texto, em: agora(), por: por }); });
  var correrAutomaticos = function (m) {
    while (!P.concluida(m) && P.passoAtual(m).responsavel === 'sistema') {
      var p = P.passoAtual(m);
      p.concluido_em = agora(); p.concluido_por = 'Sistema';
      if (p.tipo === 'validacao') {
        var n = m.indicadores.filter(function (id) { return P.validarItem(P.item(id, m.ano)).alertas.length; }).length;
        ev(m, 'Validação automática concluída: ' + n + ' indicador(es) com alertas.', 'Sistema');
      } else if (p.tipo === 'publicacao') {
        ev(m, 'Valores publicados nos quadros do relatório.', 'Sistema');
      } else {
        ev(m, 'Passo automático concluído: ' + p.nome + '.', 'Sistema');
      }
      m.passo_atual++;
    }
  };
  P.submeter = function (m, u) {
    if (!P.podePreencher(m, u)) return { erro: 'Esta milestone não está consigo neste momento.' };
    var f = P.faltasSubmissao(m);
    if (f.length) return { faltas: f };
    var p = P.passoAtual(m);
    p.concluido_em = agora(); p.concluido_por = u.nome;
    m.devolvida = false;
    ev(m, 'Milestone submetida.', u.nome);
    m.passo_atual++;
    correrAutomaticos(m);
    guardar();
    return { ok: true };
  };
  P.concluirPasso = function (m, u, comentario) {
    if (!P.podeAgir(m, u)) return { erro: 'Este passo não está consigo.' };
    var p = P.passoAtual(m);
    if (p.tipo === 'recolha') return P.submeter(m, u);
    p.concluido_em = agora(); p.concluido_por = u.nome;
    var verbo = p.tipo === 'parecer' ? 'Parecer favorável dado' : p.tipo === 'aprovacao' ? 'Valores aprovados e bloqueados' : 'Revisão concluída';
    ev(m, verbo + ': ' + p.nome + '.', u.nome);
    if (comentario && comentario.trim()) m.comentarios.push({ autor: u.nome, texto: comentario.trim(), em: agora() });
    m.passo_atual++;
    correrAutomaticos(m);
    guardar();
    return { ok: true };
  };
  P.devolver = function (m, u, comentario) {
    if (!P.podeAgir(m, u) || P.passoAtual(m).tipo === 'recolha') return { erro: 'Este passo não está consigo.' };
    if (!comentario || !comentario.trim()) return { erro: 'Escreva um comentário para devolver a milestone.' };
    m.passos.forEach(function (p) { p.concluido_em = null; p.concluido_por = null; });
    m.passo_atual = 0;
    m.devolvida = true;
    if (P.diasAte(m.prazo) < 3) m.prazo = diasDe(3);
    m.comentarios.push({ autor: u.nome, texto: comentario.trim(), em: agora() });
    ev(m, 'Devolvida à unidade. Prazo: ' + P.fmtData(m.prazo) + '.', u.nome);
    guardar();
    return { ok: true };
  };
  /* Regras do editor (6.4). Devolve a mensagem do que falha, ou null. */
  P.validarWorkflow = function (m, passos) {
    if (!passos.length || passos[0].tipo !== 'recolha') return 'O primeiro passo é sempre de recolha.';
    if (!passos.some(function (p) { return ['revisao', 'parecer', 'aprovacao'].indexOf(p.tipo) > -1; })) return 'O workflow precisa de pelo menos um passo de revisão, parecer ou aprovação.';
    for (var i = 0; i < passos.length; i++) {
      if (!String(passos[i].nome || '').trim()) return 'Todos os passos precisam de nome.';
      if (passos[i].tipo === 'publicacao' && i < passos.length - 1) return 'A publicação tem de ser o último passo.';
    }
    if (m) {
      for (var k = 0; k < m.passo_atual && k < m.passos.length; k++) {
        if (!passos[k] || passos[k].id !== m.passos[k].id) return 'Os passos concluídos não podem mudar.';
      }
      var at = P.passoAtual(m);
      if (at && (!passos[m.passo_atual] || passos[m.passo_atual].id !== at.id || passos[m.passo_atual].tipo !== at.tipo)) return 'O passo atual só pode mudar de nome e de responsável.';
    }
    return null;
  };
  P.guardarWorkflow = function (m, passos, u) {
    var e = P.validarWorkflow(m, passos);
    if (e) return { erro: e };
    m.passos = passos;
    m.workflow_ajustado = true;
    ev(m, 'Workflow alterado: ' + passos.map(function (p) { return p.nome; }).join(' > ') + '.', u.nome);
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
        var porComecar = m.passo_atual === 0 && !m.workflow_ajustado && !m.devolvida && !m.indicadores.some(function (id) { return P.item(id, m.ano).valor !== null; });
        if (porComecar) { m.passos = passosDe(S.wfbase); n++; ev(m, 'Workflow base atualizado aplicado.', 'Backoffice'); }
      });
    }
    guardar();
    return { ok: true, aplicadas: n };
  };

  /* --- Valores ----------------------------------------------------------- */
  P.gravarValor = function (m, id, bruto, u, origem) {
    var it = P.item(id, m.ano), s = String(bruto === null || bruto === undefined ? '' : bruto).trim();
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
    if (!P.podeReexpressar(u)) return { erro: 'Só a equipa de sustentabilidade e o administrador podem reexpressar.' };
    if (!P.concluida(m)) return { erro: 'Só se reexpressam valores aprovados.' };
    var n = lerNumero(bruto), c = P.cat(id), it = P.item(id, m.ano);
    if (n === null) return { erro: 'Indique um valor numérico.' };
    if (!motivo || !motivo.trim()) return { erro: 'O motivo é obrigatório na reexpressão.' };
    var v = P.validar(c, n, m.ano);
    if (v.erros.length) return { erro: v.erros[0] };
    var ant = it.valor;
    it.valor = n; it.reexpresso = true;
    it.versoes.push({ valor: n, em: agora(), por: u.nome, origem: 'reexpressão', motivo: motivo.trim() });
    ev(m, 'Valor reexpresso em ' + c.nome + ': de ' + P.fmtNum(ant, c.casas_decimais) + ' para ' + P.fmtNum(n, c.casas_decimais) + '. Motivo: ' + motivo.trim(), u.nome);
    guardar();
    return { ok: true };
  };
  P.anexar = function (it, nome, u) { it.evidencias.push({ id: 'ev' + Date.now() + Math.random().toString(36).slice(2, 5), ficheiro: nome, por: u.nome, em: agora() }); guardar(); };

  /* --- Contributos externos (secao 9) ------------------------------------ */
  P.criarPedidoExterno = function (m, indId, entidade, descricao, prazo, u) {
    if (!entidade || !String(descricao || '').trim() || !prazo) return { erro: 'Indique a entidade, a descrição e o prazo.' };
    S.ext.push({ id: 'X' + Date.now(), indicador_id: indId, milestone_id: m.id, entidade_externa: entidade, descricao: descricao.trim(), prazo: prazo, estado: 'pendente', valor: null, evidencia: '', respondido_em: null });
    ev(m, 'Pedido externo criado para ' + entidade + ': ' + P.cat(indId).nome + '.', u.nome);
    guardar();
    return { ok: true };
  };
  P.responderExterno = function (x, bruto, evidencia, u) {
    if (x.entidade_externa !== u.nome) return { erro: 'Este pedido não é da sua organização.' };
    var n = lerNumero(bruto), c = P.cat(x.indicador_id);
    if (n === null) return { erro: 'Indique um valor numérico.' };
    var m = P.ms(x.milestone_id), v = P.validar(c, n, m.ano);
    if (v.erros.length) return { erro: v.erros[0] };
    x.valor = n; x.evidencia = evidencia || ''; x.estado = 'recebido'; x.respondido_em = agora();
    ev(m, 'Valor recebido de ' + x.entidade_externa + ' para ' + c.nome + '.', x.entidade_externa);
    guardar();
    return { ok: true };
  };
  P.usarExterno = function (x, u) {
    var m = P.ms(x.milestone_id), it = P.item(x.indicador_id, m.ano);
    if (!P.podePreencher(m, u)) return { erro: 'Só durante a recolha, por quem a tem consigo.' };
    it.valor = x.valor; it.rascunho = null; it.qualidade = 'medido'; it.metodo = '';
    it.versoes.push({ valor: x.valor, em: agora(), por: u.nome, origem: 'externo: ' + x.entidade_externa, motivo: '' });
    if (x.evidencia) it.evidencias.push({ id: 'ev' + Date.now(), ficheiro: x.evidencia, por: x.entidade_externa, em: agora() });
    x.estado = 'aplicado';
    ev(m, 'Contributo externo aplicado em ' + P.cat(x.indicador_id).nome + '.', u.nome);
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
    if (a.length < 5) return { erro: 'São precisos pelo menos 5 indicadores aprovados. Há ' + a.length + '.' };
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    var sel = a.slice(0, 5);
    S.amostra = sel.map(function (x) { return x.id; });
    sel.forEach(function (x) { ev(x.m, 'Indicador na amostra do auditor: ' + P.cat(x.id).nome + '.', u.nome); });
    guardar();
    return { ok: true };
  };
  P.msDoIndicador = function (id, ano) { return P.msCiclo(ano).filter(function (m) { return m.indicadores.indexOf(id) > -1; })[0] || null; };
  P.criarPedidoAuditor = function (indId, texto, u) {
    if (!texto || !texto.trim()) return { erro: 'Escreva o pedido.' };
    var m = P.msDoIndicador(indId);
    S.aud.push({ id: 'A' + Date.now(), indicador_id: indId, texto: texto.trim(), por: u.nome, em: agora(), estado: 'aberto', resposta: null });
    if (m) { m.comentarios.push({ autor: u.nome, texto: 'Pedido de informação sobre ' + P.cat(indId).nome + ': ' + texto.trim(), em: agora(), sistema: true }); ev(m, 'Pedido de informação do auditor sobre ' + P.cat(indId).nome + '.', u.nome); }
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
    if (!P.podeResponderAuditor(a, u)) return { erro: 'Este pedido não é da sua unidade.' };
    if (!texto || !texto.trim()) return { erro: 'Escreva a resposta.' };
    a.resposta = { texto: texto.trim(), por: u.nome, em: agora() }; a.estado = 'respondido';
    var m = P.msDoIndicador(a.indicador_id);
    if (m) m.comentarios.push({ autor: u.nome, texto: 'Resposta ao auditor: ' + texto.trim(), em: agora() });
    guardar();
    return { ok: true };
  };
  P.resolverAuditor = function (a, u) {
    if (u.perfil !== 'auditor' && u.perfil !== 'admin') return { erro: 'Só o auditor dá o pedido por resolvido.' };
    a.estado = 'resolvido';
    var m = P.msDoIndicador(a.indicador_id);
    if (m) ev(m, 'Pedido do auditor resolvido: ' + P.cat(a.indicador_id).nome + '.', u.nome);
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
      if (ext === 'xls') return ok({ nome: nome, erro: 'O formato .xls antigo não é aceite. Guarde o ficheiro como .xlsx e tente de novo.' });
      if (['xlsx', 'csv', 'json'].indexOf(ext) < 0) return ok({ nome: nome, erro: 'Formato não suportado. Use .xlsx, .csv ou .json.' });
      var r = new FileReader();
      r.onerror = function () { ok({ nome: nome, erro: 'Não foi possível ler o ficheiro.' }); };
      r.onload = function () {
        try {
          if (ext === 'xlsx') {
            if (!window.XLSX) return ok({ nome: nome, erro: 'A biblioteca de Excel não carregou.' });
            var wb = window.XLSX.read(new Uint8Array(r.result), { type: 'array' });
            var folha = wb.Sheets.dados || wb.Sheets[wb.SheetNames[0]];
            return ok({ nome: nome, linhas: window.XLSX.utils.sheet_to_json(folha, { defval: '' }) });
          }
          if (ext === 'csv') return ok({ nome: nome, linhas: lerCSV(r.result) });
          var j = JSON.parse(r.result);
          var regs = Array.isArray(j) ? j : j && Array.isArray(j.records) ? j.records.map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; if (o.milestone_id === undefined && j.milestone_id) o.milestone_id = j.milestone_id; return o; }) : null;
          if (!regs) return ok({ nome: nome, erro: 'O JSON tem de ser uma lista de registos ou um objeto com "records".' });
          return ok({ nome: nome, linhas: regs });
        } catch (e) { ok({ nome: nome, erro: 'Ficheiro inválido: ' + e.message }); }
      };
      if (ext === 'xlsx') r.readAsArrayBuffer(file); else r.readAsText(file, 'utf-8');
    });
  };
  P.validarImportacao = function (m, linhas) {
    var rel = { linhas: [], desconhecidas: [], erroFormato: null, emFalta: [] };
    if (!linhas || !linhas.length) { rel.erroFormato = 'O ficheiro não tem linhas de dados.'; return rel; }
    var cols = {};
    linhas.forEach(function (l) { Object.keys(l).forEach(function (k) { cols[k] = 1; }); });
    var falta = OBRIG.filter(function (c) { return !cols[c]; });
    if (falta.length) { rel.erroFormato = 'Faltam as colunas obrigatórias: ' + falta.join(', ') + '.'; return rel; }
    rel.desconhecidas = Object.keys(cols).filter(function (c) { return COLS.indexOf(c) < 0; });
    var vistos = {};
    linhas.forEach(function (l, i) {
      var id = String(l.indicator_id === undefined ? '' : l.indicator_id).trim();
      var r = { n: i + 2, indicador: id, valor: l.value, estado: 'valida', motivos: [], dados: l };
      var sem = l.value === '' || l.value === null || l.value === undefined;
      if (sem && m.indicadores.indexOf(id) > -1 && !vistos[id]) { r.estado = 'vazia'; rel.linhas.push(r); return; }
      var rej = function (t) { r.estado = 'rejeitada'; r.motivos.push(t); };
      /* 2. Milestone e indicadores */
      if (String(l.milestone_id).trim() !== m.id) rej('milestone_id deve ser ' + m.id + '.');
      if (m.indicadores.indexOf(id) < 0) rej('O indicador ' + (id || '(vazio)') + ' não pertence a esta milestone.');
      else if (vistos[id]) rej('Indicador repetido no ficheiro.');
      var c = P.cat(id), n = lerNumero(l.value);
      /* 3. Tipos, ano e unidades */
      if (n === null) rej('value tem de ser numérico.');
      if (String(l.period).trim() !== String(m.ano)) rej('period deve ser ' + m.ano + '.');
      if (c && String(l.unit).trim() !== c.unidade_medida) rej('unit deve ser ' + c.unidade_medida + '.');
      var q = String(l.data_quality || '').trim() || 'measured';
      if (['measured', 'calculated', 'estimated'].indexOf(q) < 0) rej('data_quality deve ser measured, calculated ou estimated.');
      if (r.estado === 'valida' && c) {
        /* 4. Intervalos e 5. regras de negocio */
        var v = P.validar(c, n, m.ano);
        v.erros.forEach(rej);
        var it = P.item(id, m.ano);
        if (q === 'estimated' && !String(l.estimation_method || '').trim()) rej('estimation_method é obrigatório quando data_quality é estimated.');
        if (c.evidencia_obrigatoria && !String(l.evidence_ref || '').trim() && !it.evidencias.length) rej('evidence_ref é obrigatório neste indicador.');
        if (r.estado === 'valida' && v.alertas.length) {
          r.estado = 'alerta';
          r.motivos = v.alertas.slice();
          if (!String(l.justification || '').trim()) r.motivos.push('Falta justification: terá de a preencher antes de submeter.');
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
      var l = r.dados, it = P.item(r.indicador, m.ano);
      P.gravarValor(m, r.indicador, l.value, u, 'importação de ficheiro ' + ficheiro);
      it.qualidade = QUAL[String(l.data_quality || '').trim() || 'measured'];
      it.metodo = String(l.estimation_method || '').trim();
      if (String(l.justification || '').trim()) it.justificacao = String(l.justification).trim();
      if (String(l.source_system || '').trim()) it.fonte = String(l.source_system).trim();
      if (String(l.entity || '').trim()) it.entidade = String(l.entity).trim();
      if (String(l.evidence_ref || '').trim() && !it.evidencias.some(function (e) { return e.ficheiro === String(l.evidence_ref).trim(); })) it.evidencias.push({ id: 'ev' + Date.now() + r.n, ficheiro: String(l.evidence_ref).trim(), por: u.nome, em: agora() });
      n++;
    });
    ev(m, 'Importação de ' + ficheiro + ': ' + n + ' linha(s) aplicada(s).', u.nome);
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
    l.forEach(function (x) { var c = P.cat(x.indicator_id); x.value = valorDemo(c); if (c.evidencia_obrigatoria) x.evidence_ref = 'DOC-' + m.ano + '-0001'; x.justification = c.regras_coerencia.length ? 'Confirmado com a área.' : ''; });
    if (l[0]) l[0].unit = 'unidade-errada';
    if (l[1]) l[1].period = String(m.ano - 1);
    l.push({ milestone_id: m.id, indicator_id: m.indicadores.indexOf('G01') > -1 ? 'A01' : 'G01', indicator_name: 'Indicador de outra milestone', entity: 'Consolidado', period: String(m.ano), value: 10, unit: '€', justification: '', source_system: 'ERP', evidence_ref: '', data_quality: 'measured', estimation_method: '' });
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
  var escreverLivro = function (nome, folhas) {
    var wb = window.XLSX.utils.book_new();
    Object.keys(folhas).forEach(function (n) {
      var ws = Array.isArray(folhas[n]) && folhas[n].length ? window.XLSX.utils.json_to_sheet(folhas[n]) : window.XLSX.utils.aoa_to_sheet([['Sem dados']]);
      window.XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31));
    });
    window.XLSX.writeFile(wb, nome);
    return wb;
  };
  P.folhasTemplate = function (m) {
    return {
      dados: linhasTemplate(m),
      instrucoes: m.indicadores.map(function (id) {
        var c = P.cat(id), ant = P.valorAnterior(id, m.ano);
        return { indicador: id, nome: c.nome, unidade: c.unidade_medida, ano_anterior: ant === null || ant === undefined ? '' : ant, limiar_pct: c.limiar_variacao_pct, evidencia_obrigatoria: c.evidencia_obrigatoria ? 'Sim' : 'Não', regra: 'period = ' + m.ano + '; unit igual à indicada; value numérico; justification obrigatória quando há alerta; estimation_method obrigatório quando data_quality é estimated.' };
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
      $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Submissão da milestone ' + m.id, type: 'object', required: ['milestone_id', 'records'],
      properties: {
        milestone_id: { const: m.id }, submitted_by: { type: 'string' }, source_system: { type: 'string' },
        records: { type: 'array', minItems: 1, items: { type: 'object', required: ['indicator_id', 'period', 'value', 'unit'], properties: {
          indicator_id: { oneOf: uni }, indicator_name: { type: 'string' }, entity: { type: 'string', default: 'Consolidado' }, period: { const: String(m.ano) }, value: { type: 'number' },
          unit: { type: 'string', description: 'Tem de ser igual à unidade do indicador.' }, justification: { type: 'string' }, source_system: { type: 'string' }, evidence_ref: { type: 'string' },
          data_quality: { enum: ['measured', 'calculated', 'estimated'], default: 'measured' }, estimation_method: { type: 'string' }
        } } }
      }
    };
  };

  /* --- Exportacoes (secao 18) -------------------------------------------- */
  var submissao = function (m) { var p = m.passos.filter(function (x) { return x.tipo === 'recolha'; })[0]; return p || {}; };
  var aprovacao = function (m) { var a = m.passos.filter(function (x) { return x.tipo === 'aprovacao'; }); return a[a.length - 1] || {}; };
  var QUALIDADE_TXT = { medido: 'Medido', calculado: 'Calculado', estimado: 'Estimado' };
  P.QUALIDADE_TXT = QUALIDADE_TXT;
  P.rastreabilidade = function (mFiltro) {
    var r = [];
    P.msCiclo().forEach(function (m) {
      if (mFiltro && m.id !== mFiltro.id) return;
      m.indicadores.forEach(function (id) {
        var c = P.cat(id), it = P.item(id, m.ano), s = submissao(m), a = aprovacao(m);
        r.push({ indicador_id: id, indicador: c.nome, valor: it.valor, unidade_medida: c.unidade_medida, qualidade: QUALIDADE_TXT[it.qualidade], metodo: it.metodo, esrs: c.esrs_requisito, gri: c.gri, unidade: m.unidade, milestone: m.nome,
          submetido_por: s.concluido_por || '', submetido_em: s.concluido_em ? P.fmtDataHora(s.concluido_em) : '', aprovado_por: a.concluido_por || '', aprovado_em: a.concluido_em ? P.fmtDataHora(a.concluido_em) : '',
          evidencias: it.evidencias.map(function (e) { return e.ficheiro; }).join(', '), reexpresso: it.reexpresso ? 'Sim' : 'Não', na_amostra: S.amostra.indexOf(id) > -1 ? 'Sim' : 'Não', estado: P.estadoIndicador(m, id).txt });
      });
    });
    return r;
  };
  P.folhasDataRoom = function () {
    var hist = [], wf = [];
    P.msCiclo().forEach(function (m) {
      m.indicadores.forEach(function (id) { P.item(id, m.ano).versoes.forEach(function (v) { hist.push({ indicador_id: id, indicador: P.cat(id).nome, valor: v.valor, em: P.fmtDataHora(v.em), por: v.por, origem: v.origem, motivo: v.motivo || '' }); }); });
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
        o.estado = m ? P.estadoIndicador(m, c.id).txt : 'Por recolher'; o.qualidade = apr ? QUALIDADE_TXT[it.qualidade] : ''; o.esrs = c.esrs_requisito; o.gri = c.gri;
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
    if (!P.gereTudo(u)) return { erro: 'Sem permissão.' };
    var antigo = S.ciclo.ano, ano = antigo + 1, sufixo = '_' + ano;
    var offset = { Mensal: 30, Trimestral: 60, Anual: 90, 'Novos dados ESRS': 120 };
    P.msCiclo(antigo).forEach(function (a) {
      var id = a.id.split('_')[0] + sufixo;
      var m = { id: id, nome: nomeMs(a.periodicidade, ano, a.unidade), ano: ano, unidade: a.unidade, periodicidade: a.periodicidade, prazo: diasDe(offset[a.periodicidade] || 90), indicadores: a.indicadores.slice(), passos: passosDe(S.wfbase), passo_atual: 0, devolvida: false, workflow_ajustado: false, documentos_gerais: [], comentarios: [], eventos: [] };
      ev(m, 'Milestone criada no ciclo ' + ano + '.', u.nome);
      S.ms.push(m);
      m.indicadores.forEach(function (i) { S.items[ano + ':' + i] = novoItem(i, ano, id, P.cat(i).tipo); });
    });
    S.ciclo.fechados = (S.ciclo.fechados || []).concat([antigo]);
    S.ciclo.ano = ano; S.ciclo.data_abertura = hojeISO(); S.amostra = [];
    guardar();
    return { ok: true, ano: ano, criadas: P.msCiclo(ano).length };
  };

  /* --- Notificacoes (secao 14.13) ---------------------------------------- */
  P.notificacoes = function (u) {
    var n = [];
    if (!u) return n;
    var add = function (cls, texto, sub, rota) { n.push({ cls: cls, texto: texto, sub: sub, rota: rota }); };
    if (u.perfil === 'ext') {
      S.ext.filter(function (x) { return x.entidade_externa === u.nome && x.estado === 'pendente'; }).forEach(function (x) { add('warn', 'Pedido de dados: ' + P.cat(x.indicador_id).nome, 'Prazo ' + P.fmtData(x.prazo), 'Pedidos'); });
      return n;
    }
    P.msCiclo().forEach(function (m) {
      var est = P.estadoMs(m), r = 'Milestone/' + m.id;
      var minha = u.perfil === 'resp' && u.unidade === m.unidade;
      if (minha || P.gereTudo(u)) {
        if (est.cod === 'devolvida') add('err', m.nome + ' foi devolvida', 'Corrigir e submeter de novo', r);
        if (est.cod === 'atraso') add('err', m.nome + ' está em atraso', 'Prazo ' + P.fmtData(m.prazo), r);
        if (est.cod === 'recolha' && P.diasAte(m.prazo) <= 5) add('warn', m.nome + ' com prazo próximo', 'Prazo ' + P.fmtData(m.prazo), r);
      }
      if (P.podeAgir(m, u) && ['revisao', 'parecer', 'aprovacao'].indexOf(est.cod) > -1) add('info', m.nome + ' à espera de decisão', P.passoAtual(m).nome, r);
    });
    S.aud.forEach(function (a) {
      var m = P.msDoIndicador(a.indicador_id), r = m ? 'Milestone/' + m.id + '?sep=auditoria' : 'Auditoria';
      if (a.estado === 'aberto' && P.podeResponderAuditor(a, u)) add('warn', 'Pedido do auditor: ' + P.cat(a.indicador_id).nome, 'Em aberto', r);
      if (a.estado === 'respondido' && u.perfil === 'auditor') add('ok', 'Pedido respondido: ' + P.cat(a.indicador_id).nome, 'Pode dar por resolvido', r);
    });
    S.ext.filter(function (x) { return x.estado === 'recebido'; }).forEach(function (x) {
      var m = P.ms(x.milestone_id);
      if (m && P.acompanha(m, u)) add('ok', 'Valor recebido de ' + x.entidade_externa, P.cat(x.indicador_id).nome, 'Milestone/' + m.id + '?sep=externos');
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
    if (!o || typeof o !== 'object' || !o.cores) return 'O ficheiro não tem as cores da marca.';
    var cores = ['primary', 'secondary', 'accent', 'bg', 'text'];
    for (var i = 0; i < cores.length; i++) if (!HEX.test(o.cores[cores[i]] || '')) return 'A cor ' + cores[i] + ' não é válida.';
    if (!P.urlLogoValida(o.logotipo)) return 'O link do logótipo tem de começar por http:// ou https://.';
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
