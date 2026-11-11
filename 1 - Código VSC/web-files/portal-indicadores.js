/* ============================================================================
   portal-indicadores.js - Backoffice, pagina unica dos indicadores
   Uma so pagina para gerir os KPIs: caracteristicas, quem reporta (pessoa ou grupo),
   empresas abrangidas e empresa que reporta, exportar e importar em Excel com o
   layout do modelo de KPIs, acoes em lote e envio de tasks.
   As colunas seguem o ficheiro modelo "TEMPLATE_ESG KPIs" (Datapoint Mapping).
   As regras de dados estao em portal-nucleo.js (P.enviarTarefas, P.planoEnvio).
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var B = X.B, A = X.A, C = X.C, U = X.U, e = X.e, chip = X.chip, opt = X.opt, campo = X.campo, toast = X.toast, R = X.R, u = X.u, vazio = X.vazio, rota = X.rota, cabCartao = X.cabCartao, svg = X.svg, I = X.I;
  var norm = function (t) { return String(t === null || t === undefined ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
  var GRUPO_TXT = '(whole department)';
  var FREQ = [['Mensal', 'Monthly'], ['Trimestral', 'Quarterly'], ['Anual', 'Annual']];
  var AGREG = [['soma', 'Sum'], ['media', 'Average'], ['ultimo', 'Latest value']];
  var SIM = [['sim', 'Yes'], ['nao', 'No']];
  var par = function (l, v, i) { for (var k = 0; k < l.length; k++) if (norm(l[k][i]) === norm(v)) return l[k]; return null; };
  var reg = function (id) { if (!S.kpim) S.kpim = {}; return S.kpim[id] || (S.kpim[id] = {}); };
  var regL = function (id) { return (S.kpim || {})[id] || {}; };
  var atrL = function (id) { return (S.atrib || {})[id] || { submete: '', reve: '', valida: '' }; };
  var atr = function (id) { if (!S.atrib) S.atrib = {}; return S.atrib[id] || (S.atrib[id] = { submete: '', reve: '', valida: '' }); };
  var nomeDe = function (login) { var x = login ? P.user(login) : null; return x ? x.nome : ''; };
  var pessoas = function (papel) { return S.users.filter(function (x) { return papel === 'valida' ? x.perfil === 'esg' || x.perfil === 'admin' : x.perfil === 'resp' || x.perfil === 'esg'; }); };
  var pessoaPor = function (t, papel) { var v = norm(t); return pessoas(papel).filter(function (x) { return norm(x.login) === v || norm(x.nome) === v; })[0] || null; };
  var empPor = function (t) { var v = norm(t); return S.ent.filter(function (x) { return norm(x.nome) === v || norm(x.id) === v; })[0] || null; };
  var tipoDadoDe = function (c) {
    var un = String(c.unidade_medida || '').toLowerCase();
    if (un === '%') return 'percent';
    if (/€|eur/.test(un)) return 'monetary';
    if (/wh|gj|tep/.test(un)) return 'energy';
    if (/co2/.test(un)) return 'ghgemissions';
    if (/^(t|kg|ton)/.test(un)) return 'mass';
    if (/m³|m3|l$/.test(un)) return 'volume';
    return P.inteiro(c) ? 'integer' : 'decimal';
  };

  /* --- Campos do indicador: os mesmos no painel, no Excel e na importacao ---------- */
  /* g: grupo; t: cabecalho no Excel (como no modelo); d: explicacao; w: largura; ler: so de leitura;
     get: valor em texto; res: valida e devolve o texto canonico; set: grava. al: outros nomes aceites ao importar. */
  /* Codigos de KPI do ficheiro que se esta a importar: uma calculation pode usar indicadores novos do mesmo ficheiro */
  var idsImport = null;
  var GRUPOS = [
    ['id', 'Identification', '00338D'], ['esrs', 'ESRS reference', '7213EA'], ['car', 'Characteristics', '1E49E2'], ['resp', 'Responsibility', '005EB8'],
    ['emp', 'Companies', '0091DA'], ['disp', 'Availability', '00805A'], ['ctrl', 'Controls', 'A86400'], ['div', 'Disclosure', '483698']
  ];
  var okv = function (v) { return { val: String(v === null || v === undefined ? '' : v).trim() }; };
  var lista = function (l, rot) { return function (v) { var x = par(l, v, 1) || par(l, v, 0); return x ? { val: x[1] } : String(v).trim() === '' ? { val: '' } : { erro: rot + ' must be one of: ' + l.map(function (y) { return y[1]; }).join(', ') + '.' }; }; };
  var CAMPOS = [
    { k: 'id', g: 'id', t: 'KPI ID', w: 13, ler: true, d: 'Unique code. Do not change it. Use a new code to create an indicator.', al: ['platform kpi', 'indicator id', 'kpi code', 'indicator code'],
      get: function (c) { return c.id; } },
    { k: 'nome', g: 'id', t: 'KPI Name', w: 40, d: 'Short and concise name of the KPI.', al: ['indicator name', 'kpi', 'name', 'nome'],
      get: function (c) { return c.nome; }, res: function (v) { return String(v).trim() ? okv(v) : { erro: 'KPI Name is required.' }; }, set: function (c, v) { c.nome = v; } },
    { k: 'desc', g: 'id', t: 'KPI Description', w: 60, longo: true, d: 'What is measured or reported, including the key definitions.', al: ['description', 'descricao'],
      get: function (c) { return c.desc_propria !== undefined ? c.desc_propria : (P.esrsDe(c.id).desc || ''); }, res: okv, set: function (c, v) { c.desc_propria = v; } },
    { k: 'ativo', g: 'id', t: 'Status', w: 13, d: 'Active indicators can receive tasks. Inactive ones stay in the history but are not sent.', vals: ['Active', 'Inactive'],
      get: function (c) { return P.indAtivo(c) ? 'Active' : 'Inactive'; }, res: lista([['1', 'Active'], ['0', 'Inactive']], 'Status'), set: function (c, v) { c.ativo = v !== 'Inactive'; } },

    { k: 'esrs', g: 'esrs', t: 'ESRS Topic (numerical)', w: 13, d: 'ESRS standard the indicator belongs to (for example E1, E3, S1). Leave empty for entity-specific indicators.', al: ['esrs topic', 'esrs standard', 'esrs'],
      get: function (c) { return c.esrs || ''; }, res: function (v) { var s = String(v).trim().replace(/^ESRS\s*/i, ''); return { val: s }; }, set: function (c, v) { c.esrs = v; } },
    { k: 'esrs_tema', g: 'esrs', t: 'ESRS Topic (descriptive)', w: 26, ler: true, d: 'Name of the ESRS standard. Filled in by the platform.',
      get: function (c) { var m = (S.mat || []).filter(function (x) { return x.norma === c.esrs; })[0]; return m ? m.tema : ''; } },
    { k: 'dr', g: 'esrs', t: 'ESRS DR', w: 13, d: 'ESRS Disclosure Requirement the indicator comes from (for example E3-4).', al: ['disclosure requirement'],
      get: function (c) { return c.esrs_requisito || ''; }, res: okv, set: function (c, v) { c.dr_proprio = v; c.esrs_requisito = v || c.esrs || 'Setorial'; } },
    { k: 'dps', g: 'esrs', t: 'IG3 ID', w: 22, ler: true, d: 'ESRS datapoints mapped to this indicator, from the ESRS datapoint list.', al: ['ig3 id as of 28 08 2026'],
      get: function (c) { return P.esrsDe(c.id).dps.join('; '); } },
    { k: 'tema', g: 'esrs', t: 'Company Topic', w: 24, d: 'Company-defined sustainability topic.', al: ['topic', 'tema'],
      get: function (c) { return c.tema || ''; }, res: okv, set: function (c, v) { c.tema = v; } },
    { k: 'subtema', g: 'esrs', t: 'Company Sub-Topic', w: 24, d: 'Company-defined sub-topic, a more detailed classification.', al: ['sub topic', 'subtema'],
      get: function (c) { return c.subtema_proprio !== undefined ? c.subtema_proprio : (P.esrsDe(c.id).sub || ''); }, res: okv, set: function (c, v) { c.subtema_proprio = v; } },

    { k: 'div_tipo', g: 'car', t: 'Disclosure Type [Quantitative / Qualitative]', w: 16, d: 'Whether the indicator is a number or a text.', vals: ['Quantitative', 'Qualitative'], al: ['disclosure type'],
      get: function (c) { return c.divulgacao_tipo || 'Quantitative'; }, res: lista([['q', 'Quantitative'], ['n', 'Qualitative']], 'Disclosure Type'), set: function (c, v) { c.divulgacao_tipo = v || 'Quantitative'; } },
    { k: 'tipo_dado', g: 'car', t: 'Data Type', w: 14, d: 'Nature of the value: percent, integer, decimal, monetary, energy, mass, volume, ghgemissions, narrative.', vals: ['percent', 'integer', 'decimal', 'monetary', 'energy', 'mass', 'volume', 'ghgemissions', 'narrative', 'semi-narrative'],
      get: function (c) { return c.tipo_dado || tipoDadoDe(c); }, res: okv, set: function (c, v) { c.tipo_dado = v; } },
    { k: 'unidade', g: 'car', t: 'Unit', w: 13, d: 'Unit of measurement (for example m³, MWh, %, n.º).', al: ['unit of measure', 'unidade'],
      get: function (c) { return c.unidade_medida || ''; }, res: function (v) { return String(v).trim() ? okv(v) : { erro: 'Unit is required.' }; }, set: function (c, v) { c.unidade_medida = v; } },
    { k: 'casas', g: 'car', t: 'Decimals', w: 13, d: 'Number of decimal places shown, from 0 to 6.',
      get: function (c) { return String(c.casas_decimais === undefined ? 2 : c.casas_decimais); }, res: function (v) { var n = P.lerNumero(v); return n === null || n < 0 || n > 6 || Math.round(n) !== n ? { erro: 'Decimals must be a whole number from 0 to 6.' } : { val: String(n) }; }, set: function (c, v) { c.casas_decimais = Number(v); } },
    { k: 'natureza', g: 'car', t: 'Input / Output', w: 13, d: 'Input: data someone has to enter. Output: calculated by the platform from the inputs, with the codes in "Calculation (KPI codes)".', vals: ['Input', 'Output'], al: ['base or derived', 'input output', 'input/output'],
      get: function (c) { return c.tipo === 'derivado' ? 'Output' : 'Input'; }, res: lista([['input', 'Input'], ['output', 'Output'], ['base', 'Input'], ['derived', 'Output'], ['derivado', 'Output']], 'Input / Output'), set: function (c, v) { c.tipo = v === 'Output' ? 'derivado' : 'base'; } },
    { k: 'calc', g: 'car', t: 'Calculation (KPI codes)', w: 26, d: 'For outputs: the calculation with the KPI codes, for example A01 + A02 or (E01 - E02) / A01 * 100. It runs by itself once all the inputs of the period are submitted.', al: ['calculation kpi codes', 'calculation codes', 'kpi formula'],
      get: function (c) { if (c.calc_codigos) return c.calc_codigos; var sg = c.tipo === 'derivado' && P.sugerirCalc ? P.sugerirCalc(c.id) : null; return sg ? sg.calc : ''; }, res: function (v, c) { var s = String(v || '').trim(); var er = P.validarCalc(s, c && c.id, idsImport); return er ? { erro: er } : { val: s.toUpperCase().replace(/\s+/g, ' ') }; }, set: function (c, v) { c.calc_codigos = v || ''; if (v) c.tipo = 'derivado'; } },
    { k: 'formula', g: 'car', t: 'Calculation methodology', w: 44, longo: true, d: 'Calculation methodology, formula in words or key assumptions.', al: ['formula', 'calculation method', 'calculation'],
      get: function (c) { return c.formula || ''; }, res: okv, set: function (c, v) { c.formula = v || null; } },
    { k: 'freq', g: 'car', t: 'Reporting Frequency', w: 14, d: 'How often the indicator is reported.', vals: FREQ.map(function (f) { return f[1]; }), al: ['frequency', 'periodicidade'],
      get: function (c) { var f = par(FREQ, c.periodicidade, 0); return f ? f[1] : (X.PERIODO_TXT[c.periodicidade] || c.periodicidade || ''); },
      res: function (v, c) { if (c && norm(v) === norm(this.get(c))) return { val: this.get(c) }; return lista(FREQ, 'Reporting Frequency')(v); },
      set: function (c, v) { var f = par(FREQ, v, 1); if (f && f[0] !== c.periodicidade) { c.periodicidade = f[0]; if (c.momentos) delete c.momentos; } } },
    { k: 'recolha', g: 'car', t: 'Data collection frequency', w: 16, d: 'How often the underlying data is collected. Empty means the same as the reporting frequency.', vals: ['Monthly', 'Quarterly', 'Half-yearly', 'Annually'],
      get: function (c) { return regL(c.id).recolha || ''; }, res: okv, set: function (c, v) { reg(c.id).recolha = v; } },
    { k: 'agreg', g: 'car', t: 'Data Aggregation Type', w: 16, d: 'How values are combined across companies and periods: Sum, Average or Latest value.', vals: AGREG.map(function (f) { return f[1]; }), al: ['aggregation'],
      get: function (c) { return (par(AGREG, P.agregacao(c.id), 0) || AGREG[0])[1]; }, res: function (v) { var n = norm(v), x = /end of period|latest|last|ultimo/.test(n) ? 'Latest value' : /average|mean|media/.test(n) ? 'Average' : /sum|total|soma/.test(n) ? 'Sum' : ''; return x || !n ? { val: x } : { erro: 'Data Aggregation Type must be one of: Sum, Average, Latest value.' }; }, set: function (c, v) { var f = par(AGREG, v, 1); if (f) c.agregacao = f[0]; } },
    { k: 'scope', g: 'car', t: 'KPI Scope', w: 16, d: 'Organisational perimeter the KPI applies to (group, subsidiaries, sites).', al: ['scope', 'perimetro'],
      get: function (c) { return c.perimetro || ''; }, res: okv, set: function (c, v) { c.perimetro = v; } },

    { k: 'dep', g: 'resp', t: 'KPI Responsibility - Responsible Department', w: 26, d: 'Department that prepares and reports the KPI. It is the group that receives the task when no person is named.', listaDe: function () { return P.UNIDADES; }, al: ['responsible department', 'department', 'departamento'],
      get: function (c) { return P.donoIndicador(c.id); }, res: function (v) { if (!String(v).trim()) return { erro: 'Choose the responsible department.' }; var x = P.UNIDADES.filter(function (n) { return norm(n) === norm(v); })[0]; return x ? { val: x } : { erro: 'Department "' + String(v).trim() + '" does not exist. Create it in Backoffice, Departments.' }; },
      set: function (c, v) { c.unidade_reporte = v; } },
    { k: 'resp', g: 'resp', t: 'KPI Responsibility - Responsible Person', w: 24, d: 'Person who reports the KPI. Choose "' + GRUPO_TXT + '" to leave it with the whole department.', listaDe: function () { return [GRUPO_TXT].concat(pessoas('submete').map(function (x) { return x.nome; })); }, al: ['responsible person', 'submits', 'data owner', 'responsavel'],
      get: function (c) { return nomeDe(atrL(c.id).submete) || GRUPO_TXT; }, res: function (v) { if (/whole department|^group$|^department$|^grupo$/i.test(String(v).trim())) return { val: GRUPO_TXT }; var x = pessoaPor(v, 'submete'); return x ? { val: x.nome } : { erro: 'Responsible person "' + String(v).trim() + '" is not a data owner in the platform.' }; },
      set: function (c, v) { var x = pessoaPor(v, 'submete'); atr(c.id).submete = x ? x.login : ''; } },
    { k: 'reve', g: 'resp', t: 'Reviewer', w: 22, d: 'Person who reviews the value (first level). Cannot be the person who reports it.', listaDe: function () { return pessoas('reve').map(function (x) { return x.nome; }); }, al: ['reviews', 'reviewer 1st level'],
      get: function (c) { return nomeDe(atrL(c.id).reve); }, res: function (v) { if (!String(v).trim()) return { val: '' }; var x = pessoaPor(v, 'reve'); return x ? { val: x.nome } : { erro: 'Reviewer "' + String(v).trim() + '" is not a person who can review.' }; }, set: function (c, v) { var x = pessoaPor(v, 'reve'); atr(c.id).reve = x ? x.login : ''; } },
    { k: 'valida', g: 'resp', t: 'Validator', w: 22, d: 'Person or team that validates the value at the end (sustainability team or administrator).', listaDe: function () { return pessoas('valida').map(function (x) { return x.nome; }); }, al: ['validates', 'approver'],
      get: function (c) { return nomeDe(atrL(c.id).valida); }, res: function (v) { if (!String(v).trim()) return { val: '' }; var x = pessoaPor(v, 'valida'); return x ? { val: x.nome } : { erro: 'Validator "' + String(v).trim() + '" is not a person who can validate.' }; }, set: function (c, v) { var x = pessoaPor(v, 'valida'); atr(c.id).valida = x ? x.login : ''; } },

    { k: 'empresas', g: 'emp', t: 'Companies covered', w: 26, d: 'Companies whose data the indicator includes, separated by ";". With more than one, the value is entered per company and added up.', al: ['companies', 'associated companies', 'empresas'],
      get: function (c) { return P.empresasInd(c).map(function (x) { return x.nome; }).join('; '); },
      res: function (v) { var ns = String(v).split(/[;\n]+/).map(function (t) { return t.trim(); }).filter(Boolean), mal = ns.filter(function (n) { return !empPor(n); }); if (!ns.length) return { erro: 'Choose at least one company.' }; return mal.length ? { erro: 'Company "' + mal[0] + '" does not exist. Create it in Backoffice, Companies and perimeter.' } : { val: S.ent.filter(function (x) { return ns.some(function (n) { return empPor(n) === x; }); }).map(function (x) { return x.nome; }).join('; ') }; },
      set: function (c, v) { c.empresas = String(v).split(';').map(function (t) { return empPor(t); }).filter(Boolean).map(function (x) { return x.id; }); } },
    { k: 'reporta', g: 'emp', t: 'Reporting company', w: 20, d: 'Company that has to report the indicator. The task is sent to it.', listaDe: function () { return S.ent.map(function (x) { return x.nome; }); }, al: ['reported by', 'company', 'empresa'],
      get: function (c) { var x = P.reportaInd(c); return x ? x.nome : ''; }, res: function (v) { var x = empPor(v); return x ? { val: x.nome } : { erro: 'Reporting company "' + String(v).trim() + '" does not exist.' }; }, set: function (c, v) { var x = empPor(v); if (x) c.reporta = x.id; } },

    { k: 'disp', g: 'disp', t: 'KPI Availability - Available [yes/no]', w: 14, d: 'Whether the information needed is available today.', vals: ['Yes', 'No'], al: ['available', 'kpi availability'],
      get: function (c) { var x = par(SIM, regL(c.id).disponivel, 0); return x ? x[1] : ''; }, res: lista(SIM, 'Available'), set: function (c, v) { var x = par(SIM, v, 1); reg(c.id).disponivel = x ? x[0] : ''; } },
    { k: 'fonte', g: 'disp', t: 'Source / System', w: 26, d: 'Primary source, system or repository the data comes from.', al: ['source', 'system', 'fonte'],
      get: function (c) { return regL(c.id).fonte || ''; }, res: okv, set: function (c, v) { reg(c.id).fonte = v; } },

    { k: 'limiar', g: 'ctrl', t: 'Change threshold (%)', w: 13, d: 'A change above this percentage against the prior period raises an alert and asks for a justification.', al: ['threshold', 'threshold pct', 'limiar'],
      get: function (c) { return String(P.limiarDe(c)); }, res: function (v) { var n = P.lerNumero(v); return n === null || n < 0 ? { erro: 'Change threshold must be a number, 0 or above.' } : { val: String(n) }; }, set: function (c, v) { c.limiar_variacao_pct = Number(v); c.limiar_proprio = Number(v) !== P.limiarPadrao() || !!c.limiar_proprio; } },
    { k: 'evid', g: 'ctrl', t: 'Evidence required [yes/no]', w: 13, d: 'When Yes, a supporting document must be attached before the task is submitted.', vals: ['Yes', 'No'], al: ['required evidence', 'evidence required'],
      get: function (c) { return c.evidencia_obrigatoria ? 'Yes' : 'No'; }, res: lista(SIM, 'Evidence required'), set: function (c, v) { c.evidencia_obrigatoria = v === 'Yes'; } },
    { k: 'ctrl', g: 'ctrl', t: 'Controls - Control Description', w: 40, longo: true, d: 'Other controls performed over the collection, calculation and review of the KPI.', al: ['control description'],
      get: function (c) { return regL(c.id).controlo_txt || ''; }, res: okv, set: function (c, v) { reg(c.id).controlo_txt = v; if (v) reg(c.id).controlos = 'sim'; } },

    { k: 'divulga', g: 'div', t: 'Decision on the disclosure of KPIs - Disclosure of KPI [yes/no]', w: 16, d: 'Whether the KPI will be disclosed in the report.', vals: ['Yes', 'No'], al: ['disclosure of kpi', 'disclose'],
      get: function (c) { var x = par(SIM, regL(c.id).divulga, 0); return x ? x[1] : ''; }, res: lista(SIM, 'Disclosure of KPI'), set: function (c, v) { var x = par(SIM, v, 1); reg(c.id).divulga = x ? x[0] : ''; } },
    { k: 'motivo', g: 'div', t: 'Decision on the disclosure of KPIs - If no, please explain why.', w: 34, longo: true, d: 'Reason for not disclosing the KPI, when applicable.', al: ['if no please explain why', 'f decision on the disclosure of kpis if no please explain why'],
      get: function (c) { return regL(c.id).motivo || ''; }, res: okv, set: function (c, v) { reg(c.id).motivo = v; } },
    { k: 'uso', g: 'div', t: 'Report Use', w: 22, d: 'Reports or frameworks where the KPI is used, separated by ",".', al: ['used by'],
      get: function (c) { return (c.utilizado_por || []).join(', '); }, res: okv, set: function (c, v) { c.utilizado_por = String(v).split(/[,;]+/).map(function (t) { return t.trim(); }).filter(Boolean); } }
  ];
  var campoK = {}; CAMPOS.forEach(function (f) { campoK[f.k] = f; });
  var lerInd = function (c) { var o = {}; CAMPOS.forEach(function (f) { o[f.k] = f.get(c); }); return o; };
  var novoCat = function (id) {
    return { id: id, nome: '', unidade_medida: '', unidade_negocio: P.UNIDADES[0] || '', tipo: 'base', periodicidade: 'Anual', perimetro: 'Grupo', quadro: 'ESRS', esrs: '', esrs_requisito: '', gri: '-', limiar_variacao_pct: null, evidencia_obrigatoria: false, utilizado_por: [], novo_esrs: false, tema: '', formula: null, regras_coerencia: [], casas_decimais: 2, ano_anterior: null, criado_backoffice: true };
  };
  /* Valida um conjunto de valores (so as chaves presentes). Devolve os textos canonicos e os erros. */
  var resolver = function (dados, c) {
    var val = {}, erros = [];
    Object.keys(dados).forEach(function (k) {
      var f = campoK[k];
      if (!f || f.ler || !f.res) return;
      var r = f.res(dados[k], c);
      if (r.erro) erros.push(r.erro); else val[k] = r.val;
    });
    /* Quem reporta nao pode rever nem validar o que reporta */
    var atual = c ? lerInd(c) : {}, rp = val.resp !== undefined ? val.resp : atual.resp, rv = val.reve !== undefined ? val.reve : atual.reve, vd = val.valida !== undefined ? val.valida : atual.valida;
    if (rp && rp !== GRUPO_TXT && (rp === rv || rp === vd)) erros.push('Segregation of duties: ' + rp + ' cannot report and also review or validate the same KPI.');
    return { val: val, erros: erros };
  };
  /* Grava o que mudou e devolve a lista das mudancas, para o registo */
  var aplicar = function (c, val) {
    var antes = lerInd(c), mud = [];
    ['dep', 'nome', 'unidade'].concat(Object.keys(val)).forEach(function (k, i, l) {
      if (l.indexOf(k) !== i || val[k] === undefined) return;
      var f = campoK[k];
      if (!f || f.ler || !f.set || String(antes[k]) === String(val[k])) return;
      f.set(c, val[k]);
      mud.push({ k: k, t: f.t, de: antes[k], para: val[k] });
    });
    return mud;
  };
  var registar = function (c, mud, usr, origem) {
    if (!mud.length) return;
    var curto = function (v) { var t = String(v); return t.length > 40 ? t.slice(0, 40) + '…' : t || '(empty)'; };
    P.eventoGlobal('Indicator ' + c.id + ' ' + c.nome + (origem ? ' (' + origem + ')' : '') + ': ' + mud.map(function (m) { return rotCurto(m.k) + ' from ' + curto(m.de) + ' to ' + curto(m.para); }).join('; ') + '.', usr.nome, 'Change');
  };
  var rotCurto = function (k) { return campoK[k].t.replace(/^.* - /, '').replace(/ \[.*\]$/, ''); };

  /* --- Estado da pagina -------------------------------------------------------------- */
  U.ind = { vista: 'lista', q: '', tema: '', dep: '', emp: '', resp: '', est: 'todos', inativos: false, per: '', sel: {}, lim: 200, ed: null, lote: null, env: null, imp: null };
  var periodos = function () { return (S.periodos || []).filter(function (p) { return p.ano === S.ciclo.ano; }); };
  var perAtual = function () {
    var f = U.ind, l = periodos();
    if (f.per && l.some(function (p) { return p.id === f.per; })) return P.periodo(f.per);
    var hoje = P.hojeISO(), tri = l.filter(function (p) { return p.tipo === 'trimestre'; });
    var x = tri.filter(function (p) { return p.ini <= hoje && hoje <= p.fim; })[0] || tri.filter(function (p) { return p.fecho >= hoje; })[0] || l[0];
    f.per = x ? x.id : '';
    return x || null;
  };
  /* Pesquisa em tudo o que se sabe do indicador, mesmo o que a tabela nao mostra (descricao, formula, fonte, controlos...).
     Todas as palavras tem de aparecer, em qualquer campo. Devolve o primeiro campo escondido onde apareceu, para o mostrar na linha. */
  var VISIVEIS = ['id', 'nome', 'dr', 'unidade', 'freq', 'dep', 'resp', 'reporta', 'empresas'];
  var achado = function (c, q) {
    var d = lerInd(c), txt = {}, todo = '';
    CAMPOS.forEach(function (f) { txt[f.k] = norm(d[f.k]); todo += ' ' + txt[f.k]; });
    var s2 = per2(c); todo += ' ' + norm(s2);
    var pal = q.split(' ').filter(Boolean);
    if (!pal.every(function (w) { return todo.indexOf(w) > -1; })) return null;
    var vis = VISIVEIS.map(function (k) { return txt[k]; }).join(' ') + ' ' + norm(s2);
    if (pal.every(function (w) { return vis.indexOf(w) > -1; })) return { vis: true };
    var k = CAMPOS.filter(function (f) { return VISIVEIS.indexOf(f.k) < 0 && pal.some(function (w) { return txt[f.k].indexOf(w) > -1; }); })[0];
    return k ? { campo: k, valor: String(d[k.k]) } : { vis: true };
  };
  var per2 = function (c) { var per = P.periodo(U.ind.per); return per ? P.estadoTarefaInd(c.id, per.id).txt : ''; };
  /* Excerto com as palavras pesquisadas a negrito */
  var excerto = function (txt, q) {
    var t = String(txt), n = norm(t), pal = q.split(' ').filter(Boolean), pos = -1;
    pal.forEach(function (w) { var k = n.indexOf(w); if (k > -1 && (pos < 0 || k < pos)) pos = k; });
    var ini = Math.max(0, pos - 50), fim = Math.min(t.length, (pos < 0 ? 0 : pos) + 110), parte = t.slice(ini, fim);
    var html = e(parte);
    pal.forEach(function (w) { if (w.length < 2) return; var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'); html = html.replace(re, '<mark>$1</mark>'); });
    return (ini ? '…' : '') + html + (fim < t.length ? '…' : '');
  };
  /* Empresa escolhida no topo: cada empresa ve so os indicadores que tem de reportar */
  var daEmpresa = function (c) { var f = U.ind; return !f.emp || (P.reportaInd(c) || {}).id === f.emp; };
  var filtrados = function () {
    var f = U.ind, q = norm(f.q), per = perAtual();
    return S.cat.filter(function (c) {
      if (!f.inativos && !P.indAtivo(c)) return false;
      if (f.tema && (c.tema || '') !== f.tema) return false;
      if (f.dep && P.donoIndicador(c.id) !== f.dep) return false;
      if (!daEmpresa(c)) return false;
      if (f.resp === '__grupo' && atrL(c.id).submete) return false;
      if (f.resp && f.resp !== '__grupo' && atrL(c.id).submete !== f.resp) return false;
      if (f.est !== 'todos' && per) { var s = P.estadoTarefaInd(c.id, per.id).cod; if (f.est === 'aberta' ? ['aberta', 'atraso', 'revisao'].indexOf(s) < 0 : s !== f.est) return false; }
      if (q && !achado(c, q)) return false;
      return true;
    });
  };
  var selecionados = function () { return S.cat.filter(function (c) { return U.ind.sel[c.id]; }).map(function (c) { return c.id; }); };

  /* --- Pagina ------------------------------------------------------------------------ */
  var ICO = {
    mais: '<path d="M12 5v14M5 12h14"/>', descarregar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><path d="M12 15V3"/>',
    enviar: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>', sino: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>', lapis: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m14 6 4 4"/>'
  };
  /* Limiar na tabela: editavel por indicador; vazio volta ao limiar por omissao */
  var limiarCel = function (c) {
    var proprio = !!c.limiar_proprio, v = P.limiarDe(c), adm = P.gereTudo(u());
    var txt = '<span class="ki-lim-t" data-fx-valor>' + e(P.fmtNum(v, v % 1 ? 1 : 0)) + '%</span>';
    if (!adm) return txt + '<small class="ki-sub" data-fx-ignorar>' + (proprio ? 'own' : 'default') + '</small>';
    return '<label class="ps-sr" for="kl-lim-' + e(c.id) + '">Change threshold of ' + e(c.nome) + '</label><span class="ki-lim-in' + (proprio ? ' proprio' : '') + '"><input id="kl-lim-' + e(c.id) + '" class="ps-in ps-num" inputmode="decimal" autocomplete="off" placeholder="' + e(P.limiarPadrao()) + '" value="' + e(v) + '" data-c="indLimiar" data-id="' + e(c.id) + '" title="Empty uses the default of ' + e(P.limiarPadrao()) + '%"><i aria-hidden="true">%</i></span><small class="ki-sub" data-fx-ignorar>' + (proprio ? 'own threshold' : 'default') + '</small>';
  };
  var respHtml = function (c) {
    var r = P.responsavelInd(c.id);
    return (r.tipo === 'pessoa' ? X.pessHtml(r.nome) + '<small class="ki-sub" data-fx-ignorar>' + e(r.dep) + '</small>' : X.depHtml(r.dep) + '<small class="ki-sub" data-fx-ignorar>Whole department</small>');
  };
  var empHtmlInd = function (c) {
    var rep = P.reportaInd(c), l = P.empresasInd(c);
    return '<span class="ki-emp">' + (rep ? X.empHtml(rep.nome) : '<span class="ps-mut">-</span>') + '<small class="ki-sub" data-fx-ignorar>Covers ' + (l.length === S.ent.length && l.length > 1 ? 'all ' + l.length + ' companies' : e(l.map(function (x) { return x.nome; }).join(', '))) + '</small></span>';
  };
  B.indicadores = function () {
    var f = U.ind, usr = u(), per = perAtual(), todos = S.cat.filter(function (c) { return P.indAtivo(c) && daEmpresa(c); }), l = filtrados(), sel = selecionados(), vis = l.slice(0, f.lim);
    var empSel = f.emp ? S.ent.filter(function (x) { return x.id === f.emp; })[0] : null;
    if (f.emp && !empSel) f.emp = '';
    var est = function (cod) { return todos.filter(function (c) { var s = per ? P.estadoTarefaInd(c.id, per.id).cod : 'nao'; return cod === 'aberta' ? ['aberta', 'atraso', 'revisao'].indexOf(s) > -1 : s === cod; }).length; };
    var semPessoa = todos.filter(function (c) { return !atrL(c.id).submete; }).length;
    var tile = function (t, v, s, cls, alvo) { return '<button type="button" class="ps-kpi ki-tile ' + (cls || '') + (alvo && (alvo[0] === 'est' ? f.est === alvo[1] : f.resp === alvo[1]) ? ' on' : '') + '"' + (alvo ? ' data-a="indTile" data-v="' + alvo.join('|') + '"' : ' disabled') + '><span>' + e(t) + '</span><b>' + v + '</b><small>' + e(s) + '</small></button>'; };
    var perSel = '<select id="ki-per" class="ps-sel" aria-label="Reporting period of the tasks" data-c="indF" data-id="per">' + periodos().map(function (p) { return opt(p.id, p.nome, f.per); }).join('') + '</select>';
    var temas = []; S.cat.forEach(function (c) { if (c.tema && temas.indexOf(c.tema) < 0) temas.push(c.tema); });
    var topo = '<div class="ki-topo"><div><h2>Indicators</h2><p class="ps-mut ps-small">One place for every KPI: what it is, who reports it, which companies it covers, and the tasks sent for each period.</p></div>' +
      '<div class="ps-sp"><button type="button" class="ps-btn" data-a="indCalcAuto" data-tip="Fill in the Calculation (KPI codes) of the output indicators that have none, from their calculation methodology.">Fill calculations</button><button type="button" class="ps-btn" data-a="indImportar">' + svg(I.upload, 15) + 'Import Excel</button><button type="button" class="ps-btn" data-a="indExportar">' + svg(ICO.descarregar, 15) + 'Export Excel</button><button type="button" class="ps-btn pri" data-a="indNovo">' + svg(ICO.mais, 15) + 'New indicator</button></div></div>';
    var tiles = '<div class="ps-kpis ki-tiles">' + tile('Active indicators', todos.length, empSel ? 'reported by ' + empSel.nome : S.cat.length - todos.length ? (S.cat.length - todos.length) + ' inactive' : 'in the catalogue') +
      tile('Owned by a department', semPessoa, 'no person named', semPessoa ? 'k-warn' : '', ['resp', '__grupo']) +
      tile('Not sent, ' + (per ? per.nome : ''), est('nao'), 'no task for this period', est('nao') ? 'k-warn' : '', ['est', 'nao']) +
      tile('Open tasks', est('aberta'), est('atraso') + ' overdue', 'k-info', ['est', 'aberta']) +
      tile('Approved', est('feito'), per ? per.nome : '', 'k-ok', ['est', 'feito']) + '</div>';
    var pesquisa = '<div class="ki-busca" role="search"><span class="ki-busca-ic" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>' +
      '<label class="ps-sr" for="ki-q">Search the indicators</label><input id="ki-q" class="ki-busca-in" type="search" autocomplete="off" placeholder="Search anything: name, ID, description, formula, source, owner, company, controls…" value="' + e(f.q) + '" data-i="indBusca" data-c="indF" data-id="q">' +
      (f.q ? '<button type="button" class="ki-busca-x" data-a="indBuscaLimpar" aria-label="Clear the search">×</button>' : '') + '</div>';
    var filtros = pesquisa + '<div class="ps-filtros ki-filtros">' +
      campo('ki-tema', 'Topic', '<select id="ki-tema" class="ps-sel" data-c="indF" data-id="tema">' + opt('', 'All', f.tema) + temas.map(function (t) { return opt(t, t, f.tema); }).join('') + '</select>') +
      campo('ki-dep', 'Department', '<select id="ki-dep" class="ps-sel" data-c="indF" data-id="dep">' + opt('', 'All', f.dep) + P.UNIDADES.map(function (t) { return opt(t, t, f.dep); }).join('') + '</select>') +
      campo('ki-resp', 'Responsible', '<select id="ki-resp" class="ps-sel" data-c="indF" data-id="resp">' + opt('', 'Anyone', f.resp) + opt('__grupo', 'Whole department (no person)', f.resp) + pessoas('submete').map(function (x) { return opt(x.login, x.nome, f.resp); }).join('') + '</select>') +
      campo('ki-per', 'Reporting period', perSel) + campo('ki-est', 'Task, ' + (per ? per.nome : ''), '<select id="ki-est" class="ps-sel" data-c="indF" data-id="est">' + [['todos', 'Any status'], ['nao', 'Not sent'], ['aberta', 'Open'], ['atraso', 'Overdue'], ['revisao', 'In review'], ['feito', 'Approved']].map(function (x) { return opt(x[0], x[1], f.est); }).join('') + '</select>') +
      '<label class="ps-chk"><input id="ki-inat" type="checkbox" data-c="indInativos"' + (f.inativos ? ' checked' : '') + '> Show inactive</label>' +
      (f.q || f.tema || f.dep || f.resp || f.est !== 'todos' ? '<button type="button" class="ps-btn liga" data-a="indLimpar">Clear filters</button>' : '') + '</div>' +
      (P.gereTudo(usr) ? '<div class="ki-limp"><span class="ki-limp-t"><b>Default change threshold</b><small>Above it, the platform raises an alert and asks for a justification. Indicators with their own threshold keep it.</small></span><label class="ps-sr" for="ki-limp">Default change threshold (%)</label><span class="ki-lim-in"><input id="ki-limp" class="ps-in ps-num" inputmode="decimal" value="' + e(P.limiarPadrao()) + '" data-c="indLimPadrao"><i aria-hidden="true">%</i></span><span class="ps-small ps-mut">' + S.cat.filter(function (c) { return c.limiar_proprio; }).length + ' with own threshold</span><button type="button" class="ps-btn peq" data-a="indLimTodos">Apply to all indicators</button></div>' : '');
    var todosSel = l.length > 0 && l.every(function (c) { return f.sel[c.id]; });
    var lote = sel.length ? '<div class="ki-lote" role="region" aria-label="Actions for the selected indicators"><b>' + sel.length + ' selected</b><span class="ps-sp">' +
      '<button type="button" class="ps-btn pri peq" data-a="indEnviarAbrir">' + svg(ICO.enviar, 14) + 'Send tasks</button><button type="button" class="ps-btn peq" data-a="indLembrar">' + svg(ICO.sino, 14) + 'Send reminder</button>' +
      '<button type="button" class="ps-btn peq" data-a="indLoteAbrir">' + svg(ICO.lapis, 14) + 'Edit together</button><button type="button" class="ps-btn peq" data-a="indExportar">' + svg(ICO.descarregar, 14) + 'Export selection</button>' +
      '<button type="button" class="ps-btn liga" data-a="indSelLimpar">Clear selection</button></span></div>' : '';
    var linhas = vis.map(function (c) {
      var s = per ? P.estadoTarefaInd(c.id, per.id) : { cod: 'nao', txt: 'Not sent', cls: '' }, on = !!f.sel[c.id], id = e(c.id);
      var tarefa = s.m ? '<a class="ki-tar" href="' + rota('Milestone/' + s.m.id) + '" title="' + e(s.m.nome + ', due ' + P.fmtData(s.m.prazo)) + '">' + chip(s.txt, s.cls) + '<small class="ki-sub" data-fx-ignorar>due ' + e(P.fmtData(s.m.prazo)) + '</small></a>'
        : P.indAtivo(c) ? '<button type="button" class="ps-btn peq ki-env1" data-a="indEnviar1" data-v="' + id + '">' + svg(ICO.enviar, 13) + 'Send</button>' : chip('Inactive');
      return '<tr class="' + (on ? 'ki-on' : '') + (P.indAtivo(c) ? '' : ' ki-off') + '"><td class="ki-c"><input id="ks-' + id + '" type="checkbox" aria-label="Select ' + e(c.nome) + '" data-c="indSel" data-id="' + id + '"' + (on ? ' checked' : '') + '></td>' +
        '<td class="prim"><button type="button" class="ki-nome" data-a="indEditar" data-v="' + id + '"><b>' + e(c.nome) + '</b><small data-fx-ignorar><span class="ps-cod">' + id + '</span>' + e((c.esrs_requisito || 'No ESRS') + ' · ' + (c.unidade_medida || 'no unit') + ' · ' + campoK.freq.get(c)) + (c.tipo === 'derivado' ? ' · derived' : '') + '</small></button>' + (function () { if (!f.q) return ''; var a = achado(c, norm(f.q)); return a && a.campo ? '<span class="ki-achado" data-fx-ignorar><b>' + e(rotCurto(a.campo.k)) + ':</b> ' + excerto(a.valor, norm(f.q)) + '</span>' : ''; })() + '</td>' +
        '<td data-l="Threshold" class="ki-lim">' + limiarCel(c) + '</td><td data-l="Responsible">' + respHtml(c) + '</td><td data-l="Reported by">' + empHtmlInd(c) + '</td><td data-l="Task">' + tarefa + '</td>' +
        '<td class="ki-ac"><button type="button" class="ps-btn peq" data-a="indEditar" data-v="' + id + '" aria-label="Edit ' + e(c.nome) + '">' + svg(ICO.lapis, 14) + 'Edit</button></td></tr>';
    }).join('');
    var tabela = l.length ? '<div class="ps-tw"><table class="ps-t ki-t"><thead><tr><th class="ki-c"><input id="ks-todos" type="checkbox" aria-label="Select all ' + l.length + ' indicators in the list" data-c="indSelTodos"' + (todosSel ? ' checked' : '') + '></th><th scope="col">Indicator</th><th scope="col">Threshold</th><th scope="col">Responsible</th><th scope="col">Reported by</th><th scope="col">Task, ' + e(per ? per.nome : '') + '</th><th><span class="ps-sr">Actions</span></th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      (l.length > vis.length ? '<div class="ps-sp ps-mt"><button type="button" class="ps-btn" data-a="indMais">Show ' + Math.min(200, l.length - vis.length) + ' more</button><span class="ps-mut ps-small">' + vis.length + ' of ' + l.length + '</span></div>' : '')
      : vazio(S.cat.length ? 'No indicator matches these filters.' : 'No indicators yet. Create one or import your KPI list in Excel.');
    /* Duas vistas no mesmo ecra: a lista dos indicadores e o mapa por departamento e periodo (o antigo Launch by department) */
    var vistas = '<div class="ki-vistas" role="tablist" aria-label="View">' + [['lista', 'By indicator', l.length + ' indicators'], ['dep', 'By department', 'coverage per period'], ['tl', 'Timeline', 'where we are and what was sent']].map(function (v) { return '<button type="button" role="tab" aria-selected="' + (f.vista === v[0]) + '" class="ki-vista' + (f.vista === v[0] ? ' on' : '') + '" data-a="indVista" data-v="' + v[0] + '"><b>' + v[1] + '</b><small>' + e(v[2]) + '</small></button>'; }).join('') + '</div>';
    var empresas = '<div class="ki-ents" role="tablist" aria-label="Company">' + [{ id: '', nome: 'All companies' }].concat(S.ent).map(function (x) {
      var n = S.cat.filter(function (c) { return P.indAtivo(c) && (!x.id || (P.reportaInd(c) || {}).id === x.id); }).length;
      return '<button type="button" role="tab" aria-selected="' + (f.emp === x.id) + '" class="ki-ent' + (f.emp === x.id ? ' on' : '') + '" data-a="indEmp" data-v="' + e(x.id) + '">' + (x.id ? X.avEmpresa() : '') + '<b>' + e(x.nome) + '</b><span class="n">' + n + '</span></button>';
    }).join('') + '</div>';
    if (f.vista === 'dep') return topo + empresas + tiles + vistas + B.lancar();
    if (f.vista === 'tl') return topo + empresas + tiles + vistas + '<div class="ki-tl">' + (X.Blocos2.timeline ? X.Blocos2.timeline() : vazio('The timeline did not load.')) + '</div>';
    return topo + empresas + tiles + vistas + '<div class="ps-card ki-card"><div class="ps-card-body">' + filtros + lote + '<div class="ki-conta ps-small ps-mut">' + l.length + ' indicator(s)' + (P.gereTudo(usr) ? '' : ', read only') + '</div>' + tabela + '</div></div>';
  };
  C.indF = function (el) { U.ind[el.dataset.id] = el.value; U.ind.lim = 200; };
  C.indInativos = function (el) { U.ind.inativos = el.checked; };
  C.indSel = function (el) { if (el.checked) U.ind.sel[el.dataset.id] = true; else delete U.ind.sel[el.dataset.id]; };
  C.indSelTodos = function (el) { filtrados().forEach(function (c) { if (el.checked) U.ind.sel[c.id] = true; else delete U.ind.sel[c.id]; }); };
  A.indSelLimpar = function () { U.ind.sel = {}; R(); };
  A.indLimpar = function () { var f = U.ind; f.q = ''; f.tema = ''; f.dep = ''; f.resp = ''; f.est = 'todos'; R(); };
  A.indBuscaLimpar = function () { U.ind.q = ''; R(); var x = document.getElementById('ki-q'); if (x) x.focus(); };
  /* A pesquisa filtra enquanto se escreve, com uma pequena pausa */
  var tBusca = null;
  X.Live.indBusca = function (el) { U.ind.q = el.value; U.ind.lim = 200; clearTimeout(tBusca); tBusca = setTimeout(R, 180); };
  /* Limiar de um indicador, direto na tabela */
  C.indLimiar = function (el) {
    var c = P.cat(el.dataset.id), usr = u(), t = String(el.value).trim(), antes = P.limiarDe(c) + '%' + (c.limiar_proprio ? '' : ' (default)');
    if (!c || !P.gereTudo(usr)) return;
    if (t === '') { if (!c.limiar_proprio) return; c.limiar_proprio = false; }
    else { var n = P.lerNumero(t); if (n === null || n < 0) { toast('The threshold must be a number, 0 or above.', 'err'); el.value = P.limiarDe(c); return; } if (n === P.limiarDe(c)) return; c.limiar_variacao_pct = n; c.limiar_proprio = true; }
    P.eventoGlobal('Indicator ' + c.id + ' ' + c.nome + ': Change threshold (%) from ' + antes + ' to ' + P.limiarDe(c) + '%' + (c.limiar_proprio ? '' : ' (default)') + '.', usr.nome, 'Change');
    P.guardar();
  };
  /* Limiar por omissao: vale para todos os indicadores sem limiar proprio; "Apply to all" tira os limiares proprios */
  C.indLimPadrao = function (el) {
    var n = P.lerNumero(el.value), usr = u();
    if (n === null || n < 0) { toast('The default threshold must be a number, 0 or above.', 'err'); el.value = P.limiarPadrao(); return; }
    if (n === P.limiarPadrao()) return;
    var antes = P.limiarPadrao(); S.ciclo.limiar_padrao = n;
    P.eventoGlobal('Default change threshold from ' + antes + '% to ' + n + '%.', usr.nome, 'Change'); P.guardar();
  };
  A.indLimTodos = function () {
    var usr = u(), v = P.limiarPadrao(), prop = S.cat.filter(function (c) { return c.limiar_proprio; });
    if (prop.length && !window.confirm('Use ' + v + '% for every indicator? ' + prop.length + ' indicator(s) with their own threshold go back to the default.')) return;
    prop.forEach(function (c) { c.limiar_proprio = false; });
    P.eventoGlobal('Change threshold of ' + v + '% applied to all indicators' + (prop.length ? ' (' + prop.length + ' own threshold(s) removed)' : '') + '.', usr.nome, 'Change');
    P.guardar(); toast(v + '% applied to all ' + S.cat.length + ' indicators.', 'ok'); R();
  };
  A.indEmp = function (d) { U.ind.emp = d.v; U.ind.sel = {}; R(); };
  A.indVista = function (d) { U.ind.vista = d.v; R(); };
  A.indMais = function () { U.ind.lim += 200; R(); };
  A.indTile = function (d) { var p = d.v.split('|'), f = U.ind; if (p[0] === 'est') f.est = f.est === p[1] ? 'todos' : p[1]; else f.resp = f.resp === p[1] ? '' : p[1]; R(); };

  /* --- Painel do indicador: tudo num sitio -------------------------------------------- */
  var inp = function (k, d, extra) { return '<input id="ke-' + k + '" class="ps-in" data-c="indCampo" data-f="' + k + '" value="' + e(d[k] === undefined ? '' : d[k]) + '"' + (extra || '') + '>'; };
  var area = function (k, d) { return '<textarea id="ke-' + k + '" class="ps-ta" rows="3" data-c="indCampo" data-f="' + k + '">' + e(d[k] || '') + '</textarea>'; };
  var sel = function (k, d, ops, vazioTxt) { return '<select id="ke-' + k + '" class="ps-sel" data-c="indCampo" data-f="' + k + '">' + (vazioTxt === undefined ? '' : opt('', vazioTxt, d[k])) + ops.map(function (o) { return opt(o, o, d[k]); }).join('') + '</select>'; };
  var cmp = function (k, rot, html, ajuda) { return '<div class="ps-campo"><label class="ps-lab" for="ke-' + k + '">' + e(rot) + '</label>' + html + (ajuda ? '<small class="ps-mut">' + e(ajuda) + '</small>' : '') + '</div>'; };
  var secao = function (g, corpo, ajuda) { var x = GRUPOS.filter(function (y) { return y[0] === g; })[0]; return '<section class="ki-sec" style="--gc:#' + x[2] + '"><h3>' + e(x[1]) + (ajuda ? '<small>' + e(ajuda) + '</small>' : '') + '</h3><div class="ki-g">' + corpo + '</div></section>'; };
  /* Companies, no topo do painel: que empresas o indicador abrange e, em cada uma, o departamento e a pessoa que reportam */
  var secaoEmpresas = function (d) {
    var cobre = String(d.empresas || '').split(';').map(function (t) { return t.trim(); }).filter(Boolean);
    var chk = '<div class="ki-emps" role="group" aria-label="Companies covered">' + S.ent.map(function (x, i) { var on = cobre.indexOf(x.nome) > -1; return '<label class="ki-empc' + (on ? ' on' : '') + '"><input id="ke-emp-' + i + '" type="checkbox" data-c="indEmp" data-id="' + e(x.nome) + '"' + (on ? ' checked' : '') + '>' + X.avEmpresa() + e(x.nome) + '</label>'; }).join('') + '</div>';
    var linhas = cobre.map(function (nome, i) {
      var r = (d.respEmp || {})[nome] || { dep: '', resp: GRUPO_TXT }, deps = P.depsDaEmpresa ? P.depsDaEmpresa(nome) : P.UNIDADES, rep = d.reporta === nome;
      if (r.dep && deps.indexOf(r.dep) < 0) deps = deps.concat([r.dep]);
      /* So as pessoas desta empresa (Users and profiles, Companies) */
      var daEmp = pessoas('submete').filter(function (x) { return P.userNaEmpresa(x, nome); });
      var doDep = daEmp.filter(function (x) { return x.perfil === 'esg' || P.temUnidade(x, r.dep); }), outras = daEmp.filter(function (x) { return doDep.indexOf(x) < 0; });
      /* Quem tem a sessao aberta aparece sempre, para se poder atribuir a si proprio */
      var eu = u(), todas = doDep.concat(outras);
      var soltos = [eu.nome].concat(r.resp && r.resp !== GRUPO_TXT ? [r.resp] : []).filter(function (n, k, a) { return a.indexOf(n) === k && !todas.some(function (x) { return x.nome === n; }); });
      var selResp = '<select id="ker-p-' + i + '" class="ps-sel" data-pesq data-c="indRespEmp" data-id="' + e(nome) + '" data-f="resp">' + opt(GRUPO_TXT, 'Whole department' + (r.dep ? ': ' + r.dep : ''), r.resp) +
        (soltos.length ? '<optgroup label="You">' + soltos.map(function (n) { return opt(n, n === eu.nome ? 'Me: ' + n : n, r.resp); }).join('') + '</optgroup>' : '') +
        (doDep.length ? '<optgroup label="People of this department">' + doDep.map(function (x) { return opt(x.nome, x.nome, r.resp); }).join('') + '</optgroup>' : '') + (outras.length ? '<optgroup label="Other people">' + outras.map(function (x) { return opt(x.nome, x.nome + ' (' + P.unidadesTxt(x) + ')', r.resp); }).join('') + '</optgroup>' : '') + '</select>';
      return '<div class="ke-er' + (rep ? ' rep' : '') + '"><div class="ke-er-e">' + X.empHtml(nome) + '<label class="ps-chk ke-er-rep"><input type="radio" name="ke-rep" id="ker-r-' + i + '" data-c="indRep" data-id="' + e(nome) + '"' + (rep ? ' checked' : '') + '> Reports it</label></div>' +
        '<div class="ps-campo"><label class="ps-lab" for="ker-d-' + i + '">Department *</label><select id="ker-d-' + i + '" class="ps-sel" data-pesq data-c="indRespEmp" data-id="' + e(nome) + '" data-f="dep">' + (r.dep ? '' : opt('', 'Choose', '')) + deps.map(function (x) { return opt(x, x, r.dep); }).join('') + '</select></div>' +
        '<div class="ps-campo"><span class="ps-sp-b"><label class="ps-lab" for="ker-p-' + i + '">Responsible: person or group *</label>' + (r.resp === u().nome ? '<small class="ps-mut">Assigned to you</small>' : '<button type="button" class="ps-btn liga ke-eu" data-a="indRespEu" data-v="' + e(nome) + '">Assign to me</button>') + '</span>' + selResp + '</div></div>';
    }).join('');
    return secao('emp', '<div class="ki-full"><span class="ps-lab">Companies covered *</span>' + chk + '</div>' +
      '<div class="ki-full ke-ers">' + (linhas || '<p class="ps-mut ps-small">Choose at least one company.</p>') + '</div>' +
      '<div class="ki-full ps-small ps-mut">' + (cobre.length > 1 ? 'Each company has its own department and person. The company marked "Reports it" receives the task; with more than one company, the value is entered per company and combined with the aggregation.' : 'The department and the person who report this indicator in this company.') + '</div>' +
      cmp0('scope', 'KPI Scope', inp0('scope', d), 'For example Group, Subsidiaries, Sites.'), 'Which companies, and who reports in each');
  };
  var cmp0 = function (k, rot, html, ajuda) { return '<div class="ps-campo"><label class="ps-lab" for="ke-' + k + '">' + e(rot) + '</label>' + html + (ajuda ? '<small class="ps-mut">' + e(ajuda) + '</small>' : '') + '</div>'; };
  var inp0 = function (k, d) { return '<input id="ke-' + k + '" class="ps-in" data-c="indCampo" data-f="' + k + '" value="' + e(d[k] === undefined ? '' : d[k]) + '">'; };
  /* Responsaveis por empresa no rascunho do painel: os gravados, ou o responsavel geral para cada empresa abrangida */
  var respEmpDe = function (c, d) {
    var o = {}, cobre = String(d.empresas || '').split(';').map(function (t) { return t.trim(); }).filter(Boolean);
    cobre.forEach(function (nome) {
      var x = S.ent.filter(function (y) { return y.nome === nome; })[0], g = c && c.resp_emp && x ? c.resp_emp[x.id] : null;
      o[nome] = g && g.dep ? { dep: g.dep, resp: g.pessoa ? (P.user(g.pessoa) || {}).nome || GRUPO_TXT : GRUPO_TXT } : { dep: d.dep || '', resp: nome === d.reporta ? d.resp || GRUPO_TXT : GRUPO_TXT };
    });
    return o;
  };
  X.Pn.indEd = function () {
    var E = U.ind.ed, d = E.d, c = E.novo ? null : P.cat(E.id), per = perAtual();
    var freqs = FREQ.map(function (f) { return f[1]; }); if (d.freq && freqs.indexOf(d.freq) < 0) freqs.push(d.freq);
    var depPess = pessoas('submete').filter(function (x) { return x.perfil === 'esg' || P.temUnidade(x, d.dep); }), outras = pessoas('submete').filter(function (x) { return depPess.indexOf(x) < 0; });
    var respOps = '<select id="ke-resp" class="ps-sel" data-c="indCampo" data-f="resp">' + opt(GRUPO_TXT, 'Whole department: ' + (d.dep || 'choose a department'), d.resp) +
      (depPess.length ? '<optgroup label="People of this department">' + depPess.map(function (x) { return opt(x.nome, x.nome, d.resp); }).join('') + '</optgroup>' : '') +
      (outras.length ? '<optgroup label="Other people">' + outras.map(function (x) { return opt(x.nome, x.nome + ' (' + P.unidadesTxt(x) + ')', d.resp); }).join('') + '</optgroup>' : '') + '</select>';
    var cobre = String(d.empresas || '').split(';').map(function (t) { return t.trim(); }).filter(Boolean);
    var empChk = '<div class="ki-emps" role="group" aria-label="Companies covered">' + S.ent.map(function (x, i) { var on = cobre.indexOf(x.nome) > -1; return '<label class="ki-empc' + (on ? ' on' : '') + '"><input id="ke-emp-' + i + '" type="checkbox" data-c="indEmp" data-id="' + e(x.nome) + '"' + (on ? ' checked' : '') + '>' + X.avEmpresa() + e(x.nome) + '</label>'; }).join('') + '</div>';
    var hist = c ? (S.evg || []).filter(function (x) { return x.texto.indexOf('Indicator ' + c.id + ' ') === 0; }).slice(-6).reverse() : [];
    var tar = c && per ? P.estadoTarefaInd(c.id, per.id) : null;
    var corpo = (E.erros && E.erros.length ? '<div class="ps-aviso err" role="alert"><b>Check before saving</b><ul class="ki-err">' + E.erros.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul></div>' : '') +
      (tar ? '<div class="ki-estado"><span>Task for ' + e(per.nome) + '</span>' + chip(tar.txt, tar.cls) + (tar.m ? '<a href="' + rota('Milestone/' + tar.m.id) + '" data-a="fecharPainel">Open ' + e(tar.m.nome) + '</a>' : '<span class="ps-mut ps-small">Save and use Send task to ask for this period.</span>') + '</div>' : '') +
      secaoEmpresas(d) +
      secao('id', (E.novo ? cmp('id', 'KPI ID *', inp('id', d, ' maxlength="24" autocapitalize="characters"'), 'Short unique code, for example W05. It cannot be changed later.') : cmp('id', 'KPI ID', '<input id="ke-id" class="ps-in" readonly value="' + e(d.id) + '">')) +
        cmp('ativo', 'Status', sel('ativo', d, ['Active', 'Inactive']), 'Inactive indicators are not sent in tasks.') +
        '<div class="ki-full">' + cmp('nome', 'KPI Name *', inp('nome', d)) + '</div><div class="ki-full">' + cmp('desc', 'KPI Description', area('desc', d), 'What is measured, with the key definitions.') + '</div>') +
      secao('resp', cmp('reve', 'Reviewer', sel('reve', d, pessoas('reve').map(function (x) { return x.nome; }), 'Not set'), 'Reviews the value. Cannot be who reports.') +
        cmp('valida', 'Validator', sel('valida', d, pessoas('valida').map(function (x) { return x.nome; }), 'Not set'), 'Validates at the end.'), 'Who reviews and validates') +
      secao('car', cmp('unidade', 'Unit *', inp('unidade', d), 'For example m³, MWh, %, n.º') + cmp('casas', 'Decimals', inp('casas', d, ' inputmode="numeric"')) +
        cmp('freq', 'Reporting frequency *', sel('freq', d, freqs)) + cmp('recolha', 'Data collection frequency', sel('recolha', d, campoK.recolha.vals, 'Same as reporting')) +
        cmp('agreg', 'Aggregation', sel('agreg', d, AGREG.map(function (f) { return f[1]; })), 'How companies and periods are combined.') + cmp('natureza', 'Input / Output', sel('natureza', d, ['Input', 'Output']), 'Output: calculated from other indicators.') + cmp('calc', 'Calculation (KPI codes)', inp('calc', d, ' placeholder="For example A01 + A02" autocomplete="off"') + '<button type="button" class="ps-btn liga ke-eu" data-a="indCalcSug">Fill from the methodology</button>', 'Runs by itself once the inputs are submitted.') +
        cmp('div_tipo', 'Disclosure type', sel('div_tipo', d, ['Quantitative', 'Qualitative'])) + cmp('tipo_dado', 'Data type', sel('tipo_dado', d, campoK.tipo_dado.vals.indexOf(d.tipo_dado) < 0 && d.tipo_dado ? campoK.tipo_dado.vals.concat([d.tipo_dado]) : campoK.tipo_dado.vals)) +
        '<div class="ki-full">' + cmp('formula', 'Calculation methodology', area('formula', d), 'Methodology in words or key assumptions.') + '</div>') +
      secao('esrs', cmp('esrs', 'ESRS standard', sel('esrs', d, (S.mat || []).map(function (x) { return x.norma; }), 'Entity-specific'), d.esrs_tema || '') + cmp('dr', 'ESRS DR', inp('dr', d), 'Disclosure Requirement, for example E3-4.') +
        cmp('tema', 'Company topic', inp('tema', d)) + cmp('subtema', 'Company sub-topic', inp('subtema', d)) + (d.dps ? '<div class="ki-full ps-small ps-mut">ESRS datapoints: <span class="ps-mono">' + e(d.dps) + '</span>. From the ESRS datapoint list.</div>' : '')) +
      secao('ctrl', cmp('limiar', 'Change threshold (%)', inp('limiar', d, ' inputmode="decimal"'), 'Above it, the platform asks for a justification.') + cmp('evid', 'Evidence required', sel('evid', d, ['Yes', 'No']), 'A document must be attached to submit.') +
        '<div class="ki-full">' + cmp('ctrl', 'Other controls', inp('ctrl', d), 'Controls performed outside the platform.') + '</div>') +
      secao('disp', cmp('disp', 'Data available today', sel('disp', d, ['Yes', 'No'], 'Please select')) + cmp('fonte', 'Source or system', inp('fonte', d))) +
      secao('div', cmp('divulga', 'Disclose this KPI', sel('divulga', d, ['Yes', 'No'], 'Please select')) + cmp('uso', 'Report use', inp('uso', d), 'Reports where it is used, separated by commas.') +
        (d.divulga === 'No' ? '<div class="ki-full">' + cmp('motivo', 'If not disclosed, explain why', inp('motivo', d)) + '</div>' : '')) +
      (hist.length ? '<section class="ki-sec ki-hist"><h3>Change history<small>latest ' + hist.length + '</small></h3><ul>' + hist.map(function (x) { return '<li><span class="ps-mut ps-small">' + e(P.fmtDataHora(x.em)) + ', ' + e(x.por) + '</span>' + e(x.texto.replace(/^Indicator \S+ [^:]*: /, '')) + '</li>'; }).join('') + '</ul></section>' : '');
    return { t: E.novo ? 'New indicator' : d.nome || E.id, s: E.novo ? 'Define what it is, who reports it and which companies it covers' : E.id + ', ' + (d.dr || 'no ESRS') + ', ' + d.freq, largo: true, cls: 'alto ki-pan', b: corpo,
      p: (E.novo ? '' : '<button type="button" class="ps-btn" data-a="indEnviar1" data-v="' + e(E.id) + '">' + svg(ICO.enviar, 14) + 'Send task</button>') + '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="indGuardar">' + (E.novo ? 'Create indicator' : 'Save changes') + '</button>' };
  };
  A.indEditar = function (d) { var c = P.cat(d.v); if (!c) return; var dd = lerInd(c); dd.respEmp = respEmpDe(c, dd); U.ind.ed = { id: c.id, novo: false, d: dd, erros: [] }; X.abrePainel('indEd'); };
  A.indNovo = function () {
    var c = novoCat(''), d = lerInd(c);
    d.dep = U.ind.dep || ''; d.resp = GRUPO_TXT; d.reve = ''; d.valida = (pessoas('valida')[0] || {}).nome || ''; d.reporta = (S.ent.filter(function (x) { return x.id === U.ind.emp; })[0] || S.ent[0] || {}).nome || ''; d.freq = 'Annual';
    d.empresas = d.reporta; d.respEmp = respEmpDe(null, d);
    U.ind.ed = { id: '', novo: true, d: d, erros: [] }; X.abrePainel('indEd');
  };
  C.indCampo = function (el) {
    var d = U.ind.ed.d, k = el.dataset.f; d[k] = el.value;
    if (k === 'id') d.id = el.value.toUpperCase().replace(/[^A-Z0-9_.-]/g, '');
    if (k === 'esrs') { var m = (S.mat || []).filter(function (x) { return x.norma === el.value; })[0]; d.esrs_tema = m ? m.tema : ''; }
  };
  C.indEmp = function (el) {
    var d = U.ind.ed.d, l = String(d.empresas || '').split(';').map(function (t) { return t.trim(); }).filter(Boolean), n = el.dataset.id;
    if (el.checked && l.indexOf(n) < 0) l.push(n); if (!el.checked) l = l.filter(function (x) { return x !== n; });
    d.empresas = S.ent.filter(function (x) { return l.indexOf(x.nome) > -1; }).map(function (x) { return x.nome; }).join('; ');
    if (l.length && l.indexOf(d.reporta) < 0) d.reporta = l[0];
    d.respEmp = d.respEmp || {};
    if (el.checked && !d.respEmp[n]) d.respEmp[n] = { dep: d.dep || '', resp: GRUPO_TXT };
    sincRep(d);
  };
  /* A empresa que reporta da o departamento e a pessoa gerais do indicador (os que o resto da plataforma usa) */
  var sincRep = function (d) { var r = (d.respEmp || {})[d.reporta]; if (r) { d.dep = r.dep; d.resp = r.resp || GRUPO_TXT; } };
  /* Atribuir a si proprio: a pessoa com a sessao aberta; sem departamento, fica com o primeiro dela */
  A.indRespEu = function (d2) {
    var d = U.ind.ed.d, eu = u(); d.respEmp = d.respEmp || {};
    var r = (d.respEmp[d2.v] = d.respEmp[d2.v] || { dep: '', resp: GRUPO_TXT });
    r.resp = eu.nome;
    if (!r.dep) { var un = P.unidadesDe ? P.unidadesDe(eu) : []; if (un.length) r.dep = un[0]; }
    sincRep(d); toast(d2.v + ': assigned to you.', 'ok'); R();
  };
  C.indRespEmp = function (el) { var d = U.ind.ed.d, r = (d.respEmp[el.dataset.id] = d.respEmp[el.dataset.id] || { dep: '', resp: GRUPO_TXT }); r[el.dataset.f] = el.value; sincRep(d); };
  C.indRep = function (el) { var d = U.ind.ed.d; d.reporta = el.dataset.id; sincRep(d); };
  var guardarEd = function () {
    var E = U.ind.ed, usr = u(), d = E.d;
    if (!P.gereTudo(usr)) { E.erros = ['No permission.']; return false; }
    var c = E.novo ? null : P.cat(E.id), extra = [];
    if (E.novo) {
      if (!/^[A-Z0-9][A-Z0-9_.-]{1,23}$/.test(d.id || '')) extra.push('KPI ID is required: 2 to 24 letters or digits, with no spaces.');
      else if (P.cat(d.id)) extra.push('KPI ID ' + d.id + ' already exists. Choose another code.');
    }
    /* Cada empresa abrangida precisa de departamento; quem reporta numa empresa nao pode rever nem validar */
    var cobre = String(d.empresas || '').split(';').map(function (t) { return t.trim(); }).filter(Boolean);
    cobre.forEach(function (nome) {
      var re = (d.respEmp || {})[nome];
      if (!re || !re.dep) extra.push(nome + ': choose the department that reports it.');
      else if (re.resp && re.resp !== GRUPO_TXT && (re.resp === d.reve || re.resp === d.valida)) extra.push(nome + ': ' + re.resp + ' cannot report and also review or validate this KPI.');
    });
    sincRep(d);
    var r = resolver(d, c);
    E.erros = extra.concat(r.erros);
    if (E.erros.length) return false;
    if (E.novo) { c = novoCat(d.id); S.cat.push(c); atr(c.id); P.eventoGlobal('Indicator ' + c.id + ' ' + r.val.nome + ': created.', usr.nome, 'Creation'); }
    var mud = aplicar(c, r.val);
    /* Departamento e pessoa de cada empresa */
    var antesRE = JSON.stringify(c.resp_emp || {}), novoRE = {};
    cobre.forEach(function (nome) { var x = S.ent.filter(function (y) { return y.nome === nome; })[0], re = d.respEmp[nome], px = re.resp && re.resp !== GRUPO_TXT ? pessoaPor(re.resp, 'submete') : null; if (x) novoRE[x.id] = { dep: re.dep, pessoa: px ? px.login : '' }; });
    c.resp_emp = novoRE;
    if (antesRE !== JSON.stringify(novoRE)) mud.push({ k: 'resp', t: 'Responsible by company', de: '', para: cobre.map(function (nome) { var re = d.respEmp[nome]; return nome + ': ' + re.dep + ', ' + re.resp; }).join('; ') });
    if (!E.novo) registar(c, mud, usr);
    if (P.eOutput(c)) Object.keys(S.items).map(function (k) { return k.slice(0, k.lastIndexOf(':')); }).filter(function (k, i, l) { return l.indexOf(k) === i; }).forEach(function (ch) { P.calcularOutputs(ch, usr); });
    P.guardar();
    return { c: c, mud: mud, novo: E.novo };
  };
  A.indGuardar = function () {
    var r = guardarEd();
    if (!r) { R(); var b = document.querySelector('.ki-pan .ps-pan-b'); if (b) b.scrollTop = 0; return; }
    U.ind.ed = null; U.painel = null;
    toast(r.novo ? 'Indicator ' + r.c.id + ' created.' : r.mud.length ? r.mud.length + ' change(s) saved in ' + r.c.id + '. They are in the change history.' : 'Nothing changed.', 'ok'); R();
  };

  /* --- Editar varios de uma vez --------------------------------------------------------- */
  var LOTE = ['dep', 'resp', 'reve', 'valida', 'reporta', 'freq', 'limiar', 'evid', 'ativo'];
  X.Pn.indLote = function () {
    var L = U.ind.lote, d = L.d, ids = selecionados(), manter = 'Keep as it is';
    var s2 = function (k, ops) { return '<select id="kl-' + k + '" class="ps-sel" data-c="indLoteC" data-f="' + k + '">' + opt('', manter, d[k] || '') + ops.map(function (o) { return opt(o, o, d[k] || ''); }).join('') + '</select>'; };
    var c2 = function (k, rot, html) { return '<div class="ps-campo"><label class="ps-lab" for="kl-' + k + '">' + e(rot) + '</label>' + html + '</div>'; };
    return { t: 'Edit ' + ids.length + ' indicators together', s: 'Only the fields you change are applied', largo: true,
      b: (L.erros && L.erros.length ? '<div class="ps-aviso err" role="alert"><ul class="ki-err">' + L.erros.slice(0, 6).map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul></div>' : '') +
        '<div class="ki-g">' + c2('dep', 'Responsible department', s2('dep', P.UNIDADES)) + c2('resp', 'Responsible: person or group', s2('resp', [GRUPO_TXT].concat(pessoas('submete').map(function (x) { return x.nome; })))) +
        c2('reve', 'Reviewer', s2('reve', pessoas('reve').map(function (x) { return x.nome; }))) + c2('valida', 'Validator', s2('valida', pessoas('valida').map(function (x) { return x.nome; }))) +
        c2('reporta', 'Reporting company', s2('reporta', S.ent.map(function (x) { return x.nome; }))) + c2('freq', 'Reporting frequency', s2('freq', FREQ.map(function (f) { return f[1]; }))) +
        c2('limiar', 'Change threshold (%)', '<input id="kl-limiar" class="ps-in" inputmode="decimal" placeholder="' + manter + '" data-c="indLoteC" data-f="limiar" value="' + e(d.limiar || '') + '">') + c2('evid', 'Evidence required', s2('evid', ['Yes', 'No'])) + c2('ativo', 'Status', s2('ativo', ['Active', 'Inactive'])) + '</div>' +
        '<p class="ps-small ps-mut">Applies to: ' + e(ids.slice(0, 14).join(', ')) + (ids.length > 14 ? ' and ' + (ids.length - 14) + ' more' : '') + '. Every change goes to the change history of each indicator.</p>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="indLoteAplicar">Apply to ' + ids.length + ' indicators</button>' };
  };
  A.indLoteAbrir = function () { if (!selecionados().length) return; U.ind.lote = { d: {}, erros: [] }; X.abrePainel('indLote'); };
  C.indLoteC = function (el) { U.ind.lote.d[el.dataset.f] = el.value; };
  A.indLoteAplicar = function () {
    var L = U.ind.lote, usr = u(), dados = {}, ids = selecionados();
    LOTE.forEach(function (k) { if (String(L.d[k] || '').trim() !== '') dados[k] = L.d[k]; });
    if (!Object.keys(dados).length) { L.erros = ['Change at least one field.']; return R(); }
    var erros = [], prontos = [];
    ids.forEach(function (id) { var c = P.cat(id), r = resolver(dados, c); if (r.erros.length) erros.push(id + ': ' + r.erros[0]); else prontos.push([c, r.val]); });
    if (erros.length) { L.erros = erros; return R(); }
    var n = 0; prontos.forEach(function (x) { var mud = aplicar(x[0], x[1]); if (mud.length) { n++; registar(x[0], mud, usr, 'bulk edit'); } });
    P.guardar(); U.ind.lote = null; U.painel = null;
    toast(n + ' indicator(s) changed.', 'ok'); R();
  };

  /* --- Enviar tasks ------------------------------------------------------------------------ */
  X.Pn.indEnviar = function () {
    var E = U.ind.env, per = P.periodo(E.per), pl = P.planoEnvio(E.ids, E.per), prazo = E.prazo || (per ? per.fecho : '');
    var grupos = pl.grupos.map(function (g) {
      return '<li class="ki-envg"><div class="ki-envg-h">' + X.empHtml(g.empresa.nome) + '<span class="ki-seta">→</span>' + (g.resp.tipo === 'pessoa' ? X.pessHtml(g.resp.nome) : X.depHtml(g.dep)) + '<span class="ps-sp-flex"></span>' + chip(g.ms ? 'Added to ' + g.ms.id : 'New task', g.ms ? 'info' : 'ok') + '</div>' +
        '<div class="ki-envg-b"><b>' + g.ids.length + ' indicator' + (g.ids.length === 1 ? '' : 's') + '</b><span>' + e(g.ids.slice(0, 8).map(function (id) { return P.cat(id).nome; }).join(', ')) + (g.ids.length > 8 ? ' and ' + (g.ids.length - 8) + ' more' : '') + '</span></div></li>';
    }).join('');
    var fora = pl.fora.length ? '<details class="ki-fora"><summary>' + pl.fora.length + ' indicator(s) will not be sent</summary><ul class="ps-small">' + pl.fora.slice(0, 40).map(function (x) { return '<li><b>' + e(x.id) + '</b> ' + e((P.cat(x.id) || {}).nome || '') + ': ' + e(x.t) + '</li>'; }).join('') + '</ul></details>' : '';
    return { t: 'Send tasks', s: E.ids.length + ' indicator(s) selected', largo: true, cls: 'ki-pan',
      b: '<div class="ki-g">' + '<div class="ps-campo"><label class="ps-lab" for="kv-per">Reporting period</label><select id="kv-per" class="ps-sel" data-c="indEnvC" data-f="per">' + periodos().map(function (p) { return opt(p.id, p.nome + ' (data from ' + P.fmtData(p.ini) + ' to ' + P.fmtData(p.fim) + ')', E.per); }).join('') + '</select></div>' +
        '<div class="ps-campo"><label class="ps-lab" for="kv-prazo">Due date</label><input id="kv-prazo" type="date" class="ps-in" data-c="indEnvC" data-f="prazo" value="' + e(prazo) + '"><small class="ps-mut">Internal close of the period: ' + e(per ? P.fmtData(per.fecho) : '-') + '</small></div>' +
        '<div class="ki-full ps-campo"><label class="ps-lab" for="kv-nota">Note to the people who receive the task (optional)</label><input id="kv-nota" class="ps-in" data-c="indEnvC" data-f="nota" value="' + e(E.nota || '') + '" placeholder="For example: please attach the invoices of the period"></div></div>' +
        '<div class="ki-envr"><div><b>' + pl.n + '</b><span>indicator(s) to send</span></div><div><b>' + pl.grupos.length + '</b><span>task(s)</span></div><div><b>' + pl.grupos.filter(function (g, i, l) { return l.map(function (y) { return y.resp.nome; }).indexOf(g.resp.nome) === i; }).length + '</b><span>people or departments</span></div></div>' +
        (pl.n ? '<p class="ps-small ps-mut">One task per reporting company and responsible. Each person sees it in My tasks, with the due date, and fills it in on screen or in Excel.</p><ul class="ki-envl">' + grupos + '</ul>' : '<div class="ps-aviso warn">Nothing to send for ' + e(per ? per.nome : 'this period') + '.</div>') + fora,
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="indEnviarSim"' + (pl.n ? '' : ' disabled') + '>' + svg(ICO.enviar, 14) + 'Send ' + pl.grupos.length + ' task(s)</button>' };
  };
  var abrirEnvio = function (ids) { var per = perAtual(); U.ind.env = { ids: ids, per: per ? per.id : '', prazo: '', nota: '' }; X.abrePainel('indEnviar'); };
  A.indEnviarAbrir = function () { var ids = selecionados(); if (ids.length) abrirEnvio(ids); };
  A.indEnviar1 = function (d) {
    /* Aberto no painel de edicao: grava primeiro o que la esta */
    if (U.ind.ed && U.painel && U.painel.tipo === 'indEd') { var r = guardarEd(); if (!r) { R(); return; } U.ind.ed = null; }
    abrirEnvio([d.v]);
  };
  C.indEnvC = function (el) { var E = U.ind.env; E[el.dataset.f] = el.value; if (el.dataset.f === 'per') E.prazo = ''; };
  A.indEnviarSim = function () {
    var E = U.ind.env, r = P.enviarTarefas({ ids: E.ids, periodo: E.per, prazo: E.prazo, nota: E.nota }, u());
    if (r.erro) return toast(r.erro, 'err');
    U.ind.per = E.per; U.ind.env = null; U.ind.sel = {}; U.painel = null;
    toast(r.n + ' indicator(s) sent in ' + (r.criadas + r.juntas) + ' task(s)' + (r.fora.length ? ', ' + r.fora.length + ' skipped' : '') + '. They are in My tasks of each person.', 'ok'); R();
  };
  A.indLembrar = function () {
    var per = perAtual(), r = P.lembrarTarefas(selecionados(), per ? per.id : '', u());
    if (r.erro) return toast(r.erro, 'err');
    toast(r.n ? 'Reminder sent for ' + r.n + ' open task(s). It shows in the notifications of who has them.' : 'None of the selected indicators has an open task for ' + (per ? per.nome : 'this period') + '.', r.n ? 'ok' : 'err'); R();
  };

  /* --- Exportar para Excel, com o layout do modelo de KPIs ----------------------------------- */
  var cor = function (hex) { return { argb: 'FF' + String(hex).replace('#', '').toUpperCase() }; };
  var letra = function (n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; };
  var exportar = function (ids) {
    var XL = window.ExcelJS;
    if (!XL) return Promise.reject(new Error('The Excel library did not load.'));
    var marca = (S.marca && S.marca.nome) || P.MARCA_BASE.nome, prim = ((S.marca && S.marca.cores) || P.MARCA_BASE.cores).primary.replace('#', ''), usr = u();
    var cats = S.cat.filter(function (c) { return ids.indexOf(c.id) > -1; }), wb = new XL.Workbook();
    wb.creator = marca; wb.created = new Date();
    var FONTE = 'Arial', TINTA = '0C233C', LINHA = 'D5DDEA';
    var borda = function (c2) { var b = { style: 'thin', color: cor(c2 || LINHA) }; return { top: b, left: b, bottom: b, right: b }; };

    /* Folha 1: a lista */
    var ws = wb.addWorksheet('KPI list', { properties: { tabColor: cor(prim), defaultRowHeight: 18 }, views: [{ showGridLines: false, zoomScale: 90 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    var nCols = CAMPOS.length, ult = letra(nCols + 1), EXTRA = 60, fimDados = 5 + cats.length + EXTRA;
    ws.getColumn(1).width = 2.2;
    CAMPOS.forEach(function (f, i) { ws.getColumn(i + 2).width = f.w; });
    ws.mergeCells('B1:' + ult + '1');
    var t = ws.getCell('B1'); t.value = (marca + '  |  KPI LIST  |  ' + S.ciclo.ano + ' reporting cycle').toUpperCase();
    t.font = { name: FONTE, size: 14, bold: true, color: cor('FFFFFF') }; t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 34;
    ws.mergeCells('B2:' + ult + '2');
    var s2 = ws.getCell('B2'); s2.value = cats.length + ' indicators, exported on ' + P.fmtDataAno(P.hojeISO()) + ' by ' + usr.nome + '.  Edit the white cells and import this file in Backoffice > Indicators > Import Excel. Grey columns are filled in by the platform. To create an indicator, add a row with a new KPI ID.';
    s2.font = { name: FONTE, size: 9.5, color: cor('FFFFFF') }; s2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    ws.getRow(2).height = 24;
    for (var k = 2; k <= nCols + 1; k++) { ws.getCell(1, k).fill = { type: 'pattern', pattern: 'solid', fgColor: cor(prim) }; ws.getCell(2, k).fill = { type: 'pattern', pattern: 'solid', fgColor: cor(TINTA) }; }
    /* Linha 3: faixa dos grupos. Linha 4: explicacao de cada coluna (como no modelo). Linha 5: cabecalhos. */
    GRUPOS.forEach(function (g) {
      var idx = []; CAMPOS.forEach(function (f, i) { if (f.g === g[0]) idx.push(i + 2); });
      if (!idx.length) return;
      if (idx.length > 1) ws.mergeCells(3, idx[0], 3, idx[idx.length - 1]);
      var c3 = ws.getCell(3, idx[0]); c3.value = g[1].toUpperCase();
      idx.forEach(function (ci) { var x = ws.getCell(3, ci); x.fill = { type: 'pattern', pattern: 'solid', fgColor: cor(g[2]) }; x.border = { left: { style: 'thin', color: cor('FFFFFF') }, right: { style: 'thin', color: cor('FFFFFF') } }; });
      c3.font = { name: FONTE, size: 10, bold: true, color: cor('FFFFFF') }; c3.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(3).height = 22; ws.getRow(4).height = 78; ws.getRow(5).height = 40;
    CAMPOS.forEach(function (f, i) {
      var g = GRUPOS.filter(function (y) { return y[0] === f.g; })[0], d4 = ws.getCell(4, i + 2), h5 = ws.getCell(5, i + 2);
      d4.value = f.d; d4.font = { name: FONTE, size: 8.5, italic: true, color: cor(prim) }; d4.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      d4.fill = { type: 'pattern', pattern: 'solid', fgColor: cor('FFFFCC') }; d4.border = borda('E6E0A8');
      h5.value = f.t; h5.font = { name: FONTE, size: 10, bold: true, color: cor('FFFFFF') }; h5.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      h5.fill = { type: 'pattern', pattern: 'solid', fgColor: cor(TINTA) }; h5.border = { top: { style: 'medium', color: cor(g[2]) }, left: { style: 'thin', color: cor('3B4E66') }, right: { style: 'thin', color: cor('3B4E66') }, bottom: { style: 'thin', color: cor('3B4E66') } };
    });
    var estilo = function (cel, f, par2, vazia) {
      cel.font = { name: FONTE, size: 10, color: cor(f.ler ? '5A6B82' : TINTA), bold: f.k === 'id' || f.k === 'nome' };
      cel.alignment = { vertical: 'middle', horizontal: f.k === 'id' || f.w <= 14 ? 'center' : 'left', wrapText: true, indent: f.w > 14 ? 1 : 0 };
      cel.fill = { type: 'pattern', pattern: 'solid', fgColor: cor(f.ler ? 'EEF1F6' : par2 ? 'F7F9FC' : 'FFFFFF') };
      cel.border = borda();
      if (vazia) return;
      var v = cel.value;
      if (f.k === 'ativo') cel.font = { name: FONTE, size: 10, bold: true, color: cor(v === 'Active' ? '00805A' : 'BC204B') };
      if ((f.k === 'evid' || f.k === 'disp' || f.k === 'divulga') && v) cel.font = { name: FONTE, size: 10, bold: true, color: cor(v === 'Yes' ? '00805A' : 'A86400') };
      if (f.k === 'resp' && v === GRUPO_TXT) cel.font = { name: FONTE, size: 10, italic: true, color: cor('5A6B82') };
    };
    cats.forEach(function (c, r) {
      var d = lerInd(c), row = ws.getRow(6 + r), longo = Math.max(String(d.nome).length / 38, String(d.desc).length / 62, String(d.formula).length / 44);
      row.height = Math.max(22, Math.min(92, Math.ceil(longo) * 13.5 + 6));
      CAMPOS.forEach(function (f, i) {
        var cel = row.getCell(i + 2), v = d[f.k];
        cel.value = (f.k === 'casas' || f.k === 'limiar') && v !== '' ? Number(v) : v;
        estilo(cel, f, r % 2 === 1);
      });
    });
    /* Linhas em branco ja formatadas, para acrescentar indicadores */
    for (var x2 = 0; x2 < EXTRA; x2++) { var rw = ws.getRow(6 + cats.length + x2); rw.height = 22; CAMPOS.forEach(function (f, i) { estilo(rw.getCell(i + 2), f, (cats.length + x2) % 2 === 1, true); }); }
    ws.autoFilter = { from: { row: 5, column: 2 }, to: { row: 5, column: nCols + 1 } };

    /* Folha 3: listas para os menus das celulas */
    var wl = wb.addWorksheet('Lists', { state: 'veryHidden' }), nl = 0;
    CAMPOS.forEach(function (f, i) {
      var vals = f.listaDe ? f.listaDe() : f.vals;
      if (!vals || !vals.length || f.ler) return;
      nl++;
      wl.getCell(1, nl).value = f.t;
      vals.forEach(function (v, j) { wl.getCell(2 + j, nl).value = v; });
      var col = letra(i + 2), livre = f.k === 'tipo_dado' || f.k === 'recolha';
      ws.dataValidations.add(col + '6:' + col + fimDados, { type: 'list', allowBlank: true, formulae: ['Lists!$' + letra(nl) + '$2:$' + letra(nl) + '$' + (1 + vals.length)], showErrorMessage: !livre, errorStyle: 'stop', errorTitle: rotCurto(f.k), error: 'Choose a value from the list.', showInputMessage: true, promptTitle: rotCurto(f.k), prompt: f.d.slice(0, 250) });
    });
    ws.dataValidations.add(letra(campoIx('casas')) + '6:' + letra(campoIx('casas')) + fimDados, { type: 'whole', operator: 'between', allowBlank: true, formulae: [0, 6], showErrorMessage: true, errorTitle: 'Decimals', error: 'A whole number from 0 to 6.' });
    ws.dataValidations.add(letra(campoIx('limiar')) + '6:' + letra(campoIx('limiar')) + fimDados, { type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0], showErrorMessage: true, errorTitle: 'Change threshold (%)', error: 'A number, 0 or above.' });

    /* Folha 2: como usar */
    var wh = wb.addWorksheet('How to use', { properties: { tabColor: cor('7213EA') }, views: [{ showGridLines: false, zoomScale: 100 }] });
    wh.getColumn(1).width = 2.2; wh.getColumn(2).width = 30; wh.getColumn(3).width = 46; wh.getColumn(4).width = 16; wh.getColumn(5).width = 70; wh.getColumn(6).width = 44;
    wh.mergeCells('B1:F1'); var h1 = wh.getCell('B1'); h1.value = (marca + '  |  HOW TO USE THE KPI LIST').toUpperCase(); h1.font = { name: FONTE, size: 14, bold: true, color: cor('FFFFFF') }; h1.alignment = { vertical: 'middle', indent: 1 };
    ['B', 'C', 'D', 'E', 'F'].forEach(function (cl) { wh.getCell(cl + '1').fill = { type: 'pattern', pattern: 'solid', fgColor: cor(prim) }; });
    wh.getRow(1).height = 34;
    var passos = ['1.  Edit the white cells of the "KPI list" sheet. Cells with a small arrow have a list of accepted values.', '2.  Never change KPI ID: it is how the platform finds the indicator. Grey columns are filled in by the platform and are ignored on import.',
      '3.  To create an indicator, fill in one of the empty rows at the end with a new KPI ID, the name, the unit, the department and the reporting company.', '4.  Responsible Person: choose a person, or "' + GRUPO_TXT + '" to leave the KPI with the whole department as a group.',
      '5.  Companies covered: the companies whose data the KPI includes, separated by ";". Reporting company: the one that has to report it.', '6.  Save the file and upload it in Backoffice > Indicators > Import Excel. You see what will change before anything is saved.'];
    passos.forEach(function (p2, i) { wh.mergeCells('B' + (3 + i) + ':F' + (3 + i)); var c4 = wh.getCell('B' + (3 + i)); c4.value = p2; c4.font = { name: FONTE, size: 10.5, color: cor(TINTA) }; c4.alignment = { vertical: 'middle', wrapText: true, indent: 1 }; wh.getRow(3 + i).height = 22; });
    var l0 = 4 + passos.length;
    ['Group', 'Column', 'You can edit', 'What it is', 'Accepted values'].forEach(function (tt, i) { var c5 = wh.getCell(l0, 2 + i); c5.value = tt; c5.font = { name: FONTE, size: 10, bold: true, color: cor('FFFFFF') }; c5.fill = { type: 'pattern', pattern: 'solid', fgColor: cor(TINTA) }; c5.alignment = { vertical: 'middle', horizontal: i === 2 ? 'center' : 'left', indent: i === 2 ? 0 : 1 }; c5.border = borda('3B4E66'); });
    wh.getRow(l0).height = 26;
    CAMPOS.forEach(function (f, i) {
      var g = GRUPOS.filter(function (y) { return y[0] === f.g; })[0], r3 = wh.getRow(l0 + 1 + i), vals = f.listaDe ? f.listaDe() : f.vals;
      [g[1], f.t, f.ler ? 'No' : 'Yes', f.d, vals ? vals.slice(0, 14).join(', ') + (vals.length > 14 ? ', …' : '') : (f.ler ? '' : 'Free text')].forEach(function (v, j) {
        var c6 = r3.getCell(2 + j); c6.value = v; c6.border = borda(); c6.alignment = { vertical: 'middle', horizontal: j === 2 ? 'center' : 'left', wrapText: true, indent: j === 2 ? 0 : 1 };
        c6.font = { name: FONTE, size: 9.5, color: cor(j === 0 ? 'FFFFFF' : TINTA), bold: j < 2 }; c6.fill = { type: 'pattern', pattern: 'solid', fgColor: cor(j === 0 ? g[2] : i % 2 ? 'F7F9FC' : 'FFFFFF') };
        if (j === 2) c6.font = { name: FONTE, size: 9.5, bold: true, color: cor(f.ler ? '5A6B82' : '00805A') };
      });
      r3.height = Math.max(20, Math.ceil(Math.max(f.d.length / 78, (vals ? vals.slice(0, 14).join(', ').length : 0) / 48)) * 13 + 6);
    });
    wb.views = [{ activeTab: 0 }];
    return wb.xlsx.writeBuffer().then(function (buf) {
      P.descarregar('esg-data-hub-kpi-list-' + P.hojeISO() + '.xlsx', buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return cats.length;
    });
  };
  var campoIx = function (k) { for (var i = 0; i < CAMPOS.length; i++) if (CAMPOS[i].k === k) return i + 2; return 0; };
  P.exportarIndicadores = exportar;
  A.indExportar = function () {
    var sel2 = selecionados(), ids = sel2.length ? sel2 : filtrados().map(function (c) { return c.id; });
    if (!ids.length) return toast('No indicators to export.', 'err');
    exportar(ids).then(function (n) { toast(n + ' indicator(s) exported to Excel.', 'ok'); }).catch(function (x) { toast('Export failed: ' + x.message, 'err'); });
  };

  /* --- Importar de Excel: o proprio ficheiro exportado ou o modelo de KPIs --------------------- */
  var MARCADOR = /^\[?\s*(to be completed|please select|n\/a$)/i;
  var cabDe = function (linha) {
    var h = linha.map(norm), cols = {}, usadas = {};
    CAMPOS.forEach(function (f) {
      var nomes = [norm(f.t)].concat(f.al || []);
      for (var q = 0; q < nomes.length && cols[f.k] === undefined; q++) for (var i = 0; i < h.length; i++) if (!usadas[i] && h[i] && h[i] === nomes[q]) { cols[f.k] = i; usadas[i] = 1; break; }
    });
    /* Nomes compridos do modelo ("KPI Responsibility - Responsible Person", "Disclosure Type [...]") */
    CAMPOS.forEach(function (f) {
      if (cols[f.k] !== undefined) return;
      var nomes = [norm(rotCurto(f.k))].concat((f.al || []).filter(function (a) { return a.split(' ').length > 1; }));
      for (var q = 0; q < nomes.length && cols[f.k] === undefined; q++) for (var i = 0; i < h.length; i++) if (!usadas[i] && h[i] && h[i].indexOf(nomes[q]) > -1) { cols[f.k] = i; usadas[i] = 1; break; }
    });
    return cols;
  };
  var analisar = function (livro) {
    /* Os codigos que existem no ficheiro tambem servem nas calculations (indicadores novos do mesmo ficheiro) */
    idsImport = [];
    (livro.folhas || []).forEach(function (f) { (f.aoa || []).forEach(function (l) { l.forEach(function (x) { var t = String(x === null || x === undefined ? '' : x).trim().toUpperCase(); if (/^[A-Z]{1,4}\d{1,3}[A-Z]?$/.test(t) && idsImport.indexOf(t) < 0) idsImport.push(t); }); }); });
    try { return analisar0(livro); } finally { idsImport = null; }
  };
  var analisar0 = function (livro) {
    var melhor = null;
    livro.folhas.forEach(function (fo) {
      if (norm(fo.nome) === 'lists' || norm(fo.nome) === 'how to use') return;
      for (var r = 0; r < Math.min(25, fo.aoa.length); r++) {
        var cols = cabDe(fo.aoa[r] || []), n = Object.keys(cols).length, chave = cols.id !== undefined || cols.nome !== undefined;
        if (chave && n >= 2 && (!melhor || n > melhor.n)) melhor = { n: n, folha: fo, linha: r, cols: cols };
      }
    });
    var rel = { nome: livro.nome, novos: [], alterados: [], iguais: 0, erros: [], ignoradas: 0, dpSem: 0, dpVarios: 0, cols: [] };
    var dpsEsrs = {}; ((window.PORTAL_ESRS || {}).dps || []).forEach(function (dp) { dpsEsrs[norm(dp.id)] = 1; });
    if (!melhor) { rel.erro = 'No header row was found. The file needs a "KPI ID" or "KPI Name" column and at least one more column of the KPI list. Use Export Excel to get the layout.'; return rel; }
    var c = melhor.cols, cab = melhor.folha.aoa[melhor.linha], porNome = {}, porDp = {};
    S.cat.forEach(function (x) { porNome[norm(x.nome)] = x; P.esrsDe(x.id).dps.forEach(function (dp) { (porDp[norm(dp)] = porDp[norm(dp)] || []).push(x); }); });
    rel.folha = melhor.folha.nome; rel.linhaCab = melhor.linha + 1;
    rel.cols = CAMPOS.filter(function (f) { return c[f.k] !== undefined && !f.ler; }).map(function (f) { return rotCurto(f.k); });
    var vistos = {};
    for (var r = melhor.linha + 1; r < melhor.folha.aoa.length; r++) {
      var lin = melhor.folha.aoa[r] || [], n = r + 1, dados = {}, cel = function (k) { var v = c[k] === undefined ? '' : lin[c[k]]; v = String(v === null || v === undefined ? '' : v).trim(); return MARCADOR.test(v) ? '' : v; };
      CAMPOS.forEach(function (f) { if (c[f.k] !== undefined && !f.ler && cel(f.k) !== '') dados[f.k] = cel(f.k); });
      var idTxt = cel('id').toUpperCase(), nomeTxt = cel('nome'), dpTxt = cel('dps');
      if (!idTxt && !nomeTxt) { continue; }
      var alvo = idTxt ? P.cat(idTxt) || S.cat.filter(function (x) { return x.id.toUpperCase() === idTxt; })[0] : null;
      /* Linha de um datapoint ESRS (modelo Datapoint Mapping): aplica-se ao indicador que o alimenta. So entra o que a empresa preenche (responsaveis, empresas,
         frequencia, disponibilidade, controlos, divulgacao); o nome, a unidade e a agregacao sao do datapoint e nao mudam o indicador. */
      var eDp = !idTxt && dpTxt && dpsEsrs[norm(dpTxt)];
      if (eDp) {
        var mapa = porDp[norm(dpTxt)] || [];
        if (mapa.length !== 1) { if (mapa.length) rel.dpVarios++; else rel.dpSem++; continue; }
        alvo = mapa[0]; ['nome', 'desc', 'div_tipo', 'tipo_dado', 'esrs', 'dr', 'unidade', 'agreg', 'formula', 'natureza', 'casas'].forEach(function (k2) { delete dados[k2]; });
        if (vistos[alvo.id]) continue;
      }
      if (!alvo && !idTxt && porNome[norm(nomeTxt)]) alvo = porNome[norm(nomeTxt)];
      if (alvo) {
        if (vistos[alvo.id]) { rel.erros.push({ n: n, t: alvo.id + ' appears more than once in the file (also in row ' + vistos[alvo.id] + ').' }); continue; }
        vistos[alvo.id] = n;
        var rs = resolver(dados, alvo);
        if (rs.erros.length) { rel.erros.push({ n: n, t: alvo.id + ': ' + rs.erros.join(' ') }); continue; }
        var atual = lerInd(alvo), mud = Object.keys(rs.val).filter(function (k2) { return String(atual[k2]) !== String(rs.val[k2]); }).map(function (k2) { return { k: k2, de: atual[k2], para: rs.val[k2] }; });
        if (mud.length) rel.alterados.push({ n: n, id: alvo.id, nome: alvo.nome, val: rs.val, mud: mud }); else rel.iguais++;
      } else {
        var novoId = idTxt || (dpTxt && /^[A-Za-z0-9_.-]{2,24}$/.test(dpTxt) ? dpTxt.toUpperCase() : '');
        if (!novoId) { rel.ignoradas++; continue; }
        if (!/^[A-Z0-9][A-Z0-9_.-]{1,23}$/.test(novoId)) { rel.erros.push({ n: n, t: 'KPI ID "' + novoId + '" is not valid: 2 to 24 letters or digits, with no spaces.' }); continue; }
        if (vistos[novoId]) { rel.erros.push({ n: n, t: novoId + ' appears more than once in the file.' }); continue; }
        vistos[novoId] = n;
        var falta = ['nome', 'unidade', 'dep'].filter(function (k2) { return !dados[k2]; });
        /* O modelo de datapoints ESRS nao traz unidade nem departamento nos qualitativos: entram com valores por omissao */
        if (!dados.nome) { rel.erros.push({ n: n, t: novoId + ': KPI Name is required to create an indicator.' }); continue; }
        if (!dados.unidade) dados.unidade = /qualit/i.test(dados.div_tipo || '') ? 'text' : '';
        if (!dados.unidade) { rel.erros.push({ n: n, t: novoId + ': Unit is required to create an indicator.' }); continue; }
        var rn = resolver(dados, null);
        if (rn.erros.length) { rel.erros.push({ n: n, t: novoId + ': ' + rn.erros.join(' ') }); continue; }
        rel.novos.push({ n: n, id: novoId, nome: dados.nome, val: rn.val, semDep: falta.indexOf('dep') > -1 });
      }
    }
    return rel;
  };
  X.Pn.indImp = function () {
    var M = U.ind.imp, x = M.rel;
    var zona = '<div class="ki-drop"><span class="ki-drop-ic" aria-hidden="true">' + svg(I.tabela, 26) + '</span><div><b>' + (x ? 'Upload another file' : 'Upload your KPI list') + '</b><span>Excel (.xlsx, .xls) or .csv. Works with the file from Export Excel and with the KPI template (Datapoint Mapping).</span></div><span class="ps-sp"><button type="button" class="ps-btn pri" data-a="indImpEscolher">' + svg(I.upload, 14) + 'Choose the file</button><button type="button" class="ps-btn" data-a="indExportar">Get the layout</button></span></div>';
    if (!x) return { t: 'Import indicators from Excel', s: 'You see what changes before anything is saved', largo: true, cls: 'ki-pan', b: zona + '<ol class="ki-como"><li><b>Export</b>Download the list in Excel, with the lists of accepted values in each cell.</li><li><b>Edit</b>Change what you need, or add rows with a new KPI ID to create indicators.</li><li><b>Import</b>Upload the file and check the preview. Only the cells you changed are applied.</li></ol>', p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' };
    if (x.erro) return { t: 'Import indicators from Excel', s: x.nome, largo: true, cls: 'ki-pan', b: '<div class="ps-aviso err" role="alert"><b>' + e(x.nome) + '</b><p>' + e(x.erro) + '</p></div>' + zona, p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' };
    var nNovos = M.criar ? x.novos.length : 0, total = x.alterados.length + nNovos;
    var k = function (v, t, cls) { return '<div class="ki-impk ' + (cls || '') + '"><b>' + v + '</b><span>' + e(t) + '</span></div>'; };
    var curto = function (v) { var t2 = String(v); return t2 === '' ? '(empty)' : t2.length > 46 ? t2.slice(0, 46) + '…' : t2; };
    var alter = x.alterados.length ? '<h4 class="ki-imph">Changes (' + x.alterados.length + ')</h4><ul class="ki-impl">' + x.alterados.slice(0, 50).map(function (a) {
      return '<li><div class="ki-impl-h"><span class="ps-cod">' + e(a.id) + '</span><b>' + e(a.nome) + '</b></div><ul>' + a.mud.map(function (m) { return '<li><span class="ki-impc">' + e(rotCurto(m.k)) + '</span><span class="ki-de">' + e(curto(m.de)) + '</span><span class="ki-seta">→</span><span class="ki-para">' + e(curto(m.para)) + '</span></li>'; }).join('') + '</ul></li>';
    }).join('') + (x.alterados.length > 50 ? '<li class="ps-mut ps-small">and ' + (x.alterados.length - 50) + ' more indicators</li>' : '') + '</ul>' : '';
    var novos = x.novos.length ? '<h4 class="ki-imph">New indicators (' + x.novos.length + ')</h4><label class="ps-chk ki-impn"><input id="ki-criar" type="checkbox" data-c="indImpCriar"' + (M.criar ? ' checked' : '') + '><span>Create these ' + x.novos.length + ' indicators<small class="ps-mut ps-blk">They are in the file but not in the platform' + (x.novos.some(function (nv) { return nv.semDep; }) ? '. Those without a department go to ' + (P.UNIDADES[0] || 'the first department') + ' until you change it' : '') + '.</small></span></label>' +
      '<ul class="ki-impl ki-impl-n">' + x.novos.slice(0, 30).map(function (a) { return '<li><div class="ki-impl-h"><span class="ps-cod">' + e(a.id) + '</span><b>' + e(a.nome) + '</b><span class="ps-mut ps-small">' + e(a.val.unidade || '') + '</span></div></li>'; }).join('') + (x.novos.length > 30 ? '<li class="ps-mut ps-small">and ' + (x.novos.length - 30) + ' more</li>' : '') + '</ul>' : '';
    var erros = x.erros.length ? '<details class="ki-fora" open><summary>' + x.erros.length + ' row(s) with errors, not imported</summary><ul class="ps-small">' + x.erros.slice(0, 60).map(function (r2) { return '<li>Row ' + r2.n + ': ' + e(r2.t) + '</li>'; }).join('') + (x.erros.length > 60 ? '<li>…</li>' : '') + '</ul></details>' : '';
    return { t: 'Import indicators from Excel', s: x.nome + ', sheet "' + x.folha + '", headers in row ' + x.linhaCab, largo: true, cls: 'alto ki-pan',
      b: '<div class="ki-impks">' + k(x.alterados.length, 'to change', x.alterados.length ? 'info' : '') + k(x.novos.length, 'new', x.novos.length ? 'ok' : '') + k(x.iguais, 'unchanged') + k(x.erros.length, 'with errors', x.erros.length ? 'err' : '') + '</div>' +
        '<p class="ps-small ps-mut">Columns read: ' + e(x.cols.join(', ')) + '.' + (x.ignoradas ? ' ' + x.ignoradas + ' row(s) without a KPI ID that match no indicator were skipped.' : '') + '</p>' +
        (x.dpSem || x.dpVarios ? '<div class="ps-aviso">This file is an ESRS datapoint mapping. ' + (x.dpSem ? x.dpSem + ' datapoint(s) have no indicator in the platform yet and were skipped' : '') + (x.dpSem && x.dpVarios ? '; ' : '') + (x.dpVarios ? x.dpVarios + ' feed more than one indicator and were skipped' : '') + '. Datapoints are mapped to indicators in the ESRS datapoint list. To create an indicator from this file, add a KPI ID column.</div>' : '') + erros + alter + novos +
        (!total && !x.erros.length ? '<div class="ps-aviso ok">The file matches the platform. There is nothing to import.</div>' : ''),
      p: '<button type="button" class="ps-btn" data-a="indImpEscolher">Upload another file</button><span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="indImpAplicar"' + (total ? '' : ' disabled') + '>Import ' + total + ' indicator(s)</button>' };
  };
  /* Preenche a Calculation (KPI codes) dos outputs sem calculo, a partir da methodology */
  P.preencherCalcs = function (usr, ids) {
    var feitos = [], falhou = [];
    S.cat.forEach(function (c) {
      if (ids && ids.indexOf(c.id) < 0) return;
      if (c.tipo !== 'derivado' || String(c.calc_codigos || '').trim()) return;
      var sg = P.sugerirCalc ? P.sugerirCalc(c.id) : null;
      if (!sg) { if (String(c.formula || '').trim() || P.expressaoDe(c.id)) falhou.push(c.id); return; }
      c.calc_codigos = sg.calc; feitos.push(c.id);
      P.eventoGlobal('Indicator ' + c.id + ' ' + c.nome + ': Calculation (KPI codes) set to ' + sg.calc + ', from ' + sg.fonte + '.', usr.nome, 'Change');
    });
    if (feitos.length) { Object.keys(S.items).map(function (k) { return k.slice(0, k.lastIndexOf(':')); }).filter(function (k, i, l) { return l.indexOf(k) === i; }).forEach(function (ch) { P.calcularOutputs(ch, usr); }); P.guardar(); }
    return { feitos: feitos, falhou: falhou };
  };
  A.indCalcAuto = function () {
    if (!P.gereTudo(u())) return toast('No permission.', 'err');
    var r = P.preencherCalcs(u());
    toast(r.feitos.length ? r.feitos.length + ' calculation(s) filled in: ' + r.feitos.slice(0, 6).join(', ') + (r.feitos.length > 6 ? '…' : '') + '.' + (r.falhou.length ? ' ' + r.falhou.length + ' could not be read from the methodology (' + r.falhou.slice(0, 5).join(', ') + '): fill them in by hand.' : '') : r.falhou.length ? 'No calculation could be read from the methodology of ' + r.falhou.join(', ') + '. Fill them in by hand.' : 'Every output already has its calculation.', r.feitos.length ? 'ok' : 'err');
    R();
  };
  A.indCalcSug = function () {
    var d = U.ind.ed.d, sg = P.sugerirCalc ? P.sugerirCalc(U.ind.ed.id || d.id, d.formula) : null;
    if (!sg) return toast('The methodology does not name the indicators clearly enough. Write the calculation with the KPI codes.', 'err');
    d.calc = sg.calc; d.natureza = 'Output'; toast('Calculation filled in from ' + sg.fonte + ': ' + sg.calc, 'ok'); R();
  };
  A.indImportar = function () { U.ind.imp = { rel: null, criar: true }; X.abrePainel('indImp'); };
  C.indImpCriar = function (el) { U.ind.imp.criar = el.checked; };
  A.indImpEscolher = function () {
    X.escolherFicheiro('.xlsx,.xls,.csv', function (f) {
      P.lerLivro(f).then(function (livro) {
        U.ind.imp = { rel: livro.erro ? { nome: livro.nome, erro: livro.erro } : analisar(livro), criar: true };
        if (U.ind.imp.rel.novos && U.ind.imp.rel.novos.length > 25) U.ind.imp.criar = false;
        if (!U.painel || U.painel.tipo !== 'indImp') X.abrePainel('indImp'); else R();
      });
    });
  };
  A.indImpAplicar = function () {
    var M = U.ind.imp, x = M.rel, usr = u(), n = 0, nn = 0;
    if (!P.gereTudo(usr)) return toast('No permission.', 'err');
    x.alterados.forEach(function (a) { var c = P.cat(a.id), mud = aplicar(c, a.val); if (mud.length) { registar(c, mud, usr, 'import ' + x.nome); n++; } });
    if (M.criar) x.novos.forEach(function (a) {
      if (P.cat(a.id)) return;
      var c = novoCat(a.id); S.cat.push(c); atr(c.id);
      var val = {}; Object.keys(a.val).forEach(function (k2) { val[k2] = a.val[k2]; });
      if (!val.dep) val.dep = P.UNIDADES[0] || '';
      aplicar(c, val); nn++;
    });
    if (nn) P.eventoGlobal(nn + ' indicator(s) created from the import of ' + x.nome + '.', usr.nome, 'Creation');
    /* Outputs que vieram sem Calculation (KPI codes): preenche-se pela methodology */
    var tocados = x.alterados.map(function (a) { return a.id; }).concat(M.criar ? x.novos.map(function (a) { return a.id; }) : []);
    var auto = P.preencherCalcs(usr, tocados);
    if (auto.feitos.length) toast(auto.feitos.length + ' calculation(s) filled in from the methodology.', 'ok');
    /* Calculations novas ou alteradas: calcula ja os outputs cujos inputs estao submetidos */
    var nc = 0; Object.keys(S.items).map(function (k) { return k.slice(0, k.lastIndexOf(':')); }).filter(function (k, i, l) { return l.indexOf(k) === i; }).forEach(function (ch) { nc += P.calcularOutputs(ch, usr); });
    if (nc) toast(nc + ' output value(s) calculated from submitted inputs.', 'ok');
    P.guardar(); U.ind.imp = null; U.painel = null;
    toast(n + ' indicator(s) changed' + (nn ? ', ' + nn + ' created' : '') + ' from ' + x.nome + '.', 'ok'); R();
  };
  P.analisarIndicadores = analisar;
})();
