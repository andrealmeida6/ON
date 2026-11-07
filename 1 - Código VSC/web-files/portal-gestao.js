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
  var cicloMs = function () { return P.msCiclo(); };
  var catCiclo = function () { return S.cat.filter(function (c) { return !!P.msDoIndicador(c.id); }); };
  var pessoa = function (x) { return x ? '<span class="ps-pess"><i aria-hidden="true">' + e(iniciais(x.nome)) + '</i>' + e(x.nome) + '</span>' : '<span class="ps-mut">-</span>'; };
  var cod = function (c) { return c.esrs_requisito ? '<span class="ps-cod">' + e(c.esrs_requisito) + '</span>' : ''; };
  var pills = function (acao, lista, ativa) {
    return '<div class="ps-seg" role="group">' + lista.map(function (x) { return '<button type="button" class="' + (ativa === x[0] ? 'on' : '') + '" data-a="' + acao + '" data-v="' + e(x[0]) + '">' + e(x[1]) + (x[2] !== undefined ? ' <span class="n">' + x[2] + '</span>' : '') + '</button>'; }).join('') + '</div>';
  };
  var variacaoTxt = function (v) { return v === null || v === undefined ? '-' : (v > 0 ? '+' : '') + P.fmtNum(v, 1) + '%'; };

  /* --- Visao geral ------------------------------------------------------------ */
  U.visao = { modo: 'consolidado', empresa: '' };
  var TILES = ['E06', 'E01', 'P02', 'N05'];
  var tile = function (id, empresa) {
    var c = P.cat(id), r = P.valorConsolidado(id, empresa), m = r.m, it = P.item(id), ant = P.valorAnterior(id, S.ciclo.ano), est = P.estadoKpi(id);
    var val2 = r.valor === null ? '-' : P.fmtNum(r.valor, r.racio || empresa ? c.casas_decimais : 0);
    var dif = it && it.valor !== null && ant ? ((it.valor - ant) / Math.abs(ant)) * 100 : null;
    var nota = r.fora ? 'Reported by ' + (m ? m.empresa : 'another company') : it.valor === null ? 'Not reported yet' : !empresa && r.peso === 0 ? m.empresa + ' is outside the consolidation' : !empresa && !r.racio && r.peso !== 1 ? 'Counted at ' + P.fmtNum(r.peso * 100, 0) + '%, ' + m.empresa : (m ? m.empresa : '');
    return '<div class="ps-tile"><div class="ps-tile-t"><span>' + e(c.nome) + '</span>' + cod(c) + '</div><div class="ps-tile-v"><b>' + e(val2) + '</b> <small>' + e(c.unidade_medida) + '</small></div><div class="ps-tile-s">' + (dif === null || r.fora ? '' : '<span>' + (dif < 0 ? '▼ ' : dif > 0 ? '▲ ' : '') + e(P.fmtNum(Math.abs(dif), 1)) + '% vs ' + (S.ciclo.ano - 1) + '</span>') + '<span>' + e(nota) + '</span></div><div class="ps-tile-e">' + chip(est.txt, est.cls) + '</div></div>';
  };
  var completude = function (empresa) {
    return S.mat.map(function (x) {
      var cs = catCiclo().filter(function (c) { if (c.esrs !== x.norma) return false; return !empresa || P.msDoIndicador(c.id).empresa === empresa; });
      var titulo = '<span class="ps-cp-t"><b>' + e(x.norma) + '</b> ' + e(x.tema) + '</span>';
      if (x.avaliacao === 'não material') return '<div class="ps-cp">' + titulo + '<span class="ps-cp-b"></span><span class="ps-cp-v ps-mut">Not material</span></div>';
      if (!cs.length) return '<div class="ps-cp">' + titulo + '<span class="ps-cp-b"></span><span class="ps-cp-v ps-mut">No indicators</span></div>';
      var ap = cs.filter(function (c) { return P.estadoKpi(c.id).cod === 'aprovado'; }).length, rep = cs.filter(function (c) { return P.estadoKpi(c.id).cod !== 'aprovado' && P.item(c.id).valor !== null; }).length;
      var pct = function (n) { return (n / cs.length) * 100; };
      return '<div class="ps-cp" data-tip="' + e(x.norma + ': ' + ap + ' approved, ' + rep + ' reported, ' + (cs.length - ap - rep) + ' missing, of ' + cs.length) + '" tabindex="0">' + titulo + '<span class="ps-cp-b"><i class="a" style="width:' + pct(ap) + '%"></i><i class="r" style="width:' + pct(rep) + '%"></i></span><span class="ps-cp-v">' + Math.round(pct(ap + rep)) + '%</span></div>';
    }).join('');
  };
  var ORIGENS = ['Manual', 'Excel', 'External', 'Calculation', 'Restatement', 'API'];
  var origens = function (empresa) {
    var n = {}, tot = 0;
    catCiclo().forEach(function (c) {
      if (empresa && P.msDoIndicador(c.id).empresa !== empresa) return;
      var v = P.item(c.id).versoes, ult = v[v.length - 1];
      if (!ult || P.item(c.id).valor === null) return;
      var o = P.origemVersao(ult.origem); n[o] = (n[o] || 0) + 1; tot++;
    });
    if (!tot) return vazio('No values reported yet.');
    var usadas = ORIGENS.filter(function (o) { return n[o]; });
    return '<div class="ps-org">' + usadas.map(function (o, i) { return '<i class="o' + i + '" style="width:' + (n[o] / tot) * 100 + '%" data-tip="' + e(o + ': ' + n[o] + ' of ' + tot) + '"></i>'; }).join('') + '</div><div class="ps-leg ps-mt">' + usadas.map(function (o, i) { return '<span><i class="o' + i + '"></i>' + e(o) + ' ' + Math.round((n[o] / tot) * 100) + '%</span>'; }).join('') + '</div>';
  };
  var aprovaveis = function () { return cicloMs().filter(function (m) { return !P.concluida(m) && P.passoAtual(m).tipo !== 'recolha'; }); };
  var tituloEvento = function (x) { return x.ind ? P.cat(x.ind).nome + ': ' + (x.antes === null ? '' : P.fmtNum(x.antes, P.cat(x.ind).casas_decimais) + ' to ') + P.fmtNum(x.depois, P.cat(x.ind).casas_decimais) : x.texto; };
  Blocos['visao'] = function () {
    var v = U.visao, emp = v.modo === 'empresa' ? v.empresa || (S.ent[0] && S.ent[0].nome) : '', inc = S.ent.filter(function (x) { return x.perimetro_grupo; }).length, usr = u();
    var pend = aprovaveis().filter(function (m) { return usr.perfil !== 'resp' || m.unidade === usr.unidade; });
    if (emp) pend = pend.filter(function (m) { return m.empresa === emp; });
    var ativ = P.trilho().filter(function (x) { return !emp || (x.m && x.m.empresa === emp); }).sort(function (a, b) { return a.em < b.em ? 1 : a.em > b.em ? -1 : 0; }).slice(0, 5);
    var podeAdmin = P.gereTudo(usr), podeTrilho = podeAdmin || usr.perfil === 'auditor';
    return '<div class="ps-card ps-vista"><div class="ps-vista-e"><span class="ps-lab">Data view</span><div class="ps-seg2" role="group"><button type="button" class="' + (emp ? '' : 'on') + '" data-a="visaoModo" data-v="consolidado">Consolidated</button><button type="button" class="' + (emp ? 'on' : '') + '" data-a="visaoModo" data-v="empresa">By company</button></div>' +
      (emp ? '<label class="ps-sr" for="vis-emp">Company</label><select id="vis-emp" class="ps-sel" data-c="visaoEmp">' + S.ent.map(function (x) { return opt(x.nome, x.nome, emp); }).join('') + '</select>' : '') + '</div><div class="ps-vista-d ps-small ps-mut">' + (emp ? 'Showing what this company reports, at 100%.' : inc + ' of ' + S.ent.length + ' companies in the consolidation. Full at 100%, proportional by ownership, equity method excluded.') + (podeAdmin ? ' <a href="' + rota('Perimetro') + '">Set the perimeter</a>' : '') + '</div></div>' +
      '<div class="ps-tiles ps-mt">' + TILES.map(function (id) { return tile(id, emp); }).join('') + '</div>' +
      '<div class="ps-grid-vis ps-mt"><div class="ps-card">' + cabCartao('Completeness by ESRS standard', 'tarefa', '<div class="ps-leg"><span><i class="a"></i>Approved</span><span><i class="r"></i>Reported</span><span><i></i>Missing</span></div>') + '<div class="ps-card-body">' + completude(emp) + '</div></div>' +
      '<div class="ps-col"><div class="ps-card">' + cabCartao('Pending approval', 'ativ', podeTrilho ? '<a class="ps-small" href="' + rota('Aprovacoes') + '">See all (' + pend.length + ')</a>' : '') + '<ul class="ps-list">' + (pend.length ? pend.slice(0, 4).map(function (m) { return '<li><a class="ps-row" href="' + rota((podeTrilho ? 'Aprovacoes?ms=' : 'Milestone/') + m.id) + '"><span class="ps-row-txt"><b>' + e(m.nome) + '</b><span>' + e(m.empresa) + ' · ' + m.indicadores.length + ' indicators</span></span>' + estChip(m) + '</a></li>'; }).join('') : '<li>' + vazio('Nothing waiting for approval.') + '</li>') + '</ul></div>' +
      '<div class="ps-card">' + cabCartao('Source of the data', 'doc') + '<div class="ps-card-body">' + origens(emp) + '</div></div></div></div>' +
      '<div class="ps-card ps-mt">' + cabCartao('Recent activity', 'ativ', podeTrilho ? '<a class="ps-small" href="' + rota('Trilho') + '">Open audit trail</a>' : '') + '<ul class="ps-list">' + (ativ.length ? ativ.map(function (x) { return '<li class="ps-ativ"><span class="ps-mut ps-small ps-nowrap">' + e(P.fmtDataHora(x.em)) + '</span><span>' + e(x.por) + ': ' + e(tituloEvento(x)) + '</span>' + chip(x.origem) + '</li>'; }).join('') : '<li>' + vazio('No activity yet.') + '</li>') + '</ul></div>' +
      '<h2 class="ps-grupo-t ps-mt-l">Reporting progress, whole group</h2>';
  };
  A.visaoModo = function (d) { U.visao.modo = d.v; R(); };
  C.visaoEmp = function (el) { U.visao.empresa = el.value; };

  /* --- Estado de reporte -------------------------------------------------------- */
  U.est = { norma: '', empresa: '', dono: '', estado: 'todos' };
  var linhasEstado = function () {
    return catCiclo().map(function (c) { return { c: c, s: P.estadoKpi(c.id), m: P.msDoIndicador(c.id), d: P.dono(c.id) }; });
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
    return '<div class="ps-sp ps-filtros"><button type="button" class="ps-btn" data-a="estExcel">Export to Excel</button></div>' +
      '<div class="ps-kpis">' + kpi('Data points', base.length, S.ciclo.ano + ' cycle') + kpi('Approved', n('aprovado'), pct(n('aprovado')), 'k-ok') + kpi('In approval', n('aprovacao'), pct(n('aprovacao')), 'k-rev') + kpi('In progress', n('curso'), pct(n('curso')), 'k-info') + kpi('Missing', n('falta'), pct(n('falta')), 'k-warn') + kpi('Overdue', n('atraso'), 'past the due date', 'k-err') + '</div>' +
      '<div class="ps-grid-side ps-grid-side-l ps-mt"><div class="ps-card"><div class="ps-card-body"><div class="ps-form">' +
      campo('est-norma', 'ESRS standard', '<select id="est-norma" class="ps-sel" data-c="estF" data-id="norma">' + opt('', 'All', f.norma) + S.mat.map(function (x) { return opt(x.norma, x.norma + ' ' + x.tema, f.norma); }).join('') + '</select>') +
      campo('est-emp', 'Company', '<select id="est-emp" class="ps-sel" data-c="estF" data-id="empresa">' + opt('', 'All', f.empresa) + S.ent.filter(function (x) { return cicloMs().some(function (m) { return m.empresa === x.nome; }); }).map(function (x) { return opt(x.nome, x.nome, f.empresa); }).join('') + '</select>') +
      campo('est-dono', 'Owner', '<select id="est-dono" class="ps-sel" data-c="estF" data-id="dono">' + opt('', 'All', f.dono) + Object.keys(donos).map(function (k) { return opt(k, donos[k].nome, f.dono); }).join('') + '</select>') + '</div>' +
      '<div class="ps-mt">' + pills('estTab', [['todos', 'All', base.length], ['falta', 'Missing', n('falta')], ['atraso', 'Overdue', n('atraso')], ['curso', 'In progress', n('curso')], ['aprovacao', 'In approval', n('aprovacao')], ['aprovado', 'Approved', n('aprovado')]], f.estado) + '</div><div class="ps-mt">' +
      tabela([{ t: 'KPI' }, { t: 'Company' }, { t: 'Assigned to' }, { t: 'Due' }, { t: 'Status' }], lista.map(function (x) {
        return ['<a href="' + rota('Milestone/' + x.m.id) + '">' + e(x.c.nome) + '</a><br><small class="ps-mut">' + e(P.esrsDe(x.c.id).dps[0] || x.c.esrs_requisito || 'No ESRS') + ' · ' + e(x.m.periodicidade) + '</small>', e(x.m.empresa), pessoa(x.d), '<span class="ps-nowrap">' + e(X.prazoTxt(x.m)) + '</span>', chip(x.s.txt, x.s.cls)];
      }), 'No KPI matches these filters.') + '</div></div></div>' +
      '<div class="ps-col"><div class="ps-card">' + cabCartao('Missing by owner', 'tarefa') + '<ul class="ps-list">' + (porDono.length ? porDono.map(function (o) { return '<li class="ps-row"><span class="ps-row-txt"><b>' + e(o.x.nome) + '</b><span>' + e(o.x.unidade || P.PERFIS[o.x.perfil]) + '</span></span><span class="ps-sp">' + (o.falta ? chip(o.falta + ' missing', 'warn') : '') + (o.atraso ? chip(o.atraso + ' overdue', 'err') : '') + '</span></li>'; }).join('') : '<li>' + vazio('Nothing missing.') + '</li>') + '</ul>' + (P.gereTudo(u()) ? '<div class="ps-card-body ps-small"><a href="' + rota('Atribuicao') + '">Manage assignments</a></div>' : '') + '</div>' +
      '<div class="ps-card">' + cabCartao('Next due dates', 'cal') + '<ul class="ps-list">' + (prox.length ? prox.map(function (m) { return '<li><a class="ps-row" href="' + rota('Milestone/' + m.id) + '"><span class="ps-row-txt"><b>' + e(m.nome) + '</b><span>' + e(m.empresa) + '</span></span><b class="ps-nowrap ps-small">' + e(P.fmtDataAno(m.prazo)) + '</b></a></li>'; }).join('') : '<li>' + vazio('No upcoming due dates.') + '</li>') + '</ul></div></div></div>';
  };
  C.estF = function (el) { U.est[el.dataset.id] = el.value; };
  A.estTab = function (d) { U.est.estado = d.v; R(); };
  A.estExcel = function () {
    P.escreverFolhas('reporting-status-' + S.ciclo.ano + '.xlsx', { status: filtroEstado(linhasEstado()).map(function (x) {
      var it = P.item(x.c.id);
      return { id: x.c.id, esrs_id: P.esrsDe(x.c.id).dps.join(', '), kpi: x.c.nome, description: P.esrsDe(x.c.id).desc, esrs: x.c.esrs_requisito, company: x.m.empresa, milestone: x.m.nome, assigned_to: x.d ? x.d.nome : '', due: x.m.prazo, status: x.s.txt, value: it.valor === null ? '' : it.valor, unit: x.c.unidade_medida };
    }) });
    toast('Reporting status exported.', 'ok');
  };

  /* --- Entrada de dados ----------------------------------------------------------- */
  U.de = { tab: 'manual', norma: '', id: '', valor: '', qual: 'medido', multi: false, linhas: [], just: '', conf: false, metodo: '', evid: '', excel: null };
  var preenchiveis = function (usr) {
    var l = [];
    cicloMs().forEach(function (m) { if (P.podePreencher(m, usr)) m.indicadores.forEach(function (id) { l.push({ id: id, m: m, c: P.cat(id) }); }); });
    return l;
  };
  var carregarDe = function (x) {
    var d = U.de, it = P.item(x.id, P.chave(x.m));
    d.id = x.id; d.valor = it.valor === null ? (it.rascunho || '') : String(it.valor).replace('.', ','); d.qual = it.qualidade; d.just = it.justificacao || ''; d.metodo = it.metodo || ''; d.conf = false; d.evid = '';
    d.linhas = (it.entradas || []).map(function (l) { return { local: l.local, doc: l.doc, valor: l.valor, peso: l.peso }; });
    d.multi = d.linhas.length > 0;
  };
  var abaManual = function (usr) {
    var d = U.de, todos = preenchiveis(usr), lista = todos.filter(function (x) { return !d.norma || x.c.esrs === d.norma; });
    if (!todos.length) return '<div class="ps-card">' + vazio('No milestone is in collection with you right now.') + '</div>';
    var x = lista.filter(function (y) { return y.id === d.id; })[0];
    if (!x && lista.length) { x = lista[0]; carregarDe(x); }
    var normas = S.mat.filter(function (n) { return todos.some(function (y) { return y.c.esrs === n.norma; }); });
    var topo = '<div class="ps-form">' + campo('de-norma', 'ESRS standard', '<select id="de-norma" class="ps-sel" data-c="deNorma">' + opt('', 'All', d.norma) + normas.map(function (n) { return opt(n.norma, n.norma + ' ' + n.tema, d.norma); }).join('') + '</select>') +
      campo('de-id', 'Data point *', lista.length ? '<select id="de-id" class="ps-sel" data-c="deId">' + lista.map(function (y) { return opt(y.id, (y.c.esrs_requisito ? y.c.esrs_requisito + ' · ' : '') + y.c.nome, d.id); }).join('') + '</select>' : '<span class="ps-mut">None for this standard</span>');
    if (!x) return '<div class="ps-card"><div class="ps-card-body">' + topo + '</div></div></div>';
    var c = x.c, m = x.m, ant = P.valorAnterior(c.id, P.chave(m)), regra = P.regraEnt(m.empresa, c.id), media = regra.agreg === 'media';
    var total = d.multi ? P.agregar(d.linhas, regra.agreg) : P.lerNumero(d.valor), bruto = !d.multi && String(d.valor).trim() !== '' && total === null;
    var v = total === null ? { erros: [], alertas: [], variacao: null } : P.validar(c, total, P.chave(m)), temAlerta = v.alertas.length > 0, ic = function (ok, t, warn) { return '<div class="ps-regra"><span class="ps-chip ' + (ok ? 'ok' : warn ? 'warn' : 'err') + '">' + (ok ? 'OK' : warn ? 'Warning' : 'Error') + '</span><span>' + e(t) + '</span></div>'; };
    var cheio = total !== null || bruto;
    return '<div class="ps-card">' + cabCartao('Manual entry', 'doc', '<span class="ps-mut ps-small">Fields marked with * are required</span>') + '<div class="ps-card-body">' + topo + '</div><p class="ps-de-desc ps-mt">' + (P.esrsDe(c.id).dps.length ? '<span class="ps-mono">' + e(P.esrsDe(c.id).dps.join(', ')) + '</span> ' : '') + e(P.esrsDe(c.id).desc) + '</p><div class="ps-form">' +
      campo('de-emp', 'Company', '<input id="de-emp" class="ps-in" readonly value="' + e(m.empresa) + '">') + campo('de-per', 'Period', '<input id="de-per" class="ps-in" readonly value="' + e(m.ano) + '">') +
      (d.multi ? campo('de-tot', 'Value (' + P.AGREGACOES[regra.agreg].toLowerCase() + ')', '<input id="de-tot" class="ps-in ps-num" readonly value="' + e(total === null ? '' : P.fmtNum(total, c.casas_decimais)) + '">') : '<div class="ps-campo"><label class="ps-lab" for="de-val">Value *</label><input id="de-val" class="ps-in ps-num" inputmode="decimal" autocomplete="off" data-c="deVal" value="' + e(d.valor) + '"><small class="ps-mut">' + (m.ano - 1) + ': ' + (ant === null || ant === undefined ? 'no value' : e(fmtV(c.id, ant) + ' ' + c.unidade_medida)) + '</small></div>') +
      campo('de-uni', 'Unit', '<input id="de-uni" class="ps-in" readonly value="' + e(c.unidade_medida) + '">') +
      campo('de-q', 'Data type *', '<select id="de-q" class="ps-sel" data-c="deQ">' + opt('medido', 'Measured', d.qual) + opt('estimado', 'Estimated', d.qual) + opt('calculado', 'Calculated', d.qual) + '</select>') +
      (d.qual === 'estimado' ? campo('de-met', 'Estimation method *', '<input id="de-met" class="ps-in" data-c="deMet" value="' + e(d.metodo) + '">') : '') + '</div>' +
      (regra.multi ? '<div class="ps-de-multi ps-mt"><label class="ps-chk"><input id="de-multi" type="checkbox" data-c="deMulti"' + (d.multi ? ' checked' : '') + '> Enter several values for this KPI in the same period' + (regra.por ? ' (by ' + e(regra.por.toLowerCase()) + ')' : '') + '</label>' +
        (d.multi ? '<div class="ps-tw ps-mt"><table class="ps-t ps-t-ent"><thead><tr><th>' + e(regra.por || 'Entry') + '</th><th>Supporting document</th><th class="dir">Value (' + e(c.unidade_medida) + ')</th>' + (media ? '<th class="dir">Weight</th>' : '') + '<th><span class="ps-sr">Remove</span></th></tr></thead><tbody>' + d.linhas.map(function (l, i) {
          return '<tr><td><input id="de-l-' + i + '" class="ps-in" aria-label="Entry ' + (i + 1) + '" data-c="deLinha" data-id="' + i + '" data-f="local" value="' + e(l.local) + '"></td><td><input id="de-d-' + i + '" class="ps-in" aria-label="Document of entry ' + (i + 1) + '" data-c="deLinha" data-id="' + i + '" data-f="doc" value="' + e(l.doc) + '"></td><td class="dir"><input id="de-v-' + i + '" class="ps-in ps-num" inputmode="decimal" aria-label="Value of entry ' + (i + 1) + '" data-c="deLinha" data-id="' + i + '" data-f="valor" value="' + e(l.valor) + '"></td>' + (media ? '<td class="dir"><input id="de-w-' + i + '" class="ps-in ps-num" inputmode="decimal" aria-label="Weight of entry ' + (i + 1) + '" data-c="deLinha" data-id="' + i + '" data-f="peso" value="' + e(l.peso) + '"></td>' : '') + '<td><button type="button" class="ps-btn peq err" data-a="deTirar" data-v="' + i + '" aria-label="Remove entry ' + (i + 1) + '">×</button></td></tr>';
        }).join('') + '</tbody></table></div><div class="ps-sp-b ps-mt"><button type="button" class="ps-btn peq" data-a="deLinhaNova">Add entry</button><b class="ps-num">' + e(P.AGREGACOES[regra.agreg]) + ': ' + (total === null ? '-' : e(P.fmtNum(total, c.casas_decimais) + ' ' + c.unidade_medida)) + ' · ' + d.linhas.length + ' entries</b></div>' : '') + '</div>' : '') +
      '<div class="ps-de-regras ps-mt"><div class="ps-sp-b"><b>Validation rules for this data point</b><span class="ps-small ps-mut">Change threshold against the prior year: ±' + e(c.limiar_variacao_pct) + '%' + (P.gereTudo(usr) ? ' · <a href="#/Backoffice" data-a="deRegras">change</a>' : '') + '</span></div><div class="ps-de-regras-g ps-mt">' +
      ic(cheio, cheio ? 'Required fields filled in' : 'Value missing') + ic(!bruto && !v.erros.length, bruto ? 'The value is not numeric' : v.erros[0] || 'Numeric value within range') + ic(true, 'Unit set by the indicator: ' + c.unidade_medida) + ic(S.ciclo.estado === 'aberto', 'Period ' + m.ano + ' open') + ic(!temAlerta, temAlerta ? 'Change of ' + variacaoTxt(v.variacao) + ' or a consistency rule to confirm' : v.variacao === null ? 'No prior year to compare' : 'Change of ' + variacaoTxt(v.variacao) + ' within the threshold', true) + '</div></div>' +
      (temAlerta ? '<div class="ps-de-alerta ps-mt" role="alert"><p><b>Review the value before saving.</b> Confirm the unit, the period and the evidence. If the value is correct, justify it.</p><ul>' + v.alertas.map(function (a) { return '<li>' + e(a) + '</li>'; }).join('') + '</ul>' + campo('de-just', 'Justification *', '<textarea id="de-just" class="ps-ta" data-c="deJust">' + e(d.just) + '</textarea>') + '<label class="ps-chk ps-mt"><input id="de-conf" type="checkbox" data-c="deConf"' + (d.conf ? ' checked' : '') + '> I reviewed the value and the evidence and the value is correct</label><p class="ps-small ps-mt">The approver sees this alert and the justification, and the event stays in the audit trail.</p></div>' : '') +
      '<div class="ps-sp ps-mt"><button type="button" id="de-evid" class="ps-btn" data-a="deEvid">' + (d.evid ? 'Evidence: ' + e(d.evid) : 'Attach evidence') + '</button>' + (c.evidencia_obrigatoria ? (P.item(c.id, P.chave(m)).evidencias.length || d.evid ? chip('Evidence attached', 'ok') : chip('Evidence required', 'warn')) : '') + '</div>' +
      '<div class="ps-sp-b ps-mt"><a class="ps-small" href="' + rota('Milestone/' + m.id) + '">Open ' + e(m.nome) + '</a><span class="ps-sp"><button type="button" class="ps-btn" data-a="deSubmeter">Submit the milestone</button><button type="button" class="ps-btn pri" data-a="deGuardar">Save value</button></span></div></div></div>';
  };
  var abaExcel = function (usr) {
    var x = U.de.excel, abertas = cicloMs().filter(function (m) { return P.podePreencher(m, usr); });
    var corpo = '<div class="ps-card">' + cabCartao('Upload an Excel file', 'doc', '<button type="button" class="ps-btn peq" data-a="deTemplate">Download template (.xlsx)</button>') + '<div class="ps-card-body"><button type="button" class="ps-de-drop" data-a="deFicheiro"><b>Choose the file</b><span>.xlsx or .csv, one row per indicator. ' + abertas.length + ' milestone(s) in collection with you.</span></button><p class="ps-small ps-mut ps-mt">To paste straight from Excel, open a milestone and use its grid.</p></div></div>';
    if (!x) return corpo;
    if (x.erro) return corpo + '<div class="ps-aviso err ps-mt" role="alert">' + e(x.nome) + ': ' + e(x.erro) + '</div>';
    var linhas = []; x.grupos.forEach(function (g) { g.rel.linhas.forEach(function (r) { linhas.push({ r: r, m: g.m }); }); });
    x.soltas.forEach(function (r) { linhas.push({ r: r, m: null }); });
    var ok = linhas.filter(function (l) { return l.r.estado === 'valida'; }).length, al = linhas.filter(function (l) { return l.r.estado === 'alerta'; }).length, rj = linhas.filter(function (l) { return l.r.estado === 'rejeitada'; }).length, com = linhas.filter(function (l) { return l.r.estado !== 'valida' && l.r.estado !== 'vazia'; }).sort(function (a, b) { return a.r.n - b.r.n; });
    return corpo + '<div class="ps-card ps-mt">' + cabCartao(x.nome, 'tarefa', '<span class="ps-sp">' + chip(ok + ' valid', 'ok') + (al ? chip(al + ' with alert', 'warn') : '') + (rj ? chip(rj + ' with error', 'err') : '') + '</span>') + '<div class="ps-card-body">' +
      tabela([{ t: 'Row' }, { t: 'Indicator' }, { t: 'Company' }, { t: 'Value', dir: 1 }, { t: 'Result' }], com.map(function (l) { return [String(l.r.n), e(l.r.indicador || '-'), e(l.m ? l.m.empresa : '-'), e(l.r.valor), chip(l.r.estado === 'alerta' ? 'Alert' : 'Error', l.r.estado === 'alerta' ? 'warn' : 'err') + ' <span class="ps-small">' + e(l.r.motivos.join(' ')) + '</span>']; }), 'All rows are valid.') +
      '<div class="ps-sp ps-mt"><button type="button" class="ps-btn pri" data-a="deAplicar"' + (ok + al ? '' : ' disabled') + '>Apply ' + (ok + al) + ' row(s)</button><button type="button" class="ps-btn" data-a="deFicheiro">Fix and upload again</button></div></div></div>';
  };
  var abaApi = function (usr) {
    var ex = preenchiveis(usr)[0] || { id: 'A01', m: P.msDoIndicador('A01'), c: P.cat('A01') };
    var corpoJson = JSON.stringify({ milestone_id: ex.m.id, source_system: 'ERP', records: [{ indicator_id: ex.id, entity: ex.m.empresa, period: String(ex.m.ano), value: 0, unit: ex.c.unidade_medida, evidence_ref: 'DOC-' + ex.m.ano + '-0001' }] }, null, 2);
    return '<div class="ps-card">' + cabCartao('Connections to other systems', 'ativ') + '<div class="ps-card-body">' + tabela([{ t: 'System' }, { t: 'Provides' }, { t: 'Frequency' }, { t: 'Status' }], S.apis.map(function (a) { return [e(a.nome), e(a.ambito), e(a.frequencia), chip('Waiting for credentials', 'warn')]; }), 'No connections yet.') +
      (P.gereTudo(usr) ? '<h3 class="ps-grupo-t">New connection</h3><div class="ps-form">' + campo('api-nome', 'System', '<input id="api-nome" class="ps-in">') + campo('api-amb', 'What it provides', '<input id="api-amb" class="ps-in">') + campo('api-frq', 'Frequency', '<select id="api-frq" class="ps-sel">' + opt('Hourly') + opt('Daily') + opt('Weekly') + opt('Monthly') + '</select>') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="apiNova">Add connection</button>' : '') + '</div></div>' +
      '<div class="ps-card ps-mt">' + cabCartao('Contract for direct integration', 'doc') + '<div class="ps-card-body"><p class="ps-small ps-mut">Each system sends this format. It follows the same validation as a file.</p><pre class="ps-pre ps-mt">POST /api/v1/datapoints\n' + e(corpoJson) + '</pre></div></div>';
  };
  Blocos['data-entry'] = function () {
    var usr = u(), t = U.de.tab;
    return '<div class="ps-filtros">' + pills('deTab', [['manual', 'Manual'], ['excel', 'Excel upload'], ['api', 'API connection']], t) + '</div>' + (t === 'excel' ? abaExcel(usr) : t === 'api' ? abaApi(usr) : abaManual(usr));
  };
  var msDe = function () { return U.de.id ? P.msDoIndicador(U.de.id) : null; };
  A.deTab = function (d) { U.de.tab = d.v; R(); };
  A.deRegras = function () { U.boTab = 'regras'; };
  C.deNorma = function (el) { U.de.norma = el.value; U.de.id = ''; };
  C.deId = function (el) { var m = P.msDoIndicador(el.value); carregarDe({ id: el.value, m: m }); };
  C.deVal = function (el) { U.de.valor = el.value; };
  C.deQ = function (el) { U.de.qual = el.value; };
  C.deMet = function (el) { U.de.metodo = el.value; };
  C.deJust = function (el) { U.de.just = el.value; };
  C.deConf = function (el) { U.de.conf = el.checked; };
  C.deMulti = function (el) { var d = U.de; d.multi = el.checked; if (d.multi && !d.linhas.length) d.linhas = [{ local: '', doc: '', valor: d.valor, peso: '' }]; };
  C.deLinha = function (el) { U.de.linhas[+el.dataset.id][el.dataset.f] = el.value; };
  A.deLinhaNova = function () { U.de.linhas.push({ local: '', doc: '', valor: '', peso: '' }); R(); };
  A.deTirar = function (d) { U.de.linhas.splice(+d.v, 1); R(); };
  A.deEvid = function () { X.escolherFicheiro('', function (f) { U.de.evid = f.name; R(); }); };
  A.deGuardar = function () {
    var d = U.de, usr = u(), m = msDe(), id = d.id;
    if (!m || !P.podePreencher(m, usr)) return toast('This milestone is not with you right now.', 'err');
    var c = P.cat(id), it = P.item(id, P.chave(m)), regra = P.regraEnt(m.empresa, id);
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
    if (d.evid) { P.anexar(it, d.evid, usr); P.evento(m, 'Evidence attached to ' + c.nome + ': ' + d.evid + '.', usr.nome); d.evid = ''; }
    P.guardar(); d.conf = false;
    toast('Value saved in ' + m.nome + '.', 'ok'); R();
  };
  A.deSubmeter = function () {
    var m = msDe(), r = m ? P.submeter(m, u()) : { erro: 'Choose a data point.' };
    if (r.erro) return toast(r.erro, 'err');
    if (r.faltas) { toast(r.faltas.length + ' item(s) missing. ' + r.faltas[0].msg, 'err'); return; }
    U.de.id = ''; toast('Milestone submitted.', 'ok'); R();
  };
  A.deTemplate = function () {
    var linhas = [];
    cicloMs().filter(function (m) { return P.podePreencher(m, u()); }).forEach(function (m) { linhas = linhas.concat(P.folhasTemplate(m).dados); });
    if (!linhas.length) return toast('No milestone is in collection with you right now.', 'err');
    P.escreverFolhas('template-data-' + S.ciclo.ano + '.xlsx', { dados: linhas });
  };
  A.deFicheiro = function () {
    X.escolherFicheiro('.xlsx,.csv', function (f) {
      P.lerFicheiro(f).then(function (r) {
        if (r.erro) { U.de.excel = { nome: r.nome, erro: r.erro }; return R(); }
        var usr = u(), porMs = {}, soltas = [];
        r.linhas.forEach(function (l, i) {
          var m = P.ms(String(l.milestone_id === undefined ? '' : l.milestone_id).trim());
          if (m && P.podePreencher(m, usr)) (porMs[m.id] = porMs[m.id] || []).push({ l: l, n: i + 2 });
          else soltas.push({ n: i + 2, indicador: String(l.indicator_id || ''), valor: l.value, estado: 'rejeitada', motivos: [m ? m.nome + ' is not in collection with you.' : 'Unknown milestone_id: ' + (l.milestone_id || '(empty)') + '.'], dados: l });
        });
        var grupos = Object.keys(porMs).map(function (k) {
          var m = P.ms(k), rel = P.validarImportacao(m, porMs[k].map(function (x) { return x.l; }));
          rel.linhas.forEach(function (x, i) { x.n = porMs[k][i].n; });
          return { m: m, rel: rel };
        });
        var fmt = grupos.filter(function (g) { return g.rel.erroFormato; })[0];
        U.de.excel = fmt ? { nome: r.nome, erro: fmt.rel.erroFormato } : { nome: r.nome, grupos: grupos, soltas: soltas };
        R();
      });
    });
  };
  A.deAplicar = function () {
    var x = U.de.excel, n = 0;
    x.grupos.forEach(function (g) { n += P.aplicarImportacao(g.m, g.rel, x.nome, u()); });
    U.de.excel = null; U.de.id = '';
    toast(n + ' row(s) applied.', 'ok'); R();
  };
  A.apiNova = function () { res(P.novaLigacao(val('api-nome'), val('api-amb'), val('api-frq'), u()), 'Connection added.'); };

  /* --- Aprovacoes ------------------------------------------------------------------- */
  U.apr = { filtro: 'todas', sel: '' };
  var alertasMs = function (m) { return m.indicadores.filter(function (id) { return P.validarItem(P.item(id, P.chave(m))).alertas.length; }); };
  Blocos['approvals'] = function () {
    var usr = u(), todas = aprovaveis(), f = U.apr, minhas = todas.filter(function (m) { return P.podeAgir(m, usr); }), alerta = todas.filter(function (m) { return alertasMs(m).length; });
    if (U.rota.q.ms && !f.sel) f.sel = U.rota.q.ms;
    var lista = f.filtro === 'minhas' ? minhas : f.filtro === 'alertas' ? alerta : todas, m = lista.filter(function (x) { return x.id === f.sel; })[0] || lista[0];
    var passos = S.wfbase.filter(function (p) { return p.tipo !== 'validacao' && p.tipo !== 'publicacao'; });
    var det = '';
    if (m) {
      var al = alertasMs(m), podeA = P.podeAgir(m, usr), viola = P.violaSegregacao(m, usr), p = P.passoAtual(m), rec = m.passos.filter(function (x) { return x.tipo === 'recolha'; })[0];
      var verbo = p.tipo === 'aprovacao' ? 'Approve' : p.tipo === 'parecer' ? 'Give opinion' : 'Complete review';
      det = '<div class="ps-card ps-apr-det">' + cabCartao(m.nome, 'tarefa', estChip(m)) + '<div class="ps-card-body"><p class="ps-small ps-mut">' + e(m.empresa) + ' · ' + e(m.ano) + (rec && rec.concluido_por ? ' · submitted by ' + e(rec.concluido_por) : '') + '</p><p class="ps-small ps-mt"><b>Current step:</b> ' + e(p.nome) + ' · ' + e(P.nomeResp(m, p.responsavel)) + '</p>' +
        '<div class="ps-tw ps-mt"><table class="ps-t ps-t-apr"><thead><tr><th>Indicator</th><th class="dir">Value</th><th class="dir">' + e(P.rotAnterior(P.chave(m))) + '</th><th class="dir">Change</th></tr></thead><tbody>' + m.indicadores.map(function (id) {
          var c = P.cat(id), it = P.item(id, P.chave(m)), v = P.validarItem(it), ant = P.valorAnterior(id, P.chave(m));
          return '<tr><td class="prim">' + e(c.nome) + '</td><td class="dir ps-num">' + (it.valor === null ? '-' : e(fmtV(id, it.valor) + ' ' + c.unidade_medida)) + '</td><td class="dir ps-num">' + (ant === null || ant === undefined ? '-' : e(fmtV(id, ant))) + '</td><td class="dir ps-num ' + (v.alertas.length ? 'ps-txt-err' : '') + '">' + e(variacaoTxt(v.variacao)) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (al.length ? '<div class="ps-aviso err ps-mt">' + al.map(function (id) { var it = P.item(id, P.chave(m)); return '<div><b>' + e(P.cat(id).nome) + '.</b> ' + e(P.validarItem(it).alertas[0]) + (it.justificacao ? ' Justification: "' + e(it.justificacao) + '"' : '') + '</div>'; }).join('') + '</div>' : '') +
        '<h3 class="ps-grupo-t">Evidence</h3>' + (function () { var ev = []; m.indicadores.forEach(function (id) { P.item(id, P.chave(m)).evidencias.forEach(function (x) { ev.push(x.ficheiro); }); }); (m.documentos_gerais || []).forEach(function (x) { ev.push(x.ficheiro); }); return ev.length ? '<ul class="ps-apr-ev">' + ev.map(function (n) { return '<li>' + e(n) + '</li>'; }).join('') + '</ul>' : '<p class="ps-mut ps-small">No evidence attached.</p>'; })() +
        (podeA ? (viola ? '<div class="ps-aviso warn ps-mt">You submitted this milestone, so someone else has to decide on it.</div>' : campo('apr-com', 'Comment (required to return)', '<textarea id="apr-com" class="ps-ta"></textarea>') + '<div class="ps-sp ps-mt ps-apr-acts"><button type="button" class="ps-btn" data-a="aprDevolver" data-v="' + e(m.id) + '">Return</button><button type="button" class="ps-btn pri" data-a="aprAprovar" data-v="' + e(m.id) + '">' + e(verbo) + '</button></div>') : '<p class="ps-small ps-mut ps-mt">This step is with ' + e(P.nomeResp(m, p.responsavel)) + '.</p>') +
        '<p class="ps-small ps-mt"><a href="' + rota('Milestone/' + m.id) + '">Open the milestone</a></p></div></div>';
    }
    return '<div class="ps-card ps-apr-passos">' + passos.map(function (p, i) { return '<div class="ps-apr-p"><i>' + (i + 1) + '</i><span><b>' + e(p.nome) + '</b><small>' + e(P.nomeResp(null, p.responsavel)) + '</small></span></div>'; }).join('') + '</div>' +
      '<div class="ps-grid-apr ps-mt"><div class="ps-card"><div class="ps-card-body">' + pills('aprFiltro', [['todas', 'All', todas.length], ['minhas', 'Waiting on me', minhas.length], ['alertas', 'With alerts', alerta.length]], f.filtro) + '<div class="ps-mt">' +
      tabela([{ t: 'Milestone' }, { t: 'Company' }, { t: 'Assigned to' }, { t: 'Alerts', dir: 1 }, { t: 'Due' }], lista.map(function (x) {
        return { attrs: (m && x.id === m.id ? 'class="ps-sel-l" aria-selected="true"' : ''), celulas: ['<button type="button" class="ps-btn liga" data-a="aprVer" data-v="' + e(x.id) + '">' + e(x.nome) + '</button>', e(x.empresa), atribHtml(x), alertasMs(x).length, '<span class="ps-nowrap">' + e(X.prazoTxt(x)) + '</span>'] };
      }), 'Nothing waiting here.') + '</div></div></div>' + (det || '<div class="ps-card">' + vazio('Choose a milestone.') + '</div>') + '</div>';
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
      return '<button type="button" class="ps-ev-it ' + (c.id === atual.id ? 'on' : '') + '" data-a="evdVer" data-v="' + e(c.id) + '"><span><b>' + e(c.nome) + '</b><small>' + e(c.esrs_requisito || c.id) + ' · ' + e(P.msDoIndicador(c.id).empresa) + '</small></span>' + chip(n ? n + ' file' + (n > 1 ? 's' : '') : c.evidencia_obrigatoria ? 'Missing' : '0', cls) + '</button>';
    }).join('') + '</div></div>' +
      '<div class="ps-card">' + cabCartao(atual.nome, 'tarefa', '<span class="ps-mut ps-small">' + e(atual.esrs_requisito || atual.id) + ' · ' + e(m.empresa) + '</span>') + '<div class="ps-card-body">' +
      (pode ? '<button type="button" class="ps-de-drop" data-a="evdAnexar" data-v="' + e(atual.id) + '"><b>Attach evidence to this KPI</b><span>PDF, Excel, images or ZIP. The file name stays recorded with the value it supports.</span></button>' : '<div class="ps-aviso">Evidence can be attached while the milestone is in collection, by whoever has it.</div>') +
      '<div class="ps-mt">' + tabela([{ t: 'Include' }, { t: 'File' }, { t: 'Company · period' }, { t: 'Supports the value', dir: 1 }, { t: 'Uploaded by' }, { t: 'Status' }], it.evidencias.map(function (x, i) {
        var k = chaveEv(atual.id, x), est = P.estadoKpi(atual.id);
        return ['<label class="ps-chk"><input id="evs-' + i + '" type="checkbox" data-c="evdInc" data-id="' + e(k) + '"' + (f.fora[k] ? '' : ' checked') + '><span class="ps-sr">Include ' + e(x.ficheiro) + ' in the package</span></label>', e(x.ficheiro), e(m.empresa) + ' · ' + e(m.ano), it.valor === null ? '-' : e(fmtV(atual.id, it.valor) + ' ' + atual.unidade_medida), e(x.por), chip(est.txt, est.cls)];
      }), 'No evidence yet.') + '</div>' + (atual.evidencia_obrigatoria && !it.evidencias.length ? '<div class="ps-aviso warn ps-mt">Evidence is required for this KPI. The reported value has no support in the auditor package.</div>' : '') + '</div></div></div>';
  };
  A.evdVer = function (d) { U.evd.sel = d.v; R(); };
  C.evdInc = function (el) { if (el.checked) delete U.evd.fora[el.dataset.id]; else U.evd.fora[el.dataset.id] = 1; };
  C.pacDest = function (el) { U.evd.dest = el.value; };
  A.evdAnexar = function (d) { var m = P.msDoIndicador(d.v), usr = u(); X.escolherFicheiro('', function (f) { P.anexar(P.item(d.v), f.name, usr); P.evento(m, 'Evidence attached to ' + P.cat(d.v).nome + ': ' + f.name + '.', usr.nome); P.guardar(); toast('Evidence attached.', 'ok'); R(); }); };
  A.pacExcel = function () {
    var pk = pacote();
    P.escreverFolhas('auditor-package-' + S.ciclo.ano + '.xlsx', {
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
      '<div class="ps-card ps-mt"><div class="ps-card-body"><div class="ps-form">' + campo('tr-q', 'Search', '<input id="tr-q" class="ps-in" placeholder="Data point, user, milestone" data-c="trF" data-id="q" value="' + e(f.q) + '">') +
      campo('tr-norma', 'ESRS standard', '<select id="tr-norma" class="ps-sel" data-c="trF" data-id="norma">' + opt('', 'All', f.norma) + S.mat.map(function (x) { return opt(x.norma, x.norma, f.norma); }).join('') + '</select>') +
      campo('tr-emp', 'Company', '<select id="tr-emp" class="ps-sel" data-c="trF" data-id="empresa">' + opt('', 'All', f.empresa) + S.ent.map(function (x) { return opt(x.nome, x.nome, f.empresa); }).join('') + '</select>') +
      campo('tr-dias', 'Period', '<select id="tr-dias" class="ps-sel" data-c="trF" data-id="dias">' + opt('30', 'Last 30 days', f.dias) + opt('90', 'Last 90 days', f.dias) + opt('todos', 'Whole history', f.dias) + '</select>') + '</div><div class="ps-mt">' + pills('trTipo', [['todos', 'All']].concat(tipos.map(function (t) { return [t, t]; })), f.tipo) + '</div></div></div>' +
      '<div class="ps-card ps-mt"><div class="ps-card-body">' + tabela([{ t: 'Date and time' }, { t: 'User' }, { t: 'Event' }, { t: 'Data point' }, { t: 'Company' }, { t: 'Previous and new value' }, { t: 'Source' }, { t: 'Reason' }, { t: 'Hash' }], mostra.map(function (x) {
        var c = x.ind ? P.cat(x.ind) : null, h = P.seloDe(x.k), casas = c ? c.casas_decimais : 0;
        var vals = x.ind ? (x.antes === null ? '' : '<s class="ps-mut">' + e(P.fmtNum(x.antes, casas)) + '</s> ') + '<b>' + e(x.depois === null ? '-' : P.fmtNum(x.depois, casas)) + '</b> ' + e(c.unidade_medida) : '<span class="ps-small">' + e(x.texto) + '</span>';
        return ['<span class="ps-nowrap">' + e(P.fmtDataHora(x.em)) + '</span>', e(x.por), chip(x.tipo, TIPOS_CHIP[x.tipo]), c ? e(c.nome) + '<br><small class="ps-mut">' + e(c.esrs_requisito || c.id) + '</small>' : (x.m ? e(x.m.nome) : '<span class="ps-mut">Configuration</span>'), x.m ? e(x.m.empresa) : '-', vals, e(x.origem), x.motivo ? '<span class="ps-small">' + e(x.motivo) + '</span>' : '-', '<span class="ps-mono ps-hash" data-tip="' + e(h) + '" tabindex="0">' + e(h.slice(0, 8)) + '</span>'];
      }), 'No events match these filters.') + '<div class="ps-sp-b ps-mt ps-small ps-mut"><span>Showing ' + mostra.length + ' of ' + lista.length + ' events</span>' + (lista.length > f.n ? '<button type="button" class="ps-btn peq" data-a="trMais">Show more</button>' : '') + '</div></div></div>';
  };
  C.trF = function (el) { U.tr[el.dataset.id] = el.value; U.tr.n = 50; };
  A.trTipo = function (d) { U.tr.tipo = d.v; U.tr.n = 50; R(); };
  A.trMais = function () { U.tr.n += 100; R(); };
  A.trVerificar = function () { var v = P.verificarSelos(); v.em = new Date().toISOString(); U.tr.ver = v; toast(v.ok ? v.total + ' events verified, no breaks.' : 'Integrity broken.', v.ok ? 'ok' : 'err'); R(); };
  A.trExcel = function () {
    P.escreverFolhas('audit-trail-' + S.ciclo.ano + '.xlsx', { audit_trail: filtrarTrilho().map(function (x) { var c = x.ind ? P.cat(x.ind) : null; return { at: x.em, user: x.por, event: x.tipo, data_point: c ? c.nome : '', esrs: c ? c.esrs_requisito : '', milestone: x.m ? x.m.nome : '', company: x.m ? x.m.empresa : '', previous: x.antes === undefined || x.antes === null ? '' : x.antes, new: x.depois === undefined || x.depois === null ? '' : x.depois, detail: x.texto, source: x.origem, reason: x.motivo, hash: P.seloDe(x.k) }; }) });
    toast('Audit trail exported.', 'ok');
  };

  /* --- Calculos ------------------------------------------------------------------------- */
  Blocos['calculos'] = function () {
    var usr = u(), calc = P.calcularFatores(), m = P.msDoIndicador('E06'), itE = P.item('E06'), pode = m && P.podePreencher(m, usr), gere = P.gereTudo(usr), forms = S.cat.filter(function (c) { return c.formula && P.podeVerIndicador(c, usr); });
    return '<div class="ps-grid-calc"><div class="ps-card">' + cabCartao('Configured formulas', 'doc', '<span class="ps-mut ps-small">' + forms.length + ' formulas</span>') + '<ul class="ps-form-l">' + forms.map(function (c) { var it = P.item(c.id); return '<li><div class="ps-sp-b"><b>' + e(c.nome) + '</b>' + cod(c) + '</div><code>' + e(c.formula) + '</code><small class="ps-mut">' + (it && it.valor !== null ? 'Current value: ' + e(fmtV(c.id, it.valor) + ' ' + c.unidade_medida) : 'No value yet') + '</small></li>'; }).join('') + '</ul></div>' +
      '<div class="ps-col"><div class="ps-card">' + cabCartao('Scope 1 emissions', 'ativ', cod(P.cat('E06'))) + '<div class="ps-card-body"><p class="ps-small ps-mut">Change the quantities to simulate the result. The factors come from the library below, and are illustrative until confirmed.</p><div class="ps-tw ps-mt"><table class="ps-t ps-t-calc"><thead><tr><th>Source</th><th class="dir">Quantity</th><th>Unit</th><th>Factor</th><th class="dir">kgCO2e</th></tr></thead><tbody>' + calc.linhas.map(function (l) {
        return '<tr><td class="prim">' + e(l.f.nome) + '<br><small class="ps-mut">' + e(l.f.origem) + '</small></td><td class="dir"><input id="cf-q-' + e(l.f.id) + '" class="ps-in ps-num" inputmode="decimal" aria-label="Quantity of ' + e(l.f.nome) + '" data-c="calcQtd" data-id="' + e(l.f.id) + '" value="' + e(String(l.f.qtd).replace('.', ',')) + '"></td><td>' + e(l.f.unidade) + '</td><td class="ps-nowrap">' + e(P.fmtNum(l.f.fator) + ' ' + l.f.unidade_fator) + '</td><td class="dir ps-num"><b>' + e(P.fmtNum(l.kg, 0)) + '</b></td></tr>';
      }).join('') + '</tbody></table></div><div class="ps-calc-tot ps-mt"><span>Total Scope 1</span><span><b>' + e(P.fmtNum(calc.kg / 1000, 2)) + '</b> tCO2e</span></div>' +
      '<div class="ps-sp-b ps-mt"><span class="ps-small ps-mut">Reported in ' + e(m ? m.nome : '-') + ': ' + (itE && itE.valor !== null ? e(fmtV('E06', itE.valor)) + ' kgCO2e' : 'no value') + '</span><button type="button" class="ps-btn pri" data-a="calcAplicar"' + (pode ? '' : ' disabled title="The Scope 1 milestone is not in collection with you"') + '>Use this result in the milestone</button></div></div></div>' +
      '<div class="ps-card">' + cabCartao('Emission factor library', 'tarefa', '<span class="ps-mut ps-small">Each change keeps the previous version and enters the audit trail</span>') + '<div class="ps-card-body">' + tabela([{ t: 'Source' }, { t: 'Factor', dir: 1 }, { t: 'Unit' }, { t: 'Version' }, { t: 'Previous versions' }], S.fatores.map(function (f) {
        return [e(f.nome), gere ? '<input id="cf-f-' + e(f.id) + '" class="ps-in ps-num" inputmode="decimal" aria-label="Factor of ' + e(f.nome) + '" data-c="calcFator" data-id="' + e(f.id) + '" value="' + e(String(f.fator).replace('.', ',')) + '">' : e(P.fmtNum(f.fator)), e(f.unidade_fator), e(f.versao), f.historico.length ? f.historico.map(function (h) { return e(P.fmtNum(h.fator) + ' (v' + h.versao + ')'); }).join(', ') : '-'];
      })) + '</div></div></div></div>';
  };
  C.calcQtd = function (el) { var n = P.lerNumero(el.value), f = S.fatores.filter(function (x) { return x.id === el.dataset.id; })[0]; if (n === null || n < 0) return toast('The quantity must be a number that is not negative.', 'err'); f.qtd = n; P.guardar(); };
  C.calcFator = function (el) { var f = S.fatores.filter(function (x) { return x.id === el.dataset.id; })[0], r = P.alterarFator(f, el.value, S.ciclo.ano, u()); if (r.erro) toast(r.erro, 'err'); };
  A.calcAplicar = function () { res(P.aplicarCalculo(u()), 'Result written to the milestone, with the factors used.'); };

  /* --- Atribuicao de KPIs ------------------------------------------------------------------ */
  U.atr = { rasc: null, q: '', empresa: '' };
  var pessoasAtr = function (papel) { return S.users.filter(function (x) { return papel === 'valida' ? x.perfil === 'esg' || x.perfil === 'admin' : x.perfil === 'resp' || x.perfil === 'esg'; }); };
  Blocos['atribuicao'] = function () {
    var f = U.atr;
    if (!f.rasc) f.rasc = JSON.parse(JSON.stringify(S.atrib));
    var conf = P.conflitosAtrib(f.rasc), q = f.q.toLowerCase(), mudou = JSON.stringify(f.rasc) !== JSON.stringify(S.atrib);
    var lista = catCiclo().filter(function (c) { return (!q || (c.nome + ' ' + c.id + ' ' + c.esrs_requisito).toLowerCase().indexOf(q) > -1) && (!f.empresa || P.msDoIndicador(c.id).empresa === f.empresa); });
    var sel = function (c, papel, rot) {
      var a = f.rasc[c.id] || (f.rasc[c.id] = { submete: '', reve: '', valida: '' }), mau = papel !== 'submete' && a.submete === a[papel];
      return '<select id="at-' + papel + '-' + e(c.id) + '" class="ps-sel' + (mau ? ' erro' : '') + '" aria-label="' + e(rot + ', ' + c.nome) + '" data-c="atrSel" data-id="' + e(c.id) + '" data-f="' + papel + '">' + pessoasAtr(papel).map(function (x) { return opt(x.login, x.nome, a[papel]); }).join('') + '</select>' + (mau ? '<small class="ps-txt-err">Same person submits and approves</small>' : '');
    };
    var carga = S.users.filter(function (x) { return x.perfil === 'resp' || x.perfil === 'esg'; }).map(function (x) {
      var s = 0, r = 0, v = 0; Object.keys(f.rasc).forEach(function (k) { var a = f.rasc[k]; if (a.submete === x.login) s++; if (a.reve === x.login) r++; if (a.valida === x.login) v++; });
      return '<li class="ps-row"><span class="ps-av s" aria-hidden="true">' + e(iniciais(x.nome)) + '</span><span class="ps-row-txt"><b>' + e(x.nome) + '</b><span>' + e(x.unidade || P.PERFIS[x.perfil]) + '</span><span class="ps-carga">' + s + ' submit · ' + r + ' review · ' + v + ' validate</span></span></li>';
    }).join('');
    return '<div class="ps-filtros ps-sp"><button type="button" class="ps-btn" data-a="atrExportar">Export matrix (Excel)</button><button type="button" class="ps-btn" data-a="atrImportar">Import matrix (Excel)</button><button type="button" class="ps-btn pri" data-a="atrGuardar"' + (conf.length ? ' disabled' : '') + '>Save assignments</button>' + (mudou ? chip('Unsaved changes', 'warn') : '') + '</div>' +
      (conf.length ? '<div class="ps-aviso err" role="alert">Segregation of duties: ' + conf.length + ' KPI(s) with the same person submitting and approving (' + e(conf.slice(0, 6).join(', ')) + '). Correct this before saving.</div>' : '') +
      '<div class="ps-grid-side ps-grid-side-l"><div class="ps-card"><div class="ps-card-body"><div class="ps-form">' + campo('at-q', 'Search', '<input id="at-q" class="ps-in" data-c="atrF" data-id="q" value="' + e(f.q) + '">') + campo('at-emp', 'Company', '<select id="at-emp" class="ps-sel" data-c="atrF" data-id="empresa">' + opt('', 'All', f.empresa) + S.ent.filter(function (x) { return cicloMs().some(function (m) { return m.empresa === x.nome; }); }).map(function (x) { return opt(x.nome, x.nome, f.empresa); }).join('') + '</select>') + '</div><div class="ps-mt">' +
      tabela([{ t: 'KPI' }, { t: 'Company' }, { t: 'Submits (data owner)' }, { t: 'Reviews (1st level)' }, { t: 'Validates (ESG)' }], lista.map(function (c) {
        var a = f.rasc[c.id];
        return { attrs: P.conflitoAtrib(a) ? 'class="ps-l-err"' : '', celulas: [e(c.nome) + '<br><small class="ps-mut">' + e(c.esrs_requisito || c.id) + ' · ' + e(P.msDoIndicador(c.id).periodicidade) + '</small>', e(P.msDoIndicador(c.id).empresa), sel(c, 'submete', 'Submits'), sel(c, 'reve', 'Reviews'), sel(c, 'valida', 'Validates')] };
      }), 'No KPI matches these filters.') + '</div></div></div>' +
      '<div class="ps-card">' + cabCartao('People and workload', 'tarefa') + '<ul class="ps-list">' + carga + '</ul><p class="ps-card-body ps-small ps-mut">The assignment sets who owns each KPI in Reporting status. Who can act on a milestone still follows the department of the workflow step.</p></div></div>';
  };
  C.atrSel = function (el) { U.atr.rasc[el.dataset.id][el.dataset.f] = el.value; };
  C.atrF = function (el) { U.atr[el.dataset.id] = el.value; };
  A.atrGuardar = function () { var r = P.guardarAtrib(U.atr.rasc, u()); if (r.erro) return toast(r.erro, 'err'); U.atr.rasc = null; toast('Assignments saved. The change is in the audit trail.', 'ok'); R(); };
  A.atrExportar = function () {
    var nome = function (l) { var x = P.user(l); return x ? x.nome : l; };
    P.escreverFolhas('kpi-assignment-' + S.ciclo.ano + '.xlsx', { assignment: catCiclo().map(function (c) { var a = (U.atr.rasc || S.atrib)[c.id]; return { indicator_id: c.id, kpi: c.nome, company: P.msDoIndicador(c.id).empresa, submits: nome(a.submete), reviews: nome(a.reve), validates: nome(a.valida) }; }) });
  };
  A.atrImportar = function () {
    X.escolherFicheiro('.xlsx', function (f) {
      P.lerFicheiro(f).then(function (r) {
        if (r.erro) return toast(r.erro, 'err');
        var acha = function (t) { var s = String(t || '').trim().toLowerCase(); return S.users.filter(function (x) { return x.login.toLowerCase() === s || x.nome.toLowerCase() === s; })[0]; };
        var d = U.atr.rasc || (U.atr.rasc = JSON.parse(JSON.stringify(S.atrib))), n = 0, mal = [];
        r.linhas.forEach(function (l, i) {
          var id = String(l.indicator_id || '').trim(), s = acha(l.submits), v = acha(l.reviews), w = acha(l.validates);
          if (!d[id] || !s || !v || !w) { mal.push(i + 2); return; }
          d[id] = { submete: s.login, reve: v.login, valida: w.login }; n++;
        });
        toast(n + ' row(s) read' + (mal.length ? ', not applied in row(s) ' + mal.slice(0, 6).join(', ') : '') + '. Check and save.', mal.length ? 'err' : 'ok'); R();
      });
    });
  };

  /* --- Empresas e perimetro ------------------------------------------------------------------ */
  U.per = { sel: '' };
  Blocos['perimetro'] = function () {
    var f = U.per, x = S.ent.filter(function (y) { return y.id === f.sel; })[0] || S.ent[0];
    if (!x) return vazio('No companies yet.');
    var kpis = []; cicloMs().filter(function (m) { return m.empresa === x.nome; }).forEach(function (m) { m.indicadores.forEach(function (id) { kpis.push({ c: P.cat(id), m: m }); }); });
    var pesoTxt = function (y) { var p = P.pesoConsolidacao(y); return p === 0 ? 'Not counted' : P.fmtNum(p * 100, 0) + '%'; };
    return '<div class="ps-card">' + cabCartao('Group companies', 'doc', '<span class="ps-sp"><label class="ps-sr" for="per-novo">New company name</label><input id="per-novo" class="ps-in" placeholder="Company name"><button type="button" class="ps-btn pri peq" data-a="perNova">New company</button></span>') + '<div class="ps-card-body">' +
      tabela([{ t: 'Company' }, { t: 'Country' }, { t: 'Ownership', dir: 1 }, { t: 'Consolidation method' }, { t: 'ESRS perimeter' }, { t: 'Counts at', dir: 1 }, { t: 'Sites', dir: 1 }, { t: 'Currency' }], S.ent.map(function (y) {
        return { attrs: y.id === x.id ? 'class="ps-sel-l" aria-selected="true"' : '', celulas: ['<button type="button" class="ps-btn liga" data-a="perVer" data-v="' + e(y.id) + '">' + e(y.nome) + '</button>', e(y.pais || '-'), y.metodo === 'mae' ? '-' : e(P.fmtNum(y.detencao, 0)) + '%', e(P.METODOS[y.metodo] || '-'), y.perimetro_grupo ? chip('Included', 'ok') : chip('Excluded'), e(pesoTxt(y)), e(y.instalacoes === undefined ? '-' : y.instalacoes), e(y.moeda || '-')] };
      })) + '<p class="ps-small ps-mut ps-mt">The consolidated view adds the included companies, weighted by their method. Percentages and ratios are not weighted.</p></div></div>' +
      '<div class="ps-grid-per ps-mt"><div class="ps-card">' + cabCartao(x.nome, 'tarefa') + '<div class="ps-card-body ps-col">' +
      campo('pf-nipc', 'Tax number', '<input id="pf-nipc" class="ps-in" data-c="perCampo" data-f="nipc" value="' + e(x.nipc) + '">') + campo('pf-nace', 'Sector (NACE code)', '<input id="pf-nace" class="ps-in" data-c="perCampo" data-f="nace" value="' + e(x.nace) + '">') + campo('pf-pais', 'Country', '<input id="pf-pais" class="ps-in" data-c="perCampo" data-f="pais" value="' + e(x.pais) + '">') +
      campo('pf-det', 'Ownership (%)', '<input id="pf-det" class="ps-in ps-num" inputmode="decimal" data-c="perCampo" data-f="detencao" value="' + e(x.detencao) + '">') +
      campo('pf-met', 'Consolidation method', '<select id="pf-met" class="ps-sel" data-c="perCampo" data-f="metodo">' + Object.keys(P.METODOS).map(function (k) { return opt(k, P.METODOS[k], x.metodo); }).join('') + '</select>') +
      '<label class="ps-chk"><input id="pf-inc" type="checkbox" data-c="perInc"' + (x.perimetro_grupo ? ' checked' : '') + '> Include in the consolidated report</label>' + (x.perimetro_grupo ? '' : '<div class="ps-aviso warn">Excluded from the consolidated view. The data stays available in the by company view.</div>') + '</div></div>' +
      '<div class="ps-card">' + cabCartao('KPIs and data entry rules', 'ativ') + '<div class="ps-card-body"><p class="ps-small ps-mut">When on, the company can enter several values for the same KPI in the same period. The platform combines them with the chosen rule.</p><div class="ps-mt">' + tabela([{ t: 'KPI' }, { t: 'Frequency' }, { t: 'Several entries' }, { t: 'Split by' }, { t: 'Aggregation' }], kpis.map(function (l) {
        var r = P.regraEnt(x.nome, l.c.id), id = e(l.c.id);
        return [e(l.c.nome) + '<br><small class="ps-mut">' + e(l.c.esrs_requisito || l.c.id) + '</small>', e(l.m.periodicidade), '<label class="ps-chk"><input id="pr-m-' + id + '" type="checkbox" data-c="perRegra" data-id="' + id + '" data-f="multi"' + (r.multi ? ' checked' : '') + '> ' + (r.multi ? 'Yes' : 'No') + '</label>', r.multi ? '<input id="pr-p-' + id + '" class="ps-in" aria-label="Split ' + e(l.c.nome) + ' by" data-c="perRegra" data-id="' + id + '" data-f="por" value="' + e(r.por) + '">' : '-', r.multi ? '<select id="pr-a-' + id + '" class="ps-sel" aria-label="Aggregation of ' + e(l.c.nome) + '" data-c="perRegra" data-id="' + id + '" data-f="agreg">' + Object.keys(P.AGREGACOES).map(function (k) { return opt(k, P.AGREGACOES[k], r.agreg); }).join('') + '</select>' : '-'];
      }), 'This company has no KPIs in the current cycle.') + '</div></div></div></div>';
  };
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
