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

  var DBS = { erp: 'Financial system', rh: 'Human resources system', tele: 'Telemetry (SCADA)', lab: 'Laboratory (LIMS)', com: 'Commercial system (CRM)', amb: 'Environmental management' };
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
  /* Contagens (pessoas, projetos, ocorrencias) sao sempre inteiras; uma media de contagens pode ter decimais */
  var campoInt = function (f) { return !!f && f.agreg !== 'media' && P.inteiro(f.ind ? P.cat(f.ind) : { unidade_medida: f.un }); };
  P.campoInteiro = function (k) { return campoInt(CAMPOS[k]); };
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
    if (c && c.casas_decimais === 0 || campoInt(f)) v = Math.round(v);
    return v;
  };
  /* Registos de teste: meses para somas e medias, trimestres para ultimos valores */
  P.registosCampo = function (k, m) {
    var f = CAMPOS[k], tot = anual(k), n = f.agreg === 'ultimo' ? 4 : 12, l = [], ac = 0, cas = campoInt(f) ? 1 : 10000;
    if (cas === 1) tot = Math.round(tot);
    for (var i = 0; i < n; i++) {
      var per = n === 4 ? m.ano + '-Q' + (i + 1) : m.ano + '-' + (i < 9 ? '0' : '') + (i + 1), w = 0.9 + hash(k + i) * 0.2, v;
      if (f.agreg === 'soma') { v = i === n - 1 ? tot - ac : Math.round((tot / n) * w * cas) / cas; ac += v; }
      else if (f.agreg === 'media') { v = i === n - 1 ? tot * n - ac : Math.round(Math.min(tot * (0.995 + hash(k + i) * 0.01), unidade(f) === '%' ? 100 : Infinity) * 10000) / 10000; ac += v; }
      else v = i === n - 1 ? tot : Math.round(tot * (0.96 + i * 0.01) * cas) / cas;
      l.push({ periodo: per, empresa: m.empresa, valor: v, ref: f.tab.toUpperCase().slice(0, 3) + '-' + m.ano + '-' + String(1 + Math.floor(hash(k + 'r' + i) * 8999)).padStart(4, '0') });
    }
    /* Milestone trimestral: so os meses (ou o fecho) do trimestre */
    if (P.trimestral && P.trimestral(m)) { var t = P.periodo(m.periodo).t; l = l.filter(function (x, i) { return n === 4 ? i === t - 1 : Math.floor(i / 3) === t - 1; }); }
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
    var b = BASE[id]; return b ? AGREG[b[4]] + ' of ' + (CAMPOS[b[0]] ? CAMPOS[b[0]].rot.toLowerCase() : b[3] || 'the source data') : 'Reported value';
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
    P.evento(m, 'Data pulled from system: ' + Object.keys(vals).length + ' data items, ' + n + ' records.', usr.nome);
    P.guardar();
    return { campos: Object.keys(vals).length, registos: n };
  };
  /* sobre: valores que se sobrepoem aos puxados, para simular o impacto antes de entregar */
  P.calculosMilestone = function (m, sobre) {
    var px = (S.puxados || {})[m.id];
    if (sobre) { var vs = {}; Object.keys((px && px.vals) || {}).forEach(function (k) { vs[k] = px.vals[k]; }); Object.keys(sobre).forEach(function (k) { if (sobre[k] !== null && sobre[k] !== undefined) vs[k] = sobre[k]; }); px = { vals: vs }; }
    return m.indicadores.map(function (id) {
      var x = P.expressaoDe(id), c = P.cat(id), r = { id: id, x: x, valor: null, falta: [], subst: '' };
      if (!x) return r;
      var ler = function (k) { if (k.indexOf('fator.') === 0) return fator(k); return px && px.vals[k] !== undefined ? px.vals[k] : null; };
      P.camposDaFormula(x).forEach(function (k) { if (ler(k) === null) r.falta.push(k); });
      r.subst = x.replace(/[A-Za-z_][\w.]*/g, function (k) { var v = ler(k); return v === null ? '?' : P.fmtNum(v, Math.abs(v) < 10 ? 3 : 2); });
      if (!r.falta.length) { try { r.valor = Number(avaliar(x, ler).toFixed(c.casas_decimais)); if (c.unidade_medida === '%' && r.valor > 100) r.valor = 100; } catch (er) { r.erro = 'Cannot calculate: ' + er.message; } }
      return r;
    });
  };
  P.preencherCalculados = function (m, usr, ids) {
    if (!podePuxar(m, usr)) return { erro: 'This milestone is read only for you right now.' };
    var n = 0;
    P.calculosMilestone(m).forEach(function (r) {
      if (r.valor === null || (ids && ids.indexOf(r.id) < 0)) return;
      var it = P.item(r.id, P.chave(m));
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

  /* --- Ligacoes aos sistemas --------------------------------------------------
     So se puxa de um sistema ligado. Cada ligacao diz de quanto em quanto tempo sincroniza;
     o pop-up mostra a data da ultima atualizacao quando nao e em tempo real. */
  var API_DB = { api1: 'erp', api2: 'rh', api3: 'tele', api4: 'lab', api5: 'com', api6: 'amb' };
  P.FREQ_LIGACAO = { Live: 'Live', Hourly: 'Synced every hour', Daily: 'Synced once a day', Weekly: 'Synced once a week', Monthly: 'Synced once a month' };
  P.ligacaoDe = function (db) { return (S.apis || []).filter(function (a) { return (a.db || API_DB[a.id]) === db; })[0] || null; };
  P.ligada = function (db) { var a = P.ligacaoDe(db); return !!(a && a.estado === 'ligada'); };
  P.ultimaSync = function (a) {
    var d = new Date(), f = a && a.frequencia;
    if (f === 'Live') return { live: true, em: d.toISOString() };
    if (f === 'Hourly') d.setMinutes(0, 0, 0);
    else {
      var antes = d.getHours() < 6; d.setHours(6, 0, 0, 0);
      if (f === 'Monthly') d.setDate(1);
      else if (f === 'Weekly') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      else if (antes) d.setDate(d.getDate() - 1);
      if (d > new Date()) d.setMonth(d.getMonth() - (f === 'Monthly' ? 1 : 0));
    }
    return { live: false, em: d.toISOString() };
  };
  /* Texto do estado de um sistema: "Live", "Last update 08/11/2026 06:00" ou "Not connected" */
  P.estadoSistema = function (db) {
    var a = P.ligacaoDe(db);
    if (!a || a.estado !== 'ligada') return { ligada: false, txt: 'Not connected', sub: a ? 'Waiting for credentials' : 'No connection set up' };
    var s = P.ultimaSync(a);
    return { ligada: true, live: s.live, em: s.em, txt: s.live ? 'Live' : 'Last update ' + P.fmtDataHora(s.em), sub: P.FREQ_LIGACAO[a.frequencia] || a.frequencia };
  };
  P.dbsMilestone = function (m) { var o = []; P.camposMilestone(m).forEach(function (k) { var db = CAMPOS[k].db; if (o.indexOf(db) < 0) o.push(db); }); return o; };
  P.podePuxarSistemas = function (m) { return P.dbsMilestone(m).some(P.ligada); };

  /* --- Valores das fontes: puxados, escritos, limpos -------------------------- */
  var estadoFonte = function (m) { if (!S.puxados) S.puxados = {}; return S.puxados[m.id] || (S.puxados[m.id] = { em: null, por: null, vals: {}, registos: 0, editados: {} }); };
  /* O que o pull vai trazer, campo a campo, sem gravar nada */
  P.previewPuxar = function (m) {
    var px = (S.puxados || {})[m.id];
    return P.camposMilestone(m).map(function (k) {
      var f = CAMPOS[k], lig = P.ligada(f.db), regs = lig ? P.registosCampo(k, m) : [];
      return { k: k, f: f, db: f.db, ligada: lig, atual: px && px.vals[k] !== undefined ? px.vals[k] : null, novo: lig ? agregarRegistos(k, regs) : null, registos: regs.length };
    });
  };
  /* Indicadores que se calculam com os valores atuais das fontes: grava-os; os que deixam de se calcular ficam vazios */
  P.sincronizarCalculados = function (m, usr) {
    var n = 0;
    P.calculosMilestone(m).forEach(function (r) {
      if (!r.x) return;
      var it = P.item(r.id, P.chave(m));
      if (r.valor !== null) {
        if (it.valor !== r.valor || !it.daFonte) { P.gravarValor(m, r.id, String(r.valor).replace('.', ','), usr, DERIV[r.id] ? 'calculated from the source data' : 'source data'); n++; }
        it.daFonte = true; it.qualidade = DERIV[r.id] ? 'calculado' : 'medido'; it.metodo = '';
      } else if (it.daFonte) { P.gravarValor(m, r.id, '', usr); it.daFonte = false; n++; }
    });
    return n;
  };
  P.aplicarPuxar = function (m, usr) {
    if (!podePuxar(m, usr)) return { erro: 'You can only pull data while the milestone is in collection with you.' };
    var l = P.previewPuxar(m).filter(function (x) { return x.ligada && x.novo !== null; });
    if (!l.length) return { erro: 'None of the systems of this milestone is connected.' };
    var st = estadoFonte(m), regs = 0, dbs = {};
    l.forEach(function (x) { st.vals[x.k] = x.novo; delete (st.editados || {})[x.k]; regs += x.registos; dbs[x.db] = 1; });
    st.em = new Date().toISOString(); st.por = usr.nome; st.registos = regs;
    var n = P.sincronizarCalculados(m, usr);
    P.evento(m, 'Data pulled from system (' + Object.keys(dbs).map(function (b) { return P.estadoSistema(b).txt; }).filter(function (t, i, a) { return a.indexOf(t) === i; }).join(', ') + '): ' + l.length + ' data items, ' + n + ' indicator(s) calculated.', usr.nome);
    P.guardar();
    return { campos: l.length, indicadores: n };
  };
  P.definirFonte = function (m, k, bruto, usr) {
    if (!podePuxar(m, usr)) return { erro: 'This milestone is read only for you right now.' };
    var s = String(bruto === null || bruto === undefined ? '' : bruto).trim(), st = estadoFonte(m), v = s === '' ? null : P.lerNumero(s);
    if (s !== '' && v === null) return { erro: 'Enter a number.' };
    if (v !== null && campoInt(CAMPOS[k]) && Math.round(v) !== v) return { erro: 'Whole numbers only. This data counts units, so it cannot have decimals.' };
    if (v === null) delete st.vals[k]; else st.vals[k] = v;
    (st.editados || (st.editados = {}))[k] = 1;
    P.sincronizarCalculados(m, usr);
    P.guardar();
    return { ok: true };
  };
  P.limparFontes = function (m, usr) {
    if (!podePuxar(m, usr)) return { erro: 'This milestone is read only for you right now.' };
    if (S.puxados) delete S.puxados[m.id];
    var n = P.sincronizarCalculados(m, usr);
    P.evento(m, 'Source data cleared' + (n ? '; ' + n + ' calculated value(s) emptied' : '') + '.', usr.nome);
    P.guardar();
    return { n: n };
  };
  P.calculoDe = function (m, id) { return P.calculosMilestone(m).filter(function (r) { return r.id === id; })[0] || null; };

  /* --- Ecra ------------------------------------------------------------------ */
  var num = function (v) { return v === null || v === undefined ? '-' : P.fmtNum(v, Math.abs(v) < 10 ? 3 : 2); };
  var indsDe = function (m, k) { return porCampo(m, k).map(function (id) { return '<button type="button" class="ps-btn liga" data-a="ficha" data-v="' + e(id) + '">' + e(id) + '</button>'; }).join(', '); };
  /* Botoes do cartao Requested data: puxar (so com ligacao) e limpar */
  P.fontesAcoes = function (m) {
    var usr = u(), pode = podePuxar(m, usr), px = (S.puxados || {})[m.id], tem = px && Object.keys(px.vals || {}).length;
    if (!pode || !P.camposMilestone(m).length) return '';
    var puxar = P.podePuxarSistemas(m) ? '<button type="button" class="ps-btn pri peq" data-a="fdAbrir">Pull data from system</button>'
      : '<span class="ps-tip-alvo" tabindex="0" data-tip="The data source this milestone uses is not connected yet, so the data has to be typed in. The administrator connects it in Connections to other systems."><button type="button" class="ps-btn peq" disabled>Pull data from system</button></span>';
    return puxar + (tem ? '<button type="button" class="ps-btn peq" data-a="fdLimpar">Clear source data</button>' : '');
  };
  /* Bloco "Source data" dentro de Requested data: o que cada indicador usa, de que sistema vem e o valor, editavel */
  P.fontesHtml = function (m) {
    var usr = u(), pode = podePuxar(m, usr), px = (S.puxados || {})[m.id], ks = P.camposMilestone(m);
    if (!ks.length) return '';
    var ed = (px && px.editados) || {};
    var linhas = ks.map(function (k) {
      var f = CAMPOS[k], v = px && px.vals[k] !== undefined ? px.vals[k] : null, st = P.estadoSistema(f.db);
      var orig = v === null ? '' : ed[k] ? '<small class="fd-orig ed" data-fx-ignorar>Typed</small>' : '<small class="fd-orig" data-fx-ignorar>From the system</small>';
      return [e(f.rot), e(unidade(f)), indsDe(m, k),
        '<span class="fd-sis' + (st.ligada ? '' : ' off') + '">' + e(st.txt) + '</span>',
        pode ? '<span class="fd-val"><input id="fd-' + e(k) + '" class="ps-in ps-num fd-in' + (ed[k] ? ' ed' : '') + '"' + (campoInt(f) ? ' inputmode="numeric" data-int="1"' : ' inputmode="decimal"') + ' autocomplete="off" aria-label="' + e(f.rot) + '" value="' + e(v === null ? '' : String(Number(v.toFixed(4))).replace('.', ',')) + '" data-c="fdValor" data-id="' + e(k) + '">' + orig + '</span>'
          : (v === null ? '<span class="ps-mut">-</span>' : '<b class="ps-num">' + e(num(v)) + '</b>' + orig)];
    });
    var nota = px && px.em ? 'Last pull ' + P.fmtDataHora(px.em) + ' by ' + px.por + '.' : pode ? 'Pull the data from system or type it in. The indicators below that are calculated from it fill in by themselves.' : 'Data the indicators of this milestone are calculated from.';
    return '<div class="fd-bloco"><div class="fd-bloco-h"><h3>Source data</h3><span class="ps-small ps-mut">' + e(nota) + '</span></div>' +
      tabela([{ t: 'Data' }, { t: 'Unit' }, { t: 'Used by', info: 'The indicators of this milestone that are calculated from this data. Change the value here and they update by themselves. Click an indicator to see its definition and formula.' }, { t: 'Source' }, { t: 'Value ' + P.rotPeriodo(m) }], linhas) + '</div>';
  };
  /* Dados de um indicador, para ficarem logo por cima dele em Requested data.
     Um dado que ja apareceu num indicador anterior volta so como referencia, sem campo, para nao haver dois sitios a mudar o mesmo valor. */
  P.fontesDoIndicador = function (m, id, vistos) {
    var x = P.expressaoDe(id);
    if (!x) return '';
    var ks = P.camposDaFormula(x).filter(function (k) { return CAMPOS[k]; });
    if (!ks.length) return '';
    var usr = u(), pode = podePuxar(m, usr), px = (S.puxados || {})[m.id], ed = (px && px.editados) || {};
    return '<div class="rq-fs" role="group" aria-label="Source data of ' + e(id) + '">' + ks.map(function (k) {
      var f = CAMPOS[k], v = px && px.vals[k] !== undefined ? px.vals[k] : null, st = P.estadoSistema(f.db), ja = vistos[k];
      if (!ja) vistos[k] = id;
      var orig = v === null ? '' : '<small class="fd-orig' + (ed[k] ? ' ed' : '') + '">' + (ed[k] ? 'Typed' : 'From the system') + '</small>';
      var val = ja ? '<span class="rq-f-ref"><b class="ps-num">' + (v === null ? '-' : e(num(v))) + '</b><small>Same value as in ' + e(ja) + ' above</small></span>'
        : pode ? '<input id="fd-' + e(k) + '" class="ps-in ps-num fd-in' + (ed[k] ? ' ed' : '') + '"' + (campoInt(f) ? ' inputmode="numeric" data-int="1"' : ' inputmode="decimal"') + ' autocomplete="off" aria-label="' + e(f.rot) + '" placeholder="-" value="' + e(v === null ? '' : String(Number(v.toFixed(4))).replace('.', ',')) + '" data-c="fdValor" data-id="' + e(k) + '">' + orig
          : '<b class="ps-num">' + (v === null ? '-' : e(num(v))) + '</b>' + orig;
      return '<div class="rq-f' + (ja ? ' ref' : '') + '"><span class="rq-f-n">' + e(f.rot) + '<small class="' + (st.ligada ? (st.live ? 'live' : 'sync') : 'off') + '">' + e(st.ligada ? 'Source: ' + st.txt : st.txt) + '</small></span><span class="rq-f-u">' + e(unidade(f)) + '</span><span class="rq-f-v">' + val + '</span></div>';
    }).join('') + '</div>';
  };
  /* Detalhe tecnico de um dado: objeto de origem, campo, filtros e consulta. Nunca se mostra o nome do sistema. */
  var codEmpresa = function (nome) { var i = (S.ent || []).map(function (x) { return x.nome; }).indexOf(nome); return i < 0 ? '9900' : String(1000 + i * 100); };
  var tecnico = function (m, k) {
    var f = CAMPOS[k], p = P.periodo(m.periodo), t = p && p.t ? p.t : 0, de = t ? (t - 1) * 3 + 1 : 1, ate = t ? t * 3 : 12;
    var per = function (n) { return String(n).padStart(3, '0'); }, tab = 'ZESG_' + f.tab.toUpperCase(), col = k.toUpperCase(), cod = codEmpresa(m.empresa), fn = { soma: 'SUM', media: 'AVG' }[f.agreg];
    var onde = " WHERE BUKRS = '" + cod + "'\n   AND GJAHR = '" + m.ano + "'\n   AND POPER BETWEEN '" + per(de) + "' AND '" + per(ate) + "'";
    var q = fn ? 'SELECT BUKRS, GJAHR, ' + fn + '(' + col + ') AS VALUE\n  FROM ' + tab + '\n' + onde + '\n GROUP BY BUKRS, GJAHR'
      : 'SELECT BUKRS, GJAHR, POPER, ' + col + ' AS VALUE\n  FROM ' + tab + '\n' + onde + '\n ORDER BY POPER DESC\n FETCH FIRST 1 ROW ONLY';
    return { tab: tab, col: col, cod: cod, per: per(de) + ' to ' + per(ate), q: q };
  };
  var difere = function (a, b) { return a === null || a === undefined || b === null || b === undefined ? a !== b : Math.abs(a - b) > 1e-9; };
  /* Pop-up do pull: data da ultima atualizacao e, por indicador (fechado por omissao), os dados, a formula e a consulta de origem */
  X.Pn.puxar = function () {
    var m = X.msAtual(), l = P.previewPuxar(m), lig = l.filter(function (x) { return x.ligada; }), off = l.length - lig.length, dbs = P.dbsMilestone(m);
    var ligs = dbs.map(function (db) { return P.estadoSistema(db); }).filter(function (st) { return st.ligada; });
    var naoLive = ligs.filter(function (st) { return !st.live; }).sort(function (a, b) { return a.em < b.em ? -1 : 1; });
    var topo = !ligs.length ? 'The data source is not connected.' : naoLive.length ? 'Last update of the data: ' + P.fmtDataHora(naoLive[0].em) : 'Live data, as of ' + P.fmtDataHora(new Date().toISOString());
    var pv = {}; l.forEach(function (x) { pv[x.k] = x; });
    var sobre = {}; lig.forEach(function (x) { sobre[x.k] = x.novo; });
    var depois = P.calculosMilestone(m, sobre).filter(function (r) { return r.x; });
    var muda = lig.filter(function (x) { return difere(x.atual, x.novo); }).length;
    var linhas = depois.map(function (r) {
      var c = P.cat(r.id), it = P.item(r.id, P.chave(m)), ks = P.camposDaFormula(r.x).filter(function (k) { return pv[k]; }), calc = ks.length !== 1 || r.x !== ks[0];
      var semFonte = ks.length && ks.every(function (k) { return !pv[k].ligada; }), mud = r.valor !== null && difere(it.valor, r.valor);
      var est = semFonte ? chip('Not connected') : r.valor === null ? chip('Missing data', 'warn') : mud ? chip('Changes', 'info') : chip('No change', 'ok');
      var dados = tabela([{ t: 'Data' }, { t: 'Unit' }, { t: 'Now', dir: 1 }, { t: 'From source', dir: 1 }, { t: 'Records', dir: 1 }], ks.map(function (k) {
        var x = pv[k];
        return { attrs: 'class="' + (x.ligada ? (difere(x.atual, x.novo) ? 'fd-mud' : '') : 'fd-off') + '"', celulas: [e(x.f.rot), e(unidade(x.f)), x.atual === null ? '<span class="ps-mut">-</span>' : e(num(x.atual)), x.ligada ? '<b>' + e(num(x.novo)) + '</b>' : '<span class="ps-mut">Not connected</span>', x.ligada ? String(x.registos) : '-'] };
      }));
      var tec = ks.map(function (k) {
        var x = pv[k], st = P.estadoSistema(x.db), t = tecnico(m, k);
        var dl = [['Source object', '<span class="ps-mono">' + e(t.tab) + '</span>'], ['Field', '<span class="ps-mono">' + e(t.col) + '</span>'],
          ['Filters', 'Company code <span class="ps-mono">' + e(t.cod) + '</span> (' + e(m.empresa) + '), fiscal year <span class="ps-mono">' + e(m.ano) + '</span>, posting periods <span class="ps-mono">' + e(t.per) + '</span>'],
          ['Aggregation', e(AGREG[x.f.agreg]) + (x.f.agreg === 'ultimo' ? ' of the quarterly closings' : ' of the monthly records')],
          ['Records read', x.ligada ? String(x.registos) : '-'], ['Last update', e(st.txt) + (st.ligada && !st.live ? ', ' + e(st.sub.toLowerCase()) : '')]];
        return '<div class="px-tec"><b class="px-tec-t">' + e(x.f.rot) + '</b><dl class="px-dl">' + dl.map(function (d) { return '<dt>' + d[0] + '</dt><dd>' + d[1] + '</dd>'; }).join('') + '</dl><pre class="px-sql ps-mono" aria-label="Query for ' + e(x.f.rot) + '">' + e(t.q) + '</pre></div>';
      }).join('');
      var form = calc ? '<div class="px-form"><span class="px-form-k">Formula</span><span>' + e(P.formulaTxt(r.id)) + '</span><span class="px-form-k">With these values</span><span class="ps-mono">' + e(r.subst) + (r.valor === null ? '' : ' = ' + e(fmtV(r.id, r.valor))) + '</span></div>' : '';
      return '<details id="pxd-' + e(r.id) + '" class="px-ind' + (semFonte ? ' off' : mud ? ' mud' : '') + '"><summary><span class="px-nome"><b>' + e(r.id + ' ' + c.nome) + '</b><small>' + ks.length + ' data item' + (ks.length === 1 ? '' : 's') + (calc ? ', calculated' : '') + '</small></span>' +
        '<span class="px-vals"><span class="ps-mut">' + (it.valor === null ? '-' : e(fmtV(r.id, it.valor))) + '</span><span class="px-seta-v" aria-hidden="true">&rarr;</span>' + (r.valor === null ? '<span class="ps-mut">-</span>' : '<b>' + e(fmtV(r.id, r.valor)) + '</b>') + '<span class="ps-sr">now, then after the pull</span></span>' + est + '</summary>' +
        '<div class="px-corpo">' + dados + form + '<h4 class="px-sub">Technical details</h4>' + tec + '</div></details>';
    }).join('');
    return {
      t: 'Pull data from system', s: m.nome, largo: true,
      b: '<div class="fd-topo' + (naoLive.length || !ligs.length ? '' : ' live') + '"><b>' + e(topo) + '</b><span>' + (!ligs.length ? 'The administrator connects it in Connections to other systems.' : naoLive.length ? 'The source is not live: what comes in is what it had at its last update.' : 'The source sends its data as it happens.') + (off ? ' ' + off + ' data item' + (off === 1 ? '' : 's') + ' cannot be pulled yet.' : '') + '</span></div>' +
        '<div class="px-cab"><h3 class="ps-grupo-t">What will be filled in</h3><span class="ps-small ps-mut">Expand an indicator to see its data and where it comes from.</span><button type="button" class="ps-btn liga" data-a="pxTodos">Expand all</button></div>' +
        '<div class="px-lista">' + (linhas || '<p class="ps-mut">No indicator of this milestone is calculated from source data.</p>') + '</div>' +
        '<p class="ps-small ps-mut ps-mt">After filling in you can still change any value, or clear the source data, while the milestone is in collection.</p>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="fdAplicar"' + (lig.length ? '' : ' disabled') + '>Fill in ' + lig.length + ' value' + (lig.length === 1 ? '' : 's') + (muda && muda < lig.length ? ' (' + muda + ' change)' : '') + '</button>'
    };
  };
  A.fdAbrir = function () { X.abrePainel('puxar', {}); };
  A.pxTodos = function (d, el) { var ds = document.querySelectorAll('.px-ind'), abrir = [].some.call(ds, function (x) { return !x.open; }); [].forEach.call(ds, function (x) { x.open = abrir; }); el.textContent = abrir ? 'Collapse all' : 'Expand all'; };
  A.fdAplicar = function () { var m = X.msAtual(), r = P.aplicarPuxar(m, u()); if (r.erro) return toast(r.erro, 'err'); X.U.painel = null; toast(r.campos + ' values filled in, ' + r.indicadores + ' indicator(s) calculated. You can still change them.', 'ok'); R(); };
  A.fdLimpar = function () { var m = X.msAtual(); if (!window.confirm('Clear the source data of this milestone? The values calculated from it are emptied too.')) return; var r = P.limparFontes(m, u()); if (r.erro) return toast(r.erro, 'err'); toast('Source data cleared.', 'ok'); R(); };
  X.C.fdValor = function (el) { var r = P.definirFonte(X.msAtual(), el.dataset.id, el.value, u()); if (r.erro) toast(r.erro, 'err'); };
  /* Compatibilidade: o pull direto continua a existir para as folhas dos pedidos */
  A.fdPuxar = A.fdAbrir;
  A.fdSchema = function () { var m = X.msAtual(); P.descarregar('data-fields-' + m.id + '.json', JSON.stringify(P.schemaCampos(m), null, 2), 'application/json'); };
})();
