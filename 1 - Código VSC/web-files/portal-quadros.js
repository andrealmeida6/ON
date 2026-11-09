/* ============================================================================
   portal-quadros.js - quadros de indicadores do Report e montagem do documento
   Quatro quadros com o mesmo desenho em ecra, em Excel e em Word. As linhas com
   k vem do catalogo; as restantes tem valor proprio, editavel pelo administrador.
   Excel e Word sao escritos aqui, porque a biblioteca de folhas nao grava formatos.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var Blocos = X.Blocos, A = X.A, C = X.C, U = X.U, e = X.e, chip = X.chip, opt = X.opt, campo = X.campo, toast = X.toast, R = X.R, u = X.u;

  /* r rotulo, u unidade, k indicador, f fator, d verificado, l dados nacionais, o sentido favoravel, m [anterior, atual], c casas */
  var QD = [
    { id: 'natural', pag: 'env', t: 'Natural World', g: [
      { n: 'Drinking water', s: [
        { n: 'Infrastructures', r: [{ r: 'Number of water treatment plants operated', u: 'Number', k: 'A06' }, { r: 'Length of drinking water supply networks', u: 'km', k: 'A07' }, { r: 'Quantity of drinking water produced', u: 'Mm³', m: [51.4, 52.1], c: 2 }] },
        { n: 'Resource management - quantity', r: [{ r: 'Volume of water abstracted from the natural world', u: 'Mm³', k: 'A08' }, { r: 'Volume of water abstracted per subscriber', u: 'm³/ subscriber', k: 'A05', d: 1, o: '-' }, { r: 'Network performance', u: '%', k: 'A10', d: 1, o: '+' }, { r: 'Network Linear Loss Index (LLI)', u: 'm³/km/day', k: 'A11', o: '-' }] },
        { n: 'Resource management - quality', r: [{ r: 'Bacteriological compliance rate of water supplied', u: '%', k: 'A12', o: '+' }, { r: 'Physico-chemical compliance rate for water supplied', u: '%', k: 'A13', o: '+' }] }
      ] },
      { n: 'Wastewater treatment', s: [
        { n: 'Infrastructures', r: [{ r: 'Number of wastewater treatment plants (WWTP) operated', u: 'Number', k: 'R02' }, { r: 'Length of wastewater drainage networks', u: 'km', k: 'R03' }] },
        { n: 'Return to the natural environment', r: [{ r: 'Volume of wastewater treated', u: 'Mm³', k: 'R04' }, { r: 'Treatment efficiency in terms of COD', u: '%', k: 'R05', o: '+' }, { r: 'Treatment efficiency in terms of BOD', u: '%', k: 'R06', o: '+' }, { r: 'Treatment efficiency in terms of Total Nitrogen (NTK)', u: '%', k: 'R07', o: '+' }, { r: 'Treatment efficiency in terms of Phosphorus (P)', u: '%', k: 'R08', o: '+' }] },
        { n: 'Waste & circular economy', r: [{ r: 'Quantity of sludge produced by WWTP activity', u: 'Tons of dry material', k: 'R09', d: 1 }, { r: 'Proportion of sludge recovered', u: '%', k: 'R10', d: 1, o: '+' }, { r: 'of which land spreading', u: '%', k: 'R11' }, { r: 'of which composting', u: '%', k: 'R12', d: 1 }, { r: 'of which methanization', u: '%', m: [1.2, 1.4], c: 1 }, { r: 'of which incineration with heat recovery', u: '%', m: [0.9, 0.7], c: 1 }, { r: 'Volume of reused water (REUTE) produced', u: 'Mm³', m: [null, 2.3], c: 1 }] }
      ] },
      { n: 'Environmental management', s: [{ r: [{ r: 'Proportion of turnover covered by ISO 14001 certification', u: '%', m: [64, 68], c: 0, o: '+' }] }] }
    ] },
    { id: 'clima', pag: 'env', t: 'Climate', g: [
      { n: 'Energy efficiency & transition', s: [{ r: [
        { r: 'Primary energy consumption', u: 'GWh', k: 'E04', f: 0.001, c: 2, d: 1, o: '-' }, { r: 'Electricity consumption', u: 'MWh', k: 'E01', c: 0, d: 1, o: '-' }, { r: 'Quantity of renewable electricity generated, all types included', u: 'MWh', m: [1320, 1875], c: 0, d: 1, o: '+' }, { r: 'Quantity of biogas recovered', u: 'MWh', m: [null, 2640], c: 0, l: 1 }, { r: 'Proportion of turnover covered by ISO 50001 certification', u: '%', m: [41, 43], c: 0, o: '+' }, { r: 'Electricity consumption per m³ of water produced', u: 'kWh/m³', k: 'E05', o: '-' }, { r: 'Consumption of electricity per kg of COD eliminated during sanitation', u: 'kWh/kg COD', m: [1.34, 1.29], c: 2, o: '-' }, { r: 'Energy saving certificates (CEE)', u: 'MWh Cumac', m: [18400, 15900], c: 0, l: 1, o: '+' }
      ] }] },
      { n: 'Climate change mitigation and adaptation', s: [{ r: [
        { r: 'Direct GHG emissions (Scope 1)', u: 'Tons of CO₂e', k: 'E06', f: 0.001, c: 0, d: 1, o: '-' }, { r: 'Indirect GHG emissions from electricity consumption (Scope 2 location based)', u: 'Tons of CO₂e', k: 'E07', f: 0.001, c: 0, d: 1, o: '-' }, { r: 'Indirect GHG emissions from electricity consumption (scope 2 market based)', u: 'Tons of CO₂e', m: [0, 0], c: 0, d: 1, o: '-' }, { r: 'Percentage of electricity supply covered by guarantees of renewable origin', u: '%', k: 'E03', d: 1, c: 0, o: '+' }, { r: 'Included volume covered by a Power Purchase Agreement (PPA)', u: 'GWh', k: 'E02', f: 0.001, c: 1, d: 1, o: '+' }, { r: 'Carbon intensity for Scopes 1 and 2 (3-year rolling average)', u: 'Tons of CO₂e/M€', m: [52.6, 47.3], c: 1, d: 1, o: '-' }, { r: 'Other indirect emissions (Scope 3)*', u: 'Tons of CO₂e', k: 'N01', c: 0 }, { r: 'Sites subject to assessment of exposure and vulnerability to climate-related hazards', u: 'Number', m: [8, 214], c: 0, o: '+' }
      ] }] }
    ] },
    { id: 'social', pag: 'soc', t: 'Social indicators', g: [
      { n: 'Employment', s: [{ r: [{ r: 'Total workforce as of 31/12', u: 'Number', k: 'P01', d: 1, o: '+' }, { r: 'Number of external hires', u: 'Number', m: [146, 171], c: 0, o: '+' }, { r: 'Proportion of new hires on permanent contracts', u: '%', m: [61, 64], c: 0, o: '+' }, { r: 'Proportion of employees on permanent contracts', u: '%', k: 'P03', o: '+' }, { r: 'Proportion of managers', u: '%', m: [15, 15], c: 0, d: 1, l: 1, o: '+' }] },
      ] },
      { n: 'Diversity', s: [{ r: [{ r: 'Proportion of women', u: '%', k: 'P04', d: 1, o: '+' }, { r: 'Proportion of women in executive positions', u: '%', k: 'P08', d: 1, o: '+' }, { r: 'Proportion of women among hires on permanent contracts', u: '%', m: [23, 26.5], c: 1, o: '+' }, { r: 'Gender equality index score', u: '/100', m: [88, 90], c: 0, l: 1, o: '+' }, { r: 'Proportion of employees under 25 years old', u: '%', k: 'P09' }, { r: 'Proportion of employees over 55 years-old', u: '%', k: 'P10' }, { r: 'Proportion of disabled employees', u: '%', k: 'P11', d: 1, o: '+' }] }] },
      { n: 'Pay', s: [{ r: [{ r: 'Number of women among the 10 highest paid in the Group', u: 'Number', m: [3, 3], c: 0, o: '+' }, { r: 'Unadjusted gender pay gap', u: '%', k: 'N05' }] }] },
      { n: 'Skills development', s: [{ r: [{ r: 'Number of training hours provided during the year', u: 'hours', k: 'P12', o: '+' }, { r: 'Percentage of employees completing at least one training program during the year', u: '%', k: 'P13', d: 1, o: '+' }, { r: 'Expenditure on training as a percentage of payroll', u: '%', m: [1.7, 1.9], c: 1, o: '+' }] }] },
      { n: 'Safety', s: [{ r: [{ r: 'Occupational accident frequency rate', u: '%', m: [11.2, 10.6], c: 1, d: 1, o: '-' }, { r: 'Occupational accident severity rate', u: '%', k: 'P14', o: '-' }, { r: 'Proportion of turnover covered by ISO 45001 certification', u: '%', m: [58, 61], c: 0, o: '+' }, { r: 'Share of employees trained in safety', u: '%', k: 'P15', l: 1, o: '+' }, { r: 'Number of fatal occupational accidents involving an employee', u: 'Number', k: 'P17', o: '-' }] }] },
      { n: 'Absenteeism', s: [{ r: [{ r: 'Total absenteeism rate', u: '%', k: 'P16', d: 1, o: '-' }, { r: 'Sick leave rate', u: '%', m: [4.6, 4.4], c: 1, d: 1, o: '-' }, { r: 'Imposed employee turnover rate', u: '%', k: 'P07', d: 1, o: '-' }] }] },
      { n: 'Employee representation', s: [{ r: [{ r: 'Total number of employee and/or union representatives', u: 'Number', m: [37, 39], c: 0, l: 1, o: '+' }, { r: 'Number of meetings held with employee and/or union representatives', u: 'Number', m: [28, 31], c: 0, l: 1, o: '+' }] }] },
      { n: 'Workplace integration of young people', s: [{ r: [{ r: 'Number of work/study apprentices as of 31 December and number of interns', u: 'Number', k: 'P05', o: '+' }, { r: 'Percentage of workforce represented by interns and work/study students', u: '%', k: 'P06', o: '+' }] }] }
    ] },
    { id: 'societal', pag: 'soc', t: 'Societal indicators', g: [
      { n: 'Solidarity fund', s: [{ r: [{ r: 'Number of projects supported by the solidarity fund', u: 'Number', k: 'C01', o: '+' }, { r: 'Share of funds allocated by the solidarity fund dedicated to water and sanitation access projects', u: '%', m: [80, 76], c: 0, o: '+' }] }] },
      { n: 'Sustainable procurement', s: [{ r: [{ r: 'Total value of purchases', u: 'M€', k: 'G01', f: 0.000001, c: 1 }, { r: 'Percentage of purchases made in the operating country', u: '%', k: 'G02', c: 0, o: '+' }, { r: 'Percentage of Purchasing Sales covered by a CSR supplier assessment', u: '%', m: [38.5, 42.2], c: 1, l: 1, o: '+' }, { r: 'Average rating of suppliers assessed by CSR', u: '/100', m: [57.5, 59], c: 1, l: 1, o: '+' }] }] },
      { n: 'Ethics & compliance', s: [{ r: [{ r: 'Proportion of annual revenue covered by ISO 37001 certification', u: '%', m: [null, 45], c: 0 }, { r: 'Percentage of employees covered by the Group\'s whistleblowing system', u: '%', k: 'G03', o: '+' }, { r: 'Percentage of the target population ("managers and equivalents") who have signed the Annual Declaration of Ethics and Compliance', u: '%', k: 'G05', o: '+' }] }] },
      { n: 'Service quality', s: [{ r: [{ r: 'Customers claim rate', u: '%', m: [6.1, 5.7], c: 1, l: 1, o: '-' }, { r: 'Satisfaction rate', u: '%', m: [null, 81], c: 0, l: 1 }] }] }
    ] }
  ];
  var PAGS = { env: 'Environmental indicators', soc: 'Social and societal indicators' };
  var LEGENDA = [{ d: 1, t: 'Indicators verified by the auditor' }, { l: 1, t: 'National data' }, { t: 'Group data' }, { t: '* Data unavailable at the time of report publication' }];
  P.REPORT_QUADROS = QD;

  /* Chave estavel de cada linha, e a lista plana por quadro */
  QD.forEach(function (q) {
    var i = 0;
    q.g.forEach(function (g) { g.s.forEach(function (s) { s.r.forEach(function (r) { r.id = q.id + '-' + (++i); }); }); });
  });
  var linhasDe = function (q) { var o = []; q.g.forEach(function (g) { g.s.forEach(function (s) { s.r.forEach(function (r) { o.push(r); }); }); }); return o; };
  var quadro = function (id) { return QD.filter(function (q) { return q.id === id; })[0]; };

  P.garantirQuadros = function () {
    if (!S.rq) S.rq = {};
    QD.forEach(function (q) { linhasDe(q).forEach(function (r) { if (r.m && !S.rq[r.id]) S.rq[r.id] = { ant: r.m[0], val: r.m[1] }; }); });
    if (!S.doc) S.doc = { titulo: 'Sustainability report', blocos: [{ t: 'cap', txt: PAGS.env }, { t: 'q', id: 'natural' }, { t: 'q', id: 'clima' }, { t: 'cap', txt: PAGS.soc }, { t: 'q', id: 'social' }, { t: 'q', id: 'societal' }] };
  };

  /* --- Valores -------------------------------------------------------------- */
  var casasDe = function (r) { if (r.c !== undefined) return r.c; var c = r.k && P.cat(r.k); return c ? c.casas_decimais : 0; };
  var valores = function (r) {
    var ano = S.ciclo.ano, so = U.rq.modo === 'aprovados';
    if (!r.k) { var d = S.rq[r.id] || {}; return { ant: d.ant === undefined ? null : d.ant, val: d.val === undefined ? null : d.val, pend: false }; }
    var f = r.f || 1, it = P.item(r.k, ano), m = P.msDoIndicador(r.k, ano), v = it && it.valor !== null && it.valor !== undefined ? it.valor : null, an = P.valorAnterior(r.k, ano);
    var pend = v !== null && !(m && P.concluida(m));
    if (pend && so) { v = null; pend = false; }
    return { ant: an === null || an === undefined ? null : an * f, val: v === null ? null : v * f, pend: pend };
  };
  /* A seta diz se a evolucao e favoravel, nao se o numero subiu */
  var evolucao = function (r, v) {
    if (!r.o || v.ant === null || v.val === null) return '';
    var dif = v.ant === 0 ? (v.val === 0 ? 0 : 1) : (v.val - v.ant) / Math.abs(v.ant);
    if (Math.abs(dif) < 0.001) return 'igual';
    return (dif > 0) === (r.o === '+') ? 'bom' : 'mau';
  };
  var SETA = { bom: '↗', mau: '↘', igual: '→', '': '-' };
  var COR_SETA = { bom: '00A651', mau: 'E5005B', igual: '00385F', '': '00385F' };
  var num = function (x, c) { return x === null ? '-' : P.fmtNum(x, c); };
  var ePendente = function (id) { return linhasDe(quadro(id)).some(function (r) { return valores(r).pend; }); };

  /* --- Ecra ----------------------------------------------------------------- */
  U.rq = { sep: 'quadros', modo: 'todos', editar: false };
  var legendaHtml = function () {
    return '<div class="rq-leg"><b>LEGEND</b><div>' + LEGENDA.map(function (l) { return '<span' + (l.l ? ' class="rq-leg-l"' : '') + '>' + (l.d ? '<i class="rq-pt" aria-hidden="true"></i>' : '') + e(l.t) + '</span>'; }).join('') + '</div></div>';
  };
  var quadroHtml = function (q) {
    var ano = S.ciclo.ano, ed = U.rq.editar && P.gereTudo(u());
    var corpo = q.g.map(function (g) {
      var n = g.s.reduce(function (t, s) { return t + s.r.length + (s.n ? 1 : 0); }, 0), pr = true;
      var gcel = function () { if (!pr) return ''; pr = false; return '<th scope="rowgroup" class="rq-g" rowspan="' + n + '">' + e(g.n) + '</th>'; };
      return '<tbody>' + g.s.map(function (s) {
        return (s.n ? '<tr class="rq-sub">' + gcel() + '<td colspan="5">' + e(s.n) + '</td></tr>' : '') + s.r.map(function (r) {
          var v = valores(r), ev = evolucao(r, v), c = casasDe(r);
          var pt = r.d ? '<i class="rq-pt" aria-hidden="true"></i><span class="ps-sr">Verified. </span>' : '';
          var rot = r.k ? '<button type="button" class="rq-lig" data-a="ficha" data-v="' + e(r.k) + '">' + pt + e(r.r) + '</button>' : pt + e(r.r);
          var cels = ed && !r.k ?
            '<td class="rq-n"><input class="ps-in ps-num rq-in" id="rq-a-' + e(r.id) + '" aria-label="' + e(r.r + ', ' + (ano - 1)) + '"'+ (P.inteiro({ unidade_medida: r.u }) ? ' inputmode="numeric" data-int="1"' : ' inputmode="decimal"') + ' data-c="rqVal" data-id="' + e(r.id) + '" data-f="ant" value="' + e(v.ant === null ? '' : v.ant) + '"></td><td class="rq-n rq-at"><input class="ps-in ps-num rq-in" id="rq-v-' + e(r.id) + '" aria-label="' + e(r.r + ', ' + ano) + '"'+ (P.inteiro({ unidade_medida: r.u }) ? ' inputmode="numeric" data-int="1"' : ' inputmode="decimal"') + ' data-c="rqVal" data-id="' + e(r.id) + '" data-f="val" value="' + e(v.val === null ? '' : v.val) + '"></td>' :
            '<td class="rq-n">' + e(num(v.ant, c)) + '</td><td class="rq-n rq-at' + (v.pend ? ' rq-pend' : '') + '">' + e(num(v.val, c)) + '</td>';
          return '<tr class="' + (r.l ? 'rq-l' : '') + '">' + gcel() + '<td class="rq-r">' + rot + '</td><td class="rq-u">' + e(r.u) + '</td>' + cels + '<td class="rq-e" data-ev="' + (ev || 'nd') + '">' + SETA[ev] + '</td></tr>';
        }).join('');
      }).join('') + '</tbody>';
    }).join('');
    return '<section class="rq-q" data-quadro="' + e(q.id) + '"><h3 class="rq-t">' + e(q.t) + '</h3><div class="ps-tw"><table class="rq-tab"><thead><tr><td></td><td></td><th scope="col">Unit</th><th scope="col" class="rq-n">' + (ano - 1) + '</th><th scope="col" class="rq-n rq-at">' + ano + '</th><th scope="col" class="rq-e">Evolution</th></tr></thead>' + corpo + '</table></div></section>';
  };
  var paginaHtml = function (pag) {
    return '<article class="rq-pag"><div class="rq-pag-top"><h2>' + e(PAGS[pag]) + '</h2>' + legendaHtml() + '</div><div class="rq-pag-g">' + QD.filter(function (q) { return q.pag === pag; }).map(quadroHtml).join('') + '</div></article>';
  };
  var abaQuadros = function () {
    var d = U.rq, adm = P.gereTudo(u()), pend = QD.some(function (q) { return ePendente(q.id); });
    return '<div class="ps-sp ps-nao-imprimir ps-filtros"><button type="button" class="ps-btn pri" data-a="rqExcel">Export to Excel</button><button type="button" class="ps-btn" data-a="rqWord">Export to Word</button><button type="button" class="ps-btn" data-a="imprimir">Print or save as PDF</button>' +
      campo('rq-modo', 'Values', '<select id="rq-modo" class="ps-sel" data-c="rqModo">' + opt('todos', 'All values', d.modo) + opt('aprovados', 'Approved only', d.modo) + '</select>') +
      (adm ? '<label class="ps-chk"><input id="rq-ed" type="checkbox" data-c="rqEd"' + (d.editar ? ' checked' : '') + '> Edit values not linked to a KPI</label>' : '') + '</div>' +
      (pend ? '<p class="ps-small ps-mut ps-nao-imprimir">Values in italics are not approved yet.</p>' : '') +
      '<div class="ps-so-imprimir ps-sp-b ps-rel-topo"><span data-marca-c="logo-claro"></span><b>Report ' + S.ciclo.ano + '</b></div>' + paginaHtml('env') + paginaHtml('soc');
  };

  /* --- Montagem do documento ------------------------------------------------- */
  var blocoHtml = function (b) {
    if (b.t === 'cap') return '<h2 class="rq-doc-cap">' + e(b.txt) + '</h2>';
    if (b.t === 'txt') return '<p class="rq-doc-txt">' + e(b.txt) + '</p>';
    if (b.t === 'leg') return legendaHtml();
    var q = quadro(b.id); return q ? quadroHtml(q) : '';
  };
  var abaDoc = function () {
    var d = S.doc, adm = P.gereTudo(u()), usados = d.blocos.filter(function (b) { return b.t === 'q'; }).map(function (b) { return b.id; });
    var nomeBloco = function (b) { return b.t === 'q' ? quadro(b.id).t : b.t === 'cap' ? 'Heading' : b.t === 'leg' ? 'Legend' : 'Text'; };
    var lista = d.blocos.map(function (b, i) {
      var corpo = b.t === 'cap' ? '<input id="dc-' + i + '" class="ps-in" aria-label="Heading ' + (i + 1) + '" data-c="docTxt" data-id="' + i + '" value="' + e(b.txt) + '"' + (adm ? '' : ' readonly') + '>' : b.t === 'txt' ? '<textarea id="dc-' + i + '" class="ps-ta" aria-label="Text ' + (i + 1) + '" data-c="docTxt" data-id="' + i + '"' + (adm ? '' : ' readonly') + '>' + e(b.txt) + '</textarea>' : '<b>' + e(nomeBloco(b)) + '</b>';
      return '<li class="rq-doc-it"><span class="ps-chip">' + e(b.t === 'q' ? 'Table' : nomeBloco(b)) + '</span><div class="rq-doc-c">' + corpo + '</div>' + (adm ? '<div class="rq-doc-b"><button type="button" class="ps-btn peq" data-a="docMover" data-v="' + i + '" data-d="-1" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button type="button" class="ps-btn peq" data-a="docMover" data-v="' + i + '" data-d="1" aria-label="Move down"' + (i < d.blocos.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" class="ps-btn peq err" data-a="docTirar" data-v="' + i + '" aria-label="Remove">×</button></div>' : '') + '</li>';
    }).join('');
    var bib = QD.map(function (q) { var ja = usados.indexOf(q.id) > -1; return '<li class="ps-sp-b rq-bib"><span><b>' + e(q.t) + '</b><small class="ps-mut"> ' + e(PAGS[q.pag]) + ', ' + linhasDe(q).length + ' rows</small></span><button type="button" class="ps-btn peq" data-a="docQuadro" data-v="' + e(q.id) + '"' + (ja ? ' disabled' : '') + '>' + (ja ? 'Added' : 'Add') + '</button></li>'; }).join('');
    return '<div class="ps-sp ps-nao-imprimir ps-filtros"><button type="button" class="ps-btn pri" data-a="docWord"' + (d.blocos.length ? '' : ' disabled') + '>Export to Word</button><button type="button" class="ps-btn" data-a="docExcel"' + (usados.length ? '' : ' disabled') + '>Export tables to Excel</button></div>' +
      '<div class="rq-doc-g ps-nao-imprimir"><div class="ps-card">' + X.cabCartao('Available tables', 'doc') + '<ul class="ps-card-body rq-lista">' + bib + '</ul>' + (adm ? '<div class="ps-card-body ps-sp"><button type="button" class="ps-btn" data-a="docNovo" data-v="cap">Add heading</button><button type="button" class="ps-btn" data-a="docNovo" data-v="txt">Add text</button><button type="button" class="ps-btn" data-a="docNovo" data-v="leg">Add legend</button></div>' : '') + '</div>' +
      '<div class="ps-card">' + X.cabCartao('Document', 'doc') + '<div class="ps-card-body">' + campo('doc-tit', 'Title', '<input id="doc-tit" class="ps-in" data-c="docTit" value="' + e(d.titulo) + '"' + (adm ? '' : ' readonly') + '>') + (d.blocos.length ? '<ol class="rq-lista ps-mt">' + lista + '</ol>' : '<p class="ps-mut ps-mt">Add a table to start.</p>') + '</div></div></div>' +
      '<div class="ps-card ps-mt">' + X.cabCartao('Preview', 'doc') + '<div class="rq-pag rq-prev"><h1 class="rq-doc-tit">' + e(d.titulo) + ' ' + S.ciclo.ano + '</h1>' + d.blocos.map(blocoHtml).join('') + '</div></div>';
  };

  var antigo = Blocos['relatorio'];
  Blocos['relatorio'] = function () {
    var s = U.rq.sep, abas = [['quadros', 'Indicator tables'], ['doc', 'Document builder'], ['lista', 'All indicators']];
    var topo = '<div class="ps-seg ps-nao-imprimir ps-sp" role="group" aria-label="Report views">' + abas.map(function (a) { return '<button type="button" class="' + (s === a[0] ? 'on' : '') + '" data-a="rqSep" data-v="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>';
    return topo + (s === 'quadros' ? abaQuadros() : s === 'doc' ? abaDoc() : antigo());
  };

  A.rqSep = function (d) { U.rq.sep = d.v; R(); };
  C.rqModo = function (el) { U.rq.modo = el.value; };
  C.rqEd = function (el) { U.rq.editar = el.checked; };
  C.rqVal = function (el) {
    var t = String(el.value).trim(), x = t === '' ? null : P.lerNumero(t);
    if (t !== '' && x === null) { toast('The value is not numeric.', 'err'); return; }
    if (x !== null && el.hasAttribute('data-int') && Math.round(x) !== x) { toast('Whole numbers only. This line counts units, so it cannot have decimals.', 'err'); return; }
    var d = S.rq[el.dataset.id] || (S.rq[el.dataset.id] = { ant: null, val: null }), f = el.dataset.f;
    if (d[f] === x) return;
    var rot = (QD.reduce(function (o, q) { return o.concat(linhasDe(q)); }, []).filter(function (r) { return r.id === el.dataset.id; })[0] || {}).r;
    P.eventoGlobal('Report value changed: ' + rot + ', ' + (f === 'ant' ? S.ciclo.ano - 1 : S.ciclo.ano) + ' from ' + (d[f] === null ? '-' : d[f]) + ' to ' + (x === null ? '-' : x) + '.', u().nome);
    d[f] = x; P.guardar();
  };
  C.docTit = function (el) { S.doc.titulo = el.value; P.guardar(); };
  C.docTxt = function (el) { S.doc.blocos[Number(el.dataset.id)].txt = el.value; P.guardar(); };
  A.docQuadro = function (d) { S.doc.blocos.push({ t: 'q', id: d.v }); P.guardar(); R(); };
  A.docNovo = function (d) { S.doc.blocos.push(d.v === 'leg' ? { t: 'leg' } : { t: d.v, txt: d.v === 'cap' ? 'New heading' : 'Text' }); P.guardar(); R(); };
  A.docTirar = function (d) { S.doc.blocos.splice(Number(d.v), 1); P.guardar(); R(); };
  A.docMover = function (d, el) { var i = Number(d.v), j = i + Number((el || {}).dataset ? el.dataset.d : d.d), b = S.doc.blocos; if (j < 0 || j >= b.length) return; var x = b[i]; b[i] = b[j]; b[j] = x; P.guardar(); R(); };

  /* --- Escrita de ficheiros -------------------------------------------------- */
  var xml = function (t) { return String(t === null || t === undefined ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var COR = { navy: '00385F', sub: 'C3CFDD', loc: 'BDB8DF', fundo: 'E1E6EF', txt: '2B5C86', linha: '8FA6BD', ponto: '2E2A86', branco: 'FFFFFF' };
  var zip = function (partes) {
    var CFB = window.XLSX.CFB, z = CFB.utils.cfb_new(), en = new TextEncoder();
    Object.keys(partes).forEach(function (n) { CFB.utils.cfb_add(z, n, en.encode(partes[n])); });
    var r = CFB.write(z, { type: 'array', fileType: 'zip', compression: true });
    return r instanceof Uint8Array ? r : new Uint8Array(r);
  };
  var descarregar = function (nome, bytes, tipo) {
    var url = URL.createObjectURL(new Blob([bytes], { type: tipo })), a = document.createElement('a');
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };
  var nomeCol = function (i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

  /* Excel: cada pagina do relatorio e uma folha, com os quadros lado a lado como no original */
  var XL = function () {
    var fontes = ['<font><sz val="9"/><color rgb="FF' + COR.txt + '"/><name val="Segoe UI"/></font>'], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], bordas = ['<border><left/><right/><top/><bottom/><diagonal/></border>'], fmts = [], xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], chaves = {};
    var idx = function (l, x) { var i = l.indexOf(x); if (i < 0) { l.push(x); i = l.length - 1; } return i; };
    var estilo = function (o) {
      var k = JSON.stringify(o); if (chaves[k] !== undefined) return chaves[k];
      var f = idx(fontes, '<font>' + (o.b ? '<b/>' : '') + (o.i ? '<i/>' : '') + '<sz val="' + (o.sz || 9) + '"/><color rgb="FF' + (o.cor || COR.txt) + '"/><name val="' + (o.fonte || 'Segoe UI') + '"/></font>');
      var fl = o.fill ? idx(fills, '<fill><patternFill patternType="solid"><fgColor rgb="FF' + o.fill + '"/><bgColor indexed="64"/></patternFill></fill>') : 0;
      var b = o.bb ? idx(bordas, '<border><left/><right/><top/><bottom style="thin"><color rgb="FF' + o.bb + '"/></bottom><diagonal/></border>') : 0;
      var nf = 0; if (o.casas !== undefined) { var c = '#,##0' + (o.casas ? '.' + new Array(o.casas + 1).join('0') : ''); var i = fmts.indexOf(c); if (i < 0) { fmts.push(c); i = fmts.length - 1; } nf = 164 + i; }
      xfs.push('<xf numFmtId="' + nf + '" fontId="' + f + '" fillId="' + fl + '" borderId="' + b + '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="' + (o.al || 'left') + '" vertical="' + (o.va || 'center') + '" wrapText="' + (o.nw ? 0 : 1) + '"/></xf>');
      return (chaves[k] = xfs.length - 1);
    };
    return { estilo: estilo, xmlEstilos: function () {
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + (fmts.length ? '<numFmts count="' + fmts.length + '">' + fmts.map(function (c, i) { return '<numFmt numFmtId="' + (164 + i) + '" formatCode="' + xml(c) + '"/>'; }).join('') + '</numFmts>' : '') + '<fonts count="' + fontes.length + '">' + fontes.join('') + '</fonts><fills count="' + fills.length + '">' + fills.join('') + '</fills><borders count="' + bordas.length + '">' + bordas.join('') + '</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs></styleSheet>';
    } };
  };
  var folhaXlsx = function (titulo, quadros, est) {
    var W = 6, cels = {}, merges = [], alt = {};
    var pos = function (l, c, o) { (cels[l] = cels[l] || {})[c] = o; };
    var base = { fill: COR.fundo };
    var fim = 0;
    var ano = S.ciclo.ano;
    quadros.forEach(function (q, qi) {
      var c0 = qi * (W + 1), l = 5;
      for (var i = 0; i < W; i++) pos(l, c0 + i, { t: i ? '' : q.t, s: { b: 1, sz: 10, cor: COR.branco, fill: COR.navy, va: 'center', nw: 1 } });
      merges.push(nomeCol(c0) + (l + 1) + ':' + nomeCol(c0 + W - 1) + (l + 1)); alt[l] = 16; l += 1;
      alt[l] = alt[l] || 6; l += 1;
      ['', '', 'Unit', String(ano - 1), String(ano), 'Evolution'].forEach(function (t, i) { pos(l, c0 + i, { t: t, s: { b: 1, cor: COR.navy, fill: i === 4 ? COR.branco : COR.fundo, bb: COR.linha, al: i > 2 ? (i === 5 ? 'center' : 'left') : 'left', nw: 1 } }); });
      l += 1;
      q.g.forEach(function (g) {
        var g0 = l;
        g.s.forEach(function (s) {
          if (s.n) {
            pos(l, c0, { t: '', s: { fill: COR.fundo } });
            for (var j = 1; j < W; j++) pos(l, c0 + j, { t: j === 1 ? s.n : '', s: { b: 1, cor: COR.navy, fill: COR.sub, bb: COR.linha, nw: 1 } });
            merges.push(nomeCol(c0 + 1) + (l + 1) + ':' + nomeCol(c0 + W - 1) + (l + 1)); alt[l] = Math.max(alt[l] || 0, 13); l += 1;
          }
          s.r.forEach(function (r) {
            var v = valores(r), ev = evolucao(r, v), fl = r.l ? COR.loc : COR.fundo, cs = casasDe(r);
            pos(l, c0, { t: '', s: { fill: COR.fundo } });
            pos(l, c0 + 1, { t: r.r, ponto: !!r.d, s: { fill: fl, bb: COR.linha, va: 'bottom' } });
            pos(l, c0 + 2, { t: r.u, s: { fill: fl, bb: COR.linha, va: 'bottom' } });
            pos(l, c0 + 3, v.ant === null ? { t: '-', s: { fill: fl, bb: COR.linha, va: 'bottom' } } : { n: v.ant, s: { fill: fl, bb: COR.linha, va: 'bottom', al: 'left', casas: cs } });
            pos(l, c0 + 4, v.val === null ? { t: '-', s: { b: 1, cor: COR.navy, fill: COR.branco, bb: COR.linha, va: 'bottom' } } : { n: v.val, s: { b: 1, i: v.pend ? 1 : 0, cor: COR.navy, fill: COR.branco, bb: COR.linha, va: 'bottom', al: 'left', casas: cs } });
            pos(l, c0 + 5, { t: SETA[ev], s: { b: 1, sz: 10, cor: COR_SETA[ev], fill: fl, bb: COR.linha, al: 'center', va: 'bottom', fonte: 'Segoe UI Symbol' } });
            alt[l] = Math.max(alt[l] || 0, 13.5 + 11.5 * Math.floor((r.r.length + (r.d ? 2 : 0)) / 67)); l += 1;
          });
        });
        pos(g0, c0, { t: g.n, s: { b: 1, cor: COR.navy, fill: COR.fundo, va: 'top' } });
        if (l - 1 > g0) merges.push(nomeCol(c0) + (g0 + 1) + ':' + nomeCol(c0) + l);
        var preciso = Math.ceil(g.n.length / 14) * 12.5, tem = 0; for (var h = g0; h < l; h++) tem += alt[h] || 13.5;
        if (preciso > tem) alt[l - 1] = (alt[l - 1] || 13.5) + preciso - tem;
      });
      fim = Math.max(fim, l);
    });
    var ultCol = quadros.length * (W + 1) - 2;
    /* Titulo e legenda */
    pos(0, 0, { t: titulo, s: { b: 1, sz: 22, cor: COR.navy, fill: COR.fundo, fonte: 'Georgia', nw: 1 } }); merges.push('A1:' + nomeCol(W - 1) + '1'); alt[0] = 34;
    var cl = quadros.length > 1 ? W + 1 : 0;
    pos(1, cl, { t: 'LEGEND', s: { b: 1, cor: COR.navy, fill: COR.fundo, nw: 1 } });
    pos(2, cl + 1, { t: LEGENDA[0].t, ponto: true, s: { fill: COR.fundo, nw: 1 } });
    pos(2, cl + 2, { t: LEGENDA[1].t, s: { fill: COR.loc, nw: 1 } });
    pos(2, cl + 3, { t: LEGENDA[2].t, s: { fill: COR.fundo, nw: 1 } });
    merges.push(nomeCol(cl + 3) + '3:' + nomeCol(cl + 5) + '3');
    pos(3, cl + 1, { t: LEGENDA[3].t, s: { fill: COR.fundo, nw: 1 } });
    /* O fundo cobre a folha toda, como a pagina do relatorio */
    var linhas = '';
    for (var l = 0; l <= fim + 1; l++) {
      var cs2 = ''; var d = cels[l] || {};
      for (var c = 0; c <= ultCol; c++) {
        var o = d[c] || { t: '', s: base }, ref = nomeCol(c) + (l + 1), st = est.estilo(o.s);
        if (o.n !== undefined) cs2 += '<c r="' + ref + '" s="' + st + '"><v>' + o.n + '</v></c>';
        else if (o.ponto) cs2 += '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><r><rPr><sz val="9"/><color rgb="FF' + COR.ponto + '"/><rFont val="Segoe UI"/></rPr><t xml:space="preserve">● </t></r><r><rPr><sz val="9"/><color rgb="FF' + COR.txt + '"/><rFont val="Segoe UI"/></rPr><t>' + xml(o.t) + '</t></r></is></c>';
        else if (o.t === '') cs2 += '<c r="' + ref + '" s="' + st + '"/>';
        else cs2 += '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + xml(o.t) + '</t></is></c>';
      }
      linhas += '<row r="' + (l + 1) + '"' + (alt[l] ? ' ht="' + alt[l] + '" customHeight="1"' : '') + '>' + cs2 + '</row>';
    }
    var larg = [15, 60, 19, 10, 10, 9, 3], cols = '';
    for (var k = 0; k <= ultCol; k++) cols += '<col min="' + (k + 1) + '" max="' + (k + 1) + '" width="' + larg[k % 7] + '" customWidth="1"/>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="13.5"/><cols>' + cols + '</cols><sheetData>' + linhas + '</sheetData>' + (merges.length ? '<mergeCells count="' + merges.length + '">' + merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '') + '<pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/></worksheet>';
  };
  /* folhas: [{nome, titulo, quadros}] */
  P.quadrosXlsx = function (folhas) {
    var est = XL(), partes = {};
    folhas.forEach(function (f, i) { partes['xl/worksheets/sheet' + (i + 1) + '.xml'] = folhaXlsx(f.titulo, f.quadros, est); });
    partes['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + folhas.map(function (f, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>';
    partes['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    partes['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + folhas.map(function (f, i) { return '<sheet name="' + xml(f.nome.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>';
    partes['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + folhas.map(function (f, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (folhas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    partes['xl/styles.xml'] = est.xmlEstilos();
    return zip(partes);
  };

  /* Word: tabelas reais, editaveis, com as mesmas cores */
  var run = function (t, o) { o = o || {}; return '<w:r><w:rPr><w:rFonts w:ascii="' + (o.fonte || 'Segoe UI') + '" w:hAnsi="' + (o.fonte || 'Segoe UI') + '" w:cs="' + (o.fonte || 'Segoe UI') + '" w:eastAsia="' + (o.fonte || 'Segoe UI') + '"/>' + (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') + '<w:color w:val="' + (o.cor || COR.txt) + '"/><w:sz w:val="' + (o.sz || 15) + '"/>' + (o.fill ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.fill + '"/>' : '') + '</w:rPr><w:t xml:space="preserve">' + xml(t) + '</w:t></w:r>'; };
  var par = function (runs, o) { o = o || {}; return '<w:p><w:pPr>' + (o.estilo ? '<w:pStyle w:val="' + o.estilo + '"/>' : '') + (o.keep ? '<w:keepNext/>' : '') + '<w:spacing w:before="' + (o.antes || 0) + '" w:after="' + (o.depois || 0) + '"/>' + (o.al ? '<w:jc w:val="' + o.al + '"/>' : '') + '</w:pPr>' + runs + '</w:p>'; };
  var celula = function (w, runs, o) { o = o || {}; return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (o.span ? '<w:gridSpan w:val="' + o.span + '"/>' : '') + (o.vm ? '<w:vMerge' + (o.vm === 'ini' ? ' w:val="restart"' : '') + '/>' : '') + (o.borda === false ? '' : '<w:tcBorders><w:bottom w:val="single" w:sz="4" w:space="0" w:color="' + COR.linha + '"/></w:tcBorders>') + '<w:shd w:val="clear" w:color="auto" w:fill="' + (o.fill || COR.fundo) + '"/><w:vAlign w:val="' + (o.va || 'bottom') + '"/></w:tcPr>' + par(runs, { al: o.al }) + '</w:tc>'; };
  var GRID = [1500, 4700, 1500, 900, 900, 900];
  var TOTAL = GRID.reduce(function (a, b) { return a + b; }, 0);
  var tabelaDocx = function (q) {
    var ano = S.ciclo.ano, g0 = GRID[0], lin = function (x) { return '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + x + '</w:tr>'; };
    var banda = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + celula(TOTAL, run(q.t, { b: 1, cor: COR.branco, sz: 19 }), { span: 6, fill: COR.navy, borda: false, va: 'center' }) + '</w:tr>';
    var cab = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + ['', '', 'Unit', String(ano - 1), String(ano), 'Evolution'].map(function (t, i) { return celula(GRID[i], t ? run(t, { b: 1, cor: COR.navy }) : '', { fill: i === 4 ? COR.branco : COR.fundo, al: i === 5 ? 'center' : '' }); }).join('') + '</w:tr>';
    var corpo = q.g.map(function (g) {
      var pr = true, gc = function () { var ini = pr; pr = false; return celula(g0, ini ? run(g.n, { b: 1, cor: COR.navy }) : '', { vm: ini ? 'ini' : 'cont', va: 'top', borda: false }); };
      return g.s.map(function (s) {
        return (s.n ? lin(gc() + celula(TOTAL - g0, run(s.n, { b: 1, cor: COR.navy }), { span: 5, fill: COR.sub })) : '') + s.r.map(function (r) {
          var v = valores(r), ev = evolucao(r, v), c = casasDe(r), fl = r.l ? COR.loc : COR.fundo;
          return lin(gc() + celula(GRID[1], (r.d ? run('● ', { cor: COR.ponto }) : '') + run(r.r), { fill: fl }) + celula(GRID[2], run(r.u), { fill: fl }) + celula(GRID[3], run(num(v.ant, c)), { fill: fl }) + celula(GRID[4], run(num(v.val, c), { b: 1, i: v.pend, cor: COR.navy }), { fill: COR.branco }) + celula(GRID[5], run(SETA[ev], { b: 1, cor: COR_SETA[ev], sz: 18, fonte: 'Segoe UI Symbol' }), { fill: fl, al: 'center' }));
        }).join('');
      }).join('');
    }).join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="' + TOTAL + '" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="50" w:type="dxa"/><w:right w:w="50" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + GRID.map(function (x) { return '<w:gridCol w:w="' + x + '"/>'; }).join('') + '</w:tblGrid>' + banda + cab + corpo + '</w:tbl>' + par('', { depois: 200 });
  };
  P.documentoDocx = function (doc) {
    var legenda = par(run('LEGEND', { b: 1, cor: COR.navy }), { antes: 60, keep: 1 }) + par(run('● ', { cor: COR.ponto }) + run(LEGENDA[0].t + '     ') + run(LEGENDA[1].t, { fill: COR.loc }) + run('     ' + LEGENDA[2].t + '     ' + LEGENDA[3].t), { depois: 160 });
    var corpo = par(run(doc.titulo + ' ' + S.ciclo.ano, { b: 1, cor: COR.navy, sz: 52, fonte: 'Georgia' }), { estilo: 'Title', depois: 240 }) + doc.blocos.map(function (b, i) {
      if (b.t === 'cap') return par(run(b.txt, { b: 1, cor: COR.navy, sz: 40, fonte: 'Georgia' }), { estilo: 'Heading1', antes: i ? 240 : 0, depois: 160, keep: 1 });
      if (b.t === 'txt') return String(b.txt).split('\n').map(function (t) { return par(run(t, { sz: 18 }), { depois: 120 }); }).join('');
      if (b.t === 'leg') return legenda;
      var q = quadro(b.id); return q ? tabelaDocx(q) : '';
    }).join('');
    var partes = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      'word/_rels/document.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'word/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style></w:styles>',
      'word/document.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + corpo + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="750" w:bottom="850" w:left="750" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>'
    };
    return zip(partes);
  };
  var TIPO_X = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', TIPO_W = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var todasFolhas = function () { return Object.keys(PAGS).map(function (p) { return { nome: PAGS[p], titulo: PAGS[p], quadros: QD.filter(function (q) { return q.pag === p; }) }; }); };
  P.folhasCompletas = todasFolhas;
  var docCompleto = function () { return { titulo: 'Sustainability report', blocos: [{ t: 'cap', txt: PAGS.env }, { t: 'leg' }, { t: 'q', id: 'natural' }, { t: 'q', id: 'clima' }, { t: 'cap', txt: PAGS.soc }, { t: 'leg' }, { t: 'q', id: 'social' }, { t: 'q', id: 'societal' }] }; };
  P.docCompleto = docCompleto;
  A.rqExcel = function () { descarregar('report-tables-' + S.ciclo.ano + '.xlsx', P.quadrosXlsx(todasFolhas()), TIPO_X); toast('Excel file ready.', 'ok'); };
  A.rqWord = function () { descarregar('report-tables-' + S.ciclo.ano + '.docx', P.documentoDocx(docCompleto()), TIPO_W); toast('Word file ready.', 'ok'); };
  A.docWord = function () { descarregar('report-' + S.ciclo.ano + '.docx', P.documentoDocx(S.doc), TIPO_W); toast('Word file ready.', 'ok'); };
  A.docExcel = function () {
    var qs = S.doc.blocos.filter(function (b) { return b.t === 'q'; }).map(function (b) { return quadro(b.id); });
    var folhas = []; for (var i = 0; i < qs.length; i += 2) folhas.push({ nome: qs.slice(i, i + 2).map(function (q) { return q.t; }).join(' + ').slice(0, 31), titulo: S.doc.titulo, quadros: qs.slice(i, i + 2) });
    descarregar('report-' + S.ciclo.ano + '.xlsx', P.quadrosXlsx(folhas), TIPO_X); toast('Excel file ready.', 'ok');
  };
})();
