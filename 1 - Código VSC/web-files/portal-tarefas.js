/* ============================================================================
   portal-tarefas.js - Home, cartao Tasks e folha de reporte
   Filtros por indicador, grupo de indicadores (norma ESRS ou tema) e estado.
   "Open grid view" abre todas as tasks filtradas numa grelha tipo Excel:
   preenche-se como no Excel (escrever, colar, anular), e cada valor mostra quem
   o inseriu e quando, com o historico da celula na tooltip.
   A grelha e a de portal-grelha.js; a gravacao e a mesma da milestone (aplicarDados).
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var Blocos = X.Blocos, A = X.A, C = X.C, U = X.U, e = X.e, chip = X.chip, opt = X.opt, toast = X.toast, R = X.R, u = X.u, vazio = X.vazio, rota = X.rota, cabCartao = X.cabCartao, tabela = X.tabela, fmtV = X.fmtV;
  var norm = function (t) { return String(t === null || t === undefined ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };

  U.tarF = { q: '', grupo: '', est: 'todos' };
  var EST = [['todos', 'Any status'], ['falta', 'To report'], ['atraso', 'Overdue'], ['preenchido', 'Filled in, to submit'], ['revisao', 'In review or approval'], ['feito', 'Approved']];
  /* Estado de uma linha (KPI numa milestone), para filtrar */
  var codigo = function (m, id) {
    var p = P.passoAtual(m);
    if (!p) return 'feito';
    if (p.tipo !== 'recolha') return 'revisao';
    var it = P.item(id, P.chave(m)), vaz = !it || (it.valor === null && !it.rascunho);
    if (vaz) return P.diasAte(m.prazo) < 0 || m.devolvida ? 'atraso' : 'falta';
    return 'preenchido';
  };
  /* As linhas: mine (o que espera por mim) ou everyone (o que esta em aberto) */
  var escopo = function () {
    var usr = u(), gere = P.gereTudo(usr), minhas = X.pendentesDe(usr);
    if (!U.tarEsc) U.tarEsc = minhas.length || !gere ? 'minhas' : 'todas';
    var esc = gere ? U.tarEsc : 'minhas', lista = (esc === 'todas' ? X.abertas() : minhas).slice().sort(function (a, b) { return a.prazo < b.prazo ? -1 : a.prazo > b.prazo ? 1 : 0; });
    var linhas = [];
    lista.forEach(function (m) { m.indicadores.forEach(function (id) { var c = P.cat(id); if (c) linhas.push({ m: m, id: id, c: c }); }); });
    /* Equipa de sustentabilidade: os indicadores submetidos antes da task, a espera da sua revisao, ficam tambem em "Mine" */
    if (esc === 'minhas' && P.revParaMim) P.revParaMim(usr).forEach(function (x) {
      var ja = linhas.filter(function (l) { return l.m.id === x.m.id && l.id === x.id; })[0];
      if (ja) ja.rev = true; else linhas.unshift({ m: x.m, id: x.id, c: P.cat(x.id), rev: true });
    });
    return { esc: esc, gere: gere, nRev: P.revParaMim ? P.revParaMim(usr).length : 0, minhas: minhas, todas: gere ? X.abertas() : [], lista: lista, linhas: linhas };
  };
  /* Grupos: as normas ESRS e os temas da empresa que existem nas linhas */
  var grupos = function (linhas) {
    var es = {}, te = {};
    linhas.forEach(function (x) { if (x.c.esrs) es[x.c.esrs] = (es[x.c.esrs] || 0) + 1; if (x.c.tema) te[x.c.tema] = (te[x.c.tema] || 0) + 1; });
    var nomeNorma = function (n) { var m = (S.mat || []).filter(function (y) { return y.norma === n; })[0]; return n + (m ? ' ' + m.tema : ''); };
    return { esrs: Object.keys(es).sort().map(function (k) { return ['esrs:' + k, nomeNorma(k), es[k]]; }), tema: Object.keys(te).sort().map(function (k) { return ['tema:' + k, k, te[k]]; }) };
  };
  var filtrar = function (linhas) {
    var f = U.tarF, q = norm(f.q), pal = q.split(' ').filter(Boolean);
    return linhas.filter(function (x) {
      if (f.grupo) { var g = f.grupo.split(':'), k = g.slice(1).join(':'); if (g[0] === 'esrs' ? x.c.esrs !== k : x.c.tema !== k) return false; }
      if (f.est !== 'todos' && codigo(x.m, x.id) !== f.est) return false;
      if (pal.length) { var t = norm([x.c.id, x.c.nome, x.c.esrs_requisito, x.c.tema, P.esrsDe(x.c.id).desc, x.m.nome, x.m.empresa, P.rotPeriodo(x.m)].join(' ')); if (!pal.every(function (w) { return t.indexOf(w) > -1; })) return false; }
      return true;
    });
  };
  var filtrosHtml = function (linhas, pref) {
    var f = U.tarF, g = grupos(linhas), n = function (cod) { return linhas.filter(function (x) { return codigo(x.m, x.id) === cod; }).length; };
    return '<div class="tf-filtros">' +
      '<div class="tf-busca"><label class="ps-sr" for="' + pref + '-q">Search indicators</label><input id="' + pref + '-q" class="ps-in" type="search" autocomplete="off" placeholder="Indicator, ID, ESRS, description…" value="' + e(f.q) + '" data-i="tarBusca" data-c="tarF" data-id="q"></div>' +
      '<label class="ps-sr" for="' + pref + '-g">Group of indicators</label><select id="' + pref + '-g" class="ps-sel" data-c="tarF" data-id="grupo">' + opt('', 'All groups', f.grupo) +
        (g.esrs.length ? '<optgroup label="ESRS standard">' + g.esrs.map(function (x) { return opt(x[0], x[1] + ' (' + x[2] + ')', f.grupo); }).join('') + '</optgroup>' : '') +
        (g.tema.length ? '<optgroup label="Company topic">' + g.tema.map(function (x) { return opt(x[0], x[1] + ' (' + x[2] + ')', f.grupo); }).join('') + '</optgroup>' : '') + '</select>' +
      '<label class="ps-sr" for="' + pref + '-e">Status</label><select id="' + pref + '-e" class="ps-sel" data-c="tarF" data-id="est">' + EST.map(function (x) { return opt(x[0], x[1] + (x[0] === 'todos' ? '' : ' (' + n(x[0]) + ')'), f.est); }).join('') + '</select>' +
      (f.q || f.grupo || f.est !== 'todos' ? '<button type="button" class="ps-btn liga" data-a="tarLimpar">Clear</button>' : '') + '</div>';
  };
  C.tarF = function (el) { U.tarF[el.dataset.id] = el.value; U.tarTodas = false; };
  var tBusca = null;
  X.Live.tarBusca = function (el) { U.tarF.q = el.value; clearTimeout(tBusca); tBusca = setTimeout(R, 180); };
  A.tarLimpar = function () { U.tarF = { q: '', grupo: '', est: 'todos' }; R(); };

  /* --- Cartao Tasks na Home ------------------------------------------------------------ */
  Blocos['inicio-tarefas'] = function () {
    var usr = u(), E = escopo(), nK = function (l) { return l.reduce(function (a, m) { return a + m.indicadores.length; }, 0); };
    var l = filtrar(E.linhas), mostrar = U.tarTodas ? l : l.slice(0, 12);
    var offline = E.lista.filter(function (m) { return P.podePreencher(m, usr); });
    var dir = '<div class="ps-sp">' + (E.gere ? '<div class="ps-seg" role="group" aria-label="Whose tasks"><button type="button" class="' + (E.esc === 'minhas' ? 'on' : '') + '" data-a="tarEsc" data-v="minhas">Mine <span class="n">' + (nK(E.minhas) + E.nRev) + '</span></button><button type="button" class="' + (E.esc === 'todas' ? 'on' : '') + '" data-a="tarEsc" data-v="todas">Everyone <span class="n">' + nK(E.todas) + '</span></button></div>' : '') +
      '<button type="button" class="ps-btn pri peq tf-abrir" data-a="tarFolha"' + (l.length ? '' : ' disabled') + '><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>Open grid view</button>' +
      '<button type="button" class="ps-btn peq" data-a="tarOffline"' + (offline.length ? '' : ' disabled title="Nothing in collection with you in this list"') + '>Excel (offline)</button>' + X.botaoTl('Timeline') + '</div>';
    var cols = [{ t: 'KPI' }, { t: 'Period' }, { t: 'Perimeter' }, { t: 'Assigned to' }, { t: 'Deadline' }, { t: 'Status' }];
    var corpo = '<div class="ps-card-body">' + (E.linhas.length ? filtrosHtml(E.linhas, 'tf') : '') + (mostrar.length ? tabela(cols, mostrar.map(function (x) {
      var st = x.rev ? { txt: P.etapaInd(x.m, x.id) === 'area' ? 'To approve' : 'To approve (area approved)', cls: 'rev', atraso: P.diasAte(x.m.prazo) < 0 } : X.estadoTarefa(x.m, x.id), cta = x.rev ? 'Approve' : P.podeAgir(x.m, usr) ? X.ctaPasso(x.m) : '', sub = '<small class="ps-mut">' + e((x.c.esrs_requisito ? x.c.esrs_requisito + ', ' : '') + x.m.nome) + '</small>';
      return { attrs: 'class="ps-tr-tar"', celulas: ['<div class="ps-tar-k"><a href="' + rota('Milestone/' + x.m.id + '?ind=' + encodeURIComponent(x.c.id)) + '">' + e(x.c.nome) + '</a>' + sub + (cta ? '<a class="ps-tar-cta" href="' + rota('Milestone/' + x.m.id + '?ind=' + encodeURIComponent(x.c.id)) + '">' + e(cta) + ' →</a>' : '') + '</div>', X.tagPer(x.m) || e(P.rotPeriodo(x.m)), X.empHtml(x.m.empresa), P.atribKpiHtml(x.m, x.id), '<span class="ps-nowrap">' + e(X.prazoTxt(x.m)) + '</span>', P.chipEstadoTarefa(x.m, st)] };
    })) : vazio(!E.linhas.length ? (E.esc === 'minhas' ? 'Nothing waiting on you.' + (E.gere ? ' Switch to Everyone to follow the open tasks.' : '') : 'No open tasks.') : 'No task matches these filters.')) +
      (l.length > 12 ? '<div class="ps-sp ps-mt"><button type="button" class="ps-btn liga" data-a="tarTodas">' + (U.tarTodas ? 'Show fewer' : 'Show all ' + l.length + ' tasks') + '</button><a class="ps-btn liga" href="' + rota('Milestones' + (E.esc === 'minhas' ? '?minhas=1' : '')) + '">Open by task</a></div>' : '') + '</div>';
    return '<div class="ps-dock">' + cabCartao('Tasks', 'tarefa', dir) + corpo + '</div>';
  };

  /* --- Folha de reporte: todas as tasks filtradas numa grelha tipo Excel --------------- */
  var quem = function (it) {
    var v = (it.versoes || []).slice(-1)[0];
    return v ? { por: v.por, em: v.em, origem: v.origem } : null;
  };
  var ORIGEM = function (o) { o = String(o || ''); return /paste/.test(o) ? 'pasted from Excel' : /import/.test(o) ? 'Excel import' : /source|calculated/.test(o) ? 'from the system' : /restat|reexpress/.test(o) ? 'restatement' : /entries/.test(o) ? 'by company' : 'typed in'; };
  var historico = function (id, it) {
    var l = (it.versoes || []).slice(-5).reverse();
    if (!l.length) return 'No value entered yet.';
    return 'History of this value: ' + l.map(function (v) { return P.fmtDataHora(v.em) + ', ' + v.por + ': ' + (v.valor === null || v.valor === undefined ? '(cleared)' : fmtV(id, v.valor)) + ' (' + ORIGEM(v.origem) + ')'; }).join(' · ');
  };
  var cfgFolha = function () {
    var usr = u(), E = escopo(), l = filtrar(E.linhas);
    return {
      id: 'gr-tarefas', titulo: 'Tasks grid view', vazio: 'No task matches these filters.',
      dica: 'White cells can be edited: type, double-click, or paste a block from Excel with Ctrl+V. Ctrl+Z undoes. Grey rows are read only. Hover "Entered by" to see the history of the value.',
      cols: [{ k: 'id', t: 'ID' }, { k: 'nome', t: 'Indicator', larg: 240 }, { k: 'grupo', t: 'Group' }, { k: 'per', t: 'Period' }, { k: 'emp', t: 'Perimeter' }, { k: 'un', t: 'Unit' },
        { k: 'ant', t: 'Prior period', dir: 1 }, { k: 'valor', t: 'Value', dir: 1, edita: true, larg: 110 }, { k: 'var', t: 'Change %', dir: 1 }, { k: 'qual', t: 'Data quality', edita: true, larg: 110 },
        { k: 'just', t: 'Justification', edita: true, larg: 190 }, { k: 'est', t: 'Status' }, { k: 'por', t: 'Entered by', larg: 140 }, { k: 'em', t: 'Entered on' }, { k: 'prazo', t: 'Deadline' }],
      linhas: l.map(function (x) {
        var m = x.m, id = x.id, c = x.c, it = P.item(id, P.chave(m)) || { valor: null, versoes: [], evidencias: [] }, pode = P.podePreencher(m, usr), so = !pode;
        var v = P.validarItem(it), ant = P.valorAnterior(id, P.chave(m)), tem = it.valor !== null, q = quem(it), st = X.estadoTarefa(m, id), msg = v.erros.concat(v.alertas).join(' ');
        return { id: m.id + '|' + id, c: {
          id: { t: id, so: true }, nome: { t: c.nome, so: true, tip: P.esrsDe(id).desc || '' }, grupo: { t: (c.esrs ? c.esrs + ' ' : '') + (c.tema || ''), so: true }, per: { t: P.rotPeriodo(m), so: true }, emp: { t: m.empresa, so: true }, un: { t: c.unidade_medida, so: true },
          ant: { t: ant === null || ant === undefined ? '' : fmtV(id, ant), bruto: X.bruNum(ant), num: typeof ant === 'number' ? ant : null, so: true },
          valor: { t: it.rascunho || (tem ? fmtV(id, it.valor) : ''), bruto: it.rascunho || X.bruNum(it.valor), num: it.valor, so: so, cls: v.erros.length ? 'err' : v.alertas.length ? 'alerta' : !tem && pode ? 'falta' : '', tip: msg },
          'var': { t: v.variacao === null ? '' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1), so: true },
          qual: { t: P.QUALIDADE_TXT[it.qualidade] || '', so: so },
          just: { t: it.justificacao || '', so: so, cls: pode && v.alertas.length && !String(it.justificacao || '').trim() ? 'falta' : '', tip: v.alertas.length && !String(it.justificacao || '').trim() ? 'A justification is required because of the alert.' : '' },
          est: { t: st.txt + (st.atraso ? ', overdue' : ''), html: P.chipEstadoTarefa(m, st), so: true },
          por: { t: q ? q.por : '', so: true, tip: historico(id, it), cls: q && usr && q.por !== usr.nome ? 'tf-outro' : '' },
          em: { t: q ? P.fmtDataHora(q.em) : '', so: true }, prazo: { t: P.fmtData(m.prazo), so: true, cls: P.diasAte(m.prazo) < 0 && !P.concluida(m) ? 'err' : '' }
        } };
      }),
      aoAplicar: function (lista, origem) {
        /* Cada linha e uma milestone e um KPI: grava por milestone, como na grelha da milestone */
        var porMs = {}, n = 0, rec = [];
        lista.forEach(function (a) { var p = a.id.split('|'); (porMs[p[0]] = porMs[p[0]] || []).push({ id: p[1], k: a.k, valor: a.valor }); });
        Object.keys(porMs).forEach(function (mid) { var m = P.ms(mid); if (!m) return; var r = X.aplicarDados(m, porMs[mid], origem) || {}; n += r.aplicados || 0; rec = rec.concat(r.recusados || []); });
        return { aplicados: n, recusados: rec, semAlteracao: !n };
      },
      aoColado: function (rel) { toast(rel.aplicados + ' cell(s) updated from your copy.' + (rel.recusados.length ? ' ' + rel.recusados[0] : '') + (rel.ignorados.length ? ' ' + rel.ignorados.join(' ') : ''), rel.aplicados ? 'ok' : 'err'); R(); },
      aoRecusar: function () { toast('This row is read only for you: the task is not in collection with you.', 'err'); },
      aoAnular: function (k) { toast(k + ' cell(s) restored.', 'ok'); }
    };
  };
  X.Pn.tarFolha = function () {
    var usr = u(), E = escopo(), l = filtrar(E.linhas), cfg = cfgFolha();
    var pode = l.filter(function (x) { return P.podePreencher(x.m, usr); }), feitos = l.filter(function (x) { var it = P.item(x.id, P.chave(x.m)); return it && it.valor !== null; });
    var outros = feitos.filter(function (x) { var q = quem(P.item(x.id, P.chave(x.m))); return q && q.por !== usr.nome; }).length;
    var pct = l.length ? Math.round((feitos.length / l.length) * 100) : 0;
    var resumo = '<div class="tf-res"><div class="tf-res-b"><b>' + feitos.length + ' of ' + l.length + '</b> reported<span class="tf-barra" aria-hidden="true"><i style="width:' + pct + '%"></i></span></div>' +
      '<span>' + pode.length + ' you can fill in</span><span>' + (l.length - pode.length) + ' read only</span><span>' + outros + ' entered by someone else</span></div>';
    return { t: 'Tasks grid view', s: (E.esc === 'minhas' ? 'Your tasks' : 'Everyone\'s open tasks') + ', ' + l.length + ' row(s)', largo: true, cls: 'folha tf-pan',
      b: filtrosHtml(E.linhas, 'tfs') + resumo + window.PortalGrelha.html(cfg),
      p: '<button type="button" class="ps-btn" data-a="tarFolhaExcel"' + (l.length ? '' : ' disabled') + '>Export to Excel</button><span class="ps-sp-flex"></span><button type="button" class="ps-btn pri" data-a="fecharPainel">Done</button>' };
  };
  A.tarFolha = function () { X.abrePainel('tarFolha'); };
  A.tarFolhaExcel = function () { if (P.exportarGrelha) { P.exportarGrelha(cfgFolha(), 'tasks-' + P.hojeISO() + '.xlsx', 'Tasks'); toast('Excel file exported.', 'ok'); } };
})();
