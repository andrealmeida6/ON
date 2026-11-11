/* ============================================================================
   portal-master.js - pagina KPI master
   Indicadores com ID ESRS, descricao e informacao de reporte; lista de datapoints
   com a cobertura; glossario; exportacao com as colunas do modelo de datapoints.
   Os dados vem de portal-esrs.js. As ligacoes sao as de esrs-mapeamento.js.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext, D = window.PORTAL_ESRS;
  var Blocos = X.Blocos, A = X.A, C = X.C, U = X.U, e = X.e, chip = X.chip, opt = X.opt, campo = X.campo, tabela = X.tabela, toast = X.toast, R = X.R, u = X.u, vazio = X.vazio, rota = X.rota, cabCartao = X.cabCartao;
  var REL = { direto: ['Direct', 'ok'], parcial: ['Partial', 'warn'], especifico: ['Entity-specific', ''] };
  var dpPor = {}; D.dps.forEach(function (d) { dpPor[d.id] = d; });
  /* De cada datapoint para os indicadores que o alimentam */
  var porDp = {}; Object.keys(D.kpi).forEach(function (id) { D.kpi[id].dps.forEach(function (d) { (porDp[d] = porDp[d] || []).push(id); }); });
  var campoSim = function (id, lab, f, ch, v, ed) { return campo(id, lab, '<select id="' + id + '" class="ps-sel" data-c="' + ch + '" data-f="' + f + '"' + (ed ? '' : ' disabled') + '>' + opt('', 'Please select', v) + opt('sim', 'Yes', v) + opt('nao', 'No', v) + '</select>'); };
  var FREQ = ['Monthly', 'Quarterly', 'Half-yearly', 'Annually'];
  var FREQ_PT = { Mensal: 'Monthly', Trimestral: 'Quarterly', Semestral: 'Half-yearly', Anual: 'Annually' };
  var freqDe = function (c) { return FREQ_PT[c.periodicidade] || c.periodicidade; };
  var controlosPlataforma = function (c) {
    var t = 'Change threshold of ±' + P.limiarDe(c) + '% against the prior year; review and approval in the workflow; audit trail';
    return t + (c.evidencia_obrigatoria ? '; evidence required.' : '.');
  };
  var registo = function (id) { return S.kpim[id] || (S.kpim[id] = {}); };

  U.km = { sep: 'kpis', sel: '', q: '', rel: '', norma: '', dpNorma: '', dpCob: '', dpQ: '', dpLim: 60, gQ: '', gTema: '', gVaz: false };

  /* --- KPIs ------------------------------------------------------------------ */
  var abaKpis = function () {
    var f = U.km, q = f.q.toLowerCase(), adm = P.gereTudo(u());
    var lista = S.cat.filter(function (c) {
      var k = P.esrsDe(c.id);
      if (f.rel && k.rel !== f.rel) return false;
      if (f.norma && c.esrs !== f.norma) return false;
      return !q || (c.id + ' ' + c.nome + ' ' + k.dps.join(' ') + ' ' + k.desc).toLowerCase().indexOf(q) > -1;
    });
    var atual = lista.filter(function (c) { return c.id === f.sel; })[0] || lista[0];
    var normas = {}; S.cat.forEach(function (c) { if (c.esrs) normas[c.esrs] = 1; });
    var filtro = '<div class="ps-form">' + campo('km-q', 'Search', '<input id="km-q" class="ps-in" data-c="kmF" data-id="q" value="' + e(f.q) + '">') + campo('km-rel', 'ESRS link', '<select id="km-rel" class="ps-sel" data-c="kmF" data-id="rel">' + opt('', 'All', f.rel) + Object.keys(REL).map(function (k) { return opt(k, REL[k][0], f.rel); }).join('') + '</select>') + campo('km-nor', 'Standard', '<select id="km-nor" class="ps-sel" data-c="kmF" data-id="norma">' + opt('', 'All', f.norma) + Object.keys(normas).sort().map(function (n) { return opt(n, n, f.norma); }).join('') + '</select>') + '</div>';
    var itens = lista.map(function (c) {
      var k = P.esrsDe(c.id);
      return '<button type="button" class="ps-ev-it ' + (atual && c.id === atual.id ? 'on' : '') + '" data-a="kmVer" data-v="' + e(c.id) + '"><span><b>' + e(c.id) + ', ' + e(c.nome) + '</b><small>' + e(k.dps[0] || 'No ESRS datapoint') + (k.dps.length > 1 ? ' +' + (k.dps.length - 1) : '') + '</small></span>' + chip(REL[k.rel][0], REL[k.rel][1]) + '</button>';
    }).join('');
    var det = '';
    if (atual) {
      var c = atual, k = P.esrsDe(c.id), r = registo(c.id), d = P.user((S.atrib[c.id] || {}).submete), m = P.msDoIndicador(c.id), ed = adm;
      var dps = k.dps.map(function (id) {
        var x = dpPor[id];
        return '<div class="km-dp"><div class="ps-sp-b"><span class="ps-mono km-id">' + e(x.id) + '</span><span class="ps-small ps-mut">' + e(x.dr) + ', §' + e(x.par) + (x.ar ? ', ' + e(x.ar) : '') + ', ' + e(x.tipo) + '</span></div><b>' + e(x.nome) + '</b><p class="ps-small">' + e(x.texto) + '</p></div>';
      }).join('');
      det = '<div class="ps-card">' + cabCartao(c.nome, 'tarefa', chip(REL[k.rel][0], REL[k.rel][1])) + '<div class="ps-card-body"><p>' + e(k.desc) + '</p>' +
        (k.nota ? '<div class="ps-aviso warn ps-mt">' + e(k.nota) + '</div>' : '') +
        '<h3 class="ps-grupo-t">ESRS</h3>' + (dps || '<p class="ps-small ps-mut">No ESRS datapoint for this indicator. If it is disclosed, it follows ESRS 2 GDR-M (entity-specific metric).</p>') +
        '<h3 class="ps-grupo-t">Reporting information</h3><dl class="ps-det km-det"><dt>Platform ID</dt><dd class="ps-mono">' + e(c.id) + '</dd><dt>Company topic</dt><dd>' + e(c.tema) + '</dd><dt>Company sub-topic</dt><dd>' + e(k.sub) + '</dd><dt>Disclosure type</dt><dd>Quantitative</dd><dt>Unit</dt><dd>' + e(c.unidade_medida) + '</dd><dt>Calculation</dt><dd>' + e(c.formula || 'Reported value') + '</dd><dt>Reporting frequency</dt><dd>' + e(freqDe(c)) + '</dd><dt>Aggregation</dt><dd>' + e(k.agreg) + '</dd><dt>KPI scope</dt><dd>' + e(c.perimetro) + '</dd><dt>Company</dt><dd>' + e(m ? m.empresa : '-') + '</dd><dt>Department</dt><dd>' + e(c.unidade_negocio) + '</dd><dt>Responsible person</dt><dd>' + e(d ? d.nome : '-') + '</dd><dt>Report use</dt><dd>' + e(c.utilizado_por.join(', ')) + '</dd><dt>GRI</dt><dd>' + e(c.gri) + '</dd><dt>Platform controls</dt><dd>' + e(controlosPlataforma(c)) + '</dd></dl>' +
        '<h3 class="ps-grupo-t">To complete</h3><div class="ps-form">' +
        campo('km-rec', 'Data collection frequency', '<select id="km-rec" class="ps-sel" data-c="kmCampo" data-f="recolha"' + (ed ? '' : ' disabled') + '>' + opt('', 'Same as reporting', r.recolha || '') + FREQ.map(function (x) { return opt(x, x, r.recolha || ''); }).join('') + '</select>') +
        campoSim('km-dis', 'Data available', 'disponivel', 'kmCampo', r.disponivel || '', ed) +
        campo('km-fon', 'Source or system', '<input id="km-fon" class="ps-in" data-c="kmCampo" data-f="fonte" value="' + e(r.fonte || '') + '"' + (ed ? '' : ' readonly') + '>') +
        campoSim('km-con', 'Other controls in place', 'controlos', 'kmCampo', r.controlos || '', ed) +
        campo('km-ctx', 'Description of those controls', '<input id="km-ctx" class="ps-in" data-c="kmCampo" data-f="controlo_txt" value="' + e(r.controlo_txt || '') + '"' + (ed ? '' : ' readonly') + '>') +
        campoSim('km-div', 'Disclose this KPI', 'divulga', 'kmCampo', r.divulga || '', ed) +
        (r.divulga === 'nao' ? campo('km-mot', 'Why not', '<input id="km-mot" class="ps-in" data-c="kmCampo" data-f="motivo" value="' + e(r.motivo || '') + '"' + (ed ? '' : ' readonly') + '>') : '') +
        '</div>' + (m ? '<p class="ps-mt"><a href="' + rota('Milestone/' + m.id) + '">Open the task</a></p>' : '') + '</div></div>';
    }
    return '<div class="ps-card ps-card-body ps-sp-b-f">' + filtro + '</div><div class="km-g ps-mt"><div class="ps-card km-lista"><div class="ps-card-head"><h2>' + lista.length + ' KPI' + (lista.length === 1 ? '' : 's') + '</h2></div><div class="km-itens">' + (itens || vazio('No KPI matches these filters.')) + '</div></div><div>' + (det || vazio('Pick a KPI.')) + '</div></div>';
  };

  /* --- Datapoints ------------------------------------------------------------ */
  var cobertura = function (d) { var l = porDp[d.id]; if (!l) return ''; return l.some(function (i) { return D.kpi[i].rel === 'direto'; }) ? 'direto' : 'parcial'; };
  var abaDps = function () {
    var f = U.km, q = f.dpQ.toLowerCase(), adm = P.gereTudo(u());
    var tot = { direto: 0, parcial: 0, '': 0, quant: 0 };
    D.dps.forEach(function (d) { var c = cobertura(d); tot[c]++; if (!c && d.div === 'Quantitative') tot.quant++; });
    var normas = []; D.dps.forEach(function (d) { if (normas.indexOf(d.norma) < 0) normas.push(d.norma); });
    var lista = D.dps.filter(function (d) {
      var c = cobertura(d);
      if (f.dpNorma && d.norma !== f.dpNorma) return false;
      if (f.dpCob === 'sem' ? c : f.dpCob && c !== f.dpCob) return false;
      return !q || (d.id + ' ' + d.nome + ' ' + d.texto).toLowerCase().indexOf(q) > -1;
    });
    var linhas = lista.slice(0, f.dpLim).map(function (d) {
      var c = cobertura(d), l = porDp[d.id] || [], dc = S.dpdec[d.id] || {};
      return ['<span class="ps-mono km-id">' + e(d.id) + '</span>', '<details class="km-det-d"><summary>' + e(d.nome) + '</summary><p class="ps-small">' + e(d.texto) + '</p></details>', e(d.dr) + ' §' + e(d.par), e(d.tipo),
        c ? chip(REL[c][0], REL[c][1]) + ' <span class="ps-small">' + l.map(function (i) { return '<button type="button" class="ps-btn liga" data-a="kmIr" data-v="' + e(i) + '">' + e(i) + '</button>'; }).join(', ') + '</span>' : '<span class="ps-mut">Not covered</span>',
        '<select id="dp-' + e(d.id) + '" class="ps-sel km-sel" aria-label="Disclose ' + e(d.id) + '" data-c="dpDec" data-id="' + e(d.id) + '"' + (adm ? '' : ' disabled') + '>' + opt('', 'Please select', dc.divulga || '') + opt('sim', 'Yes', dc.divulga || '') + opt('nao', 'No', dc.divulga || '') + '</select>' + (dc.divulga === 'nao' ? '<input id="dpm-' + e(d.id) + '" class="ps-in km-sel ps-mt" aria-label="Why not, ' + e(d.id) + '" placeholder="Why not" data-c="dpMot" data-id="' + e(d.id) + '" value="' + e(dc.motivo || '') + '"' + (adm ? '' : ' readonly') + '>' : '')];
    });
    return '<div class="ps-tiles km-tiles"><div class="ps-kpi"><span>Datapoints</span><b>' + D.dps.length + '</b></div><div class="ps-kpi"><span>Direct KPI</span><b>' + tot.direto + '</b></div><div class="ps-kpi"><span>Partial KPI</span><b>' + tot.parcial + '</b></div><div class="ps-kpi"><span>Not covered</span><b>' + tot[''] + '</b></div><div class="ps-kpi"><span>Not covered, quantitative</span><b>' + tot.quant + '</b></div></div>' +
      '<div class="ps-card ps-mt"><div class="ps-card-body"><div class="ps-form">' + campo('dp-q', 'Search', '<input id="dp-q" class="ps-in" data-c="kmF" data-id="dpQ" value="' + e(f.dpQ) + '">') + campo('dp-nor', 'Standard', '<select id="dp-nor" class="ps-sel" data-c="kmF" data-id="dpNorma">' + opt('', 'All', f.dpNorma) + normas.map(function (n) { return opt(n, n, f.dpNorma); }).join('') + '</select>') + campo('dp-cob', 'Coverage', '<select id="dp-cob" class="ps-sel" data-c="kmF" data-id="dpCob">' + opt('', 'All', f.dpCob) + opt('direto', 'Direct KPI', f.dpCob) + opt('parcial', 'Partial KPI', f.dpCob) + opt('sem', 'Not covered', f.dpCob) + '</select>') + '</div><div class="ps-mt">' +
      tabela([{ t: 'IG3 ID' }, { t: 'Datapoint' }, { t: 'Requirement' }, { t: 'Data type' }, { t: 'Coverage' }, { t: 'Disclose' }], linhas, 'No datapoint matches these filters.') + '</div>' +
      (lista.length > f.dpLim ? '<div class="ps-sp ps-mt"><button type="button" class="ps-btn" data-a="dpMais">Show more (' + (lista.length - f.dpLim) + ' left)</button></div>' : '') + '</div></div>';
  };

  /* --- Glossario ------------------------------------------------------------- */
  var defDe = function (g) { return g.def || (S.gloss[g.n] || ''); };
  var abaGloss = function () {
    var f = U.km, q = f.gQ.toLowerCase(), adm = P.gereTudo(u());
    var abertos = D.glossario.filter(function (g) { return !g.def && !S.gloss[g.n]; }).length;
    var temas = []; D.glossario.forEach(function (g) { if (temas.indexOf(g.tema) < 0) temas.push(g.tema); });
    var lista = D.glossario.filter(function (g) {
      if (f.gTema && g.tema !== f.gTema) return false;
      if (f.gVaz && (g.def || S.gloss[g.n])) return false;
      return !q || (g.termo + ' ' + defDe(g)).toLowerCase().indexOf(q) > -1;
    });
    return '<div class="ps-card"><div class="ps-card-body"><div class="ps-form">' + campo('gl-q', 'Search', '<input id="gl-q" class="ps-in" data-c="kmF" data-id="gQ" value="' + e(f.gQ) + '">') + campo('gl-t', 'Topic', '<select id="gl-t" class="ps-sel" data-c="kmF" data-id="gTema">' + opt('', 'All', f.gTema) + temas.map(function (t) { return opt(t, t, f.gTema); }).join('') + '</select>') + '</div><label class="ps-chk ps-mt"><input id="gl-v" type="checkbox" data-c="glVaz"' + (f.gVaz ? ' checked' : '') + '> Only terms the company still has to define (' + abertos + ')</label><div class="ps-mt">' +
      tabela([{ t: 'Term' }, { t: 'Definition' }, { t: 'Topic' }], lista.map(function (g) {
        var def = g.def ? '<span class="km-def">' + e(g.def) + '</span>' : '<textarea id="gl-' + g.n + '" class="ps-ta" aria-label="Definition of ' + e(g.termo) + '" data-c="glDef" data-id="' + g.n + '"' + (adm ? '' : ' readonly') + '>' + e(S.gloss[g.n] || '') + '</textarea>' + (g.ajuda ? '<details class="km-det-d ps-mt"><summary>Help with this definition</summary><p class="ps-small km-def">' + e(g.ajuda) + '</p></details>' : '');
        return ['<b>' + e(g.termo) + '</b>', def, e(g.tema)];
      }), 'No term matches these filters.') + '</div></div></div>';
  };

  Blocos['kpi-master'] = function () {
    var s = U.km.sep, abas = [['kpis', 'KPIs', S.cat.length], ['dps', 'ESRS datapoints', D.dps.length], ['gl', 'Glossary', D.glossario.length]];
    return '<div class="ps-filtros ps-sp"><div class="ps-seg" role="group" aria-label="KPI master views">' + abas.map(function (a) { return '<button type="button" class="' + (s === a[0] ? 'on' : '') + '" data-a="kmSep" data-v="' + a[0] + '">' + e(a[1]) + ' <span class="n">' + a[2] + '</span></button>'; }).join('') + '</div><button type="button" class="ps-btn" data-a="kmExportar">Export (Excel)</button></div>' +
      (s === 'kpis' ? abaKpis() : s === 'dps' ? abaDps() : abaGloss());
  };

  A.kmSep = function (d) { U.km.sep = d.v; R(); };
  A.kmVer = function (d) { U.km.sel = d.v; R(); };
  A.kmIr = function (d) { U.km.sep = 'kpis'; U.km.sel = d.v; U.km.q = ''; U.km.rel = ''; U.km.norma = ''; R(); };
  A.dpMais = function () { U.km.dpLim += 100; R(); };
  C.kmF = function (el) { U.km[el.dataset.id] = el.value; if (el.dataset.id.indexOf('dp') === 0) U.km.dpLim = 60; };
  C.glVaz = function (el) { U.km.gVaz = el.checked; };
  var ROT = { recolha: 'collection frequency', disponivel: 'availability', fonte: 'source', controlos: 'controls', controlo_txt: 'control description', divulga: 'disclosure decision', motivo: 'reason' };
  C.kmCampo = function (el) {
    var id = (document.querySelector('.ps-ev-it.on') || { dataset: {} }).dataset.v;
    if (!id) return;
    var r = registo(id), f = el.dataset.f, v = String(el.value).trim();
    if ((r[f] || '') === v) return;
    r[f] = v; P.eventoGlobal('KPI master: ' + id + ', ' + ROT[f] + ' set to "' + v + '".', u().nome); P.guardar();
  };
  C.dpDec = function (el) { var r = S.dpdec[el.dataset.id] || (S.dpdec[el.dataset.id] = {}); r.divulga = el.value; if (el.value !== 'nao') delete r.motivo; P.eventoGlobal('Datapoint ' + el.dataset.id + ': disclosure set to "' + (el.value || 'not decided') + '".', u().nome); P.guardar(); };
  C.dpMot = function (el) { var r = S.dpdec[el.dataset.id] || (S.dpdec[el.dataset.id] = {}); r.motivo = el.value; P.guardar(); };
  C.glDef = function (el) { var g = D.glossario.filter(function (x) { return String(x.n) === el.dataset.id; })[0], v = el.value.trim(); if ((S.gloss[g.n] || '') === v) return; if (v) S.gloss[g.n] = v; else delete S.gloss[g.n]; P.eventoGlobal('Glossary: definition of "' + g.termo + '" changed.', u().nome); P.guardar(); };

  /* --- Exportacao com as colunas do modelo ------------------------------------ */
  var simNao = function (v) { return v === 'sim' ? 'Yes' : v === 'nao' ? 'No' : ''; };
  var linhaModelo = function (d, ids, n) {
    var cs = ids.map(function (i) { return P.cat(i); }).filter(Boolean), juntar = function (fn) { var o = []; cs.forEach(function (c) { var x = fn(c, registo(c.id), P.esrsDe(c.id)); if (x && o.indexOf(x) < 0) o.push(x); }); return o.join('; '); }, dc = d ? S.dpdec[d.id] || {} : {};
    return {
      'ID': n, 'IG3 ID (as of 28/08/2026)': d ? d.id : '', 'ESRS Topic (numerical)': d ? 'ESRS ' + d.norma : '', 'ESRS Topic (descriptive)': d ? d.tema : '',
      'Platform KPI': cs.map(function (c) { return c.id; }).join('; '), 'Link': juntar(function (c, r, k) { return REL[k.rel][0]; }),
      'Company Topic': juntar(function (c) { return c.tema; }), 'Company Sub-Topic': juntar(function (c, r, k) { return k.sub; }), 'ESRS DR': d ? d.dr : '', 'ESRS Paragraph': d ? d.par : '', 'Related ESRS AR': d ? d.ar : '',
      'KPI Name': d ? d.nome : juntar(function (c) { return c.nome; }), 'KPI Description': d ? d.texto : juntar(function (c, r, k) { return k.desc; }), 'Platform KPI Description': juntar(function (c, r, k) { return c.nome + ': ' + k.desc; }),
      'Disclosure Type [Quantitative / Qualitative]': d ? d.div : 'Quantitative', 'Data Type': d ? d.tipo : '', 'Unit': juntar(function (c) { return c.unidade_medida; }), 'Calculation': juntar(function (c) { return c.formula; }),
      'Reporting Frequency': juntar(freqDe), 'Data collection frequency': juntar(function (c, r) { return r.recolha || freqDe(c); }), 'Data Aggregation Type': juntar(function (c, r, k) { return k.agreg; }), 'KPI Scope': juntar(function (c) { return c.perimetro; }),
      'KPI Responsibility - Responsible Department': juntar(function (c) { return c.unidade_negocio; }), 'KPI Responsibility - Responsible Person': juntar(function (c) { var x = P.user((S.atrib[c.id] || {}).submete); return x ? x.nome : ''; }),
      'KPI Availability - Available [yes/no]': juntar(function (c, r) { return simNao(r.disponivel); }), 'Source / System': juntar(function (c, r) { return r.fonte; }),
      'Controls - Controls already implemented [yes/no]': cs.length ? 'Yes' : '', 'Controls - Control Description': juntar(function (c, r) { return controlosPlataforma(c) + (r.controlo_txt ? ' ' + r.controlo_txt : ''); }),
      'Decision on the disclosure of KPIs - Disclosure of KPI [yes/no]': simNao(dc.divulga) || juntar(function (c, r) { return simNao(r.divulga); }), 'Decision on the disclosure of KPIs - If no, please explain why.': dc.motivo || juntar(function (c, r) { return r.motivo; }),
      'Report Use': juntar(function (c) { return c.utilizado_por.join(', '); })
    };
  };
  P.linhasModelo = function () {
    var r = D.dps.map(function (d, i) { return linhaModelo(d, porDp[d.id] || [], i + 1); }), n = r.length;
    S.cat.forEach(function (c) { if (P.esrsDe(c.id).rel === 'especifico') r.push(linhaModelo(null, [c.id], ++n)); });
    return r;
  };
  A.kmExportar = function () {
    P.escreverFolhas('kpi-master-' + S.ciclo.ano + '.xlsx', { 'Datapoint Mapping': P.linhasModelo(), 'Definition of terms': D.glossario.map(function (g) { return { '#': g.n, Term: g.termo, Definition: defDe(g), 'Relevant Topic': g.tema, 'Assistance with definition': g.ajuda }; }) });
  };
})();
