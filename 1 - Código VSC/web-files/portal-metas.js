/* ============================================================================
   portal-metas.js - Metas ESG (Targets)

   Cada indicador pode ter varias metas, uma por prazo (por exemplo 2026, 2030,
   2050), cada uma com a sua classificacao: Financing (financiamentos ligados a
   sustentabilidade), Rating, Other commitment ou Internal target.
   Uma meta: { id, indicador_id, ano_meta, valor_meta, sentido ('subir'|'descer'),
   classificacao, empresa ('' = grupo consolidado), ano_base, valor_base, notas }.
   O estado compara o valor do ano do ciclo com a trajetoria linear entre o ano
   base e o ano da meta: Achieved, On track, At risk, Off track, Missed ou No data.
   A pagina Targets (Monitoring) mostra todas as metas e a performance vs a meta.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal;
  if (!P || !P.ext) return;
  var S = P.S, X = P.ext, e = X.e, chip = X.chip, R = X.R, u = X.u, opt = X.opt, campo = X.campo, U = X.U, toast = X.toast, cabCartao = X.cabCartao;

  P.CLASSES_META = [['financiamento', 'Financing'], ['rating', 'Rating'], ['compromisso', 'Other commitment'], ['interna', 'Internal target']];
  P.classeMetaTxt = function (k) { var x = P.CLASSES_META.filter(function (c) { return c[0] === k; })[0]; return x ? x[1] : 'Internal target'; };
  P.metasDe = function (id) { return (S.metas || []).filter(function (m) { return m.indicador_id === id; }).sort(function (a, b) { return a.ano_meta - b.ano_meta; }); };

  /* Valor de um ano; sem o anual, os trimestres reportados ate agora pela regra do KPI (YTD) */
  /* Valores historicos do indicador (grupo consolidado), por ano: c.historico = { '2022': 3450000, ... } */
  P.historicoDe = function (id) { var c = P.cat(id); return (c && c.historico) || {}; };
  var histAno = function (id, ano, emp) { if (emp || ano >= S.ciclo.ano) return null; var h = P.historicoDe(id)[String(ano)]; return h === null || h === undefined || h === '' || isNaN(Number(h)) ? null : Number(h); };
  var valorAno = function (id, ano, emp) {
    var hv = histAno(id, ano, emp);
    if (hv !== null) return { v: hv, ytd: false, hist: true };
    var va = P.valorVista(id, ano, emp).valor;
    if (va !== null && va !== undefined) return { v: va, ytd: false };
    var qs = [1, 2, 3, 4].map(function (t) { return P.valorVista(id, ano + '-T' + t, emp).valor; }).filter(function (x) { return x !== null && x !== undefined; });
    if (!qs.length) return { v: null, ytd: false };
    var ag = P.agregacao(id), v = ag === 'ultimo' ? qs[qs.length - 1] : ag === 'media' ? qs.reduce(function (s, x) { return s + x; }, 0) / qs.length : qs.reduce(function (s, x) { return s + x; }, 0);
    return { v: v, ytd: qs.length < 4 };
  };
  P.valorAnoMeta = valorAno;

  /* Estado de uma meta: valor do ano do ciclo vs a trajetoria esperada desde o ano base */
  P.estadoMeta = function (mt, empVista) {
    var ano = S.ciclo.ano, emp = empVista !== undefined ? empVista : (mt.empresa || '');
    var cur = valorAno(mt.indicador_id, ano, emp), v = cur.v;
    var anoBase = Number(mt.ano_base) || ano - 1;
    var b = mt.valor_base !== null && mt.valor_base !== undefined && mt.valor_base !== '' ? Number(mt.valor_base) : (function () {
      var x = valorAno(mt.indicador_id, anoBase, emp).v;
      if ((x === null || x === undefined) && anoBase === ano - 1 && P.anteriorVista) x = P.anteriorVista(mt.indicador_id, ano, emp);
      return x === null || x === undefined ? null : x;
    })();
    var T = Number(mt.valor_meta), desc = mt.sentido === 'descer';
    var base = { v: v, ytd: cur.ytd, b: b, anoBase: anoBase, prog: null, esperado: null };
    if (v === null) return Object.assign(base, { cod: 'nd', txt: 'No data yet', cls: '' });
    var atingiu = desc ? v <= T : v >= T;
    var prog = b === null || b === T ? (atingiu ? 1 : 0) : desc ? (b - v) / (b - T) : (v - b) / (T - b);
    var esp = Number(mt.ano_meta) <= anoBase ? 1 : Math.max(0, Math.min(1, (ano - anoBase) / (Number(mt.ano_meta) - anoBase)));
    base.prog = prog; base.esperado = esp;
    if (atingiu) return Object.assign(base, { cod: 'ok', txt: 'Achieved', cls: 'ok', prog: 1 });
    if (Number(mt.ano_meta) < ano) return Object.assign(base, { cod: 'falhou', txt: 'Missed', cls: 'err' });
    if (prog >= esp - 0.05) return Object.assign(base, { cod: 'curso', txt: 'On track', cls: 'info' });
    if (prog >= esp - 0.2) return Object.assign(base, { cod: 'risco', txt: 'At risk', cls: 'warn' });
    return Object.assign(base, { cod: 'fora', txt: 'Off track', cls: 'err' });
  };

  /* Gravar e apagar (equipa de sustentabilidade e administrador) */
  P.validarMeta = function (mt) {
    var c = P.cat(mt.indicador_id), erros = [];
    if (!c) erros.push('Choose the indicator.');
    var a = Number(mt.ano_meta);
    if (!(a >= 2000 && a <= 2100 && Math.round(a) === a)) erros.push('Target year must be a year, for example 2030.');
    if (mt.valor_meta === '' || mt.valor_meta === null || mt.valor_meta === undefined || isNaN(Number(mt.valor_meta))) erros.push('Target value must be a number.');
    if (mt.ano_base !== '' && mt.ano_base !== null && mt.ano_base !== undefined && !(Number(mt.ano_base) >= 2000 && Number(mt.ano_base) < a)) erros.push('Baseline year must be before the target year.');
    if (mt.valor_base !== '' && mt.valor_base !== null && mt.valor_base !== undefined && isNaN(Number(mt.valor_base))) erros.push('Baseline value must be a number.');
    if (P.CLASSES_META.every(function (x) { return x[0] !== mt.classificacao; })) erros.push('Choose the classification.');
    if (mt.empresa && !S.ent.some(function (x) { return x.nome === mt.empresa; })) erros.push('Company "' + mt.empresa + '" does not exist.');
    return erros;
  };
  var limpar = function (mt) {
    var c = P.cat(mt.indicador_id), num = function (v) { return v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')); };
    return { id: mt.id || 'mt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), indicador_id: mt.indicador_id, nome: mt.nome || (c ? c.nome : ''), ano_meta: Number(mt.ano_meta), valor_meta: num(mt.valor_meta),
      sentido: mt.sentido === 'descer' ? 'descer' : 'subir', unidade: c ? c.unidade_medida : (mt.unidade || ''), classificacao: mt.classificacao || 'interna', empresa: mt.empresa || '',
      ano_base: mt.ano_base === '' || mt.ano_base === null || mt.ano_base === undefined ? null : Number(mt.ano_base), valor_base: num(mt.valor_base), notas: String(mt.notas || '').trim() };
  };
  P.gravarMeta = function (mt, usr) {
    if (!P.gereTudo(usr)) return { erro: 'No permission.' };
    var bruto = Object.assign({}, mt, { valor_meta: mt.valor_meta === '' ? '' : String(mt.valor_meta).replace(',', '.'), valor_base: mt.valor_base === '' || mt.valor_base === null || mt.valor_base === undefined ? '' : String(mt.valor_base).replace(',', '.') });
    var erros = P.validarMeta(bruto);
    if (erros.length) return { erro: erros.join(' ') };
    var x = limpar(bruto), novo = !(S.metas || []).some(function (m) { return m.id === x.id; });
    S.metas = (S.metas || []).filter(function (m) { return m.id !== x.id; }).concat([x]);
    if (P.eventoGlobal) P.eventoGlobal('Target ' + (novo ? 'created' : 'changed') + ' for ' + x.indicador_id + ': ' + P.fmtNum(x.valor_meta) + ' ' + x.unidade + ' by ' + x.ano_meta + ' (' + P.classeMetaTxt(x.classificacao) + ').', usr.nome, novo ? 'Creation' : 'Change');
    P.guardar();
    return { ok: true, meta: x };
  };
  /* Substitui as metas de um indicador (editor do indicador, ao gravar) */
  P.gravarMetasInd = function (id, lista, usr) {
    if (!P.gereTudo(usr)) return { erro: 'No permission.' };
    var erros = [];
    lista.forEach(function (mt, i) { P.validarMeta(Object.assign({}, mt, { indicador_id: id, valor_meta: String(mt.valor_meta === undefined ? '' : mt.valor_meta).replace(',', '.'), valor_base: mt.valor_base === null || mt.valor_base === undefined ? '' : String(mt.valor_base).replace(',', '.') })).forEach(function (t) { erros.push('Target ' + (i + 1) + ': ' + t); }); });
    if (erros.length) return { erros: erros };
    var antes = JSON.stringify(P.metasDe(id));
    S.metas = (S.metas || []).filter(function (m) { return m.indicador_id !== id; }).concat(lista.map(function (mt) { return limpar(Object.assign({}, mt, { indicador_id: id, valor_meta: String(mt.valor_meta).replace(',', '.'), valor_base: mt.valor_base === null || mt.valor_base === undefined ? '' : String(mt.valor_base).replace(',', '.') })); }));
    if (antes !== JSON.stringify(P.metasDe(id)) && P.eventoGlobal) P.eventoGlobal('Targets of ' + id + ' updated: ' + lista.length + ' target(s).', usr.nome, 'Change');
    return { ok: true };
  };
  P.apagarMeta = function (id, usr) {
    if (!P.gereTudo(usr)) return { erro: 'No permission.' };
    var mt = (S.metas || []).filter(function (m) { return m.id === id; })[0];
    if (!mt) return { erro: 'This target no longer exists.' };
    S.metas = S.metas.filter(function (m) { return m.id !== id; });
    if (P.eventoGlobal) P.eventoGlobal('Target removed for ' + mt.indicador_id + ' (' + mt.ano_meta + ').', usr.nome, 'Change');
    P.guardar();
    return { ok: true };
  };

  /* --- Barra de progresso: o preenchido e o progresso, o traco e onde devia estar hoje --- */
  P.barraMeta = function (st) {
    if (st.prog === null) return '<span class="mt-bar vazio" aria-hidden="true"></span>';
    var p = Math.max(0, Math.min(1, st.prog)), esp = st.esperado === null ? null : Math.max(0, Math.min(1, st.esperado));
    return '<span class="mt-bar ' + st.cod + '" role="img" aria-label="' + e(Math.round(p * 100) + '% of the way to the target' + (esp !== null ? ', ' + Math.round(esp * 100) + '% expected by now' : '')) + '"><i style="width:' + (p * 100).toFixed(1) + '%"></i>' + (esp !== null && esp < 1 && st.cod !== 'ok' ? '<b style="left:' + (esp * 100).toFixed(1) + '%"></b>' : '') + '</span>';
  };
  /* --- Grafico da evolucao: uma barra por ano desde o ano base ate ao ano do ciclo; o ano base noutra cor,
     o ano corrente em YTD tracejado quando ainda nao fechou, e uma linha horizontal por meta --- */
  P.serieMeta = function (id, emp) {
    var ano = S.ciclo.ano, mts = P.metasDe(id), bases = mts.map(function (m) { return Number(m.ano_base) || ano - 1; });
    var hist = Object.keys(P.historicoDe(id)).map(Number).filter(function (y) { return y < ano; });
    var ini = Math.min.apply(null, (bases.length ? bases : [ano - 1]).concat(bases.length ? [] : hist));
    var l = [];
    for (var y = ini; y <= ano; y++) {
      var r = valorAno(id, y, emp || '');
      if ((r.v === null || r.v === undefined) && y === ano - 1 && P.anteriorVista) { var a = P.anteriorVista(id, ano, emp || ''); if (a !== null && a !== undefined) r = { v: a, ytd: false }; }
      l.push({ ano: y, v: r.v === undefined ? null : r.v, ytd: !!r.ytd, base: y === ini });
    }
    return l;
  };
  P.graficoMeta = function (id, emp, opc) {
    var c = P.cat(id); if (!c) return '';
    opc = opc || {};
    var serie = P.serieMeta(id, emp), mts = P.metasDe(id).filter(function (m) { return !m.empresa || !emp || m.empresa === emp; }).slice(0, 3);
    if (!serie.some(function (x) { return x.v !== null; }) && !mts.length) return '';
    var W = 640, H = opc.alto || 230, L = 16, Rr = 150, T = 18, B = 34;
    var vals = serie.map(function (x) { return x.v; }).filter(function (v) { return v !== null; }).concat(mts.map(function (m) { return Number(m.valor_meta); }));
    var mx = Math.max.apply(null, vals.concat([0])), mn = Math.min.apply(null, vals.concat([0]));
    if (mx === mn) mx = mn + 1;
    var top = mx + (mx - mn) * 0.12, Y = function (v) { return T + (top - v) / (top - mn) * (H - T - B); }, y0 = Y(Math.max(0, mn));
    var n = serie.length, slot = (W - L - Rr) / n, bw = Math.min(64, slot * 0.6);
    var casas = c.casas_decimais, f = function (v) { return P.fmtNum(v, casas); }, un = c.unidade_medida || '';
    var barras = serie.map(function (x, i) {
      var cx = L + slot * i + slot / 2, cls = x.base ? 'g-base' : x.ytd ? 'g-ytd' : 'g-val';
      var rot = '<text class="g-ano" x="' + cx.toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + x.ano + (x.ytd ? ' YTD' : '') + '</text>';
      if (x.v === null) return '<g><rect class="g-vazio" x="' + (cx - bw / 2).toFixed(1) + '" y="' + (y0 - 2) + '" width="' + bw.toFixed(1) + '" height="2"/><text class="g-v g-nd" x="' + cx.toFixed(1) + '" y="' + (y0 - 8).toFixed(1) + '" text-anchor="middle">no data</text>' + rot + '</g>';
      var yv = Y(x.v), yt = Math.min(yv, y0), h = Math.max(1.5, Math.abs(y0 - yv));
      return '<g><title>' + e(x.ano + (x.base ? ' (baseline)' : '') + (x.ytd ? ' (year to date)' : '') + ': ' + f(x.v) + ' ' + un) + '</title><rect class="' + cls + '" x="' + (cx - bw / 2).toFixed(1) + '" y="' + yt.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4"/>' +
        '<text class="g-v" x="' + cx.toFixed(1) + '" y="' + (yt - 6).toFixed(1) + '" text-anchor="middle">' + e(f(x.v)) + '</text>' + rot + '</g>';
    }).join('');
    var linhas = mts.map(function (m, i) {
      var yy = Y(Number(m.valor_meta)), ly = Math.max(T + 10, Math.min(H - B - 4, yy - 6 - i * 0));
      return '<g class="g-meta"><title>' + e('Target ' + m.ano_meta + ' (' + P.classeMetaTxt(m.classificacao) + '): ' + (m.sentido === 'descer' ? '≤ ' : '≥ ') + f(Number(m.valor_meta)) + ' ' + un) + '</title><line x1="' + L + '" x2="' + (W - Rr + 8) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>' +
        '<text x="' + (W - Rr + 14) + '" y="' + (ly + 4).toFixed(1) + '">' + e('Target ' + m.ano_meta) + '</text><text class="g-mv" x="' + (W - Rr + 14) + '" y="' + (ly + 19).toFixed(1) + '">' + e((m.sentido === 'descer' ? '≤ ' : '≥ ') + f(Number(m.valor_meta))) + '</text></g>';
    }).join('');
    return '<figure class="g-fig"><svg class="g-meta-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + e(c.nome + ': values by year from the baseline, with the targets') + '">' +
      '<line class="g-eixo" x1="' + L + '" x2="' + (W - Rr + 8) + '" y1="' + y0.toFixed(1) + '" y2="' + y0.toFixed(1) + '"/>' + barras + linhas + '</svg>' +
      '<figcaption class="g-leg"><span><i class="g-base"></i>Baseline</span><span><i class="g-val"></i>Reported</span><span><i class="g-ytd"></i>Year to date</span>' + (mts.length ? '<span><i class="g-lmeta"></i>Target</span>' : '') + '<span class="g-un">' + e(un) + (emp ? ', ' + e(emp) : ', group') + '</span></figcaption></figure>';
  };
  var fmtV = function (id, v) { var c = P.cat(id); return v === null || v === undefined ? '-' : P.fmtNum(v, c ? c.casas_decimais : 2) + (c && c.unidade_medida ? ' ' + c.unidade_medida : ''); };
  P.fmtValorMeta = fmtV;

  /* --- Pagina Targets ------------------------------------------------------------------- */
  U.metas = { emp: '', classe: '', est: '', tema: '', q: '' };
  var ESTADOS = [['ok', 'Achieved'], ['curso', 'On track'], ['risco', 'At risk'], ['fora', 'Off track'], ['falhou', 'Missed'], ['nd', 'No data yet']];
  var ICO_CLASSE = { financiamento: '€', rating: '★', compromisso: '✓', interna: '◎' };
  X.Blocos['metas'] = function () {
    var f = U.metas, usr = u(), gere = P.gereTudo(usr), ano = S.ciclo.ano;
    var empV = function (mt) { return f.emp || mt.empresa || ''; };
    var todas = (S.metas || []).filter(function (mt) { return P.cat(mt.indicador_id); }).map(function (mt) { return { mt: mt, c: P.cat(mt.indicador_id), st: P.estadoMeta(mt, empV(mt)) }; });
    var filtradas = todas.filter(function (x) {
      if (f.classe && x.mt.classificacao !== f.classe) return false;
      if (f.est && x.st.cod !== f.est) return false;
      if (f.tema && (x.c.tema || 'Other') !== f.tema) return false;
      if (f.q && (x.c.id + ' ' + x.c.nome + ' ' + (x.mt.notas || '')).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      return true;
    });
    var conta = function (cod, l) { return (l || todas).filter(function (x) { return x.st.cod === cod; }).length; };
    var temas = []; todas.forEach(function (x) { var t = x.c.tema || 'Other'; if (temas.indexOf(t) < 0) temas.push(t); });
    var kpi = function (t, n, s, cls, est) { return '<button type="button" class="mt-k ' + (cls || '') + (f.est === est ? ' on' : '') + '" data-a="mtEst" data-v="' + (est || '') + '"><span>' + e(t) + '</span><b>' + n + '</b><small>' + e(s) + '</small></button>'; };
    var topo = '<div class="mt-ks">' + kpi('All targets', todas.length, todas.length ? Math.round((conta('ok') + conta('curso')) / todas.length * 100) + '% achieved or on track' : 'none yet', '', '') +
      kpi('Achieved', conta('ok'), 'target met', 'ok', 'ok') + kpi('On track', conta('curso'), 'ahead of the trajectory', 'info', 'curso') + kpi('At risk', conta('risco'), 'slightly behind', 'warn', 'risco') +
      kpi('Off track', conta('fora') + conta('falhou'), conta('falhou') ? conta('falhou') + ' missed' : 'well behind', 'err', 'fora') + kpi('No data yet', conta('nd'), 'no ' + ano + ' value', '', 'nd') + '</div>';
    /* Por classificacao: quantas e como estao */
    var classes = '<div class="mt-cls">' + P.CLASSES_META.map(function (k) {
      var l = todas.filter(function (x) { return x.mt.classificacao === k[0]; }), n = l.length;
      var seg = function (cod, cls) { var q = conta(cod, l); return q ? '<i class="' + cls + '" style="flex:' + q + '" title="' + e(q + ' ' + ESTADOS.filter(function (s) { return s[0] === cod; })[0][1].toLowerCase()) + '"></i>' : ''; };
      return '<button type="button" class="mt-cl' + (f.classe === k[0] ? ' on' : '') + '" data-a="mtClasse" data-v="' + k[0] + '"><span class="mt-cl-i" aria-hidden="true">' + ICO_CLASSE[k[0]] + '</span><span class="mt-cl-t"><b>' + e(k[1]) + '</b><small>' + n + ' target' + (n === 1 ? '' : 's') + '</small></span><span class="mt-cl-bar" aria-hidden="true">' + (n ? seg('ok', 'ok') + seg('curso', 'info') + seg('risco', 'warn') + seg('fora', 'err') + seg('falhou', 'err') + seg('nd', 'nd') : '<i class="nd" style="flex:1"></i>') + '</span></button>';
    }).join('') + '</div>';
    var filtros = '<div class="ps-filtros">' + campo('mt-emp', 'Perimeter', '<select id="mt-emp" class="ps-sel" data-c="mtF" data-id="emp">' + opt('', 'As set in each target (group or company)', f.emp) + S.ent.map(function (x) { return opt(x.nome, x.nome + ' at 100%', f.emp); }).join('') + '</select>') +
      campo('mt-tema', 'Topic', '<select id="mt-tema" class="ps-sel" data-c="mtF" data-id="tema">' + opt('', 'All', f.tema) + temas.sort().map(function (t) { return opt(t, t, f.tema); }).join('') + '</select>') +
      campo('mt-q', 'Search', '<input id="mt-q" class="ps-in" type="search" placeholder="Indicator, code or note" value="' + e(f.q) + '" data-c="mtF" data-id="q">') +
      (f.classe || f.est || f.tema || f.q || f.emp ? '<button type="button" class="ps-btn liga" data-a="mtLimpar">Clear filters</button>' : '') + '</div>';
    /* Uma linha por meta, agrupadas por indicador (varios prazos do mesmo KPI juntos) */
    var porInd = {}; filtradas.forEach(function (x) { (porInd[x.c.id] = porInd[x.c.id] || []).push(x); });
    var ids = Object.keys(porInd).sort(function (a, b) { var o = ['fora', 'falhou', 'risco', 'curso', 'nd', 'ok'], pa = Math.min.apply(null, porInd[a].map(function (x) { return o.indexOf(x.st.cod); })), pb = Math.min.apply(null, porInd[b].map(function (x) { return o.indexOf(x.st.cod); })); return pa - pb || a.localeCompare(b); });
    var lista = ids.map(function (id) {
      var c = P.cat(id), l = porInd[id].sort(function (a, b) { return a.mt.ano_meta - b.mt.ano_meta; });
      return '<article class="mt-ind"><header class="mt-ind-h"><button type="button" class="mt-ind-n" data-a="indFicha" data-v="' + e(id) + '"><span class="ps-cod">' + e(id) + '</span><b>' + e(c.nome) + '</b></button><small class="ps-mut">' + e((c.tema || 'Other') + ' · ' + (c.unidade_medida || '')) + '</small></header>' +
        '<div class="mt-graf">' + P.graficoMeta(id, f.emp || '') + '</div>' +
        '<div class="mt-rows">' + l.map(function (x) {
          var mt = x.mt, st = x.st, onde = empV(mt) || 'Group, consolidated';
          return '<div class="mt-row"><div class="mt-c mt-c1"><span class="mt-ano">' + mt.ano_meta + '</span><span class="mt-chip c-' + e(mt.classificacao) + '">' + e(P.classeMetaTxt(mt.classificacao)) + '</span></div>' +
            '<div class="mt-c"><span class="mt-k2">Target</span><b>' + (mt.sentido === 'descer' ? '≤ ' : '≥ ') + e(fmtV(id, mt.valor_meta)) + '</b><small>' + e(onde) + '</small></div>' +
            '<div class="mt-c"><span class="mt-k2">Baseline ' + st.anoBase + '</span><span>' + e(fmtV(id, st.b)) + '</span></div>' +
            '<div class="mt-c"><span class="mt-k2">' + ano + (st.ytd ? ' (YTD)' : '') + '</span><b>' + e(fmtV(id, st.v)) + '</b></div>' +
            '<div class="mt-c mt-c-prog">' + P.barraMeta(st) + '<small class="ps-mut">' + (st.prog === null ? 'No ' + ano + ' value yet' : Math.round(Math.max(0, st.prog) * 100) + '% of the way' + (st.esperado !== null && st.cod !== 'ok' ? ', ' + Math.round(st.esperado * 100) + '% expected' : '')) + '</small></div>' +
            '<div class="mt-c mt-c-st">' + chip(st.txt, st.cls) + (gere ? '<span class="mt-acoes"><button type="button" class="ps-btn liga" data-a="mtEditar" data-v="' + e(mt.id) + '">Edit</button></span>' : '') + '</div>' +
            (mt.notas ? '<p class="mt-nota">' + e(mt.notas) + '</p>' : '') + '</div>';
        }).join('') + '</div></article>';
    }).join('');
    var cab = cabCartao('Performance vs target (' + filtradas.length + ')', 'ativ', gere ? '<button type="button" class="ps-btn pri peq" data-a="mtNova">+ New target</button>' : '');
    return topo + classes + '<div class="ps-card ps-mt">' + cab + '<div class="ps-card-body">' + filtros + (lista ? '<div class="mt-lista ps-mt">' + lista + '</div>' : X.vazio(todas.length ? 'No target matches the filters.' : 'No targets yet. Set them in the indicator (Edit, Targets) or with New target.')) +
      '<p class="ps-small ps-mut ps-mt">Progress compares the ' + ano + ' value with the straight line from the baseline to the target. The mark on each bar shows where the indicator should be by now.</p></div></div>';
  };
  X.A.mtEst = function (d) { U.metas.est = U.metas.est === d.v ? '' : d.v; R(); };
  X.A.mtClasse = function (d) { U.metas.classe = U.metas.classe === d.v ? '' : d.v; R(); };
  X.A.mtLimpar = function () { U.metas = { emp: '', classe: '', est: '', tema: '', q: '' }; R(); };
  X.C.mtF = function (el) { U.metas[el.dataset.id] = el.value; R(); };

  /* --- Painel: nova meta ou editar ------------------------------------------------------ */
  X.A.mtNova = function () { U.mtEd = { mt: { indicador_id: '', ano_meta: S.ciclo.ano + 4, valor_meta: '', sentido: 'subir', classificacao: 'interna', empresa: '', ano_base: '', valor_base: '', notas: '' }, erro: '' }; X.abrePainel('metaEd', {}); };
  X.A.mtEditar = function (d) { var mt = (S.metas || []).filter(function (m) { return m.id === d.v; })[0]; if (!mt) return; U.mtEd = { mt: Object.assign({}, mt, { valor_meta: mt.valor_meta, ano_base: mt.ano_base || '', valor_base: mt.valor_base === null ? '' : mt.valor_base }), erro: '' }; X.abrePainel('metaEd', {}); };
  X.C.mtEdCampo = function (el) { U.mtEd.mt[el.dataset.f] = el.value; if (el.dataset.f === 'indicador_id') { var c = P.cat(el.value); if (c && /reduc|emiss|consum|perdas|acidente|absent|turnover|gap|CO2|resíduo|residuo/i.test(c.nome + ' ' + c.unidade_medida)) U.mtEd.mt.sentido = 'descer'; R(); } };
  X.Pn.metaEd = function () {
    var E = U.mtEd || { mt: {} }, mt = E.mt, c = P.cat(mt.indicador_id), novo = !mt.id;
    var inds = S.cat.filter(function (x) { return !P.indAtivo || P.indAtivo(x); });
    var cmp = function (id, rot, h, aj) { return campo(id, rot, h) + (aj ? '<small class="ps-mut ps-small">' + e(aj) + '</small>' : ''); };
    var b = (E.erro ? '<div class="ps-aviso err" role="alert">' + e(E.erro) + '</div>' : '') + '<div class="ps-form ps-form-1">' +
      cmp('me-ind', 'Indicator', '<select id="me-ind" class="ps-sel" data-pesq data-c="mtEdCampo" data-f="indicador_id"' + (novo ? '' : ' disabled') + '>' + opt('', 'Choose…', mt.indicador_id) + inds.map(function (x) { return opt(x.id, x.id + ' ' + x.nome + ' (' + x.unidade_medida + ')', mt.indicador_id); }).join('') + '</select>') +
      '<div class="ps-grid2">' + cmp('me-ano', 'Target year', '<input id="me-ano" class="ps-in" inputmode="numeric" value="' + e(mt.ano_meta) + '" data-c="mtEdCampo" data-f="ano_meta">') +
      cmp('me-val', 'Target value' + (c ? ' (' + c.unidade_medida + ')' : ''), '<input id="me-val" class="ps-in ps-num" inputmode="decimal" value="' + e(mt.valor_meta === null || mt.valor_meta === undefined ? '' : String(mt.valor_meta).replace('.', ',')) + '" data-c="mtEdCampo" data-f="valor_meta">') + '</div>' +
      '<div class="ps-grid2">' + cmp('me-sent', 'Direction', '<select id="me-sent" class="ps-sel" data-c="mtEdCampo" data-f="sentido">' + opt('subir', 'Reach at least the target (higher is better)', mt.sentido) + opt('descer', 'Stay at or below the target (lower is better)', mt.sentido) + '</select>') +
      cmp('me-cls', 'Classification', '<select id="me-cls" class="ps-sel" data-c="mtEdCampo" data-f="classificacao">' + P.CLASSES_META.map(function (k) { return opt(k[0], k[1], mt.classificacao); }).join('') + '</select>', 'Financing: sustainability-linked loans or bonds. Rating: ESG ratings. Other commitment: public or regulatory pledges.') + '</div>' +
      cmp('me-emp', 'Applies to', '<select id="me-emp" class="ps-sel" data-c="mtEdCampo" data-f="empresa">' + opt('', 'Group, consolidated', mt.empresa) + S.ent.map(function (x) { return opt(x.nome, x.nome, mt.empresa); }).join('') + '</select>') +
      '<div class="ps-grid2">' + cmp('me-ab', 'Baseline year', '<input id="me-ab" class="ps-in" inputmode="numeric" placeholder="' + (S.ciclo.ano - 1) + '" value="' + e(mt.ano_base || '') + '" data-c="mtEdCampo" data-f="ano_base">', 'Empty: the previous year.') +
      cmp('me-vb', 'Baseline value', '<input id="me-vb" class="ps-in ps-num" inputmode="decimal" placeholder="From the platform" value="' + e(mt.valor_base === null || mt.valor_base === undefined ? '' : String(mt.valor_base).replace('.', ',')) + '" data-c="mtEdCampo" data-f="valor_base">', 'Empty: the value reported for that year.') + '</div>' +
      cmp('me-not', 'Note', '<textarea id="me-not" class="ps-ta" rows="2" data-c="mtEdCampo" data-f="notas" placeholder="For example: KPI of the sustainability-linked loan with Bank X, margin step-down">' + e(mt.notas || '') + '</textarea>') + '</div>';
    return { t: novo ? 'New target' : 'Edit target', s: c ? c.id + ' ' + c.nome : 'Set a target for an indicator', b: b,
      p: (!novo ? '<button type="button" class="ps-btn err" data-a="mtApagar">Delete</button>' : '') + '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="mtGuardar">Save target</button>' };
  };
  X.A.mtGuardar = function () { var r = P.gravarMeta(U.mtEd.mt, u()); if (r.erro) { U.mtEd.erro = r.erro; R(); return; } U.painel = null; U.mtEd = null; toast('Target saved.', 'ok'); R(); };
  X.A.mtApagar = function () { var r = P.apagarMeta(U.mtEd.mt.id, u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; U.mtEd = null; toast('Target deleted.', 'ok'); R(); };
})();
