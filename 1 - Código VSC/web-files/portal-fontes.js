/* ============================================================================
   portal-fontes.js - fontes de dados, campos e calculos da milestone
   Cada indicador e uma formula sobre campos de bases de dados (ERP, RH,
   telemetria, laboratorio, comercial, ambiente). Puxar le os registos dos
   campos da milestone; calcular aplica as formulas; preencher grava os valores.
   As bases ainda nao estao ligadas: os registos sao de teste, gerados aqui.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var A = X.A, e = X.e, chip = X.chip, cabCartao = X.cabCartao, tabela = X.tabela, toast = X.toast, R = X.R, u = X.u, fmtV = X.fmtV;

  var DBS = { erp: 'ERP', rh: 'Human resources system', tele: 'Telemetry (SCADA)', lab: 'Laboratory (LIMS)', com: 'Commercial system (CRM)', amb: 'Environmental management' };
  /* Indicadores de base: [campo, base, tabela, descricao, agregacao] */
  var BASE = {
    A01: ['volume_entrada_mm3', 'tele', 'volumes_agua', 'Água entrada no sistema', 'soma'], A02: ['volume_faturado_mm3', 'com', 'faturacao_agua', 'Água faturada', 'soma'],
    A04: ['clientes_agua_milhares', 'com', 'clientes', 'Clientes de abastecimento', 'ultimo'], A06: ['n_eta', 'tele', 'ativos', 'ETA em operação', 'ultimo'],
    A07: ['ext_abastecimento_km', 'tele', 'ativos', 'Extensão da rede de abastecimento', 'ultimo'], A08: ['volume_captado_mm3', 'tele', 'volumes_agua', 'Água potável captada', 'soma'],
    A09: ['roturas_pesquisa', 'tele', 'ocorrencias_rede', 'Roturas detetadas na pesquisa ativa', 'soma'], A12: ['conf_bacteriologica_pct', 'lab', 'analises_agua', 'Análises bacteriológicas conformes', 'media'],
    A13: ['conf_fisicoquimica_pct', 'lab', 'analises_agua', 'Análises físico-químicas conformes', 'media'], R01: ['volume_residual_faturado_mm3', 'com', 'faturacao_saneamento', 'Água residual faturada', 'soma'],
    R02: ['n_etar', 'tele', 'ativos', 'ETAR em operação', 'ultimo'], R03: ['ext_drenagem_km', 'tele', 'ativos', 'Extensão da rede de drenagem', 'ultimo'],
    R04G: ['volume_tratado_grupo_mm3', 'tele', 'volumes_etar', 'Águas residuais tratadas, perímetro do grupo', 'soma'], R04: ['volume_tratado_mm3', 'tele', 'volumes_etar', 'Águas residuais tratadas', 'soma'],
    R09: ['lamas_tms', 'amb', 'lamas', 'Lamas produzidas', 'soma'], R10: ['lamas_valorizadas_pct', 'amb', 'lamas', 'Lamas valorizadas', 'media'],
    R11: ['lamas_espalhamento_pct', 'amb', 'lamas', 'Lamas com destino a espalhamento', 'media'], R12: ['lamas_compostagem_pct', 'amb', 'lamas', 'Lamas com destino a compostagem', 'media'],
    P02: ['colaboradores_grupo', 'rh', 'efetivos', 'Colaboradores do grupo', 'ultimo'], C01: ['projetos_sensibilizacao', 'com', 'comunidade', 'Projetos de sensibilização ambiental', 'soma'],
    C02: ['nps', 'com', 'inquerito_satisfacao', 'Net Promoter Score', 'ultimo'], C03: ['investimento_digital_eur', 'erp', 'investimentos', 'Investimento em inovação digital', 'soma'],
    E09: ['frota_verde_pct', 'erp', 'frota', 'Viaturas elétricas e híbridas plug-in', 'ultimo'], E04: ['energia_primaria_mwh', 'erp', 'energia', 'Energia primária consumida', 'soma'],
    E01: ['eletricidade_mwh', 'erp', 'faturas_energia', 'Eletricidade consumida', 'soma'], E03: ['eletricidade_renovavel_pct', 'erp', 'faturas_energia', 'Eletricidade com garantia de origem renovável', 'media'],
    E02: ['eletricidade_ppa_mwh', 'erp', 'faturas_energia', 'Eletricidade adquirida por PPA', 'soma'], P01: ['forca_trabalho', 'rh', 'efetivos', 'Força de trabalho a 31/12', 'ultimo'],
    P05: ['estagiarios', 'rh', 'efetivos', 'Estagiários', 'ultimo'], P11: ['deficiencia_pct', 'rh', 'efetivos', 'Colaboradores com deficiência', 'ultimo'],
    P12: ['horas_formacao', 'rh', 'formacao', 'Horas de formação', 'soma'], P15: ['formacao_seguranca_pct', 'rh', 'formacao', 'Trabalhadores com formação em segurança', 'ultimo'],
    P17: ['acidentes_fatais', 'rh', 'acidentes', 'Acidentes de trabalho fatais', 'soma'], G01: ['compras_total_eur', 'erp', 'compras', 'Compras a fornecedores', 'soma'],
    G03: ['cobertura_canal_pct', 'rh', 'etica', 'Cobertura do canal de denúncias', 'ultimo'], G04: ['formacao_anticorrupcao_pct', 'rh', 'formacao', 'Formação anticorrupção nas funções expostas', 'ultimo'],
    G05: ['declaracao_etica_pct', 'rh', 'etica', 'Gestores com declaração de ética', 'ultimo'], G06: ['alertas_resposta_pct', 'rh', 'etica', 'Alertas com resposta escrita', 'ultimo'],
    N01: ['emissoes_ambito3_tco2e', 'amb', 'emissoes', 'Emissões de Âmbito 3', 'soma'], N02: ['reagentes_t', 'erp', 'reagentes', 'Reagentes químicos consumidos', 'soma'],
    N03: ['residuos_t', 'amb', 'residuos', 'Resíduos produzidos', 'soma'], N04: ['gases_fluorados_kg', 'amb', 'gases_fluorados', 'Gases fluorados recarregados', 'soma'],
    N05: ['gap_salarial_pct', 'rh', 'remuneracoes', 'Diferença salarial entre géneros', 'ultimo'], N06: ['reclamacoes', 'com', 'reclamacoes', 'Reclamações de clientes', 'soma'],
    N07: ['incidentes_dados', 'com', 'incidentes', 'Incidentes com dados pessoais', 'soma'], N08: ['instalacoes_sensiveis', 'amb', 'biodiversidade', 'Instalações em áreas sensíveis', 'ultimo']
  };
  /* Campos que so entram em calculos: [base, tabela, descricao, unidade, agregacao, valor ou [campo, proporcao]] */
  var EXTRA = {
    volume_autorizado_mm3: ['tele', 'volumes_agua', 'Água faturada e consumos autorizados', 'Mm³', 'soma', ['volume_entrada_mm3', 0.797]],
    clientes_captacao_milhares: ['com', 'clientes', 'Clientes servidos pelas captações próprias', 'milhares', 'ultimo', 134],
    perdas_reais_mm3: ['tele', 'balanco_hidrico', 'Perdas reais', 'Mm³', 'soma', 3.45],
    cqo_afluente_t: ['lab', 'cargas_etar', 'CQO no afluente', 't', 'soma', 18400], cqo_efluente_t: ['lab', 'cargas_etar', 'CQO no efluente', 't', 'soma', 1290],
    cbo_afluente_t: ['lab', 'cargas_etar', 'CBO no afluente', 't', 'soma', 8900], cbo_efluente_t: ['lab', 'cargas_etar', 'CBO no efluente', 't', 'soma', 372],
    azoto_afluente_t: ['lab', 'cargas_etar', 'Azoto total no afluente', 't', 'soma', 1720], azoto_efluente_t: ['lab', 'cargas_etar', 'Azoto total no efluente', 't', 'soma', 560],
    fosforo_afluente_t: ['lab', 'cargas_etar', 'Fósforo no afluente', 't', 'soma', 290], fosforo_efluente_t: ['lab', 'cargas_etar', 'Fósforo no efluente', 't', 'soma', 118],
    combustivel_recolha_l: ['erp', 'combustiveis', 'Combustível da frota de recolha', 'L', 'soma', 412000], residuos_recolhidos_t: ['amb', 'recolha', 'Resíduos recolhidos', 't', 'soma', 41500],
    eletricidade_eta_kwh: ['tele', 'energia_instalacoes', 'Eletricidade nas ETA e captações', 'kWh', 'soma', 31400000], agua_produzida_m3: ['tele', 'volumes_agua', 'Água produzida', 'm³', 'soma', 46100000],
    gas_natural_m3: ['erp', 'combustiveis', 'Gás natural nas caldeiras', 'm³', 'soma', 920000], gasoleo_l: ['erp', 'combustiveis', 'Gasóleo da frota própria', 'L', 'soma', 420000],
    refrigerante_r410a_kg: ['amb', 'gases_fluorados', 'Fugas de refrigerante R-410A', 'kg', 'soma', 52],
    fator_rede_kgco2e_mwh: ['amb', 'fatores_emissao', 'Fator de emissão da rede elétrica', 'kgCO2e/MWh', 'ultimo', 158],
    receitas_eur: ['erp', 'receitas', 'Receitas', '€', 'soma', 61700000],
    colaboradores_total: ['rh', 'efetivos', 'Total de colaboradores', 'n.º', 'ultimo', 488], colaboradores_permanentes: ['rh', 'efetivos', 'Colaboradores com contrato sem termo', 'n.º', 'ultimo', 324],
    mulheres: ['rh', 'efetivos', 'Mulheres', 'n.º', 'ultimo', 122], estudantes_estagiarios: ['rh', 'efetivos', 'Estudantes e estagiários', 'n.º', 'ultimo', 2],
    saidas: ['rh', 'movimentos', 'Saídas no período', 'n.º', 'soma', 95], efetivo_medio: ['rh', 'efetivos', 'Efetivo médio', 'n.º', 'media', 489],
    mulheres_lideranca: ['rh', 'efetivos', 'Mulheres em cargos de liderança', 'n.º', 'ultimo', 28], cargos_lideranca: ['rh', 'efetivos', 'Cargos de liderança', 'n.º', 'ultimo', 75],
    colaboradores_menos_26: ['rh', 'efetivos', 'Colaboradores com menos de 26 anos', 'n.º', 'ultimo', 18], colaboradores_mais_55: ['rh', 'efetivos', 'Colaboradores com mais de 55 anos', 'n.º', 'ultimo', 101],
    colaboradores_formados: ['rh', 'formacao', 'Colaboradores com formação concluída', 'n.º', 'ultimo', 166],
    dias_perdidos: ['rh', 'acidentes', 'Dias perdidos por acidente', 'dias', 'soma', 3300], horas_trabalhadas: ['rh', 'assiduidade', 'Horas trabalhadas', 'horas', 'soma', 768000],
    horas_ausencia: ['rh', 'assiduidade', 'Horas de ausência', 'horas', 'soma', 20970], horas_teoricas: ['rh', 'assiduidade', 'Horas teóricas de trabalho', 'horas', 'soma', 768000],
    compras_nacionais_eur: ['erp', 'compras', 'Compras a fornecedores nacionais', '€', 'soma', ['compras_total_eur', 0.947]]
  };
  var E06 = 'gas_natural_m3 * fator.gas + gasoleo_l * fator.gasoleo + refrigerante_r410a_kg * fator.r410a';
  /* Indicadores calculados. t e o texto da formula quando o catalogo nao a tem. */
  var DERIV = {
    A03: { x: '(volume_entrada_mm3 - volume_faturado_mm3) / volume_entrada_mm3 * 100' }, A05: { x: 'volume_captado_mm3 * 1000 / clientes_captacao_milhares' },
    A10: { x: 'volume_autorizado_mm3 / volume_entrada_mm3 * 100' }, A11: { x: 'perdas_reais_mm3 * 1000000 / (ext_abastecimento_km * 365)' },
    R05: { x: '(cqo_afluente_t - cqo_efluente_t) / cqo_afluente_t * 100' }, R06: { x: '(cbo_afluente_t - cbo_efluente_t) / cbo_afluente_t * 100' },
    R07: { x: '(azoto_afluente_t - azoto_efluente_t) / azoto_afluente_t * 100' }, R08: { x: '(fosforo_afluente_t - fosforo_efluente_t) / fosforo_afluente_t * 100' },
    W01: { x: 'combustivel_recolha_l / residuos_recolhidos_t' }, E05: { x: 'eletricidade_eta_kwh / agua_produzida_m3' },
    E06: { x: E06 }, E07: { x: 'eletricidade_mwh * fator_rede_kgco2e_mwh * (1 - eletricidade_renovavel_pct / 100)' }, E08: { x: '(' + E06 + ') / receitas_eur' },
    P03: { x: 'colaboradores_permanentes / colaboradores_total * 100' }, P04: { x: 'mulheres / colaboradores_total * 100' },
    P06: { x: 'estudantes_estagiarios / colaboradores_total * 100' }, P07: { x: 'saidas / efetivo_medio * 100' }, P08: { x: 'mulheres_lideranca / cargos_lideranca * 100' },
    P09: { x: 'colaboradores_menos_26 / colaboradores_total * 100', t: 'Colaboradores com menos de 26 anos / total de colaboradores' },
    P10: { x: 'colaboradores_mais_55 / colaboradores_total * 100', t: 'Colaboradores com mais de 55 anos / total de colaboradores' },
    P13: { x: 'colaboradores_formados / colaboradores_total * 100', t: 'Colaboradores com formação concluída / total de colaboradores' },
    P14: { x: 'dias_perdidos / horas_trabalhadas * 100' }, P16: { x: 'horas_ausencia / horas_teoricas * 100' }, G02: { x: 'compras_nacionais_eur / compras_total_eur * 100' }
  };
  var AGREG = { soma: 'Sum', media: 'Average', ultimo: 'Latest value' };
  var BASE_SEM = { C01: 12, C03: 450000, E02: 8000, P17: 0, N01: 4200, N02: 1850, N03: 640, N04: 36, N05: 11.4, N06: 310, N07: 2, N08: 5 };

  /* Dicionario de campos */
  var CAMPOS = {};
  Object.keys(BASE).forEach(function (id) { var b = BASE[id]; CAMPOS[b[0]] = { k: b[0], db: b[1], tab: b[2], rot: b[3], agreg: b[4], ind: id }; });
  Object.keys(EXTRA).forEach(function (k) { var x = EXTRA[k]; CAMPOS[k] = { k: k, db: x[0], tab: x[1], rot: x[2], un: x[3], agreg: x[4], v: x[5] }; });
  var hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
  var unidade = function (f) { if (f.un) return f.un; var c = P.cat(f.ind); return c ? c.unidade_medida : ''; };
  /* Valor anual de teste de um campo */
  var LIGADOS = { volume_faturado_mm3: ['volume_entrada_mm3', 0.823] };
  var anual = function (k) {
    var f = CAMPOS[k];
    if (LIGADOS[k]) return anual(LIGADOS[k][0]) * LIGADOS[k][1];
    if (Array.isArray(f.v)) return anual(f.v[0]) * f.v[1];
    if (typeof f.v === 'number') return f.v;
    var c = P.cat(f.ind), b = c && c.ano_anterior !== null && c.ano_anterior !== undefined ? c.ano_anterior : BASE_SEM[f.ind];
    var v = (b || 0) * (0.97 + hash(k) * 0.09);
    if (c && c.unidade_medida === '%') v = Math.min(v, 100);
    if (c && c.casas_decimais === 0) v = Math.round(v);
    return v;
  };
  /* Registos de teste: meses para somas e medias, trimestres para ultimos valores */
  P.registosCampo = function (k, m) {
    var f = CAMPOS[k], tot = anual(k), n = f.agreg === 'ultimo' ? 4 : 12, l = [], ac = 0;
    for (var i = 0; i < n; i++) {
      var per = n === 4 ? m.ano + '-Q' + (i + 1) : m.ano + '-' + (i < 9 ? '0' : '') + (i + 1), w = 0.9 + hash(k + i) * 0.2, v;
      if (f.agreg === 'soma') { v = i === n - 1 ? tot - ac : Math.round((tot / n) * w * 10000) / 10000; ac += v; }
      else if (f.agreg === 'media') { v = i === n - 1 ? tot * n - ac : Math.round(Math.min(tot * (0.995 + hash(k + i) * 0.01), unidade(f) === '%' ? 100 : Infinity) * 10000) / 10000; ac += v; }
      else v = i === n - 1 ? tot : Math.round(tot * (0.96 + i * 0.01) * 10000) / 10000;
      l.push({ periodo: per, empresa: m.empresa, valor: v, ref: f.tab.toUpperCase().slice(0, 3) + '-' + m.ano + '-' + String(1 + Math.floor(hash(k + 'r' + i) * 8999)).padStart(4, '0') });
    }
    return l;
  };
  var agregarRegistos = function (k, l) { var f = CAMPOS[k]; if (!l.length) return null; if (f.agreg === 'ultimo') return l[l.length - 1].valor; var s = l.reduce(function (a, r) { return a + r.valor; }, 0); return f.agreg === 'media' ? s / l.length : s; };

  /* --- Formulas: avaliador proprio, sem eval ---------------------------------- */
  var tokens = function (x) { return String(x).match(/\d+(?:\.\d+)?|[A-Za-z_][\w.]*|[-+*/()]/g) || []; };
  P.camposDaFormula = function (x) { return tokens(x).filter(function (t) { return /^[A-Za-z_]/.test(t); }).filter(function (t, i, a) { return a.indexOf(t) === i; }); };
  var avaliar = function (x, ler) {
    var t = tokens(x), i = 0;
    var prim = function () {
      var k = t[i++];
      if (k === '(') { var v = soma(); i++; return v; }
      if (k === '-') return -prim();
      if (/^\d/.test(k)) return Number(k);
      var v2 = ler(k); if (v2 === null || v2 === undefined || isNaN(v2)) throw new Error(k); return v2;
    };
    var prod = function () { var v = prim(); while (t[i] === '*' || t[i] === '/') { var o = t[i++], w = prim(); if (o === '/' && w === 0) throw new Error('/0'); v = o === '*' ? v * w : v / w; } return v; };
    var soma = function () { var v = prod(); while (t[i] === '+' || t[i] === '-') { var o = t[i++], w = prod(); v = o === '+' ? v + w : v - w; } return v; };
    return soma();
  };
  var fator = function (k) { var id = k.split('.')[1], f = S.fatores.filter(function (x) { return x.id === id; })[0]; return f ? f.fator : null; };
  P.expressaoDe = function (id) { return DERIV[id] ? DERIV[id].x : BASE[id] ? BASE[id][0] : null; };
  P.formulaTxt = function (id) {
    var c = P.cat(id);
    if (DERIV[id]) return c.formula || DERIV[id].t || DERIV[id].x;
    var b = BASE[id]; return b ? AGREG[b[4]] + ' of ' + b[0] + ' (' + DBS[b[1]] + ')' : 'Reported value';
  };
  P.camposMilestone = function (m) {
    var o = []; m.indicadores.forEach(function (id) { var x = P.expressaoDe(id); if (x) P.camposDaFormula(x).forEach(function (k) { if (CAMPOS[k] && o.indexOf(k) < 0) o.push(k); }); });
    return o;
  };
  var porCampo = function (m, k) { return m.indicadores.filter(function (id) { var x = P.expressaoDe(id); return x && P.camposDaFormula(x).indexOf(k) > -1; }); };

  /* --- Puxar, calcular e preencher ------------------------------------------- */
  var podePuxar = function (m, usr) { return P.podePreencher(m, usr); };
  P.puxarDados = function (m, usr) {
    if (!podePuxar(m, usr)) return { erro: 'You can only pull data while the milestone is in collection with you.' };
    if (!S.puxados) S.puxados = {};
    var vals = {}, n = 0, bases = {};
    P.camposMilestone(m).forEach(function (k) { var l = P.registosCampo(k, m); vals[k] = agregarRegistos(k, l); n += l.length; bases[CAMPOS[k].db] = 1; });
    S.puxados[m.id] = { em: new Date().toISOString(), por: usr.nome, vals: vals, registos: n };
    P.evento(m, 'Data pulled from ' + Object.keys(bases).map(function (b) { return DBS[b]; }).join(', ') + ': ' + Object.keys(vals).length + ' fields, ' + n + ' records.', usr.nome);
    P.guardar();
    return { campos: Object.keys(vals).length, registos: n };
  };
  P.calculosMilestone = function (m) {
    var px = (S.puxados || {})[m.id];
    return m.indicadores.map(function (id) {
      var x = P.expressaoDe(id), c = P.cat(id), r = { id: id, x: x, valor: null, falta: [], subst: '' };
      if (!x) return r;
      var ler = function (k) { if (k.indexOf('fator.') === 0) return fator(k); return px && px.vals[k] !== undefined ? px.vals[k] : null; };
      P.camposDaFormula(x).forEach(function (k) { if (ler(k) === null) r.falta.push(k); });
      r.subst = x.replace(/[A-Za-z_][\w.]*/g, function (k) { var v = ler(k); return v === null ? k : P.fmtNum(v, Math.abs(v) < 10 ? 3 : 2); });
      if (!r.falta.length) { try { r.valor = Number(avaliar(x, ler).toFixed(c.casas_decimais)); if (c.unidade_medida === '%' && r.valor > 100) r.valor = 100; } catch (er) { r.erro = 'Cannot calculate: ' + er.message; } }
      return r;
    });
  };
  P.preencherCalculados = function (m, usr, ids) {
    if (!podePuxar(m, usr)) return { erro: 'This milestone is read only for you right now.' };
    var n = 0;
    P.calculosMilestone(m).forEach(function (r) {
      if (r.valor === null || (ids && ids.indexOf(r.id) < 0)) return;
      var it = P.item(r.id, m.ano);
      P.gravarValor(m, r.id, String(r.valor).replace('.', ','), usr, DERIV[r.id] ? 'calculated from data sources' : 'data source');
      it.qualidade = DERIV[r.id] ? 'calculado' : 'medido'; it.metodo = '';
      n++;
    });
    if (n) { P.evento(m, n + ' value(s) filled in from the data sources.', usr.nome); P.guardar(); }
    return { n: n };
  };
  P.schemaCampos = function (m) {
    var props = { company: { type: 'string', description: 'Company of the record' }, period: { type: 'string', description: 'YYYY-MM or YYYY-Qn' }, record_ref: { type: 'string', description: 'Reference of the source document or reading' } };
    P.camposMilestone(m).forEach(function (k) { var f = CAMPOS[k]; props[k] = { type: 'number', description: f.rot + ' (' + unidade(f) + ')', 'x-source': DBS[f.db] + ' / ' + f.tab, 'x-aggregation': AGREG[f.agreg] }; });
    return { $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Data fields for ' + m.nome, type: 'object', properties: props, required: ['company', 'period'] };
  };
  P.CAMPOS_FONTE = CAMPOS; P.BASES_DADOS = DBS;

  /* --- Ecra ------------------------------------------------------------------ */
  var num = function (v) { return v === null || v === undefined ? '-' : P.fmtNum(v, Math.abs(v) < 10 ? 3 : 2); };
  P.fontesHtml = function (m) {
    var usr = u(), pode = podePuxar(m, usr), px = (S.puxados || {})[m.id], ks = P.camposMilestone(m), dbs = {};
    ks.forEach(function (k) { var f = CAMPOS[k]; (dbs[f.db] = dbs[f.db] || {})[f.tab] = 1; });
    var bases = '<ul class="fd-dbs">' + Object.keys(dbs).map(function (d) { return '<li><b>' + e(DBS[d]) + '</b><small>' + Object.keys(dbs[d]).map(e).join(', ') + '</small>' + chip('Test data', 'info') + '</li>'; }).join('') + '</ul>';
    var linhas = ks.map(function (k) {
      var f = CAMPOS[k], v = px ? px.vals[k] : null, regs = px ? P.registosCampo(k, m) : [];
      return ['<span class="ps-mono fd-k">' + e(k) + '</span>', e(f.rot), e(unidade(f)), e(DBS[f.db]) + '<br><small class="ps-mut ps-mono">' + e(f.tab) + '</small>', e(AGREG[f.agreg]), porCampo(m, k).map(function (id) { return '<button type="button" class="ps-btn liga" data-a="ficha" data-v="' + e(id) + '">' + e(id) + '</button>'; }).join(', '),
        px ? '<details class="fd-reg"><summary class="ps-num"><b>' + e(num(v)) + '</b> <small class="ps-mut">' + regs.length + ' records</small></summary><table class="fd-reg-t"><thead><tr><th>Period</th><th>Reference</th><th class="dir">Value</th></tr></thead><tbody>' + regs.map(function (r) { return '<tr><td>' + e(r.periodo) + '</td><td class="ps-mono">' + e(r.ref) + '</td><td class="dir ps-num">' + e(num(r.valor)) + '</td></tr>'; }).join('') + '</tbody></table></details>' : '<span class="ps-mut">Not pulled</span>'];
    });
    var tabs = Object.keys(dbs).reduce(function (o, d) { Object.keys(dbs[d]).forEach(function (t) { o.push([d, t]); }); return o; }, []);
    var api = tabs.map(function (dt) {
      var ex = { company: m.empresa, period: m.ano + '-01', record_ref: dt[1].toUpperCase().slice(0, 3) + '-' + m.ano + '-0001' };
      ks.filter(function (k) { return CAMPOS[k].tab === dt[1] && CAMPOS[k].db === dt[0]; }).forEach(function (k) { var r = P.registosCampo(k, m)[0]; ex[k] = r.valor; });
      return '<div class="fd-api"><span class="ps-mono">GET /api/v1/data/' + e(dt[1]) + '?company=' + e(encodeURIComponent(m.empresa)) + '&amp;year=' + m.ano + '</span><pre class="ps-pre" tabindex="0">' + e(JSON.stringify({ records: [ex] }, null, 2)) + '</pre></div>';
    }).join('');
    var calc = P.calculosMilestone(m), prontos = calc.filter(function (r) { return r.valor !== null; }).length;
    var linhasC = calc.map(function (r) {
      var c = P.cat(r.id), it = P.item(r.id, m.ano), igual = r.valor !== null && it.valor === r.valor;
      return [e(c.nome) + '<br><small class="ps-mut">' + e(r.id) + ' · ' + e(c.unidade_medida) + '</small>', '<span class="fd-f">' + e(P.formulaTxt(r.id)) + '</span>' + (r.x && DERIV[r.id] ? '<br><small class="ps-mono ps-mut">' + e(r.x) + '</small>' : ''),
        r.x ? '<span class="ps-mono ps-small">' + e(r.subst) + '</span>' : '-', r.valor === null ? '<span class="ps-mut">' + (r.erro ? e(r.erro) : r.x ? 'Pull the data' : '-') + '</span>' : '<b class="ps-num">' + e(fmtV(r.id, r.valor)) + '</b>',
        it.valor === null ? '<span class="ps-mut">-</span>' : '<span class="ps-num">' + e(fmtV(r.id, it.valor)) + '</span>',
        r.valor === null ? '' : igual ? chip('In use', 'ok') : pode ? '<button type="button" class="ps-btn peq" data-a="fdUsar" data-v="' + e(r.id) + '">Use</button>' : chip('Differs', 'warn')];
    });
    return '<div class="ps-card">' + cabCartao('Data sources and fields', 'ativ', pode ? '<button type="button" class="ps-btn pri peq" data-a="fdPuxar">' + (px ? 'Pull again' : 'Pull data') + '</button>' : '') + '<div class="ps-card-body">' +
      '<p class="ps-small ps-mut">' + (px ? 'Last pull ' + e(P.fmtDataHora(px.em)) + ' by ' + e(px.por) + ', ' + px.registos + ' records.' : 'These are the fields the indicators of this milestone are calculated from.') + '</p>' + bases +
      tabela([{ t: 'Field' }, { t: 'Description' }, { t: 'Unit' }, { t: 'Source' }, { t: 'Aggregation' }, { t: 'Used by' }, { t: 'Value ' + m.ano }], linhas, 'No data fields for this milestone.') +
      '<h3 class="ps-grupo-t">API for these fields</h3><p class="ps-small ps-mut">Each source table answers with the records for the company and year. ' + chip('Planned', 'warn') + '</p><div class="ps-sp"><button type="button" class="ps-btn peq" data-a="fdSchema">Download JSON Schema</button></div>' + api + '</div></div>' +
      '<div class="ps-card">' + cabCartao('Calculations', 'tarefa', pode && prontos ? '<button type="button" class="ps-btn pri peq" data-a="fdPreencher">Fill in ' + prontos + ' calculated value' + (prontos > 1 ? 's' : '') + '</button>' : '') + '<div class="ps-card-body">' +
      tabela([{ t: 'Indicator' }, { t: 'Formula' }, { t: 'With the source values' }, { t: 'Result' }, { t: 'Current value' }, { t: '' }], linhasC) + '</div></div>';
  };
  A.fdPuxar = function () { var m = X.msAtual(), r = P.puxarDados(m, u()); if (r.erro) return toast(r.erro, 'err'); toast(r.campos + ' fields pulled, ' + r.registos + ' records.', 'ok'); R(); };
  A.fdPreencher = function () { var m = X.msAtual(), r = P.preencherCalculados(m, u()); if (r.erro) return toast(r.erro, 'err'); toast(r.n + ' value(s) filled in. Check the alerts before submitting.', 'ok'); R(); };
  A.fdUsar = function (d) { var m = X.msAtual(), r = P.preencherCalculados(m, u(), [d.v]); if (r.erro) return toast(r.erro, 'err'); toast('Value filled in.', 'ok'); R(); };
  A.fdSchema = function () { var m = X.msAtual(); P.descarregar('data-fields-' + m.id + '.json', JSON.stringify(P.schemaCampos(m), null, 2), 'application/json'); };
})();
