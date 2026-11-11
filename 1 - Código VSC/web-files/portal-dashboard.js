/* ============================================================================
   portal-dashboard.js - Dashboard executivo (visao administrador)

   Filtros de perimetro (consolidado, uma empresa ou uma selecao) e de periodo
   (ano ou trimestre). Scorecard ESG global com ate 8 KPIs escolhidos, e as
   seccoes Ambiente, Social e Governance.
   Valores: os mesmos da plataforma (P.valorVista). No ano, quando o valor anual
   ainda nao existe, junta os trimestres reportados (YTD) pela regra do KPI.
   O estado de cada tile diz-se sempre por texto (On target, On track,
   Attention, At risk), nunca so pela cor.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal;
  if (!P || !P.ext) return;
  var S = P.S, X = P.ext, e = X.e, chip = X.chip, R = X.R, u = X.u, opt = X.opt, campo = X.campo, U = X.U, toast = X.toast, cabCartao = X.cabCartao;

  U.dash = { per: '', modo: 'consolidado', emp: '', sel: [] };
  var SCORE_BASE = ['E06+E07', 'E03', 'E08', 'P14', 'P08', 'P07', 'G04', 'QUAL'];
  var MENOS_E_MELHOR = ['E06', 'E07', 'E08', 'N01', 'E01', 'E04', 'A03', 'P07', 'P14', 'P16', 'P17', 'N05', 'N06', 'N03', 'N04', 'E06+E07'];
  var PILAR = function (id) { if (id === 'QUAL') return 'Data quality'; var c = P.cat(id.split('+')[0]); var t = c ? c.tema : ''; return /pessoas/i.test(t) ? 'Social' : /governance/i.test(t) ? 'Governance' : /comunidade|cliente/i.test(t) ? 'Social' : 'Environment'; };

  /* Perimetro da vista: '' (consolidado), o nome de uma empresa, ou uma lista */
  var perim = function () { var d = U.dash; return d.modo === 'empresa' ? d.emp || (S.ent[0] && S.ent[0].nome) : d.modo === 'selecao' ? (d.sel.length === 1 ? d.sel[0] : d.sel.slice()) : ''; };
  var ano = function () { return S.ciclo.ano; };
  /* Valor de um KPI no periodo da vista; no ano, os trimestres ate agora (YTD) quando o anual ainda nao existe */
  var valor = function (id, emp) {
    var per = U.dash.per, a = ano();
    if (per) { var v0 = P.valorVista(id, per, emp).valor; return { v: v0, ytd: false }; }
    var va = P.valorVista(id, a, emp).valor;
    if (va !== null && va !== undefined) return { v: va, ytd: false };
    var qs = [1, 2, 3, 4].map(function (t) { return P.valorVista(id, a + '-T' + t, emp).valor; }).filter(function (x) { return x !== null && x !== undefined; });
    if (!qs.length) return { v: null, ytd: false };
    var ag = P.agregacao(id), v = ag === 'ultimo' ? qs[qs.length - 1] : ag === 'media' ? qs.reduce(function (s, x) { return s + x; }, 0) / qs.length : qs.reduce(function (s, x) { return s + x; }, 0);
    return { v: v, ytd: qs.length < 4, n: qs.length };
  };
  /* Periodo homologo do ano anterior */
  var anterior = function (id, emp) {
    var per = U.dash.per, a = ano();
    if (per) { var t = /T(\d)$/.exec(per); var v1 = t ? P.valorVista(id, (a - 1) + '-T' + t[1], emp).valor : null; return v1 !== null && v1 !== undefined ? v1 : (P.valorAnterior(id, per) === undefined ? null : P.valorAnterior(id, per)); }
    var v2 = P.anteriorVista ? P.anteriorVista(id, a, emp) : P.valorAnterior(id, a);
    return v2 === undefined ? null : v2;
  };
  /* KPI composto (E06+E07, em tCO2e) ou simples */
  var leitura = function (k, emp) {
    if (k === 'E06+E07') {
      var a = valor('E06', emp), b = valor('E07', emp), pa = anterior('E06', emp), pb = anterior('E07', emp);
      var v = a.v === null && b.v === null ? null : ((a.v || 0) + (b.v || 0)) / 1000, pv = pa === null && pb === null ? null : ((pa || 0) + (pb || 0)) / 1000;
      return { v: v, ant: pv, un: 'tCO2e', nome: 'GHG emissions (Scope 1+2)', ytd: a.ytd || b.ytd, casas: 0, pct: false };
    }
    if (k === 'QUAL') {
      var emp2 = emp, pts = P.pontosCiclo(function (m) { return (!U.dash.per || m.periodo === U.dash.per) && (!emp2 || (Array.isArray(emp2) ? emp2.indexOf(m.empresa) > -1 : m.empresa === emp2)); });
      var ok = pts.filter(function (x) { return x.s.cod === 'aprovado' || x.s.cod === 'aprovacao'; }).length;
      return { v: pts.length ? ok / pts.length * 100 : null, ant: null, un: '%', nome: 'Reporting completeness (approved or in approval)', casas: 0, pct: true };
    }
    var c = P.cat(k), r = valor(k, emp), kg = /kgCO2e$/.test(c.unidade_medida) && !/\//.test(c.unidade_medida);
    return { v: r.v === null ? null : kg ? r.v / 1000 : r.v, ant: (function () { var x = anterior(k, emp); return x === null ? null : kg ? x / 1000 : x; })(), un: kg ? 'tCO2e' : c.unidade_medida, nome: c.nome, ytd: r.ytd, casas: kg ? 0 : c.casas_decimais, pct: c.unidade_medida === '%' };
  };
  var meta = function (k) { return (S.metas || []).filter(function (m) { return m.indicador_id === k; })[0] || null; };
  var estado = function (k, l) {
    if (l.v === null) return { t: 'No data yet', c: '' };
    var mt = meta(k), menos = MENOS_E_MELHOR.indexOf(k) > -1 || (mt && mt.sentido === 'descer');
    if (mt && (menos ? l.v <= mt.valor_meta : l.v >= mt.valor_meta)) return { t: 'On target', c: 'ok' };
    if (k === 'QUAL') return l.v >= 85 ? { t: 'On track', c: 'ok' } : l.v >= 60 ? { t: 'Attention', c: 'warn' } : { t: 'At risk', c: 'err' };
    if (l.ant === null || !l.ant) return { t: 'No comparison', c: '' };
    var d = (l.v - l.ant) / Math.abs(l.ant) * 100, bom = menos ? d <= 0 : d >= 0;
    return bom ? { t: 'On track', c: 'ok' } : Math.abs(d) <= 5 ? { t: 'Attention', c: 'warn' } : { t: 'At risk', c: 'err' };
  };
  var pc = function (v, casas) { return v === null || v === undefined ? '-' : e(P.fmtNum(v, casas === undefined ? 1 : casas)) + '%'; };
  var fmt = function (v, casas) { return v === null || v === undefined ? '-' : P.fmtNum(v, Math.abs(v) >= 1000 ? 0 : casas); };
  var variacao = function (l) {
    if (l.v === null || l.ant === null) return '';
    var up = l.v >= l.ant, d = l.pct ? Math.abs(l.v - l.ant) : (l.ant ? Math.abs((l.v - l.ant) / l.ant * 100) : null);
    if (d === null) return '';
    return '<span class="db-var">' + (up ? '▲' : '▼') + ' ' + P.fmtNum(d, 1) + (l.pct ? ' p.p.' : '%') + ' vs ' + (U.dash.per ? 'same quarter ' + (ano() - 1) : ano() - 1) + '</span>';
  };
  var tile = function (k, emp) {
    var l = leitura(k, emp), st = estado(k, l), cod = k === 'QUAL' ? 'Completeness' : k.replace('+', ' + ');
    return '<div class="db-tile"><span class="db-pilar">' + e(PILAR(k).toUpperCase()) + '</span><b class="db-v">' + e(fmt(l.v, l.casas)) + (l.pct && l.v !== null ? '<small>%</small>' : '') + '</b>' +
      '<span class="db-n">' + e((l.pct ? '' : l.un + ' · ') + l.nome) + (l.ytd ? ' <span class="db-ytd" title="Year to date: the quarters reported so far">YTD</span>' : '') + '</span>' +
      '<span class="db-pe">' + variacao(l) + '<span class="ps-tip-alvo" tabindex="0" data-tip="' + e(cod + ': ' + st.t + (meta(k) ? '. Target ' + P.fmtNum(meta(k).valor_meta, 0) + ' ' + meta(k).unidade + ' in ' + meta(k).ano_meta : '')) + '">' + chip(st.t, st.c) + '</span></span></div>';
  };
  /* Barras horizontais: rotulo, barra fina, valor em texto (a cor nunca vai sozinha) */
  var barras = function (linhas, un, max) {
    var mx = max || Math.max.apply(null, linhas.map(function (x) { return x.v || 0; }).concat([1]));
    return '<ul class="db-bars">' + linhas.map(function (x) {
      var w = x.v === null || x.v === undefined ? 0 : Math.max(2, Math.min(100, x.v / mx * 100));
      return '<li tabindex="0" data-tip="' + e(x.t + ': ' + (x.v === null || x.v === undefined ? 'no data' : fmt(x.v, x.casas === undefined ? 1 : x.casas) + ' ' + (x.un || un))) + '"><span class="db-bl">' + e(x.t) + '</span><span class="db-bt"><i class="' + (x.cls || '') + '" style="width:' + w + '%"></i></span><b>' + (x.v === null || x.v === undefined ? '<span class="ps-mut">-</span>' : e(fmt(x.v, x.casas === undefined ? 1 : x.casas)) + (x.un === '%' || un === '%' ? '%' : '')) + '</b></li>';
    }).join('') + '</ul>';
  };
  var lista = function (linhas) { return '<dl class="db-dl">' + linhas.map(function (x) { return '<dt>' + e(x[0]) + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl>'; };
  var v = function (id, emp) { return leitura(id, emp).v; };
  var cartao = function (titulo, corpo, link) { return '<div class="ps-card db-card"><div class="ps-card-body"><h3 class="db-ct">' + e(titulo) + '</h3>' + corpo + (link ? '<a class="db-lk" href="' + link[1] + '">' + e(link[0]) + ' →</a>' : '') + '</div></div>'; };

  X.Blocos['dashboard'] = function () {
    var d = U.dash, emp = perim(), pers = (S.periodos || []).filter(function (p) { return p.ano === ano() && p.tipo === 'trimestre'; });
    if (!d.sel.length) d.sel = S.ent.map(function (x) { return x.nome; });
    var score = (S.ciclo.dashKpis && S.ciclo.dashKpis.length ? S.ciclo.dashKpis : SCORE_BASE).slice(0, 8);
    var filtros = '<div class="ps-card db-filtros"><div class="ps-card-body ps-sp"><span class="ps-lab">Perimeter</span><div class="ps-seg2" role="group" aria-label="Perimeter">' +
      [['consolidado', 'Consolidated'], ['empresa', 'Company'], ['selecao', 'Selection']].map(function (x) { return '<button type="button" class="' + (d.modo === x[0] ? 'on' : '') + '" data-a="dbModo" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (d.modo === 'empresa' ? '<label class="ps-sr" for="db-emp">Company</label><select id="db-emp" class="ps-sel" data-c="dbEmp">' + S.ent.map(function (x) { return opt(x.nome, x.nome, emp); }).join('') + '</select>' : '') +
      (d.modo === 'selecao' ? '<span class="ps-dt-chips">' + S.ent.map(function (x, i) { var on = d.sel.indexOf(x.nome) > -1; return '<label class="ps-dt-chip' + (on ? ' on' : '') + '"><input type="checkbox" id="db-sel-' + i + '" data-c="dbSel" data-id="' + e(x.nome) + '"' + (on ? ' checked' : '') + '>' + e(x.nome) + '</label>'; }).join('') + '</span>' : '') +
      '<span class="ps-lab db-sep">Reporting period</span><label class="ps-sr" for="db-per">Reporting period</label><select id="db-per" class="ps-sel" data-c="dbPer">' + opt('', 'Year ' + ano() + ' (year to date)', d.per) + pers.map(function (p) { return opt(p.id, p.nome, d.per); }).join('') + '</select></div></div>';

    var sc = '<div class="db-sec"><div class="ps-sp-b"><h2 class="db-h">Scorecard ESG global <small>' + score.length + ' of 8 KPIs</small></h2>' + (P.gereTudo(u()) ? '<button type="button" class="ps-btn peq" data-a="dbEditar">Choose the KPIs</button>' : '') + '</div><div class="db-score">' + score.map(function (k) { return tile(k, emp); }).join('') + '</div></div>';

    var s1 = v('E06', emp), s2 = v('E07', emp), s3 = v('N01', emp), ren = v('E03', emp), renA = leitura('E03', emp).ant;
    var amb = '<div class="db-sec"><h2 class="db-h">Environment</h2><div class="db-g3">' +
      cartao('GHG emissions by scope (tCO2e)', barras([{ t: 'Scope 1', v: s1, casas: 0, un: 'tCO2e' }, { t: 'Scope 2', v: s2, casas: 0, un: 'tCO2e' }, { t: 'Scope 3', v: s3, casas: 0, un: 'tCO2e' }], 'tCO2e'), ['See by company and source', X.rota('Consolidado')]) +
      cartao('Energy: renewable share', barras([{ t: String(ano()), v: ren, un: '%' }, { t: String(ano() - 1), v: renA, un: '%', cls: 'ant' }], '%', 100) + lista([['Electricity (MWh)', e(fmt(v('E01', emp), 0))], ['Primary energy (MWh)', e(fmt(v('E04', emp), 0))], ['Sludge valorised', pc(v('R10', emp), 1)]])) +
      cartao('Trajectory vs target', (S.metas || []).length ? barras((S.metas || []).map(function (mt) { var l = leitura(mt.indicador_id, emp), menos = mt.sentido === 'descer'; var prog = l.v === null ? null : menos ? (l.ant && l.ant > mt.valor_meta ? Math.max(0, Math.min(100, (l.ant - l.v) / (l.ant - mt.valor_meta) * 100)) : null) : Math.max(0, Math.min(100, l.v / (mt.valor_meta || 1) * 100)); return { t: mt.nome.split(',')[0] + ' (' + mt.ano_meta + ')', v: prog, un: '%', casas: 0 }; }), '%', 100) + '<p class="ps-small ps-mut">Progress towards each target. For targets to reduce, the progress of the year against the prior year.</p>' : '<p class="ps-mut ps-small">No targets set.</p>') +
      '</div></div>';

    var soc = '<div class="db-sec"><h2 class="db-h">Social</h2><div class="db-g3">' +
      cartao('Workforce', lista([['Headcount (31/12)', e(fmt(v('P01', emp), 0))], ['Group employees', e(fmt(v('P02', emp), 0))], ['Turnover', pc(v('P07', emp), 1)], ['Training hours', e(fmt(v('P12', emp), 0))], ['Trained at least once', pc(v('P13', emp), 1)]])) +
      cartao('Women in the workforce', barras([{ t: 'Total workforce', v: v('P04', emp), un: '%' }, { t: 'Leadership', v: v('P08', emp), un: '%' }], '%', 100) + lista([['Gender pay gap', pc(v('N05', emp), 1)]])) +
      cartao('Health and safety', lista([['Severity rate', pc(v('P14', emp), 2) + ' ' + chip(estado('P14', leitura('P14', emp)).t, estado('P14', leitura('P14', emp)).c)], ['Absenteeism', pc(v('P16', emp), 2)], ['Fatal accidents', e(fmt(v('P17', emp), 0))]])) +
      '</div></div>';

    var gov = '<div class="db-sec"><h2 class="db-h">Governance</h2><div class="db-g3">' +
      cartao('Ethics and compliance', barras([{ t: 'Whistleblowing channel coverage', v: v('G03', emp), un: '%' }, { t: 'Anti-corruption training', v: v('G04', emp), un: '%' }, { t: 'Ethics declaration signed', v: v('G05', emp), un: '%' }, { t: 'Alerts with written answer', v: v('G06', emp), un: '%' }], '%', 100)) +
      cartao('Supply chain', lista([['Total purchases (€)', e(fmt(v('G01', emp), 0))]]) + barras([{ t: 'Purchases in domestic markets', v: v('G02', emp), un: '%' }], '%', 100)) +
      cartao('Customers', lista([['Customer satisfaction (NPS)', e(fmt(v('C02', emp), 0))], ['Customer complaints', e(fmt(v('N06', emp), 0))], ['Personal data incidents', e(fmt(v('N07', emp), 0))]])) +
      '</div></div>';
    var nota = '<p class="ps-small ps-mut db-nota">' + (Array.isArray(emp) ? 'Selection of ' + emp.length + ' companies, each at 100%.' : emp ? emp + ', at 100%.' : 'Consolidated by the perimeter of the group.') + ' ' + (d.per ? P.periodo(d.per).nome + ', compared with the same quarter of ' + (ano() - 1) + '.' : 'Year ' + ano() + ': annual values when reported, otherwise the quarters so far (YTD).') + ' Values include those still in approval.</p>';
    return filtros + nota + sc + amb + soc + gov;
  };
  X.A.dbModo = function (d) { U.dash.modo = d.v; R(); };
  X.C.dbEmp = function (el) { U.dash.emp = el.value; R(); };
  X.C.dbPer = function (el) { U.dash.per = el.value; R(); };
  X.C.dbSel = function (el) { var l = U.dash.sel.filter(function (n) { return n !== el.dataset.id; }); if (el.checked) l.push(el.dataset.id); if (!l.length) { toast('Choose at least one company.', 'err'); R(); return; } U.dash.sel = l; R(); };

  /* Escolher os KPIs do scorecard (ate 8) */
  var OPCOES = function () { return [['E06+E07', 'GHG emissions (Scope 1+2), tCO2e'], ['QUAL', 'Reporting completeness (data quality)']].concat(S.cat.filter(function (c) { return !P.indAtivo || P.indAtivo(c); }).map(function (c) { return [c.id, c.id + ' ' + c.nome + ' (' + c.unidade_medida + ')']; })); };
  X.A.dbEditar = function () { U.dashEd = (S.ciclo.dashKpis && S.ciclo.dashKpis.length ? S.ciclo.dashKpis : SCORE_BASE).slice(0, 8); X.abrePainel('dashKpis', {}); };
  X.Pn.dashKpis = function () {
    var l = U.dashEd || [];
    return { t: 'Scorecard KPIs', s: 'Up to 8 KPIs of executive interest, in the order they appear', b: '<ol class="db-ed">' + l.map(function (k, i) { return '<li><span>' + e((OPCOES().filter(function (o) { return o[0] === k; })[0] || [k, k])[1]) + '</span><span class="ps-sp"><button type="button" class="ps-btn liga" data-a="dbSobe" data-v="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Move up">↑</button><button type="button" class="ps-btn liga" data-a="dbTira" data-v="' + i + '" aria-label="Remove">×</button></span></li>'; }).join('') + '</ol>' +
      (l.length < 8 ? campo('db-add', 'Add a KPI', '<select id="db-add" class="ps-sel" data-pesq data-c="dbAdd"><option value="">Choose…</option>' + OPCOES().filter(function (o) { return l.indexOf(o[0]) < 0; }).map(function (o) { return opt(o[0], o[1], ''); }).join('') + '</select>') : '<p class="ps-small ps-mut">8 KPIs: remove one to add another.</p>'),
      p: '<button type="button" class="ps-btn liga" data-a="dbRepor">Back to the default</button><span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="dbGuardar">Save</button>' };
  };
  X.C.dbAdd = function (el) { if (el.value && U.dashEd.length < 8) U.dashEd.push(el.value); R(); };
  X.A.dbTira = function (d) { U.dashEd.splice(+d.v, 1); R(); };
  X.A.dbSobe = function (d) { var i = +d.v, l = U.dashEd; if (i > 0) { var t = l[i - 1]; l[i - 1] = l[i]; l[i] = t; } R(); };
  X.A.dbRepor = function () { U.dashEd = SCORE_BASE.slice(); R(); };
  X.A.dbGuardar = function () { S.ciclo.dashKpis = U.dashEd.slice(0, 8); P.eventoGlobal('Dashboard scorecard KPIs set to ' + S.ciclo.dashKpis.join(', ') + '.', u().nome, 'Change'); P.guardar(); U.painel = null; toast('Scorecard saved.', 'ok'); R(); };
})();
