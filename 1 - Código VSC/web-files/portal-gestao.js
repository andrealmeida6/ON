/* ============================================================================
   portal-gestao.js - paginas de controlo
   Visao geral, estado de reporte, entrada de dados, aprovacoes, evidencias,
   calculos, registo, atribuicao de KPIs, empresas e perimetro.
   As regras estao em portal-controlo.js e portal-nucleo.js.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var Blocos = X.Blocos, A = X.A, C = X.C, U = X.U, e = X.e, rota = X.rota, chip = X.chip, estChip = X.estChip, cabCartao = X.cabCartao, vazio = X.vazio, opt = X.opt, campo = X.campo, tabela = X.tabela, toast = X.toast, R = X.R, val = X.val, res = X.res, atribHtml = X.atribHtml, iniciais = X.iniciais, u = X.u, fmtV = X.fmtV;
  var emp = X.empHtml;
  var cicloMs = function () { return P.msCiclo(); };
  /* Indicadores com valor anual no ciclo: so trimestres lancados, sem a milestone do ano, ainda nao contam */
  var catCiclo = function () { return S.cat.filter(function (c) { return !!P.msDoIndicador(c.id) && !!P.item(c.id); }); };
  var pessoa = function (x) { return x ? X.pessHtml(x.nome) : '<span class="ps-mut">-</span>'; };
  var cod = function (c) { return c.esrs_requisito ? '<span class="ps-cod">' + e(c.esrs_requisito) + '</span>' : ''; };
  var pills = function (acao, lista, ativa) {
    return '<div class="ps-seg" role="group">' + lista.map(function (x) { return '<button type="button" class="' + (ativa === x[0] ? 'on' : '') + '" data-a="' + acao + '" data-v="' + e(x[0]) + '">' + e(x[1]) + (x[2] !== undefined ? ' <span class="n">' + x[2] + '</span>' : '') + '</button>'; }).join('') + '</div>';
  };
  var variacaoTxt = function (v) { return v === null || v === undefined ? '-' : (v > 0 ? '+' : '') + P.fmtNum(v, 1) + '%'; };

  /* --- Visao geral ------------------------------------------------------------ */
  U.visao = { modo: 'consolidado', empresa: '', per: '', agr: 'tema', sel: [] };
  /* Empresa ou selecao de empresas (array) da vista */
  var naVista = function (empresa, nome) { return !empresa || (Array.isArray(empresa) ? empresa.indexOf(nome) > -1 : nome === empresa); };
  var TILES = ['E06', 'E01', 'P02', 'N05'];
  var tile = function (id, empresa) {
    var c = P.cat(id), r = P.valorConsolidado(id, empresa), m = r.m, it = P.item(id), ant = P.valorAnterior(id, S.ciclo.ano), est = P.estadoKpi(id);
    var val2 = r.valor === null ? '-' : P.fmtNum(r.valor, r.racio || (empresa && !Array.isArray(empresa)) ? c.casas_decimais : 0);
    var dif = it && it.valor !== null && ant ? ((it.valor - ant) / Math.abs(ant)) * 100 : null;
    var nota = Array.isArray(empresa) && empresa.length > 1 ? (r.recalculado ? 'Recalculated with the inputs of the selection: ' + r.formula : r.valor === null ? 'Not reported by the selected companies' : (r.racio ? 'Average of ' : 'Sum of ') + empresa.length + ' companies, each at 100%') : !empresa && r.recalculado ? 'Recalculated with the consolidated inputs: ' + r.formula : r.fora ? 'Reported by ' + (m ? m.empresa : 'another company') : !it || it.valor === null ? 'Not reported yet' : !empresa && r.peso === 0 ? m.empresa + ' is outside the consolidation' : !empresa && !r.racio && r.peso !== 1 ? 'Counted at ' + P.fmtNum(r.peso * 100, 0) + '%, ' + m.empresa : (m ? m.empresa : '');
    return '<div class="ps-tile"><div class="ps-tile-t"><span>' + e(c.nome) + '</span>' + cod(c) + '</div><div class="ps-tile-v"><b>' + e(val2) + '</b> <small>' + e(c.unidade_medida) + '</small></div><div class="ps-tile-s">' + (dif === null || r.fora ? '' : '<span>' + (dif < 0 ? '▼ ' : dif > 0 ? '▲ ' : '') + e(P.fmtNum(Math.abs(dif), 1)) + '% vs ' + (S.ciclo.ano - 1) + '</span>') + '<span>' + e(nota) + '</span></div><div class="ps-tile-e">' + chip(est.txt, est.cls) + '</div></div>';
  };
  /* Pontos de dados da vista: periodo de reporte e empresa. Sao os mesmos do Reporting status (P.pontosCiclo). */
  var pontosVista = function (empresa, per) {
    return P.pontosCiclo(function (m) { return (!per || m.periodo === per) && naVista(empresa, m.empresa); });
  };
  /* Grupos de indicadores: normas ESRS (com a materialidade) ou temas da empresa */
  var gruposVista = function (agr) {
    if (agr === 'tema') { var t = []; S.cat.forEach(function (c) { if (c.tema && t.indexOf(c.tema) < 0) t.push(c.tema); }); return t.sort().map(function (x) { return { k: x, t: '', d: x, teste: function (c) { return c.tema === x; } }; }); }
    return S.mat.map(function (x) { return { k: x.norma, t: x.norma, d: x.tema, nm: x.avaliacao === 'não material', teste: function (c) { return c.esrs === x.norma; } }; });
  };
  var contaPontos = function (l) {
    var ap = l.filter(function (x) { return x.s.cod === 'aprovado'; }).length;
    var rep = l.filter(function (x) { return x.s.cod !== 'aprovado'; }).filter(function (x) { var it = P.item(x.id, P.chave(x.m)); return it && it.valor !== null; }).length;
    return { tot: l.length, ap: ap, rep: rep, falta: l.length - ap - rep, pct: l.length ? Math.round(((ap + rep) / l.length) * 100) : null };
  };
  var completude = function (empresa, per, agr) {
    var pts = pontosVista(empresa, per);
    return gruposVista(agr).map(function (g) {
      var l = pts.filter(function (x) { return g.teste(x.c); }), n = contaPontos(l);
      var titulo = '<span class="ps-cp-t">' + (g.t ? '<b>' + e(g.t) + '</b> ' : '') + e(g.d) + '</span>';
      if (g.nm) return '<div class="ps-cp">' + titulo + '<span class="ps-cp-b"></span><span class="ps-cp-v ps-mut">Not material</span></div>';
      if (!n.tot) return '<div class="ps-cp">' + titulo + '<span class="ps-cp-b"></span><span class="ps-cp-v ps-mut">No data points</span></div>';
      var pct = function (k) { return (k / n.tot) * 100; };
      return '<div class="ps-cp" data-tip="' + e((g.t || g.d) + ': ' + n.ap + ' approved, ' + n.rep + ' reported, ' + n.falta + ' missing, of ' + n.tot + ' data points') + '" tabindex="0">' + titulo + '<span class="ps-cp-b"><i class="a" style="width:' + pct(n.ap) + '%"></i><i class="r" style="width:' + pct(n.rep) + '%"></i></span><span class="ps-cp-v">' + n.pct + '%</span></div>';
    }).join('');
  };
  /* Monitorizacao de cada periodo: grupos nas linhas, periodos nas colunas */
  var matrizPeriodos = function (empresa, agr) {
    var pers = (S.periodos || []).filter(function (p) { return p.ano === S.ciclo.ano; }), pts = pontosVista(empresa, ''), gs = gruposVista(agr).filter(function (g) { return !g.nm; }), sel = U.visao.per;
    var cel = function (l, pid, g) {
      var n = contaPontos(l);
      if (!n.tot) return '<td class="mp-c vazio"><span class="ps-mut">-</span></td>';
      var cls = n.pct === 100 && n.ap === n.tot ? 'ok' : n.pct >= 75 ? 'bom' : n.pct >= 40 ? 'meio' : 'baixo';
      return '<td class="mp-c ' + cls + (sel === pid ? ' on' : '') + '"><button type="button" data-a="visaoPer" data-v="' + e(pid) + '" data-tip="' + e((g ? (g.t || g.d) + ', ' : '') + (P.periodo(pid) ? P.periodo(pid).nome : 'All periods') + ': ' + n.ap + ' approved, ' + n.rep + ' reported, ' + n.falta + ' missing, of ' + n.tot) + '"><b>' + n.pct + '%</b><small>' + (n.ap + n.rep) + '/' + n.tot + '</small></button></td>';
    };
    var linhas = gs.map(function (g) {
      var l = pts.filter(function (x) { return g.teste(x.c); });
      if (!l.length) return '';
      return '<tr><th scope="row">' + (g.t ? '<b>' + e(g.t) + '</b> ' : '') + e(g.d) + '</th>' + pers.map(function (p) { return cel(l.filter(function (x) { return x.m.periodo === p.id; }), p.id, g); }).join('') + cel(l, '', g) + '</tr>';
    }).join('');
    var total = '<tr class="mp-tot"><th scope="row">All groups</th>' + pers.map(function (p) { return cel(pts.filter(function (x) { return x.m.periodo === p.id; }), p.id, null); }).join('') + cel(pts, '', null) + '</tr>';
    return '<div class="ps-card ps-mt">' + cabCartao('Completeness by reporting period', 'cal', '<div class="ps-leg mp-leg"><span><i class="ok"></i>All approved</span><span><i class="bom"></i>75% or more</span><span><i class="meio"></i>40 to 74%</span><span><i class="baixo"></i>Below 40%</span></div>') +
      '<div class="ps-card-body"><p class="ps-small ps-mut">Share of data points (indicator per period) with a value, approved or reported, in each reporting period. Click a cell to see that period above.</p>' +
      '<div class="ps-tw mp-tw"><table class="mp-t"><thead><tr><th scope="col">' + (agr === 'tema' ? 'Company topic' : 'ESRS standard') + '</th>' + pers.map(function (p) { return '<th scope="col">' + e(p.nome) + '<small>close ' + e(P.fmtData(p.fecho)) + '</small></th>'; }).join('') + '<th scope="col">All periods</th></tr></thead><tbody>' + linhas + total + '</tbody></table></div></div></div>';
  };
  var ORIGENS = ['Manual', 'Excel', 'External', 'Calculation', 'Restatement', 'API'];
  var origens = function (empresa, per) {
    var n = {}, tot = 0;
    pontosVista(empresa, per).forEach(function (x) {
      var it = P.item(x.id, P.chave(x.m)), v = it ? it.versoes : [], ult = v[v.length - 1];
      if (!ult || it.valor === null) return;
      var o = P.origemVersao(ult.origem); n[o] = (n[o] || 0) + 1; tot++;
    });
    if (!tot) return vazio('No values reported yet.');
    var usadas = ORIGENS.filter(function (o) { return n[o]; });
    return '<div class="ps-org">' + usadas.map(function (o, i) { return '<i class="o' + i + '" style="width:' + (n[o] / tot) * 100 + '%" data-tip="' + e(o + ': ' + n[o] + ' of ' + tot) + '"></i>'; }).join('') + '</div><div class="ps-leg ps-mt">' + usadas.map(function (o, i) { return '<span><i class="o' + i + '"></i>' + e(o) + ' ' + Math.round((n[o] / tot) * 100) + '%</span>'; }).join('') + '</div>';
  };
  var aprovaveis = function () { return cicloMs().filter(function (m) { return !P.concluida(m) && P.passoAtual(m).tipo !== 'recolha'; }); };
  var tituloEvento = function (x) { return x.ind ? P.cat(x.ind).nome + ': ' + (x.antes === null ? '' : P.fmtNum(x.antes, P.cat(x.ind).casas_decimais) + ' to ') + P.fmtNum(x.depois, P.cat(x.ind).casas_decimais) : x.texto; };
  Blocos['visao'] = function () {
    var v = U.visao, inc = S.ent.filter(function (x) { return x.perimetro_grupo; }).length, usr = u();
    if (!v.sel || !v.sel.length) v.sel = S.ent.filter(function (x) { return x.perimetro_grupo; }).map(function (x) { return x.nome; }).slice(0, 2);
    var empV = v.modo === 'empresa' ? v.empresa || (S.ent[0] && S.ent[0].nome) : v.modo === 'selecao' ? (v.sel.length === 1 ? v.sel[0] : v.sel.slice()) : '';
    var pend = aprovaveis().filter(function (m) { return usr.perfil !== 'resp' || P.temUnidade(usr, m.unidade); });
    if (empV) pend = pend.filter(function (m) { return naVista(empV, m.empresa); });
    if (v.per) pend = pend.filter(function (m) { return m.periodo === v.per; });
    var pers = (S.periodos || []).filter(function (p) { return p.ano === S.ciclo.ano; }), perSel = v.per ? P.periodo(v.per) : null;
    var ativ = P.trilho().filter(function (x) { return !empV || (x.m && naVista(empV, x.m.empresa)); }).sort(function (a, b) { return a.em < b.em ? 1 : a.em > b.em ? -1 : 0; }).slice(0, 5);
    var podeAdmin = P.gereTudo(usr), podeTrilho = podeAdmin || usr.perfil === 'auditor';
    return '<div class="ps-card ps-vista"><div class="ps-vista-e"><span class="ps-lab">Data view</span><div class="ps-seg2" role="group"><button type="button" class="' + (v.modo !== 'empresa' && v.modo !== 'selecao' ? 'on' : '') + '" data-a="visaoModo" data-v="consolidado">Consolidated</button><button type="button" class="' + (v.modo === 'empresa' ? 'on' : '') + '" data-a="visaoModo" data-v="empresa">By company</button><button type="button" class="' + (v.modo === 'selecao' ? 'on' : '') + '" data-a="visaoModo" data-v="selecao">Selection</button></div>' +
      (v.modo === 'empresa' ? '<label class="ps-sr" for="vis-empV">Company</label><select id="vis-empV" class="ps-sel" data-c="visaoEmp">' + S.ent.map(function (x) { return opt(x.nome, x.nome, empV); }).join('') + '</select>' : '') +
      (v.modo === 'selecao' ? '<div class="ps-dt-chips vis-sel" role="group" aria-label="Companies in the view">' + S.ent.map(function (x, i) { var on = v.sel.indexOf(x.nome) > -1; return '<label class="ps-dt-chip' + (on ? ' on' : '') + '"><input type="checkbox" id="vis-sel-' + i + '" data-c="visaoSel" data-id="' + e(x.nome) + '"' + (on ? ' checked' : '') + '>' + e(x.nome) + (x.perimetro_grupo ? '' : '<small>outside the group</small>') + '</label>'; }).join('') + '</div>' : '') +
      '<span class="ps-lab vis-sep">Reporting period</span><label class="ps-sr" for="vis-per">Reporting period</label><select id="vis-per" class="ps-sel" data-c="visaoPer">' + opt('', 'All periods', v.per) + pers.map(function (p) { return opt(p.id, p.nome, v.per); }).join('') + '</select></div><div class="ps-vista-d ps-small ps-mut">' + (Array.isArray(empV) ? 'Selection of ' + empV.length + ' companies, each at 100%: volumes added, ratios averaged, calculated indicators recalculated from the selected inputs.' : empV ? 'Showing what this company reports, at 100%.' : inc + ' of ' + S.ent.length + ' companies in the consolidation. Full at 100%, proportional by ownership, equity method excluded.') + (podeAdmin ? ' <a href="' + rota('Backoffice?tab=perimetro') + '">Set the perimeter</a>' : '') + '</div></div>' +
      '<div class="ps-tiles ps-mt">' + TILES.map(function (id) { return tile(id, empV); }).join('') + '</div>' +
      '<div class="ps-grid-vis ps-mt"><div class="ps-card">' + cabCartao('Completeness by ' + (v.agr === 'tema' ? 'company topic' : 'ESRS standard') + (perSel ? ', ' + perSel.nome : ''), 'tarefa', '<div class="ps-sp"><div class="ps-seg" role="group" aria-label="Group indicators by"><button type="button" class="' + (v.agr !== 'tema' ? 'on' : '') + '" data-a="visaoAgr" data-v="esrs">ESRS</button><button type="button" class="' + (v.agr === 'tema' ? 'on' : '') + '" data-a="visaoAgr" data-v="tema">Topic</button></div><div class="ps-leg"><span><i class="a"></i>Approved</span><span><i class="r"></i>Reported</span><span><i></i>Missing</span></div></div>') + '<div class="ps-card-body">' + completude(empV, v.per, v.agr) + '</div></div>' +
      '<div class="ps-col"><div class="ps-card">' + cabCartao('Pending approval', 'ativ', podeTrilho ? '<a class="ps-small" href="' + rota('Aprovacoes') + '">See all (' + pend.length + ')</a>' : '') + '<ul class="ps-list">' + (pend.length ? pend.slice(0, 4).map(function (m) { return '<li><a class="ps-row" href="' + rota((podeTrilho ? 'Aprovacoes?ms=' : 'Milestone/') + m.id) + '"><span class="ps-row-txt"><b>' + e(m.nome) + '</b><span>' + emp(m.empresa) + ', ' + m.indicadores.length + ' indicators</span></span>' + estChip(m) + '</a></li>'; }).join('') : '<li>' + vazio('Nothing waiting for approval.') + '</li>') + '</ul></div>' +
      '</div></div>' + matrizPeriodos(empV, v.agr) +
      '<div class="ps-card ps-mt">' + cabCartao('Recent activity', 'ativ', podeTrilho ? '<a class="ps-small" href="' + rota('Trilho') + '">Open audit trail</a>' : '') + '<ul class="ps-list">' + (ativ.length ? ativ.map(function (x) { return '<li class="ps-ativ"><span class="ps-mut ps-small ps-nowrap">' + e(P.fmtDataHora(x.em)) + '</span><span>' + e(x.por) + ': ' + e(tituloEvento(x)) + '</span>' + chip(x.origem) + '</li>'; }).join('') : '<li>' + vazio('No activity yet.') + '</li>') + '</ul></div>' +
      '<h2 class="ps-grupo-t ps-mt-l">Reporting progress, whole group</h2>';
  };
  A.visaoModo = function (d) { U.visao.modo = d.v; R(); };
  A.visaoAgr = function (d) { U.visao.agr = d.v; R(); };
  A.visaoPer = function (d) { U.visao.per = U.visao.per === d.v ? '' : d.v; R(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  C.visaoPer = function (el) { U.visao.per = el.value; };
  C.visaoEmp = function (el) { U.visao.empresa = el.value; };
  C.visaoSel = function (el) {
    var l = U.visao.sel.filter(function (n) { return n !== el.dataset.id; });
    if (el.checked) l.push(el.dataset.id);
    if (!l.length) { toast('Choose at least one company.', 'err'); R(); return; }
    U.visao.sel = S.ent.map(function (x) { return x.nome; }).filter(function (n) { return l.indexOf(n) > -1; }); R();
  };
  /* Estado de uma ligacao: so com "Connected" se pode puxar dados desse sistema nas milestones */
  C.ligEstado = function (el) { var a = S.apis[+el.dataset.id], usr = u(); if (!a || !P.gereTudo(usr)) return; a.estado = el.value; a.mudado = true; if (P.eventoGlobal) P.eventoGlobal('Connection ' + a.nome + ': ' + (el.value === 'ligada' ? 'connected' : 'waiting for credentials') + '.', usr.nome); P.guardar(); toast('Connection updated.', 'ok'); };

  /* --- Estado de reporte -------------------------------------------------------- */
  U.est = { norma: '', empresa: '', dono: '', estado: 'todos', vista: 'lista' };
  /* Uma linha por ponto de dados (indicador num periodo): conta tambem o que foi preenchido nas entregas trimestrais */
  var linhasEstado = function () {
    return P.pontosCiclo().map(function (x) { return { c: x.c, s: x.s, m: x.m, d: P.dono(x.id) }; });
  };
  var filtroEstado = function (l, semEstado) {
    var f = U.est;
    return l.filter(function (x) { return (!f.norma || x.c.esrs === f.norma) && (!f.empresa || x.m.empresa === f.empresa) && (!f.dono || (x.d && x.d.login === f.dono)) && (semEstado || f.estado === 'todos' || x.s.cod === f.estado); });
  };
  Blocos['estado'] = function () {
    var todos = linhasEstado(), base = filtroEstado(todos, true), lista = filtroEstado(todos), f = U.est;
    var n = function (cod2, l) { return (l || base).filter(function (x) { return x.s.cod === cod2; }).length; };
    var pct = function (v) { return base.length ? Math.round((v / base.length) * 100) + '% of the total' : ''; };
    var donos = {};
    todos.forEach(function (x) { if (x.d) donos[x.d.login] = x.d; });
    var porDono = Object.keys(donos).map(function (k) {
      var l = todos.filter(function (x) { return x.d && x.d.login === k; });
      return { x: donos[k], falta: l.filter(function (y) { return y.s.cod === 'falta'; }).length, atraso: l.filter(function (y) { return y.s.cod === 'atraso'; }).length };
    }).filter(function (o) { return o.falta + o.atraso; }).sort(function (a, b) { return b.atraso + b.falta - a.atraso - a.falta; });
    var prox = cicloMs().filter(function (m) { return !P.concluida(m) && P.diasAte(m.prazo) >= 0; }).sort(function (a, b) { return a.prazo < b.prazo ? -1 : 1; }).slice(0, 4);
    var kpi = function (t, v, s, cls) { return '<div class="ps-kpi ' + (cls || '') + '"><span>' + e(t) + '</span><b>' + v + '</b><small>' + e(s) + '</small></div>'; };
    /* Duas vistas: a lista dos pontos de dados e By area (por departamento) */
    var vistas = '<div class="ps-seg" role="tablist" aria-label="View"><button type="button" role="tab" aria-selected="' + (f.vista !== 'area') + '" class="' + (f.vista !== 'area' ? 'on' : '') + '" data-a="estVista" data-v="lista">By data point</button><button type="button" role="tab" aria-selected="' + (f.vista === 'area') + '" class="' + (f.vista === 'area' ? 'on' : '') + '" data-a="estVista" data-v="area">By area</button></div>';
    var topo = '<div class="ps-sp-b ps-filtros">' + vistas + '<span class="ps-sp">' + (f.vista === 'area' ? '<label class="ps-sr" for="est-emp-a">Company</label><select id="est-emp-a" class="ps-sel" data-c="estF" data-id="empresa">' + opt('', 'All companies', f.empresa) + S.ent.map(function (x) { return opt(x.nome, x.nome, f.empresa); }).join('') + '</select>' : '') + '<button type="button" class="ps-btn" data-a="estExcel">Export to Excel</button></span></div>';
    /* Total de indicadores do catalogo (ativos) e para quantos ja foram enviados pedidos (tasks) neste ciclo */
    var indsTot = S.cat.filter(function (c) { return (!P.indAtivo || P.indAtivo(c)) && (!f.norma || c.esrs === f.norma) && (!f.empresa || P.empresasInd(c).some(function (y) { return y.nome === f.empresa; })); });
    var pedidos = {}; cicloMs().forEach(function (m) { if (!f.empresa || m.empresa === f.empresa) m.indicadores.forEach(function (id) { pedidos[id] = 1; }); });
    var nPed = indsTot.filter(function (c) { return pedidos[c.id]; }).length;
    var kpis = '<div class="ps-kpis">' + kpi('Indicators', indsTot.length, 'in the catalogue') + kpi('Requests sent', nPed, indsTot.length ? (indsTot.length - nPed) + ' not requested yet' : '', 'k-info') + kpi('Data points', base.length, S.ciclo.ano + ' cycle') + kpi('Approved', n('aprovado'), pct(n('aprovado')), 'k-ok') + kpi('In approval', n('aprovacao'), pct(n('aprovacao')), 'k-rev') + kpi('In progress', n('curso'), pct(n('curso')), 'k-info') + kpi('Missing', n('falta'), pct(n('falta')), 'k-warn') + kpi('Overdue', n('atraso'), 'past the due date', 'k-err') + '</div>';
    if (f.vista === 'area') return topo + kpis + (P.porAreaHtml ? P.porAreaHtml(function (m) { return !f.empresa || m.empresa === f.empresa; }) : '');
    return topo + kpis +
      '<div class="ps-grid-side ps-grid-side-l ps-mt"><div class="ps-card"><div class="ps-card-body"><div class="ps-form">' +
      campo('est-norma', 'ESRS standard', '<select id="est-norma" class="ps-sel" data-c="estF" data-id="norma">' + opt('', 'All', f.norma) + S.mat.map(function (x) { return opt(x.norma, x.norma + ' ' + x.tema, f.norma); }).join('') + '</select>') +
      campo('est-emp', 'Perimeter', '<select id="est-emp" class="ps-sel" data-c="estF" data-id="empresa">' + opt('', 'All', f.empresa) + S.ent.filter(function (x) { return cicloMs().some(function (m) { return m.empresa === x.nome; }); }).map(function (x) { return opt(x.nome, x.nome, f.empresa); }).join('') + '</select>') +
      campo('est-dono', 'Owner', '<select id="est-dono" class="ps-sel" data-c="estF" data-id="dono">' + opt('', 'All', f.dono) + Object.keys(donos).map(function (k) { return opt(k, donos[k].nome, f.dono); }).join('') + '</select>') + '</div>' +
      '<div class="ps-mt">' + pills('estTab', [['todos', 'All', base.length], ['falta', 'Missing', n('falta')], ['atraso', 'Overdue', n('atraso')], ['curso', 'In progress', n('curso')], ['aprovacao', 'In approval', n('aprovacao')], ['aprovado', 'Approved', n('aprovado')]], f.estado) + '</div><div class="ps-mt">' +
      tabela([{ t: 'KPI' }, { t: 'Period' }, { t: 'Perimeter' }, { t: 'Assigned to' }, { t: 'Deadline' }, { t: 'Status' }], lista.map(function (x) {
        return ['<a href="' + rota('Milestone/' + x.m.id) + '">' + e(x.c.nome) + '</a><br><small class="ps-mut">' + e(P.esrsDe(x.c.id).dps[0] || x.c.esrs_requisito || 'No ESRS') + ', ' + e(x.m.periodicidade) + '</small>', P.tagPer(x.m) || e(P.rotPeriodo(x.m)), emp(x.m.empresa), x.d ? pessoa(x.d) : X.depHtml(P.donoIndicador(x.c.id)), '<span class="ps-nowrap">' + e(X.prazoTxt(x.m)) + '</span>', chip(x.s.txt, x.s.cls)];
      }), 'No KPI matches these filters.') + '</div></div></div>' +
      '<div class="ps-col"><div class="ps-card">' + cabCartao('Missing by owner', 'tarefa') + '<ul class="ps-list">' + (porDono.length ? porDono.map(function (o) { return '<li class="ps-row"><span class="ps-row-txt"><b>' + e(o.x.nome) + '</b><span>' + e(P.unidadesTxt(o.x) || P.PERFIS[o.x.perfil]) + '</span></span><span class="ps-sp">' + (o.falta ? chip(o.falta + ' missing', 'warn') : '') + (o.atraso ? chip(o.atraso + ' overdue', 'err') : '') + '</span></li>'; }).join('') : '<li>' + vazio('Nothing missing.') + '</li>') + '</ul>' + (P.gereTudo(u()) ? '<div class="ps-card-body ps-small"><a href="' + rota('Backoffice?tab=indicadores') + '">Manage assignments</a></div>' : '') + '</div>' +
      '<div class="ps-card">' + cabCartao('Next due dates', 'cal') + '<ul class="ps-list">' + (prox.length ? prox.map(function (m) { return '<li><a class="ps-row" href="' + rota('Milestone/' + m.id) + '"><span class="ps-row-txt"><b>' + e(m.nome) + '</b><span>' + emp(m.empresa) + '</span></span><b class="ps-nowrap ps-small">' + e(P.fmtDataAno(m.prazo)) + '</b></a></li>'; }).join('') : '<li>' + vazio('No upcoming due dates.') + '</li>') + '</ul></div></div></div>';
  };
  C.estF = function (el) { U.est[el.dataset.id] = el.value; };
  A.estVista = function (d) { U.est.vista = d.v; R(); };
  A.estTab = function (d) { U.est.estado = d.v; R(); };
  A.estExcel = function () {
    P.escreverFolhas('reporting-status-' + S.ciclo.ano + '.xlsx', { status: filtroEstado(linhasEstado()).map(function (x) {
      var it = P.item(x.c.id);
      return { id: x.c.id, esrs_id: P.esrsDe(x.c.id).dps.join(', '), kpi: x.c.nome, description: P.esrsDe(x.c.id).desc, esrs: x.c.esrs_requisito, period: P.rotPeriodo(x.m), perimeter: x.m.empresa, milestone: x.m.nome, assigned_to: x.d ? x.d.nome : '', due: x.m.prazo, status: x.s.txt, value: it.valor === null ? '' : it.valor, unit: x.c.unidade_medida };
    }) });
    toast('Reporting status exported.', 'ok');
  };

  /* --- Entrada de dados ----------------------------------------------------------- */
  U.de = { tab: 'manual', norma: '', id: '', ms: '', valor: '', qual: 'medido', multi: false, linhas: [], just: '', conf: false, metodo: '', evid: '', excel: null };
  var preenchiveis = function (usr) {
    var l = [];
    cicloMs().forEach(function (m) { if (P.podePreencher(m, usr)) m.indicadores.forEach(function (id) { l.push({ id: id, m: m, c: P.cat(id) }); }); });
    return l;
  };
  /* Varios valores no mesmo periodo: a regra da empresa, se existir; senao, uma linha por empresa ou origem, juntas pela agregacao do indicador */
  var regraDe = function (m, id) { var r = P.regraEnt(m.empresa, id); return r.multi ? r : { multi: true, por: '', agreg: P.agregacao(id) }; };
  var carregarDe = function (x) {
    var d = U.de, it = P.item(x.id, P.chave(x.m));
    d.id = x.id; d.ms = x.m.id; d.valor = it.valor === null ? (it.rascunho || '') : String(it.valor).replace('.', ','); d.qual = it.qualidade; d.just = it.justificacao || ''; d.metodo = it.metodo || ''; d.conf = false; d.evid = '';
    d.linhas = (it.entradas || []).map(function (l) { return { local: l.local, doc: l.doc, valor: l.valor, peso: l.peso }; });
    d.multi = d.linhas.length > 0;
  };
  var abaManual = function (usr) {
    var d = U.de, todos = preenchiveis(usr), lista = todos.filter(function (x) { return !d.norma || x.c.esrs === d.norma; });
    if (!todos.length) return '<div class="ps-card">' + vazio('No task is in collection with you right now.') + '</div>';
    /* O mesmo KPI pode estar num trimestre e no ano: a escolha e sempre o par milestone e KPI */
    var x = lista.filter(function (y) { return y.id === d.id && y.m.id === d.ms; })[0];
    if (!x && lista.length) { x = lista[0]; carregarDe(x); }
    var normas = S.mat.filter(function (n) { return todos.some(function (y) { return y.c.esrs === n.norma; }); });
    var topo = '<div class="ps-form">' + campo('de-norma', 'ESRS standard', '<select id="de-norma" class="ps-sel" data-c="deNorma">' + opt('', 'All', d.norma) + normas.map(function (n) { return opt(n.norma, n.norma + ' ' + n.tema, d.norma); }).join('') + '</select>') +
      campo('de-id', 'Data point *', lista.length ? '<select id="de-id" class="ps-sel" data-c="deId">' + lista.map(function (y) { return opt(y.m.id + '|' + y.id, (y.c.esrs_requisito ? y.c.esrs_requisito + ', ' : '') + y.c.nome + ' (' + P.rotPeriodo(y.m) + ', ' + y.m.empresa + ')', d.ms + '|' + d.id); }).join('') + '</select>' : '<span class="ps-mut">None for this standard</span>');
    if (!x) return '<div class="ps-card"><div class="ps-card-body">' + topo + '</div></div></div>';
    var c = x.c, m = x.m, ant = P.valorAnterior(c.id, P.chave(m)), regra = regraDe(m, c.id), media = regra.agreg === 'media';
    var total = d.multi ? P.agregar(d.linhas, regra.agreg) : P.lerNumero(d.valor), bruto = !d.multi && String(d.valor).trim() !== '' && total === null;
    var v = total === null ? { erros: [], alertas: [], variacao: null } : P.validar(c, total, P.chave(m)), temAlerta = v.alertas.length > 0, ic = function (ok, t, warn) { return '<div class="ps-regra"><span class="ps-chip ' + (ok ? 'ok' : warn ? 'warn' : 'err') + '">' + (ok ? 'OK' : warn ? 'Warning' : 'Error') + '</span><span>' + e(t) + '</span></div>'; };
    var cheio = total !== null || bruto;
    return '<div class="ps-card">' + cabCartao('Manual entry', 'doc', '<span class="ps-mut ps-small">Fields marked with * are required</span>') + '<div class="ps-card-body">' + topo + '</div><p class="ps-de-desc ps-mt">' + (P.esrsDe(c.id).dps.length ? '<span class="ps-mono">' + e(P.esrsDe(c.id).dps.join(', ')) + '</span> ' : '') + e(P.esrsDe(c.id).desc) + '</p><div class="ps-form">' +
      campo('de-emp', 'Perimeter', '<input id="de-emp" class="ps-in" readonly value="' + e(m.empresa) + '">') + campo('de-per', 'Period', '<input id="de-per" class="ps-in" readonly value="' + e(P.rotPeriodo(m)) + '">') +
      (d.multi ? campo('de-tot', 'Value (' + P.AGREGACOES[regra.agreg].toLowerCase() + ')', '<input id="de-tot" class="ps-in ps-num" readonly value="' + e(total === null ? '' : P.fmtNum(total, c.casas_decimais)) + '">') : '<div class="ps-campo"><label class="ps-lab" for="de-val">Value *</label><input id="de-val" class="ps-in ps-num"' + X.numAttr(c.id) + ' autocomplete="off" data-c="deVal" value="' + e(d.valor) + '"><small class="ps-mut">' + e(P.rotAnterior(P.chave(m))) + ': ' + (ant === null || ant === undefined ? 'no value' : e(fmtV(c.id, ant) + ' ' + c.unidade_medida)) + '</small></div>') +
      campo('de-uni', 'Unit', '<input id="de-uni" class="ps-in" readonly value="' + e(c.unidade_medida) + '">') +
      campo('de-q', 'Data type *', '<select id="de-q" class="ps-sel" data-c="deQ">' + opt('medido', 'Measured', d.qual) + opt('estimado', 'Estimated', d.qual) + opt('calculado', 'Calculated', d.qual) + '</select>') +
      (d.qual === 'estimado' ? campo('de-met', 'Estimation method *', '<input id="de-met" class="ps-in" data-c="deMet" value="' + e(d.metodo) + '">') : '') + '</div>' +
      (regra.multi ? '<div class="ps-de-multi ps-mt"><label class="ps-chk"><input id="de-multi" type="checkbox" data-c="deMulti"' + (d.multi ? ' checked' : '') + '> Enter several values for this KPI in the same period' + (regra.por ? ' (by ' + e(regra.por.toLowerCase()) + ')' : '') + '</label>' +
        (d.multi ? '<div class="ps-tw ps-mt"><table class="ps-t ps-t-ent"><thead><tr><th>' + e(regra.por || 'Entry') + '</th><th>Supporting document</th><th class="dir">Value (' + e(c.unidade_medida) + ')</th>' + (media ? '<th class="dir">Weight</th>' : '') + '<th><span class="ps-sr">Remove</span></th></tr></thead><tbody>' + d.linhas.map(function (l, i) {
          return '<tr><td><input id="de-l-' + i + '" class="ps-in" aria-label="Entry ' + (i + 1) + '" data-c="deLinha" data-id="' + i + '" data-f="local" value="' + e(l.local) + '"></td><td><input id="de-d-' + i + '" class="ps-in" aria-label="Document of entry ' + (i + 1) + '" data-c="deLinha" data-id="' + i + '" data-f="doc" value="' + e(l.doc) + '"></td><td class="dir"><input id="de-v-' + i + '" class="ps-in ps-num"' + X.numAttr(c.id) + ' aria-label="Value of entry ' + (i + 1) + '" data-c="deLinha" data-id="' + i + '" data-f="valor" value="' + e(l.valor) + '"></td>' + (media ? '<td class="dir"><input id="de-w-' + i + '" class="ps-in ps-num" inputmode="decimal" aria-label="Weight of entry ' + (i + 1) + '" data-c="deLinha" data-id="' + i + '" data-f="peso" value="' + e(l.peso) + '"></td>' : '') + '<td><button type="button" class="ps-btn peq err" data-a="deTirar" data-v="' + i + '" aria-label="Remove entry ' + (i + 1) + '">×</button></td></tr>';
        }).join('') + '</tbody></table></div><div class="ps-sp-b ps-mt"><span class="ps-sp"><button type="button" class="ps-btn peq" data-a="deLinhaNova">Add entry</button><button type="button" class="ps-btn peq" data-a="deEmpresas" title="One row for each company in the group perimeter">One row per company</button></span><b class="ps-num">' + e(P.AGREGACOES[regra.agreg]) + ': ' + (total === null ? '-' : e(P.fmtNum(total, c.casas_decimais) + ' ' + c.unidade_medida)) + ', ' + d.linhas.length + ' entries</b></div>' : '') + '</div>' : '') +
      '<div class="ps-de-regras ps-mt"><div class="ps-sp-b"><b>Validation rules for this data point</b><span class="ps-small ps-mut">Change threshold against the prior year: ±' + e(P.limiarDe(c)) + '%' + (P.gereTudo(usr) ? ', <a href="#/Backoffice?tab=indicadores" data-a="deRegras">change</a>' : '') + '</span></div><div class="ps-de-regras-g ps-mt">' +
      ic(cheio, cheio ? 'Required fields filled in' : 'Value missing') + ic(!bruto && !v.erros.length, bruto ? 'The value is not numeric' : v.erros[0] || 'Numeric value within range') + ic(true, 'Unit set by the indicator: ' + c.unidade_medida) + ic(S.ciclo.estado === 'aberto', 'Period ' + m.ano + ' open') + ic(!temAlerta, temAlerta ? 'Change of ' + variacaoTxt(v.variacao) + ' or a consistency rule to confirm' : v.variacao === null ? 'No prior year to compare' : 'Change of ' + variacaoTxt(v.variacao) + ' within the threshold', true) + '</div></div>' +
      (temAlerta ? '<div class="ps-de-alerta ps-mt" role="alert"><p><b>Review the value before saving.</b> Confirm the unit, the period and the evidence. If the value is correct, justify it.</p><ul>' + v.alertas.map(function (a) { return '<li>' + e(a) + '</li>'; }).join('') + '</ul>' + campo('de-just', 'Justification *', '<textarea id="de-just" class="ps-ta" data-c="deJust">' + e(d.just) + '</textarea>') + '<label class="ps-chk ps-mt"><input id="de-conf" type="checkbox" data-c="deConf"' + (d.conf ? ' checked' : '') + '> I reviewed the value and the evidence and the value is correct</label><p class="ps-small ps-mt">The approver sees this alert and the justification, and the event stays in the audit trail.</p></div>' : '') +
      '<div class="ps-sp ps-mt"><button type="button" id="de-evid" class="ps-btn" data-a="deEvid">' + (d.evid ? 'Evidence: ' + e(d.evid) : 'Attach evidence') + '</button>' + (c.evidencia_obrigatoria ? (P.item(c.id, P.chave(m)).evidencias.length || d.evid ? chip('Evidence attached', 'ok') : chip('Evidence required', 'warn')) : '') + '</div>' +
      '<div class="ps-sp-b ps-mt"><a class="ps-small" href="' + rota('Milestone/' + m.id) + '">Open ' + e(m.nome) + '</a><span class="ps-sp"><button type="button" class="ps-btn" data-a="deSubmeter">Submit the task</button><button type="button" class="ps-btn pri" data-a="deGuardar">Save value</button></span></div></div></div>';
  };
  /* --- Excel offline: os KPIs em recolha com a pessoa, preenchidos fora e carregados de novo --- */
  U.off = { split: false, res: null, ids: null };
  var msOffline = function (usr) {
    var todas = cicloMs().filter(function (m) { return P.podePreencher(m, usr); });
    return U.off.ids ? todas.filter(function (m) { return U.off.ids.indexOf(m.id) > -1; }) : todas;
  };
  var cartaoOffline = function (usr) {
    var lista = msOffline(usr), nk = lista.reduce(function (a, m) { return a + m.indicadores.length; }, 0), ng = P.empresasGrupo().length, x = U.off.res;
    var topo = '<div class="ps-off"><ol class="ps-off-p"><li><b>Download</b><span>' + nk + ' KPI(s) in ' + lista.length + ' task(s) in collection with you, with what is already saved.</span></li><li><b>Fill in offline</b><span>Only the value column is needed. The file explains the rest.</span></li><li><b>Upload it again</b><span>Every row is validated as if typed. Rows that did not change are skipped.</span></li></ol>' +
      '<label class="ps-chk ps-mt"><input id="off-split" type="checkbox" data-c="offSplit"' + (U.off.split ? ' checked' : '') + '><span>One row per company (' + ng + ' companies in the group perimeter)<small class="ps-mut ps-blk">For KPIs you report for the whole group, company by company. The platform adds them up and keeps the value of each company.</small></span></label>' +
      '<div class="ps-sp ps-mt"><button type="button" class="ps-btn" data-a="offBaixar"' + (nk ? '' : ' disabled') + '>Download my KPIs (.xlsx)</button><button type="button" class="ps-btn pri" data-a="offCarregar"' + (lista.length ? '' : ' disabled') + '>' + X.svg(X.I.upload, 14) + 'Upload the filled-in file</button></div></div>';
    if (!x) return topo;
    if (x.erro) return topo + '<div class="ps-aviso err ps-mt" role="alert">' + e(x.nome) + ': ' + e(x.erro) + '</div>';
    var linhas = []; x.grupos.forEach(function (g) { g.rel.linhas.forEach(function (r) { linhas.push({ r: r, m: g.m }); }); });
    x.soltas.forEach(function (r) { linhas.push({ r: r, m: null }); });
    var cnt = function (st) { return linhas.filter(function (l) { return l.r.estado === st; }).length; }, ok = cnt('valida'), al = cnt('alerta'), rj = cnt('rejeitada'), ig = cnt('igual'), sep = linhas.filter(function (l) { return l.r.entradas && (l.r.estado === 'valida' || l.r.estado === 'alerta'); }).length;
    var com = linhas.filter(function (l) { return l.r.estado === 'alerta' || l.r.estado === 'rejeitada'; }).sort(function (a, b) { return a.r.n - b.r.n; });
    var rotLinha = function (r) { return r.ns && r.ns.length > 1 ? r.ns[0] + '-' + r.ns[r.ns.length - 1] : String(r.n); };
    return topo + '<div class="ps-off-res ps-mt"><div class="ps-sp-b"><b>' + e(x.nome) + '</b><span class="ps-sp">' + chip(ok + ' to apply', 'ok') + (al ? chip(al + ' with alert', 'warn') : '') + (rj ? chip(rj + ' with error', 'err') : '') + (ig ? chip(ig + ' unchanged') : '') + '</span></div>' +
      (sep ? '<p class="ps-small ps-mut ps-mt">' + sep + ' KPI(s) came with one row per company and will be saved as the sum of the companies (or the latest value or the average, as the indicator says).</p>' : '') +
      (com.length ? '<div class="ps-mt">' + tabela([{ t: 'Row' }, { t: 'KPI' }, { t: 'Perimeter' }, { t: 'Value', dir: 1 }, { t: 'Result' }], com.map(function (l) { var c = P.cat(l.r.indicador); return ['<span class="ps-nowrap">' + rotLinha(l.r) + '</span>', e(c ? c.nome : l.r.indicador || '-'), l.m ? emp(l.m.empresa) : '-', e(l.r.valor), chip(l.r.estado === 'alerta' ? 'Alert' : 'Error', l.r.estado === 'alerta' ? 'warn' : 'err') + ' <span class="ps-small">' + e(l.r.motivos.join(' ')) + '</span>']; })) + '</div>' : '<p class="ps-small ps-mt">No errors or alerts.</p>') +
      '<div class="ps-sp ps-mt"><button type="button" class="ps-btn pri" data-a="offAplicar"' + (ok + al ? '' : ' disabled') + '>Apply ' + (ok + al) + ' value(s)</button><button type="button" class="ps-btn" data-a="offCarregar">Fix and upload again</button></div></div>';
  };
  var abaExcel = function (usr) {
    if (U.off.ids) { U.off.ids = null; U.off.res = null; }
    return '<div class="ps-card">' + cabCartao('Work offline in Excel', 'doc') + '<div class="ps-card-body">' + cartaoOffline(usr) + '<p class="ps-small ps-mut ps-mt">To paste straight from Excel, open a task and use its grid.</p></div></div>';
  };
  /* Home, Tasks: o mesmo cartao num painel, so com as milestones da lista */
  X.Pn.offline = function () {
    return { t: 'Excel (offline)', s: 'Download your KPIs, fill them in Excel and upload the file again', largo: true, b: cartaoOffline(u()), p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' };
  };
  P.abrirOffline = function (ids) { U.off.ids = ids && ids.length ? ids : null; U.off.res = null; X.abrePainel('offline'); };
  C.offSplit = function (el) { U.off.split = el.checked; };
  A.offBaixar = function () {
    var usr = u(), lista = msOffline(usr);
    if (!lista.length) return toast('No task is in collection with you right now.', 'err');
    P.escreverFolhas('my-kpis-' + S.ciclo.ano + (U.off.split ? '-by-company' : '') + '.xlsx', P.folhasOffline(lista, U.off.split));
    toast('File downloaded. Fill in the value column and upload it again.', 'ok');
  };
  A.offCarregar = function () {
    X.escolherFicheiro('.xlsx', function (f) {
      P.lerFicheiro(f).then(function (r) {
        if (r.erro) { U.off.res = { nome: r.nome, erro: r.erro }; return R(); }
        var usr = u(), porMs = {}, soltas = [];
        r.linhas.forEach(function (l, i) {
          var m = P.ms(String(l.milestone_id === undefined ? '' : l.milestone_id).trim());
          if (m && P.podePreencher(m, usr)) (porMs[m.id] = porMs[m.id] || []).push({ l: l, n: i + 2 });
          else soltas.push({ n: i + 2, indicador: String(l.indicator_id || ''), valor: l.value, estado: 'rejeitada', motivos: [m ? m.nome + ' is not in collection with you.' : 'Unknown milestone_id: ' + (l.milestone_id || '(empty)') + '.'], dados: l });
        });
        var grupos = Object.keys(porMs).map(function (k) {
          var m = P.ms(k), rel = P.validarImportacao(m, porMs[k].map(function (x) { return x.l; }));
          rel.linhas.forEach(function (x) { x.n = porMs[k][x.n - 2].n; x.ns = (x.ns || []).map(function (q) { return porMs[k][q - 2].n; }); });
          return { m: m, rel: rel };
        });
        var fmt = grupos.filter(function (g) { return g.rel.erroFormato; })[0];
        U.off.res = fmt ? { nome: r.nome, erro: fmt.rel.erroFormato } : !grupos.length && !soltas.length ? { nome: r.nome, erro: 'The file has no data rows.' } : { nome: r.nome, grupos: grupos, soltas: soltas };
        R();
      });
    });
  };
  A.offAplicar = function () {
    var x = U.off.res, n = 0;
    if (!x || !x.grupos) return;
    x.grupos.forEach(function (g) { n += P.aplicarImportacao(g.m, g.rel, x.nome, u()); });
    U.off.res = null; U.de.id = '';
    toast(n + ' value(s) saved. Submit each task when it is complete.', 'ok'); R();
  };
  var abaApi = function (usr) {
    var ex = preenchiveis(usr)[0] || { id: 'A01', m: P.msDoIndicador('A01'), c: P.cat('A01') };
    var corpoJson = JSON.stringify({ milestone_id: ex.m.id, source_system: 'financial-system', records: [{ indicator_id: ex.id, entity: ex.m.empresa, period: String(ex.m.ano), value: 0, unit: ex.c.unidade_medida, evidence_ref: 'DOC-' + ex.m.ano + '-0001' }] }, null, 2);
    return '<div class="ps-card">' + cabCartao('Connections to other systems', 'ativ') + '<div class="ps-card-body">' + tabela([{ t: 'System' }, { t: 'Provides' }, { t: 'Frequency' }, { t: 'Status' }], S.apis.map(function (a, i) {
      var st = a.db && P.estadoSistema ? P.estadoSistema(a.db) : { ligada: a.estado === 'ligada', txt: '' };
      var estado = P.gereTudo(u()) ? '<select id="lg-' + i + '" class="ps-sel" aria-label="Status of ' + e(a.nome) + '" data-c="ligEstado" data-id="' + i + '">' + X.opt('ligada', 'Connected', a.estado) + X.opt('pendente', 'Waiting for credentials', a.estado) + '</select>' : chip(st.ligada ? 'Connected' : 'Waiting for credentials', st.ligada ? 'ok' : 'warn');
      return [e(a.nome), e(a.ambito), e((P.FREQ_LIGACAO || {})[a.frequencia] || a.frequencia), estado + (st.ligada ? '<small class="ps-mut ps-blk">' + e(st.txt) + '</small>' : '')];
    }), 'No connections yet.') +
      (P.gereTudo(usr) ? '<h3 class="ps-grupo-t">New connection</h3><div class="ps-form">' + campo('api-nome', 'System', '<input id="api-nome" class="ps-in">') + campo('api-amb', 'What it provides', '<input id="api-amb" class="ps-in">') + campo('api-frq', 'Frequency', '<select id="api-frq" class="ps-sel">' + opt('Hourly') + opt('Daily') + opt('Weekly') + opt('Monthly') + '</select>') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="apiNova">Add connection</button>' : '') + '</div></div>' +
      '<div class="ps-card ps-mt">' + cabCartao('Contract for direct integration', 'doc') + '<div class="ps-card-body"><p class="ps-small ps-mut">Each system sends this format. It follows the same validation as a file.</p><pre class="ps-pre ps-mt">POST /api/v1/datapoints\n' + e(corpoJson) + '</pre></div></div>';
  };
  P.ligacoesHtml = function () { return abaApi(u()); };
  Blocos['data-entry'] = function () {
    var usr = u(), t = U.de.tab;
    return '<div class="ps-filtros">' + pills('deTab', [['manual', 'Manual'], ['excel', 'Excel upload'], ['api', 'API connection']], t) + '</div>' + (t === 'excel' ? abaExcel(usr) : t === 'api' ? abaApi(usr) : abaManual(usr));
  };
  var msDe = function () { return U.de.id && U.de.ms ? P.ms(U.de.ms) : null; };
  A.deTab = function (d) { U.de.tab = d.v; R(); };
  A.deRegras = function () { U.boTab = 'indicadores'; };
  C.deNorma = function (el) { U.de.norma = el.value; U.de.id = ''; };
  C.deId = function (el) { var p = el.value.split('|'), m = P.ms(p[0]); if (m) carregarDe({ id: p[1], m: m }); };
  C.deVal = function (el) { U.de.valor = el.value; };
  C.deQ = function (el) { U.de.qual = el.value; };
  C.deMet = function (el) { U.de.metodo = el.value; };
  C.deJust = function (el) { U.de.just = el.value; };
  C.deConf = function (el) { U.de.conf = el.checked; };
  C.deMulti = function (el) { var d = U.de; d.multi = el.checked; if (d.multi && !d.linhas.length) d.linhas = [{ local: '', doc: '', valor: d.valor, peso: '' }]; };
  C.deLinha = function (el) { U.de.linhas[+el.dataset.id][el.dataset.f] = el.value; };
  /* Quem reporta o grupo empresa a empresa: uma linha por empresa do perimetro, sem as escrever a mao */
  A.deEmpresas = function () {
    var d = U.de, ja = {}, grupo = P.empresasLinhas(P.cat(d.id));
    d.linhas.forEach(function (l) { ja[String(l.local).trim()] = l; });
    var outras = d.linhas.filter(function (l) { var n = String(l.local).trim(); return n && String(l.valor).trim() && !grupo.some(function (x) { return x.nome === n; }); });
    d.linhas = grupo.map(function (x) { return ja[x.nome] || { local: x.nome, doc: '', valor: '', peso: '' }; }).concat(outras);
    R(); toast(grupo.length + ' companies listed. Fill in the value of each one.', 'ok');
  };
  A.deLinhaNova = function () { U.de.linhas.push({ local: '', doc: '', valor: '', peso: '' }); R(); };
  A.deTirar = function (d) { U.de.linhas.splice(+d.v, 1); R(); };
  A.deEvid = function () { X.escolherFicheiro('', function (f) { U.de.evid = f.name; U.de.evidF = f; R(); }); };
  A.deGuardar = function () {
    var d = U.de, usr = u(), m = msDe(), id = d.id;
    if (!m || !P.podePreencher(m, usr)) return toast('This task is not with you right now.', 'err');
    var c = P.cat(id), it = P.item(id, P.chave(m)), regra = regraDe(m, id);
    var total = d.multi ? P.agregar(d.linhas, regra.agreg) : P.lerNumero(d.valor);
    if (total === null) { toast(d.multi ? 'Enter at least one numeric value.' : 'The value must be numeric.', 'err'); var ve = document.getElementById(d.multi ? 'de-v-0' : 'de-val'); if (ve) ve.focus(); return; }
    var v = P.validar(c, total, P.chave(m));
    if (v.erros.length) return toast(v.erros[0], 'err');
    if (v.alertas.length && !d.just.trim()) { toast('Write the justification.', 'err'); var j = document.getElementById('de-just'); if (j) j.focus(); return; }
    if (v.alertas.length && !d.conf) { toast('Confirm that you reviewed the value.', 'err'); var k = document.getElementById('de-conf'); if (k) k.focus(); return; }
    if (d.qual === 'estimado' && !d.metodo.trim()) { toast('Write the estimation method.', 'err'); return; }
    if (d.multi) { var r = P.gravarEntradas(m, id, d.linhas, regra.agreg, usr); if (r.erro) return toast(r.erro, 'err'); } else { it.entradas = []; P.gravarValor(m, id, d.valor, usr); }
    it.qualidade = d.qual; it.metodo = d.qual === 'estimado' ? d.metodo.trim() : '';
    if (v.alertas.length) it.justificacao = d.just.trim();
    if (d.evid) { P.anexar(it, d.evid, usr, P.guardarFicheiro(d.evidF)); P.evento(m, 'Evidence attached to ' + c.nome + ': ' + d.evid + '.', usr.nome); d.evid = ''; d.evidF = null; }
    P.guardar(); d.conf = false;
    toast('Value saved in ' + m.nome + '.', 'ok'); R();
  };
  A.deSubmeter = function () {
    var m = msDe(), r = m ? P.submeter(m, u()) : { erro: 'Choose a data point.' };
    if (r.erro) return toast(r.erro, 'err');
    if (r.faltas) { toast(r.faltas.length + ' item(s) missing. ' + r.faltas[0].msg, 'err'); return; }
    U.de.id = ''; toast('Task submitted.', 'ok'); R();
  };
  A.apiNova = function () { res(P.novaLigacao(val('api-nome'), val('api-amb'), val('api-frq'), u()), 'Connection added.'); };

  /* --- Aprovacoes ------------------------------------------------------------------- */
  U.apr = { filtro: 'todas', sel: '' };
  var alertasMs = function (m) { return m.indicadores.filter(function (id) { return P.validarItem(P.item(id, P.chave(m))).alertas.length; }); };
  /* Indicadores submetidos antes da task, a espera de revisao: aparecem aqui logo, um a um */
  var filaRevisao = function (usr) {
    var l = P.revParaMim ? P.revParaMim(usr) : [];
    if (!l.length) return '';
    return '<div class="ps-card rev-fila">' + cabCartao('Indicators waiting for your approval (' + l.length + ')', 'tarefa', '<span class="ps-mut ps-small">Submitted ahead of their task. Approve them so they move on.</span>') + '<div class="ps-card-body">' +
      tabela([{ t: 'Indicator' }, { t: 'Period' }, { t: 'Company' }, { t: 'Value', dir: 1 }, { t: 'Change', dir: 1 }, { t: 'Submitted' }, { t: '' }], l.map(function (x) {
        var it = P.item(x.id, P.chave(x.m)), c = P.cat(x.id), v = P.validarItem(it);
        return ['<b>' + e(c.nome) + '</b> <span class="ps-mut ps-small">' + e(x.id) + '</span>', (P.tagPer(x.m) || e(P.rotPeriodo(x.m))), emp(x.m.empresa), it.valor === null ? '-' : e(fmtV(x.id, it.valor) + ' ' + c.unidade_medida), v.variacao === null ? '-' : '<span class="' + (v.alertas.length ? 'ps-txt-err' : '') + '">' + (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%</span>', e(it.submetido.por + ', ' + P.fmtDataHora(it.submetido.em)), '<a class="ps-btn peq pri" href="' + X.rota('Milestone/' + x.m.id + '?ind=' + encodeURIComponent(x.id)) + '">Review →</a>'];
      })) + '</div></div>';
  };
  Blocos['approvals'] = function () {
    var usr = u(), todas = aprovaveis(), f = U.apr, minhas = todas.filter(function (m) { return P.esperaPor(m, usr); }), alerta = todas.filter(function (m) { return alertasMs(m).length; });
    if (U.rota.q.ms && !f.sel) f.sel = U.rota.q.ms;
    var lista = f.filtro === 'minhas' ? minhas : f.filtro === 'alertas' ? alerta : todas, m = lista.filter(function (x) { return x.id === f.sel; })[0] || lista[0];
    var passos = S.wfbase.filter(function (p) { return p.tipo !== 'validacao' && p.tipo !== 'publicacao'; });
    var det = '';
    if (m) {
      var al = alertasMs(m), podeA = P.podeAgir(m, usr), viola = P.violaSegregacao(m, usr), p = P.passoAtual(m), rec = m.passos.filter(function (x) { return x.tipo === 'recolha'; })[0];
      var verbo = p.tipo === 'aprovacao' ? 'Approve' : p.tipo === 'parecer' ? 'Give opinion' : 'Complete review';
      det = '<div class="ps-card ps-apr-det">' + cabCartao(m.nome, 'tarefa', estChip(m)) + '<div class="ps-card-body"><p class="ps-small ps-mut">' + emp(m.empresa) + ', ' + e(m.ano) + (rec && rec.concluido_por ? ', submitted by ' + e(rec.concluido_por) : '') + '</p><p class="ps-small ps-mt"><b>Current step:</b> ' + e(p.nome) + ': ' + e(P.nomeResp(m, p.responsavel)) + '</p>' +
        '<div class="ps-tw ps-mt"><table class="ps-t ps-t-apr"><thead><tr><th>Indicator</th><th class="dir">Value</th><th class="dir">' + e(P.rotAnterior(P.chave(m))) + '</th><th class="dir">Change</th></tr></thead><tbody>' + m.indicadores.map(function (id) {
          var c = P.cat(id), it = P.item(id, P.chave(m)), v = P.validarItem(it), ant = P.valorAnterior(id, P.chave(m));
          return '<tr><td class="prim">' + e(c.nome) + '</td><td class="dir ps-num">' + (it.valor === null ? '-' : e(fmtV(id, it.valor) + ' ' + c.unidade_medida)) + '</td><td class="dir ps-num">' + (ant === null || ant === undefined ? '-' : e(fmtV(id, ant))) + '</td><td class="dir ps-num ' + (v.alertas.length ? 'ps-txt-err' : '') + '">' + e(variacaoTxt(v.variacao)) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (al.length ? '<div class="ps-aviso err ps-mt">' + al.map(function (id) { var it = P.item(id, P.chave(m)); return '<div><b>' + e(P.cat(id).nome) + '.</b> ' + e(P.validarItem(it).alertas[0]) + (it.justificacao ? ' Justification: "' + e(it.justificacao) + '"' : '') + '</div>'; }).join('') + '</div>' : '') +
        '<h3 class="ps-grupo-t">Evidence</h3>' + (function () { var ev = [], sis = m.indicadores.map(function (id) { return P.extracaoHtml ? P.extracaoHtml(m, id) : ''; }).filter(Boolean); m.indicadores.forEach(function (id) { P.item(id, P.chave(m)).evidencias.forEach(function (x) { ev.push(x); }); }); (m.documentos_gerais || []).forEach(function (x) { ev.push(x); }); return ev.length || sis.length ? '<ul class="ps-apr-ev">' + sis.map(function (h) { return '<li>' + h + '</li>'; }).join('') + ev.map(function (n) { return '<li>' + P.fichHtml(n, '', m) + '</li>'; }).join('') + '</ul>' : '<p class="ps-mut ps-small">No evidence attached.</p>'; })() +
        (podeA ? (viola ? '<div class="ps-aviso warn ps-mt">You submitted this task, so someone else has to decide on it.</div>' : campo('apr-com', 'Comment (required to return)', '<textarea id="apr-com" class="ps-ta"></textarea>') + '<div class="ps-sp ps-mt ps-apr-acts"><button type="button" class="ps-btn" data-a="aprDevolver" data-v="' + e(m.id) + '">Return</button><button type="button" class="ps-btn pri" data-a="aprAprovar" data-v="' + e(m.id) + '">' + e(verbo) + '</button></div>') : '<p class="ps-small ps-mut ps-mt">This step is with ' + e(P.nomeResp(m, p.responsavel)) + '.</p>') +
        '<p class="ps-small ps-mt"><a href="' + rota('Milestone/' + m.id) + '">Open the task</a></p></div></div>';
    }
    return filaRevisao(usr) + '<div class="ps-card ps-apr-passos' + (P.revParaMim && P.revParaMim(usr).length ? ' ps-mt' : '') + '">' + passos.map(function (p, i) { return '<div class="ps-apr-p"><i>' + (i + 1) + '</i><span><b>' + e(p.nome) + '</b><small>' + e(P.nomeResp(null, p.responsavel)) + '</small></span></div>'; }).join('') + '</div>' +
      '<div class="ps-grid-apr ps-mt"><div class="ps-card"><div class="ps-card-body">' + pills('aprFiltro', [['todas', 'All', todas.length], ['minhas', 'Waiting on me', minhas.length], ['alertas', 'With alerts', alerta.length]], f.filtro) + '<div class="ps-mt">' +
      tabela([{ t: 'Task' }, { t: 'Perimeter' }, { t: 'Assigned to' }, { t: 'Alerts', dir: 1 }, { t: 'Deadline' }], lista.map(function (x) {
        return { attrs: (m && x.id === m.id ? 'class="ps-sel-l" aria-selected="true"' : ''), celulas: ['<button type="button" class="ps-btn liga" data-a="aprVer" data-v="' + e(x.id) + '">' + e(x.nome) + '</button>', emp(x.empresa), atribHtml(x), alertasMs(x).length, '<span class="ps-nowrap">' + e(X.prazoTxt(x)) + '</span>'] };
      }), 'Nothing waiting here.') + '</div></div></div>' + (det || '<div class="ps-card">' + vazio('Choose a task.') + '</div>') + '</div>';
  };
  A.aprFiltro = function (d) { U.apr.filtro = d.v; U.apr.sel = ''; R(); };
  A.aprVer = function (d) { U.apr.sel = d.v; R(); };
  A.aprAprovar = function (d) { var m = P.ms(d.v); U.apr.sel = ''; res(P.concluirPasso(m, u(), val('apr-com')), 'Decision saved. It is in the audit trail.'); };
  A.aprDevolver = function (d) { var r = P.devolver(P.ms(d.v), u(), val('apr-com')); if (r.erro) { toast(r.erro, 'err'); var c = document.getElementById('apr-com'); if (c) c.focus(); return; } U.apr.sel = ''; toast('Returned to the unit.', 'ok'); R(); };

  /* --- Evidencias ---------------------------------------------------------------------- */
  U.evd = { sel: '', fora: {}, dest: 'Auditor externo, assurance limitada' };
  var kpisEvidencia = function () {
    return catCiclo().filter(function (c) { return (c.evidencia_obrigatoria || P.item(c.id).evidencias.length) && P.podeVerIndicador(c, u()); });
  };
  var chaveEv = function (id, x) { return id + '|' + (x.id || x.ficheiro); };
  var pacote = function () {
    var l = [];
    kpisEvidencia().forEach(function (c) { P.item(c.id).evidencias.forEach(function (x) { if (!U.evd.fora[chaveEv(c.id, x)]) l.push({ c: c, x: x }); }); });
    return l;
  };
  Blocos['evidencias'] = function () {
    var usr = u(), lista = kpisEvidencia(), f = U.evd, atual = lista.filter(function (c) { return c.id === f.sel; })[0] || lista[0], pk = pacote(), nKpi = {};
    pk.forEach(function (x) { nKpi[x.c.id] = 1; });
    var ob = lista.filter(function (c) { return c.evidencia_obrigatoria; }), semEv = ob.filter(function (c) { return !P.item(c.id).evidencias.length; }).length;
    var banda = '<div class="ps-pac"><div><b>Package for the auditor</b><span>' + pk.length + ' files from ' + Object.keys(nKpi).length + ' KPIs, indexed against each value and the audit trail.' + (semEv ? ' ' + semEv + ' required KPI(s) still have no evidence.' : '') + '</span></div><div class="ps-pac-a">' + campo('pac-dest', 'Recipient', '<select id="pac-dest" class="ps-sel" data-c="pacDest">' + ['Auditor externo, assurance limitada', 'Auditoria interna'].map(function (o) { return opt(o, o, f.dest); }).join('') + '</select>') + '<button type="button" class="ps-btn" data-a="pacExcel">Export package index (Excel)</button></div></div>';
    if (!atual) return banda + '<div class="ps-card ps-mt">' + vazio('No KPI with evidence for your profile.') + '</div>';
    var it = P.item(atual.id), m = P.msDoIndicador(atual.id), pode = P.podePreencher(m, usr);
    return banda + '<div class="ps-grid-ev ps-mt"><div class="ps-card">' + cabCartao('KPIs and evidence', 'doc', '<span class="ps-mut ps-small">' + (ob.length - semEv) + ' of ' + ob.length + ' required covered</span>') + '<div class="ps-ev-lista">' + lista.map(function (c) {
      var n = P.item(c.id).evidencias.length, cls = n ? 'ok' : c.evidencia_obrigatoria ? 'err' : '';
      return '<button type="button" class="ps-ev-it ' + (c.id === atual.id ? 'on' : '') + '" data-a="evdVer" data-v="' + e(c.id) + '"><span><b>' + e(c.nome) + '</b><small>' + e(c.esrs_requisito || c.id) + ', ' + emp(P.msDoIndicador(c.id).empresa) + '</small></span>' + chip(n ? n + ' file' + (n > 1 ? 's' : '') : c.evidencia_obrigatoria ? 'Missing' : '0', cls) + '</button>';
    }).join('') + '</div></div>' +
      '<div class="ps-card">' + cabCartao(atual.nome, 'tarefa', '<span class="ps-mut ps-small">' + e(atual.esrs_requisito || atual.id) + ', ' + emp(m.empresa) + '</span>') + '<div class="ps-card-body">' +
      (pode ? '<button type="button" class="ps-de-drop" data-a="evdAnexar" data-v="' + e(atual.id) + '"><b>Attach evidence to this KPI</b><span>PDF, Excel, images or ZIP. The file name stays recorded with the value it supports.</span></button>' : '<div class="ps-aviso">Evidence can be attached while the task is in collection, by whoever has it.</div>') +
      '<div class="ps-mt">' + tabela([{ t: 'Include' }, { t: 'File' }, { t: 'Company and period' }, { t: 'Supports the value', dir: 1 }, { t: 'Uploaded by' }, { t: 'Status' }], it.evidencias.map(function (x, i) {
        var k = chaveEv(atual.id, x), est = P.estadoKpi(atual.id);
        return ['<label class="ps-chk"><input id="evs-' + i + '" type="checkbox" data-c="evdInc" data-id="' + e(k) + '"' + (f.fora[k] ? '' : ' checked') + '><span class="ps-sr">Include ' + e(x.ficheiro) + ' in the package</span></label>', P.fichHtml({ ficheiro: x.ficheiro, fid: x.fid, id: x.id }, '', m), emp(m.empresa) + ', ' + e(m.ano), it.valor === null ? '-' : e(fmtV(atual.id, it.valor) + ' ' + atual.unidade_medida), e(x.por || '-') + (x.em ? '<small class="ps-mut ps-blk">' + e(P.fmtDataHora(x.em)) + '</small>' : ''), chip(est.txt, est.cls)];
      }), 'No evidence yet.') + '</div>' + (atual.evidencia_obrigatoria && !it.evidencias.length ? '<div class="ps-aviso warn ps-mt">Evidence is required for this KPI. The reported value has no support in the auditor package.</div>' : '') + '</div></div></div>';
  };
  A.evdVer = function (d) { U.evd.sel = d.v; R(); };
  /* Remover um ficheiro carregado: pop-up com o que vai ser removido e quem o carregou; fica no historico da milestone */
  X.Pn.fichRem = function (a) {
    var m = P.ms(a.ms), r = m ? P.acharFicheiro(m, a.k) : null;
    if (!r) return { t: 'Remove file', cls: 'conf', b: '<div class="ps-aviso">This file is no longer in the task.</div>', p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>' };
    var x = r.x;
    return { t: 'Remove this file?', s: m.nome, cls: 'conf',
      b: '<div class="ps-conf"><span class="ps-conf-ic" aria-hidden="true">' + X.svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/>', 26) + '</span><div>' +
        '<p><b>' + e(x.ficheiro) + '</b> will be removed from ' + (r.ind ? 'the evidence of <b>' + e(P.cat(r.ind).nome) + '</b>' : 'the documents of this task') + '.</p>' +
        '<ul class="ps-conf-l"><li>Uploaded by <b class="fr-q">' + e(x.por || 'unknown') + '</b></li><li>On <b class="fr-q">' + e(x.em ? P.fmtDataHora(x.em) : 'unknown date') + '</b></li></ul>' +
        '<p class="ps-small ps-mut">The removal stays in the task history, with who removed it, when, and who had uploaded it.' + (r.ind && P.cat(r.ind).evidencia_obrigatoria && r.lista.length === 1 ? ' This indicator requires evidence: the task cannot be submitted without another file.' : '') + '</p></div></div>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn err cheio" data-a="fichRemoverSim">Remove file</button>' };
  };
  A.fichRemover = function (d) { var p = d.v.split('|'); X.abrePainel('fichRem', { ms: p[0], k: p.slice(1).join('|') }); };
  A.fichRemoverSim = function () {
    var a = X.U.painel && X.U.painel.args, m = a ? P.ms(a.ms) : null, r = m ? P.removerFicheiro(m, a.k, u()) : { erro: 'Task not found.' };
    X.U.painel = null;
    if (r.erro) { R(); return toast(r.erro, 'err'); }
    toast(r.nome + ' removed. It is in the task history.', 'ok'); R();
  };
  C.evdInc = function (el) { if (el.checked) delete U.evd.fora[el.dataset.id]; else U.evd.fora[el.dataset.id] = 1; };
  C.pacDest = function (el) { U.evd.dest = el.value; };
  A.evdAnexar = function (d) { var m = P.msDoIndicador(d.v), usr = u(); X.escolherFicheiro('', function (f) { P.anexar(P.item(d.v), f.name, usr, P.guardarFicheiro(f)); P.evento(m, 'Evidence attached to ' + P.cat(d.v).nome + ': ' + f.name + '.', usr.nome); P.guardar(); toast('Evidence attached.', 'ok'); R(); }); };
  A.pacExcel = function () {
    var pk = pacote();
    (P.livroObjetos ? function (n, f) { return P.livroObjetos(n, f, { titulo: 'Auditor package ' + S.ciclo.ano, descricoes: { package: 'Who the package is for, when and by whom it was generated, and the integrity seals.', evidence_index: 'Each indicator in the package with its value and evidence files.' } }); } : P.escreverFolhas)('auditor-package-' + S.ciclo.ano + '.xlsx', {
      package: [{ recipient: U.evd.dest, generated_at: new Date().toISOString(), generated_by: u().nome, files: pk.length, chain_seals: S.selos.length, last_seal: S.selos.length ? S.selos[S.selos.length - 1].h : '' }],
      evidence_index: pk.map(function (x) { var it = P.item(x.c.id), m = P.msDoIndicador(x.c.id); return { kpi_id: x.c.id, esrs_id: P.esrsDe(x.c.id).dps.join(', '), kpi: x.c.nome, esrs: x.c.esrs_requisito, company: m.empresa, value: it.valor === null ? '' : it.valor, unit: x.c.unidade_medida, status: P.estadoKpi(x.c.id).txt, file: x.x.ficheiro, uploaded_by: x.x.por, uploaded_at: x.x.em }; })
    });
    toast('Package index exported.', 'ok');
  };

  /* --- Registo com hash -------------------------------------------------------------- */
  U.tr = { q: '', norma: '', empresa: '', tipo: 'todos', dias: '30', ver: null, n: 50 };
  var TIPOS_CHIP = { Creation: 'info', Change: 'warn', Approval: 'ok', Return: 'err', Calculation: 'rev', Workflow: '' };
  var dentroPrazo = function (x, dias) { return dias === 'todos' || new Date(x.em) >= new Date(Date.now() - 86400000 * Number(dias)); };
  var filtrarTrilho = function (semTipo) {
    var f = U.tr, q = f.q.toLowerCase();
    return P.trilho().filter(function (x) {
      var c = x.ind ? P.cat(x.ind) : null;
      if (!semTipo && f.tipo !== 'todos' && x.tipo !== f.tipo) return false;
      if (f.norma && !(c && c.esrs === f.norma)) return false;
      if (f.empresa && !(x.m && x.m.empresa === f.empresa)) return false;
      if (!dentroPrazo(x, f.dias)) return false;
      return !q || (tituloEvento(x) + ' ' + x.por + ' ' + (x.m ? x.m.nome : '') + ' ' + x.motivo).toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return a.em < b.em ? 1 : a.em > b.em ? -1 : 0; });
  };
  Blocos['trilho'] = function () {
    var f = U.tr, lista = filtrarTrilho(), v = f.ver || P.verificarSelos(), mostra = lista.slice(0, f.n), tipos = ['Creation', 'Change', 'Workflow', 'Approval', 'Return', 'Calculation'];
    return '<div class="ps-filtros ps-sp"><button type="button" class="ps-btn" data-a="trVerificar">Verify integrity</button><button type="button" class="ps-btn" data-a="trExcel">Export to Excel</button></div>' +
      (v.ok ? '<div class="ps-aviso ps-sp-b" role="status"><span><b>Sealed log.</b> Each event carries a hash chained to the one before: ' + v.total + ' events, no breaks' + (f.ver ? ', verified at ' + e(P.fmtDataHora(f.ver.em)) : '') + '.</span></div>' : '<div class="ps-aviso err" role="alert"><b>Integrity broken at event ' + v.quebra.pos + ' of ' + v.total + '.</b> ' + e(v.quebra.motivo) + ' Reference: <span class="ps-mono">' + e(v.quebra.k) + '</span></div>') +
      '<div class="ps-card ps-mt"><div class="ps-card-body"><div class="ps-form">' + campo('tr-q', 'Search', '<input id="tr-q" class="ps-in" placeholder="Data point, user, task" data-c="trF" data-id="q" value="' + e(f.q) + '">') +
      campo('tr-norma', 'ESRS standard', '<select id="tr-norma" class="ps-sel" data-c="trF" data-id="norma">' + opt('', 'All', f.norma) + S.mat.map(function (x) { return opt(x.norma, x.norma, f.norma); }).join('') + '</select>') +
      campo('tr-emp', 'Company', '<select id="tr-emp" class="ps-sel" data-c="trF" data-id="empresa">' + opt('', 'All', f.empresa) + S.ent.map(function (x) { return opt(x.nome, x.nome, f.empresa); }).join('') + '</select>') +
      campo('tr-dias', 'Period', '<select id="tr-dias" class="ps-sel" data-c="trF" data-id="dias">' + opt('30', 'Last 30 days', f.dias) + opt('90', 'Last 90 days', f.dias) + opt('todos', 'Whole history', f.dias) + '</select>') + '</div><div class="ps-mt">' + pills('trTipo', [['todos', 'All']].concat(tipos.map(function (t) { return [t, t]; })), f.tipo) + '</div></div></div>' +
      '<div class="ps-card ps-mt"><div class="ps-card-body">' + tabela([{ t: 'Date and time' }, { t: 'User' }, { t: 'Event' }, { t: 'Data point' }, { t: 'Company' }, { t: 'Previous and new value' }, { t: 'Source' }, { t: 'Reason' }, { t: 'Hash' }], mostra.map(function (x) {
        var c = x.ind ? P.cat(x.ind) : null, h = P.seloDe(x.k), casas = c ? c.casas_decimais : 0;
        var vals = x.ind ? (x.antes === null ? '' : '<s class="ps-mut">' + e(P.fmtNum(x.antes, casas)) + '</s> ') + '<b>' + e(x.depois === null ? '-' : P.fmtNum(x.depois, casas)) + '</b> ' + e(c.unidade_medida) : '<span class="ps-small">' + e(x.texto) + '</span>';
        return ['<span class="ps-nowrap">' + e(P.fmtDataHora(x.em)) + '</span>', e(x.por), chip(x.tipo, TIPOS_CHIP[x.tipo]), c ? e(c.nome) + '<br><small class="ps-mut">' + e(c.esrs_requisito || c.id) + '</small>' : (x.m ? e(x.m.nome) : '<span class="ps-mut">Configuration</span>'), x.m ? emp(x.m.empresa) : '-', vals, e(x.origem), x.motivo ? '<span class="ps-small">' + e(x.motivo) + '</span>' : '-', '<span class="ps-mono ps-hash" data-tip="' + e(h) + '" tabindex="0">' + e(h.slice(0, 8)) + '</span>'];
      }), 'No events match these filters.') + '<div class="ps-sp-b ps-mt ps-small ps-mut"><span>Showing ' + mostra.length + ' of ' + lista.length + ' events</span>' + (lista.length > f.n ? '<button type="button" class="ps-btn peq" data-a="trMais">Show more</button>' : '') + '</div></div></div>';
  };
  C.trF = function (el) { U.tr[el.dataset.id] = el.value; U.tr.n = 50; };
  A.trTipo = function (d) { U.tr.tipo = d.v; U.tr.n = 50; R(); };
  A.trMais = function () { U.tr.n += 100; R(); };
  A.trVerificar = function () { var v = P.verificarSelos(); v.em = new Date().toISOString(); U.tr.ver = v; toast(v.ok ? v.total + ' events verified, no breaks.' : 'Integrity broken.', v.ok ? 'ok' : 'err'); R(); };
  A.trExcel = function () {
    (P.livroObjetos ? function (n, f) { return P.livroObjetos(n, f, { titulo: 'Audit trail ' + S.ciclo.ano, descricoes: { audit_trail: 'Every event with the filters applied on screen: when, who, what changed and the hash that seals it.' } }); } : P.escreverFolhas)('audit-trail-' + S.ciclo.ano + '.xlsx', { audit_trail: filtrarTrilho().map(function (x) { var c = x.ind ? P.cat(x.ind) : null; return { at: x.em, user: x.por, event: x.tipo, data_point: c ? c.nome : '', esrs: c ? c.esrs_requisito : '', milestone: x.m ? x.m.nome : '', company: x.m ? x.m.empresa : '', previous: x.antes === undefined || x.antes === null ? '' : x.antes, new: x.depois === undefined || x.depois === null ? '' : x.depois, detail: x.texto, source: x.origem, reason: x.motivo, hash: P.seloDe(x.k) }; }) });
    toast('Audit trail exported.', 'ok');
  };

  /* --- Calculos ------------------------------------------------------------------------- */
  Blocos['calculos'] = function () {
    var usr = u(), calc = P.calcularFatores(), m = P.msDoIndicador('E06'), itE = P.item('E06'), pode = m && P.podePreencher(m, usr), gere = P.gereTudo(usr), forms = S.cat.filter(function (c) { return c.formula && P.podeVerIndicador(c, usr); });
    return '<div class="ps-grid-calc"><div class="ps-card">' + cabCartao('Configured formulas', 'doc', '<span class="ps-mut ps-small">' + forms.length + ' formulas</span>') + '<ul class="ps-form-l">' + forms.map(function (c) { var it = P.item(c.id); return '<li><div class="ps-sp-b"><b>' + e(c.nome) + '</b>' + cod(c) + '</div><code>' + e(c.formula) + '</code><small class="ps-mut">' + (it && it.valor !== null ? 'Current value: ' + e(fmtV(c.id, it.valor) + ' ' + c.unidade_medida) : 'No value yet') + '</small></li>'; }).join('') + '</ul></div>' +
      /* O simulador de Scope 1 saiu: as emissoes sao um input calculado fora (P.INPUT_CARBONO). Fica a biblioteca de fatores, como referencia */
      '<div class="ps-col"><div class="ps-aviso info">GHG emissions (Scope 1, 2 and 3 and carbon intensity) are not calculated here. Whoever reports them calculates them outside the platform and enters the result as an input in the task, and can attach the calculation as evidence.</div>' +
      /* A biblioteca de fatores de emissao deixou de estar visivel (pedido do cliente); os fatores ficam nos dados */
      '</div></div>';
  };
  C.calcQtd = function (el) { var n = P.lerNumero(el.value), f = S.fatores.filter(function (x) { return x.id === el.dataset.id; })[0]; if (n === null || n < 0) return toast('The quantity must be a number that is not negative.', 'err'); f.qtd = n; P.guardar(); };
  C.calcFator = function (el) { var f = S.fatores.filter(function (x) { return x.id === el.dataset.id; })[0], r = P.alterarFator(f, el.value, S.ciclo.ano, u()); if (r.erro) toast(r.erro, 'err'); };
  A.calcAplicar = function () { res(P.aplicarCalculo(u()), 'Result written to the task, with the factors used.'); };

  /* --- Empresas e perimetro ------------------------------------------------------------------ */
  U.per = { sel: '' };
  /* Companies and perimeter: uma so tabela. New company e Edit abrem o mesmo painel, com tudo o que a empresa tem. */
  var pesoTxt = function (y) { var p = P.pesoConsolidacao(y); return p === 0 ? 'Not counted' : P.fmtNum(p * 100, 0) + '%'; };
  Blocos['perimetro'] = function () {
    var adm = P.gereTudo(u()), inc = S.ent.filter(function (x) { return P.pesoConsolidacao(x) > 0; }).length;
    return '<div class="ps-card">' + cabCartao('Group companies (' + S.ent.length + ')', 'doc', adm ? '<button type="button" class="ps-btn pri peq" data-a="empNova">+ New company</button>' : '') + '<div class="ps-card-body">' +
      '<p class="ps-small ps-mut">' + inc + ' of ' + S.ent.length + ' companies count in the consolidated view: full and parent at 100%, proportional by ownership, equity method left out. Percentages and ratios are a weighted average.</p><div class="ps-mt">' +
      tabela([{ t: 'Company' }, { t: 'Country' }, { t: 'Consolidation' }, { t: 'ESRS perimeter' }, { t: 'Counts at', dir: 1 }, { t: 'Departments', dir: 1 }, { t: 'Tasks', dir: 1 }, { t: 'Actions' }], S.ent.map(function (y) {
        var nDep = P.depsDaEmpresa(y).length, nMs = cicloMs().filter(function (m) { return m.empresa === y.nome; }).length;
        return [(adm ? '<button type="button" class="ps-btn liga" data-a="empEditar" data-v="' + e(y.id) + '">' + emp(y.nome) + '</button>' : emp(y.nome)) + '<small class="ps-mut ps-blk">' + e([y.nipc ? 'Tax ' + y.nipc : '', y.nace ? 'NACE ' + y.nace : ''].filter(Boolean).join(', ') || ' ') + '</small>', e(y.pais || '-'), e(P.METODOS[y.metodo] || '-') + (y.metodo === 'mae' ? '' : '<small class="ps-mut ps-blk">' + e(P.fmtNum(y.detencao, 0)) + '% owned</small>'), y.perimetro_grupo ? chip('Included', 'ok') : chip('Excluded'), e(pesoTxt(y)), String(nDep), String(nMs),
          adm ? '<span class="ps-sp"><button type="button" class="ps-btn peq" data-a="empEditar" data-v="' + e(y.id) + '">Edit</button>' + (nMs ? '' : '<button type="button" class="ps-btn peq err" data-a="empApagar" data-v="' + e(y.id) + '">Remove</button>') + '</span>' : '-'];
      }), 'No companies yet.') + '</div></div></div>';
  };
  U.empEd = null;
  X.Pn.empEd = function () {
    var E = U.empEd, d = E.d, x = E.novo ? null : S.ent.filter(function (y) { return y.id === E.id; })[0];
    var cmp = function (k, rot, html, ajuda) { return '<div class="ps-campo"><label class="ps-lab" for="ee-' + k + '">' + e(rot) + '</label>' + html + (ajuda ? '<small class="ps-mut">' + e(ajuda) + '</small>' : '') + '</div>'; };
    var inp = function (k, extra) { return '<input id="ee-' + k + '" class="ps-in" data-c="empCampo" data-f="' + k + '" value="' + e(d[k] === undefined || d[k] === null ? '' : d[k]) + '"' + (extra || '') + '>'; };
    var regras = '';
    if (x) {
      var kpis = []; cicloMs().filter(function (m) { return m.empresa === x.nome; }).forEach(function (m) { m.indicadores.forEach(function (id) { if (!kpis.some(function (k) { return k.c.id === id; })) kpis.push({ c: P.cat(id), m: m }); }); });
      regras = '<details class="ki-sec ee-reg"' + (E.regras ? ' open' : '') + '><summary><h3>KPIs and data entry rules<small>' + kpis.length + ' KPI(s) in the current cycle</small></h3></summary><p class="ps-small ps-mut">When on, the company can enter several values for the same KPI in the same period. The platform combines them with the chosen rule. These save straight away.</p><div class="ps-mt">' + tabela([{ t: 'KPI' }, { t: 'Several entries' }, { t: 'Split by' }, { t: 'Aggregation' }], kpis.map(function (l) {
        var r = P.regraEnt(x.nome, l.c.id), id = e(l.c.id);
        return [e(l.c.nome) + '<br><small class="ps-mut">' + e(l.c.esrs_requisito || l.c.id) + '</small>', '<label class="ps-chk"><input id="pr-m-' + id + '" type="checkbox" data-c="perRegra" data-id="' + id + '" data-f="multi"' + (r.multi ? ' checked' : '') + '> ' + (r.multi ? 'Yes' : 'No') + '</label>', r.multi ? '<input id="pr-p-' + id + '" class="ps-in" aria-label="Split ' + e(l.c.nome) + ' by" data-c="perRegra" data-id="' + id + '" data-f="por" value="' + e(r.por) + '">' : '-', r.multi ? '<select id="pr-a-' + id + '" class="ps-sel" aria-label="Aggregation of ' + e(l.c.nome) + '" data-c="perRegra" data-id="' + id + '" data-f="agreg">' + Object.keys(P.AGREGACOES).map(function (k) { return opt(k, P.AGREGACOES[k], r.agreg); }).join('') + '</select>' : '-'];
      }), 'This company has no KPIs in the current cycle.') + '</div></details>';
    }
    var deps = x ? P.depsDaEmpresa(x) : [];
    return { t: E.novo ? 'New company' : 'Edit ' + d.nome, s: E.novo ? 'Add a company to the group' : 'Changes are saved when you click Save', largo: true, cls: 'alto ki-pan',
      b: (E.erros && E.erros.length ? '<div class="ps-aviso err" role="alert"><ul class="ki-err">' + E.erros.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul></div>' : '') +
        '<section class="ki-sec" style="--gc:#00338D"><h3>Company</h3><div class="ki-g"><div class="ki-full">' + cmp('nome', 'Company name *', inp('nome')) + '</div>' +
          cmp('pais', 'Country', inp('pais')) + cmp('moeda', 'Currency', inp('moeda', ' maxlength="3"')) + cmp('nipc', 'Tax number', inp('nipc')) + cmp('nace', 'Sector (NACE code)', inp('nace')) +
          cmp('instalacoes', 'Sites', inp('instalacoes', ' inputmode="numeric"')) + '</div></section>' +
        '<section class="ki-sec" style="--gc:#0091DA"><h3>Consolidation<small>How the company counts in the consolidated view</small></h3><div class="ki-g">' +
          cmp('metodo', 'Consolidation method', '<select id="ee-metodo" class="ps-sel" data-c="empCampo" data-f="metodo">' + Object.keys(P.METODOS).map(function (k) { return opt(k, P.METODOS[k], d.metodo); }).join('') + '</select>', 'Full and parent: 100%. Proportional: by ownership. Equity method: not counted.') +
          cmp('detencao', 'Ownership (%)', inp('detencao', ' inputmode="decimal"')) +
          '<div class="ki-full"><label class="ps-chk"><input id="ee-inc" type="checkbox" data-c="empInc"' + (d.perimetro_grupo ? ' checked' : '') + '> Include in the consolidated report (ESRS perimeter)</label></div></div></section>' +
        (x ? '<section class="ki-sec" style="--gc:#483698"><h3>Departments<small>' + deps.length + ' department(s) in this company</small></h3><p class="ps-small">' + (deps.length ? deps.map(function (n) { return '<span class="us-tag">' + X.avEquipa() + e(n) + '</span>'; }).join(' ') : '<span class="ps-mut">None yet.</span>') + '</p><p class="ps-small ps-mut">Choose the companies of each department in Backoffice, Departments.</p></section>' : '') + regras,
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="empGuardar">' + (E.novo ? 'Add company' : 'Save') + '</button>' };
  };
  var CAMPOS_EMP = ['nome', 'pais', 'moeda', 'nipc', 'nace', 'instalacoes', 'metodo', 'detencao', 'perimetro_grupo'];
  A.empNova = function () { U.empEd = { novo: true, d: { nome: '', pais: 'Portugal', moeda: 'EUR', nipc: '', nace: '', instalacoes: 0, metodo: 'integral', detencao: 100, perimetro_grupo: true }, erros: [] }; X.abrePainel('empEd'); };
  A.empEditar = function (d) { var x = S.ent.filter(function (y) { return y.id === d.v; })[0]; if (!x) return; var c = {}; CAMPOS_EMP.forEach(function (k) { c[k] = x[k]; }); U.per.sel = x.id; U.empEd = { novo: false, id: x.id, d: c, erros: [] }; X.abrePainel('empEd'); };
  C.empCampo = function (el) { U.empEd.d[el.dataset.f] = el.value; };
  C.empInc = function (el) { U.empEd.d.perimetro_grupo = el.checked; };
  A.empGuardar = function () {
    var E = U.empEd, d = E.d, usr = u(), erros = [], nome = String(d.nome || '').trim(), det = P.lerNumero(d.detencao), inst = String(d.instalacoes === undefined ? '' : d.instalacoes).trim() === '' ? 0 : P.lerNumero(d.instalacoes);
    if (!nome) erros.push('Enter the company name.');
    if (S.ent.some(function (y) { return y.nome === nome && (E.novo || y.id !== E.id); })) erros.push('There is already a company called ' + nome + '.');
    if (det === null || det < 0 || det > 100) erros.push('Ownership must be between 0 and 100.');
    if (inst === null || inst < 0 || Math.round(inst) !== inst) erros.push('Sites must be a whole number.');
    if (erros.length) { E.erros = erros; return R(); }
    var x;
    if (E.novo) { var r = P.criarEmpresa(nome); if (r.erro) { E.erros = [r.erro]; return R(); } x = S.ent[S.ent.length - 1]; P.eventoGlobal('Company added: ' + nome + '.', usr.nome, 'Creation'); }
    else { x = S.ent.filter(function (y) { return y.id === E.id; })[0]; if (x.nome !== nome) { var r2 = P.renomearEmpresa(x, nome); if (r2.erro) { E.erros = [r2.erro]; return R(); } } }
    var mud = [];
    [['pais', String(d.pais || '').trim()], ['moeda', String(d.moeda || '').trim().toUpperCase()], ['nipc', String(d.nipc || '').trim()], ['nace', String(d.nace || '').trim()], ['instalacoes', inst], ['metodo', d.metodo], ['detencao', det], ['perimetro_grupo', !!d.perimetro_grupo]].forEach(function (c) {
      if (x[c[0]] === c[1]) return;
      if (['metodo', 'detencao', 'perimetro_grupo'].indexOf(c[0]) > -1) { var r3 = P.alterarEntidade(x, c[0], c[1], usr); if (r3.erro) erros.push(r3.erro); else mud.push(c[0]); }
      else { x[c[0]] = c[1]; mud.push(c[0]); }
    });
    if (erros.length) { E.erros = erros; return R(); }
    if (!E.novo && mud.length) P.eventoGlobal('Company ' + x.nome + ' edited: ' + mud.join(', ') + '.', usr.nome, 'Change');
    P.guardar(); U.empEd = null; U.painel = null;
    toast(E.novo ? nome + ' added.' : x.nome + ' saved.', 'ok'); R();
  };
  A.empApagar = function (d) { var x = S.ent.filter(function (y) { return y.id === d.v; })[0]; if (!x || !window.confirm('Remove ' + x.nome + '?')) return; var r = P.apagarEmpresa(x); if (r.erro) return toast(r.erro, 'err'); P.eventoGlobal('Company removed: ' + x.nome + '.', u().nome); toast(x.nome + ' removed.', 'ok'); R(); };
  var entPer = function () { return S.ent.filter(function (y) { return y.id === U.per.sel; })[0] || S.ent[0]; };
  A.perVer = function (d) { U.per.sel = d.v; R(); };
  A.perNova = function () {
    var r = P.criarEmpresa(val('per-novo').trim());
    if (r.erro) return toast(r.erro, 'err');
    var x = S.ent[S.ent.length - 1];
    U.per.sel = x.id; P.eventoGlobal('Company added: ' + x.nome + '.', u().nome, 'Creation'); P.guardar(); toast('Company added.', 'ok'); R();
  };
  C.perCampo = function (el) { var r = P.alterarEntidade(entPer(), el.dataset.f, el.value, u()); if (r.erro) toast(r.erro, 'err'); };
  C.perInc = function (el) { var r = P.alterarEntidade(entPer(), 'perimetro_grupo', el.checked, u()); if (r.erro) toast(r.erro, 'err'); };
  C.perRegra = function (el) { var f = el.dataset.f, r = P.alterarRegraEnt(entPer(), el.dataset.id, f, f === 'multi' ? el.checked : el.value, u()); if (r.erro) toast(r.erro, 'err'); };
})();
