/* ============================================================================
   portal-paginas.js - desenha as paginas e liga as acoes
   Cada web page tem <section data-pagina="X"> com blocos <div data-bloco="y">.
   Aqui so se preenchem os blocos, por isso funciona igual com rotas por hash (todas as
   paginas no mesmo ficheiro) e no portal (uma pagina por URL).
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S;
  var MODO = window.PORTAL_MODO || 'portal';
  var e = function (v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var U = { rota: { pag: '', arg: '', q: {} }, sep: 'dados', msFiltro: { empresa: '', dep: '', estado: 'todas', esrs: true, minhas: false }, msEmpTodas: false, dadosVista: 'form', colRel: {}, exp: {}, msVista: 'lista', entVista: 'board', imp: {}, cal: null, consEsrs: false, histInd: 'A03', audFiltro: 'todas', boTab: 'ciclo', painel: null, menu: null, docNova: false, indBusca: '', marca: null, regraBusca: '', logoEstado: '' };

  /* --- Icones ------------------------------------------------------------ */
  var svg = function (d, t) { return '<svg width="' + (t || 16) + '" height="' + (t || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var I = {
    tick: '<path d="M20 6L9 17l-5-5"/>', doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    tarefa: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>', cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    ativ: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', voltar: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', cima: '<polyline points="18 15 12 9 6 15"/>', baixo: '<polyline points="6 9 12 15 18 9"/>', lixo: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>'
  };

  /* --- Componentes ------------------------------------------------------- */
  var rota = function (r) {
    if (MODO === 'hash') return '#/' + r;
    var q = r.split('?'), p = q[0].split('/');
    return '/' + p[0].toLowerCase() + '/' + (p[1] || q[1] ? '?' + [p[1] ? 'id=' + p[1] : '', q[1] || ''].filter(Boolean).join('&') : '');
  };
  var tagsDe = function (m) { return '<span class="ps-tags">' + (m.departamentos || []).map(function (d) { return '<span class="ps-tag">' + e(d) + '</span>'; }).join('') + '</span>'; };
  var atribHtml = function (m) {
    var a = P.atribuido(m);
    if (!a) return '<span class="ps-mut">-</span>';
    return a.tipo === 'pessoa' ? '<span class="ps-pess"><i aria-hidden="true">' + e(iniciais(a.nome)) + '</i>' + e(a.nome) + '</span>' : '<span class="ps-tag">' + e(a.nome) + '</span>';
  };
  var rotaEmp = function (nome) { var x = S.ent.filter(function (y) { return y.nome === nome; })[0]; return rota('Milestones' + (x ? '?empresa=' + encodeURIComponent(x.id) : '')); };
  /* A mesma regra em todas as tabelas de milestones: empresa e a quem esta atribuida */
  var COLS_MS = [{ t: 'Milestone' }, { t: 'Company' }, { t: 'Assigned to' }, { t: 'Due' }, { t: 'Status' }];
  var linhaTabMs = function (m) { return ['<a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a>', e(m.empresa), atribHtml(m), '<span class="ps-nowrap">' + e(prazoTxt(m)) + '</span>', estChip(m)]; };
  var chip = function (txt, cls) { return '<span class="ps-chip ' + (cls || '') + '">' + e(txt) + '</span>'; };
  var estChip = function (m) { var s = P.estadoMs(m); return chip(s.txt, s.cls); };
  var iniciais = function (n) { return String(n).replace(/^Resp\.\s*/, '').split(/\s+/).filter(function (x) { return x.length > 2 || x === x.toUpperCase(); }).slice(0, 2).map(function (x) { return x[0]; }).join('') || '?'; };
  var cabCartao = function (t, ico, dir) { return '<div class="ps-card-head"><h2>' + (ico ? '<span class="ps-ic">' + svg(I[ico]) + '</span>' : '') + e(t) + '</h2>' + (dir || '') + '</div>'; };
  var vazio = function (t) { return '<div class="ps-vazio">' + e(t) + '</div>'; };
  var opt = function (val, txt, sel) { return '<option value="' + e(val) + '"' + (String(val) === String(sel) ? ' selected' : '') + '>' + e(txt === undefined ? val : txt) + '</option>'; };
  var campo = function (id, lab, html) { return '<div class="ps-campo"><label class="ps-lab" for="' + e(id) + '">' + e(lab) + '</label>' + html + '</div>'; };
  var tabela = function (cols, linhas, vaz) {
    if (!linhas.length) return vazio(vaz || 'Sem dados.');
    return '<div class="ps-tw"><table class="ps-t"><thead><tr>' + cols.map(function (c) { return '<th scope="col"' + (c.dir ? ' class="dir"' : '') + '>' + e(c.t) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) {
        var cels = l.celulas || l;
        return '<tr' + (l.attrs ? ' ' + l.attrs : '') + '>' + cels.map(function (h, i) { return '<td' + (i === 0 ? ' class="prim"' : ' data-l="' + e(cols[i].t) + '"' + (cols[i].dir ? ' class="dir ps-num"' : '')) + '>' + h + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  };
  var miniWf = function (m) {
    return '<span class="ps-mini-wf" role="img" aria-label="Step ' + Math.min(m.passo_atual + 1, m.passos.length) + ' of ' + m.passos.length + '">' + m.passos.map(function (p, i) { return '<i class="' + (i < m.passo_atual ? 'ok' : i === m.passo_atual ? 'at' : '') + '" title="' + e(p.nome) + '"></i>'; }).join('') + '</span>';
  };
  var passoTxt = function (m) {
    if (P.concluida(m)) return 'All steps completed';
    var p = P.passoAtual(m);
    return p.nome + ' · ' + P.nomeResp(m, p.responsavel);
  };
  var prazoTxt = function (m) {
    if (P.concluida(m)) return P.fmtData(m.prazo);
    var d = P.diasAte(m.prazo);
    return P.fmtData(m.prazo) + (d < 0 ? ' · ' + Math.abs(d) + ' days ago' : d === 0 ? ' · today' : ' · in ' + d + ' days');
  };
  var fmtV = function (id, v) { return P.fmtNum(v, P.cat(id).casas_decimais); };
  var u = function () { return P.sessao(); };
  var doUtilizador = function (m, usr) { return usr.perfil === 'resp' ? m.unidade === usr.unidade : true; };
  var aviso = function (t, cls) { toast(t, cls); };
  var toastTimer = null;
  var toast = function (t, cls) {
    var el = document.querySelector('[data-toast]');
    if (!el) return;
    el.className = 'ps-toast ' + (cls || '');
    el.textContent = t;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 4600);
  };

  /* --- Marca ------------------------------------------------------------- */
  var nomeMarca = function () { return (S.marca && S.marca.nome) || P.MARCA_BASE.nome; };
  /* A sigla entre parenteses, se existir, e o monograma: Record to Report (R2R) da R2R */
  var sigla = function (n) { var x = /\(([^)]+)\)/.exec(n || ''); return x ? x[1] : iniciais(n || 'P').toUpperCase(); };
  var monograma = function () { return '<span class="ps-marca-mono" aria-hidden="true">' + e(sigla(nomeMarca())) + '</span>'; };
  var logoOuMono = function () {
    return S.marca.logotipo ? '<img src="' + e(S.marca.logotipo) + '" alt="' + e(nomeMarca()) + '" data-logo>' : monograma();
  };
  var pintarMarca = function () {
    document.querySelectorAll('[data-marca-c]').forEach(function (el) {
      var t = el.getAttribute('data-marca-c');
      if (t === 'cabecalho') {
        el.innerHTML = logoOuMono() + '<span class="ps-marca-txt">' + e(nomeMarca()) + (S.marca.subtitulo ? '<small>' + e(S.marca.subtitulo) + '</small>' : '') + '</span>';
      } else if (t === 'hero') {
        el.innerHTML = (S.marca.logotipo ? '<span class="ps-logo-chip"><img src="' + e(S.marca.logotipo) + '" alt="" data-logo></span>' : '') + '<h1>' + e(nomeMarca()) + '</h1>';
      } else if (t === 'nome') {
        el.textContent = nomeMarca();
      } else if (t === 'logo-claro') {
        el.innerHTML = S.marca.logotipo ? '<span class="ps-logo-chip"><img src="' + e(S.marca.logotipo) + '" alt="' + e(nomeMarca()) + '" data-logo></span>' : '<b>' + e(nomeMarca()) + '</b>';
      }
    });
  };
  window.PortalAoMudarMarca = function () { if (S.marca) pintarMarca(); };

  /* --- Cabecalho e navegacao --------------------------------------------- */
  var paginasPermitidas = function (usr) {
    if (!usr) return ['Entrada'];
    if (usr.perfil === 'ext') return ['Pedidos'];
    var base = ['Inicio', 'Milestones', 'Milestone', 'Consolidado', 'Documentos', 'Evidencias', 'Calculos', 'Relatorio', 'Kpis', 'Historico', 'Auditoria'];
    if (usr.perfil !== 'auditor') base.push('Dados');
    if (P.gereTudo(usr) || usr.perfil === 'auditor') base.push('Aprovacoes', 'Estado', 'Trilho');
    if (P.gereTudo(usr)) base.push('Atribuicao', 'Perimetro', 'Backoffice');
    return base;
  };
  var ativaNav = function (pag) { return pag === 'Milestone' ? 'Milestones' : pag; };
  var pendentesDe = function (usr) { return P.msCiclo().filter(function (m) { return P.podeAgir(m, usr); }); };
  var pintarCabecalho = function () {
    var usr = u(), pag = U.rota.pag;
    document.body.classList.toggle('ps-sem-nav', !usr || pag === 'Entrada');
    var h = document.querySelector('[data-cabecalho]');
    if (!h) return;
    h.hidden = !usr || pag === 'Entrada';
    if (h.hidden) { var bn = document.querySelector('[data-bnav]'); if (bn) bn.hidden = true; return; }
    var per = paginasPermitidas(usr);
    var mc = document.querySelector('[data-nav-marca]');
    if (mc) mc.setAttribute('href', rota(usr.perfil === 'ext' ? 'Pedidos' : 'Inicio'));
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var n = a.getAttribute('data-nav');
      a.hidden = per.indexOf(n) < 0;
      a.classList.toggle('on', ativaNav(pag) === n);
      a.setAttribute('href', rota(n));
      if (ativaNav(pag) === n) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var nPend = pendentesDe(usr).length;
    document.querySelectorAll('[data-campo="nav-pend"]').forEach(function (el) { el.textContent = nPend || ''; el.hidden = !nPend; });
    var nAprov = pendentesDe(usr).filter(function (m) { return P.passoAtual(m).tipo !== 'recolha'; }).length;
    document.querySelectorAll('[data-campo="nav-aprov"]').forEach(function (el) { el.textContent = nAprov || ''; el.hidden = !nAprov; });
    document.querySelectorAll('[data-nav-grp]').forEach(function (g) { var v = false, n = g.nextElementSibling; while (n && !n.hasAttribute('data-nav-grp')) { if (!n.hidden) v = true; n = n.nextElementSibling; } g.hidden = !v; });
    var notifs = P.notificacoes(usr);
    var badge = document.querySelector('[data-campo="sino-n"]');
    if (badge) { badge.textContent = notifs.length; badge.hidden = !notifs.length; }
    var av = document.querySelector('[data-campo="avatar"]');
    if (av) { av.textContent = iniciais(usr.nome); av.title = usr.nome; }
    var c = document.querySelector('[data-campo="ciclo"]');
    if (c) c.textContent = S.ciclo.ano;
    var bnav = document.querySelector('[data-bnav]');
    if (bnav) bnav.hidden = usr.perfil === 'ext';
    var menu = document.querySelector('[data-menu]');
    if (menu) {
      menu.hidden = !U.menu;
      if (U.menu === 'notif') {
        menu.innerHTML = '<div class="ps-menu-head"><b>Notifications</b>' + notifs.length + ' open</div><div class="ps-menu-sec">' + (notifs.length ? notifs.map(function (n) {
          return '<a class="ps-menu-it" href="' + rota(n.rota) + '" data-a="fecharMenu"><i class="ps-menu-dot ' + e(n.cls) + '"></i><span>' + e(n.texto) + '<small>' + e(n.sub) + '</small></span></a>';
        }).join('') : vazio('No notifications.')) + '</div>';
      } else if (U.menu === 'conta') {
        menu.innerHTML = '<div class="ps-menu-head"><b>' + e(usr.nome) + '</b>' + e(P.PERFIS[usr.perfil]) + (usr.unidade ? ' · ' + e(usr.unidade) : '') + '</div><div class="ps-menu-sec"><button class="ps-menu-it" type="button" data-a="sair">' + (P.online() ? 'Sign out' : 'Switch profile') + '</button></div>';
      }
    }
  };

  /* --- Entrada ----------------------------------------------------------- */
  var Blocos = {};
  Blocos['entrada-perfis'] = function () {
    if (P.online()) {
      return '<form class="ps-login" data-login>' +
        campo('lg-email', 'Email or username', '<input id="lg-email" class="ps-in" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required>') +
        campo('lg-senha', 'Password', '<input id="lg-senha" class="ps-in" type="password" autocomplete="current-password" required>') +
        (U.loginErro ? '<div class="ps-aviso err" role="alert">' + e(U.loginErro) + '</div>' : '') +
        '<button type="submit" class="ps-btn pri"' + (U.aEntrar ? ' disabled' : '') + '>' + (U.aEntrar ? 'Signing in' : 'Sign in') + '</button></form>';
    }
    var grupos = [['Administration', 'admin'], ['Sustainability', 'esg'], ['Data owners', 'resp'], ['Audit', 'auditor'], ['External entities', 'ext']];
    return grupos.map(function (g) {
      return '<div class="ps-ent-grp"><h3>' + e(g[0]) + '</h3>' + S.users.filter(function (x) { return x.perfil === g[1]; }).map(function (x) {
        return '<button type="button" class="ps-ent-p" data-a="entrar" data-v="' + e(x.login) + '"><span class="ps-av s" aria-hidden="true">' + e(iniciais(x.nome)) + '</span><span><b>' + e(x.nome) + '</b><small>' + e(x.unidade || P.PERFIS[x.perfil]) + '</small></span></button>';
      }).join('') + '</div>';
    }).join('');
  };

  /* --- Inicio ------------------------------------------------------------ */
  var contagens = function (usr) {
    var todas = P.msCiclo().filter(function (m) { return doUtilizador(m, usr); }), n = { pend: pendentesDe(usr).length, atraso: 0, rev: 0, conc: 0 };
    todas.forEach(function (m) {
      var c = P.estadoMs(m).cod;
      if (c === 'atraso') n.atraso++;
      if (['revisao', 'parecer', 'aprovacao'].indexOf(c) > -1) n.rev++;
      if (c === 'concluida') n.conc++;
    });
    return n;
  };
  var linhaMs = function (m, cta) {
    var ico = P.estadoMs(m).cls === 'err' ? 'err' : '';
    return '<li><a class="ps-row" href="' + rota('Milestone/' + m.id) + '"><span class="ps-row-ico ' + ico + '">' + svg(I.doc, 18) + '</span><span class="ps-row-txt"><b>' + e(m.nome) + '</b><span>' + e(m.empresa) + ' · ' + e(passoTxt(m)) + ' · due ' + e(prazoTxt(m)) + '</span></span>' + estChip(m) + (cta ? '<span class="ps-row-cta">' + e(cta) + '</span>' : '') + '</a></li>';
  };
  var ctaPasso = function (m) { var p = P.passoAtual(m); return !p ? '' : p.tipo === 'recolha' ? 'Fill in' : p.tipo === 'parecer' ? 'Give opinion' : p.tipo === 'aprovacao' ? 'Approve' : 'Review'; };
  var pintarHero = function () {
    var usr = u(), n = contagens(usr), set = function (k, v) { var el = document.querySelector('[data-campo="' + k + '"]'); if (el) el.textContent = v; };
    var h = new Date().getHours();
    set('hero-ola', (h < 13 ? 'Good morning' : h < 20 ? 'Good afternoon' : 'Good evening') + ', ' + usr.nome);
    set('kpi-pend', n.pend); set('kpi-atraso', n.atraso); set('kpi-rev', n.rev); set('kpi-conc', n.conc);
    document.querySelectorAll('[data-kpi-rota]').forEach(function (a) { a.setAttribute('href', rota(a.getAttribute('data-kpi-rota'))); });
  };
  Blocos['inicio-pendentes'] = function () {
    var l = pendentesDe(u()), mostrar = l.slice(0, 5);
    return '<div class="ps-dock">' + cabCartao('Milestones waiting on you', 'tarefa', '<a class="ps-btn liga" href="' + rota('Milestones?minhas=1') + '">View all (' + l.length + ')</a>') +
      (mostrar.length ? '<ul class="ps-list">' + mostrar.map(function (m) { return linhaMs(m, ctaPasso(m)); }).join('') + '</ul>' : vazio('Nothing waiting on you.')) + '</div>';
  };
  Blocos['inicio-entregas'] = function () {
    var usr = u(), cols = [['Overdue', [], 'atraso'], ['Next 7 days', [], ''], ['8 to 21 days', [], ''], ['Expiring in more than 21 days', [], '']], todas = [];
    P.msCiclo().forEach(function (m) {
      var p = P.passoAtual(m);
      if (!p || p.tipo !== 'recolha') return;
      var d = P.diasAte(m.prazo);
      cols[d < 0 ? 0 : d <= 7 ? 1 : d <= 21 ? 2 : 3][1].push(m);
      todas.push(m);
    });
    var porPrazo = function (a, b) { return a.prazo < b.prazo ? -1 : 1; };
    var dir = '<div class="ps-sp"><div class="ps-seg" role="group" aria-label="View"><button type="button" class="' + (U.entVista === 'board' ? 'on' : '') + '" data-a="entVista" data-v="board">Board</button><button type="button" class="' + (U.entVista === 'tabela' ? 'on' : '') + '" data-a="entVista" data-v="tabela">Table</button></div><a class="ps-btn liga" href="' + rota('Milestones') + '">View all milestones</a></div>';
    var corpo;
    if (U.entVista === 'tabela') {
      corpo = '<div class="ps-card-body">' + tabela(COLS_MS, todas.sort(porPrazo).map(linhaTabMs), 'No upcoming deliveries.') + '</div>';
    } else {
      corpo = '<div class="ps-tl">' + cols.map(function (c) {
        c[1].sort(porPrazo);
        return '<div class="ps-tl-col ' + c[2] + '"><h4>' + e(c[0]) + ' <span class="ps-n">' + c[1].length + '</span></h4>' + (c[1].length ? c[1].slice(0, 6).map(function (m) {
          return '<a class="ps-tl-it" href="' + rota('Milestone/' + m.id) + '"><b>' + e(m.nome) + '</b><small>' + e(m.empresa) + ' · ' + e(P.fmtData(m.prazo)) + '</small>' + (P.podeAgir(m, usr) ? '<span class="ps-tl-tag">with you</span>' : '') + '</a>';
        }).join('') + (c[1].length > 6 ? '<a class="ps-btn liga" href="' + rota('Milestones') + '">' + (c[1].length - 6) + ' more</a>' : '') : '<div class="ps-mut ps-small">Nothing here.</div>') + '</div>';
      }).join('') + '</div>';
    }
    return '<div class="ps-card">' + cabCartao('Upcoming deliveries', 'cal', dir) + corpo + '</div>';
  };
  var classeCal = function (m) { var c = P.estadoMs(m).cod; return c === 'concluida' ? 'ok' : (c === 'atraso' || c === 'devolvida') ? 'err' : (c === 'revisao' || c === 'parecer' || c === 'aprovacao') ? 'rev' : ''; };
  var janelasDoDia = function (a, me, d) { return S.janelas.filter(function (j) { return j.meses.indexOf(me + 1) > -1 && d >= j.dia_inicio && d <= j.dia_fim; }); };
  var calendario = function (lista, pref) {
    var hoje = new Date();
    if (!U.cal) U.cal = { ano: hoje.getFullYear(), mes: hoje.getMonth(), dia: hoje.getDate() };
    var a = U.cal.ano, me = U.cal.mes, prim = new Date(a, me, 1), n = new Date(a, me + 1, 0).getDate(), desloc = (prim.getDay() + 6) % 7, iso = function (d) { return a + '-' + String(me + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
    var porDia = {};
    lista.forEach(function (m) { (porDia[m.prazo] = porDia[m.prazo] || []).push(m); });
    var cel = '';
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(function (x) { cel += '<div class="ps-cal-sem" aria-hidden="true">' + x + '</div>'; });
    for (var i = 0; i < desloc; i++) cel += '<div></div>';
    for (var d = 1; d <= n; d++) {
      var ms = porDia[iso(d)] || [], cl = ['ps-cal-d'];
      if (janelasDoDia(a, me, d).length) cl.push('jan');
      if (iso(d) === P.hojeISO()) cl.push('hoje');
      if (d === U.cal.dia) cl.push('sel');
      cel += '<button type="button" id="' + pref + d + '" class="' + cl.join(' ') + '" data-a="calDia" data-v="' + d + '" aria-label="' + d + ', ' + ms.length + ' deadlines"' + (d === U.cal.dia ? ' aria-pressed="true"' : '') + '>' + d + (ms.length ? '<span class="pts">' + ms.slice(0, 3).map(function (m) { return '<i class="' + classeCal(m) + '"></i>'; }).join('') + '</span>' : '') + '</button>';
    }
    var ds = U.cal.dia, msDia = porDia[iso(ds)] || [], jan = janelasDoDia(a, me, ds);
    var nomeMes = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(prim);
    return '<aside class="ps-cal ps-fundo-marca" aria-label="Calendar"><div class="ps-cal-h"><h2>Calendar</h2><div class="ps-cal-nav"><button type="button" data-a="calMes" data-v="-1" aria-label="Previous month">‹</button><button type="button" data-a="calHoje">Today</button><button type="button" data-a="calMes" data-v="1" aria-label="Next month">›</button></div></div>' +
      '<div class="ps-cal-mes">' + e(nomeMes) + '</div><div class="ps-cal-g">' + cel + '</div>' +
      '<div class="ps-cal-leg"><span><i></i>In collection</span><span><i class="err"></i>Overdue or returned</span><span><i class="rev"></i>In review</span><span><i class="ok"></i>Completed</span></div>' +
      '<div class="ps-cal-det"><h3>' + ds + ' ' + e(new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(prim)) + '</h3>' +
      (jan.length ? jan.map(function (j) { return '<div class="ps-cal-jan" style="--c:' + e(P.TEMAS[j.tema] || '#888') + '"><i></i>' + e(j.nome) + '</div>'; }).join('') : '') +
      (msDia.length ? msDia.map(function (m) { return '<a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a>'; }).join('') : '<div class="ps-mut">No milestones due on this day.</div>') + '</div></aside>';
  };
  Blocos['inicio-calendario'] = function () { return calendario(P.msCiclo(), 'cal-'); };

  /* --- Milestones -------------------------------------------------------- */
  var msFiltradas = function () {
    var f = U.msFiltro, usr = u();
    return P.msCiclo().filter(function (m) {
      var c = P.estadoMs(m).cod;
      if (f.empresa && m.empresa !== f.empresa) return false;
      if (f.dep && m.departamentos.indexOf(f.dep) < 0) return false;
      if (f.minhas && !P.podeAgir(m, usr)) return false;
      if (f.estado === 'curso' && c === 'concluida') return false;
      if (f.estado === 'atraso' && c !== 'atraso') return false;
      if (f.estado === 'concluidas' && c !== 'concluida') return false;
      if (!f.esrs && m.periodicidade === 'Novos dados ESRS') return false;
      return true;
    }).sort(function (a, b) {
      /* O que esta em aberto vem primeiro, por prazo. O concluido fica no fim. */
      var ca = P.concluida(a) ? 1 : 0, cb = P.concluida(b) ? 1 : 0;
      return ca - cb || (a.prazo < b.prazo ? -1 : a.prazo > b.prazo ? 1 : 0);
    });
  };
  Blocos['milestones-empresas'] = function () {
    var f = U.msFiltro, ms = P.msCiclo();
    var cartao = function (href, nome, mono, l, on) {
      var conc = l.filter(P.concluida).length, atr = l.filter(function (m) { return P.estadoMs(m).cod === 'atraso'; }).length, pct = l.length ? Math.round((conc / l.length) * 100) : 0;
      return '<a class="ps-emp' + (on ? ' on' : '') + '" href="' + href + '"' + (on ? ' aria-current="true"' : '') + '><span class="ps-emp-mono" aria-hidden="true">' + e(mono) + '</span><span class="ps-emp-txt"><b>' + e(nome) + '</b><small>' + l.length + (l.length === 1 ? ' milestone' : ' milestones') + (atr ? ' · <em>' + atr + ' overdue</em>' : '') + '</small><span class="ps-emp-barra" aria-hidden="true"><i style="width:' + pct + '%"></i></span><small>' + conc + ' of ' + l.length + ' completed</small></span></a>';
    };
    var daEmpresa = function (nome) { return ms.filter(function (m) { return m.empresa === nome; }); };
    var com = S.ent.filter(function (x) { return daEmpresa(x.nome).length; }), sem = S.ent.filter(function (x) { return !daEmpresa(x.nome).length; });
    var vis = com.concat(U.msEmpTodas ? sem : sem.filter(function (x) { return x.nome === f.empresa; }));
    return '<div class="ps-card"><div class="ps-card-head"><h2>Companies</h2>' + (sem.length ? '<button type="button" class="ps-btn liga" data-a="msEmpTodas">' + (U.msEmpTodas ? 'Show only companies with milestones' : 'Show ' + sem.length + ' more with no milestones') + '</button>' : '') + '</div><div class="ps-emps">' +
      cartao(rota('Milestones'), 'All companies', 'All', ms, !f.empresa) +
      vis.map(function (x) { return cartao(rota('Milestones?empresa=' + encodeURIComponent(x.id)), x.nome, iniciais(x.nome), daEmpresa(x.nome), f.empresa === x.nome); }).join('') + '</div></div>';
  };
  Blocos['milestones-calendario'] = function () {
    var f = U.msFiltro;
    return calendario(P.msCiclo().filter(function (m) { return !f.empresa || m.empresa === f.empresa; }), 'calm-');
  };
  var exportarMilestones = function (lista) {
    var linhas = [['Milestone', 'Company', 'Assigned to', 'Due', 'Status']].concat(lista.map(function (m) { var a = P.atribuido(m); return [m.nome, m.empresa, a ? a.nome : '', m.prazo, P.estadoMs(m).txt]; }));
    var wb = window.XLSX.utils.book_new(), ws = window.XLSX.utils.aoa_to_sheet(linhas);
    ws['!cols'] = [{ wch: 48 }, { wch: 26 }, { wch: 32 }, { wch: 12 }, { wch: 18 }];
    window.XLSX.utils.book_append_sheet(wb, ws, 'Milestones');
    window.XLSX.writeFile(wb, 'milestones.xlsx');
    toast('Excel file exported.', 'ok');
  };
  Blocos['milestones'] = function () {
    var f = U.msFiltro, lista = msFiltradas();
    var filtros = '<div class="ps-filtros">' + campo('f-dep', 'Department', '<select id="f-dep" class="ps-sel" data-c="msDepF">' + opt('', 'All', f.dep) + P.UNIDADES.map(function (x) { return opt(x, x, f.dep); }).join('') + '</select>') +
      campo('f-es', 'Status', '<select id="f-es" class="ps-sel" data-c="msEstado">' + opt('todas', 'All', f.estado) + opt('curso', 'In progress', f.estado) + opt('atraso', 'Overdue', f.estado) + opt('concluidas', 'Completed', f.estado) + '</select>') +
      '<label class="ps-chk"><input id="f-minhas" type="checkbox" data-c="msMinhas"' + (f.minhas ? ' checked' : '') + '> Waiting on me</label>' +
      '<label class="ps-chk"><input id="f-esrs" type="checkbox" data-c="msEsrs"' + (f.esrs ? ' checked' : '') + '> Include ESRS track</label></div>';
    var dir = '<div class="ps-sp"><div class="ps-seg" role="group" aria-label="View"><button type="button" class="' + (U.msVista === 'lista' ? 'on' : '') + '" data-a="msVista" data-v="lista">Table</button><button type="button" class="' + (U.msVista === 'board' ? 'on' : '') + '" data-a="msVista" data-v="board">Board</button></div><button type="button" class="ps-btn peq" data-a="msExcel"' + (lista.length ? '' : ' disabled') + '>Export to Excel</button></div>';
    var cab = cabCartao((f.empresa || 'All companies') + ' (' + lista.length + ')', 'tarefa', dir);
    if (!lista.length) return filtros + '<div class="ps-card">' + cab + vazio('No milestones match these filters.') + '</div>';
    if (U.msVista === 'board') {
      var cols = [['Collection', ['recolha', 'atraso', 'devolvida']], ['Review and opinion', ['revisao', 'parecer']], ['Approval', ['aprovacao']], ['Completed', ['concluida']]];
      return filtros + '<div class="ps-card">' + cab + '<div class="ps-card-body"><div class="ps-board">' + cols.map(function (c) {
        var it = lista.filter(function (m) { return c[1].indexOf(P.estadoMs(m).cod) > -1; });
        return '<div class="ps-board-col"><h3>' + e(c[0]) + '<span class="ps-n">' + it.length + '</span></h3>' + it.map(function (m) {
          return '<a class="ps-board-it" href="' + rota('Milestone/' + m.id) + '"><b>' + e(m.nome) + '</b><small class="ps-mut">' + e(m.empresa) + '</small><div>' + atribHtml(m) + '</div><div class="ps-sp-b ps-mt">' + estChip(m) + '<span class="ps-mut ps-small">' + e(P.fmtData(m.prazo)) + '</span></div></a>';
        }).join('') + '</div>';
      }).join('') + '</div></div></div>';
    }
    return filtros + '<div class="ps-card">' + cab + '<div class="ps-card-body">' + tabela(COLS_MS, lista.map(linhaTabMs)) + '</div></div>';
  };

  /* --- Milestone --------------------------------------------------------- */
  var PERIODO_TXT = { Mensal: 'Monthly', Trimestral: 'Quarterly', Anual: 'Annual', 'Novos dados ESRS': 'New ESRS data' };
  var msAtual = function () { return P.ms(U.rota.arg); };
  var preenchidos = function (m) { return m.indicadores.filter(function (id) { return P.item(id, m.ano).valor !== null; }).length; };
  var usados = function (m) { var o = {}; m.indicadores.forEach(function (id) { P.cat(id).utilizado_por.forEach(function (x) { o[x] = 1; }); }); return Object.keys(o); };
  Blocos['milestone-cabecalho'] = function () {
    var m = msAtual(), d = P.diasAte(m.prazo);
    var ext = S.ext.filter(function (x) { return x.milestone_id === m.id; }).length;
    return '<nav class="ps-mig" aria-label="Breadcrumb"><a href="' + rota('Inicio') + '">Home</a><span>/</span><a href="' + rota('Milestones') + '">Milestones</a><span>/</span><a href="' + rotaEmp(m.empresa) + '">' + e(m.empresa) + '</a><span>/</span><b>' + e(m.nome) + '</b></nav>' +
      '<div class="ps-ban"><div class="ps-ban-top"><div><div class="ps-ban-tags"><span class="ps-ban-tag">' + e(m.empresa) + '</span><span class="ps-ban-tag">' + e(m.ano) + '</span><span class="ps-ban-tag">' + e(PERIODO_TXT[m.periodicidade] || m.periodicidade) + '</span>' + (m.periodicidade === 'Novos dados ESRS' ? '<span class="ps-ban-tag">ESRS track</span>' : '') + (m.workflow_ajustado ? '<span class="ps-ban-tag">Adjusted workflow</span>' : '') + '</div>' +
      '<h1>' + e(m.nome) + '</h1><div class="ps-ban-sub">Reporting year ' + e(m.ano) + ' · ' + e(m.unidade) + ' · data users: ' + e(usados(m).join(', ')) + '</div></div>' +
      '<div class="ps-ban-dir"><div class="ps-ban-pill"><small>Due</small>' + e(P.fmtDataAno(m.prazo)) + '</div>' + estChip(m) + '</div></div>' +
      '<div class="ps-ban-stats"><div class="ps-ban-stat"><b>' + preenchidos(m) + '/' + m.indicadores.length + '</b><span>Indicators filled in</span></div><div class="ps-ban-stat"><b>' + m.indicadores.filter(function (id) { return P.item(id, m.ano).evidencias.length; }).length + '</b><span>With evidence</span></div><div class="ps-ban-stat"><b>' + ext + '</b><span>External requests</span></div><div class="ps-ban-stat"><b>' + (P.concluida(m) ? '-' : d + 'd') + '</b><span>Until due</span></div></div></div>';
  };
  Blocos['milestone-workflow'] = function () {
    var m = msAtual(), feitos = Math.min(m.passo_atual, m.passos.length), pct = Math.round((feitos / m.passos.length) * 100);
    return '<div class="ps-card ps-mt">' + cabCartao('Milestone workflow', 'ativ', '<div class="ps-sp"><div class="ps-leg"><span><i class="ok"></i>Completed</span><span><i class="at"></i>Current</span><span><i></i>To do</span></div>' + (P.podeAlterarWorkflow(m, u()) ? '<button type="button" class="ps-btn peq" data-a="abrirWf">Change workflow</button>' : '') + '</div>') +
      '<div class="ps-wf-barra ps-mt" role="img" aria-label="' + pct + '% of steps completed"><i style="width:' + pct + '%"></i></div><div class="ps-wf">' + m.passos.map(function (p, i) {
        var c = i < m.passo_atual ? 'ok' : i === m.passo_atual ? (m.devolvida ? 'at dev' : 'at') : '';
        return '<div class="ps-wf-p ' + c + '"' + (i === m.passo_atual ? ' aria-current="step"' : '') + '><div class="ps-wf-n">' + e(p.nome) + '</div><div class="ps-wf-c">' + (i < m.passo_atual ? svg(I.tick, 18) : m.devolvida && i === m.passo_atual ? svg(I.voltar, 18) : i + 1) + '</div><div class="ps-wf-r">' + (p.concluido_em ? '<b>' + e(P.fmtData(p.concluido_em)) + '</b><br>' + e(p.concluido_por) : i === m.passo_atual ? '<b>Current</b><br>' + e(P.nomeResp(m, p.responsavel)) : e(P.nomeResp(m, p.responsavel))) + '</div></div>';
      }).join('') + '</div></div>';
  };
  Blocos['milestone-corpo'] = function () {
    var m = msAtual(), usr = u(), decide = P.podeAgir(m, usr) && P.passoAtual(m).tipo !== 'recolha';
    var nAud = S.aud.filter(function (a) { var x = P.msDoIndicador(a.indicador_id, m.ano); return x && x.id === m.id && a.estado !== 'resolvido'; }).length;
    var nExt = S.ext.filter(function (x) { return x.milestone_id === m.id && x.estado !== 'aplicado'; }).length;
    /* Uma so pagina, pela ordem do trabalho: pedido, fontes e calculos, dados, ficheiros, exploracao, qualidade, terceiros, auditoria e conversa */
    var secs = [['dados', decide ? 'Review' : 'Data request', 0, pedidoTopo(m) + (P.fontesHtml ? '<div id="sec-fontes" class="ps-sec">' + P.fontesHtml(m) + '</div>' : '') + (decide ? sepRevisao(m) : P.podePreencher(m, usr) ? sepRecolha(m) : sepLeitura(m)) + cartaoFicheiros(m)],
      ['explorar', 'Data explorer', 0, sepExplorar(m)], ['evidencias', 'Evidence and quality', 0, sepEvidencias(m)], ['externos', 'External contributions', nExt, sepExternos(m)], ['auditoria', 'Audit', nAud, sepAuditoria(m)], ['conversa', 'Conversation and history', m.comentarios.length, sepConversa(m)]];
    var indice = [['dados', secs[0][1]], ['fontes', 'Data sources and calculations']].concat(secs.slice(1).map(function (s) { return [s[0], s[1], s[2]]; }));
    return '<div class="ps-grid-side ps-ms-corrida"><div class="ps-col">' + secs.map(function (s) { return '<section id="sec-' + s[0] + '" class="ps-sec ps-col" aria-label="' + e(s[1]) + '">' + s[3] + '</section>'; }).join('') + '</div>' +
      '<div class="ps-col ps-ms-lado"><nav class="ps-card ps-ms-indice" aria-label="On this page">' + cabCartao('On this page') + '<ul>' + indice.map(function (s) { return '<li><button type="button" class="ps-btn liga" data-a="sep" data-v="' + s[0] + '">' + e(s[1]) + (s[2] ? ' <span class="ps-n">' + s[2] + '</span>' : '') + '</button></li>'; }).join('') + '</ul></nav>' +
      '<div class="ps-card">' + cabCartao('Details') + '<div class="ps-card-body"><dl class="ps-det"><dt>Company</dt><dd>' + (P.gereTudo(usr) ? '<select id="ms-emp" class="ps-sel" aria-label="Company" data-c="msEmpresa">' + S.ent.map(function (x) { return opt(x.nome, x.nome, m.empresa); }).join('') + '</select>' : e(m.empresa)) + '</dd><dt>Departments</dt><dd>' + editorTags(m, usr) + '</dd><dt>Unit</dt><dd>' + e(m.unidade) + '</dd><dt>Current step</dt><dd>' + e(P.concluida(m) ? 'Completed' : P.passoAtual(m).nome) + '</dd><dt>Assigned to</dt><dd>' + editorAtrib(m, usr) + '</dd><dt>Due</dt><dd>' + e(prazoTxt(m)) + '</dd><dt>Indicators</dt><dd>' + m.indicadores.length + '</dd></dl></div></div></div></div>';
  };
  var editorAtrib = function (m, usr) {
    var p = P.passoAtual(m);
    if (!p || p.tipo !== 'recolha' || !P.acompanha(m, usr)) return atribHtml(m);
    return '<select id="ms-atr" class="ps-sel" aria-label="Assigned to" data-c="msAtrib">' + opt('', m.unidade + ' (department)', m.atribuido_a || '') + P.atribuiveis(m).map(function (x) { return opt(x.login, x.nome, m.atribuido_a || ''); }).join('') + '</select>';
  };
  var editorTags = function (m, usr) {
    if (!P.acompanha(m, usr) || P.concluida(m)) return tagsDe(m);
    var livres = P.UNIDADES.filter(function (d) { return m.departamentos.indexOf(d) < 0; });
    return '<span class="ps-tags">' + m.departamentos.map(function (d) { return '<span class="ps-tag">' + e(d) + '<button type="button" data-a="msTagDel" data-v="' + e(d) + '" aria-label="Remove ' + e(d) + '">×</button></span>'; }).join('') + '</span>' +
      (livres.length ? '<select id="ms-tag" class="ps-sel ps-mt" aria-label="Add department" data-c="msTagAdd">' + opt('', 'Add department') + livres.map(function (d) { return opt(d); }).join('') + '</select>' : '');
  };
  var celValor = function (m, id) { var it = P.item(id, m.ano); return it.valor === null ? '-' : fmtV(id, it.valor); };
  var linkFicha = function (id, txt) { return '<button type="button" class="ps-btn liga" data-a="ficha" data-v="' + e(id) + '">' + e(txt || P.cat(id).nome) + '</button>'; };
  var marcaAmostra = function (id) { return S.amostra.indexOf(id) > -1 ? ' ' + chip('Sample', 'rev') : ''; };

  var sepRecolha = function (m) {
    var usr = u(), rel = U.imp[m.id], feitos = preenchidos(m);
    var linhas = m.indicadores.map(function (id) {
      var c = P.cat(id), it = P.item(id, m.ano), v = P.validarItem(it), ant = P.valorAnterior(id, m.ano);
      var txtBruto = it.rascunho || (it.valor === null ? '' : String(it.valor).replace('.', ','));
      var cls = v.erros.length ? 'erro' : v.alertas.length ? 'alerta' : '';
      var res = v.erros.length ? chip('Error', 'err') : v.alertas.length ? chip(v.alertas.length + ' alert(s)', 'warn') : it.valor !== null ? chip('Valid', 'ok') : chip('To fill in');
      var recebido = S.ext.filter(function (x) { return x.indicador_id === id && x.milestone_id === m.id && x.estado === 'recebido'; })[0];
      return '<div class="ps-ind" id="ind-' + e(id) + '"><div class="ps-ind-top"><div class="ps-ind-nome"><button type="button" data-a="ficha" data-v="' + e(id) + '">' + e(c.nome) + '</button><small>' + e(c.unidade_medida) + ' · ' + (c.tipo === 'derivado' ? 'Derived' : 'Base data') + ' · ' + e(c.perimetro) + (P.esrsDe(id).dps.length ? ' · ' + e(P.esrsDe(id).dps[0]) : '') + '</small><span class="ps-ind-desc">' + e(P.esrsDe(id).desc) + '</span>' + (P.formulaTxt ? '<span class="ps-ind-form">ƒ ' + e(P.formulaTxt(id)) + '</span>' : '') + '</div>' +
        '<div><span class="ps-ind-k">' + (m.ano - 1) + '</span><span class="ps-num">' + (ant === null || ant === undefined ? '-' : fmtV(id, ant)) + '</span></div>' +
        '<div class="ps-ind-campo"><label class="ps-ind-k" for="v-' + e(id) + '">Value ' + e(m.ano) + '</label><input id="v-' + e(id) + '" class="ps-in ps-num ' + cls + '" inputmode="decimal" autocomplete="off" value="' + e(txtBruto) + '" data-c="valor" data-id="' + e(id) + '"' + (v.erros.length ? ' aria-invalid="true" aria-describedby="err-' + e(id) + '"' : '') + '></div>' +
        '<div><span class="ps-ind-k">Change</span><span class="ps-num">' + (v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%') + '</span></div><div>' + res + '</div></div>' +
        (v.erros.length ? '<div id="err-' + e(id) + '" class="ps-ind-msg ps-mt" role="alert">' + e(v.erros[0]) + '</div>' : '') +
        (v.alertas.length ? '<div class="ps-ind-just"><ul>' + v.alertas.map(function (a) { return '<li>' + e(a) + '</li>'; }).join('') + '</ul><label class="ps-lab" for="j-' + e(id) + '">Justification (required)</label><textarea id="j-' + e(id) + '" class="ps-ta" data-c="just" data-id="' + e(id) + '">' + e(it.justificacao) + '</textarea></div>' : '') +
        '<div class="ps-ind-sub">' + campo('q-' + id, 'Data quality', '<select id="q-' + e(id) + '" class="ps-sel" data-c="qual" data-id="' + e(id) + '">' + opt('medido', 'Measured', it.qualidade) + opt('calculado', 'Calculated', it.qualidade) + opt('estimado', 'Estimated', it.qualidade) + '</select>') +
        (it.qualidade === 'estimado' ? campo('m-' + id, 'Estimation method (required)', '<input id="m-' + e(id) + '" class="ps-in" value="' + e(it.metodo) + '" data-c="metodo" data-id="' + e(id) + '">') : '') +
        '<div class="ps-sp"><button type="button" id="e-' + e(id) + '" class="ps-btn peq" data-a="anexar" data-v="' + e(id) + '">Attach evidence</button>' + (c.evidencia_obrigatoria ? (it.evidencias.length ? chip('Evidence attached', 'ok') : chip('Evidence required', 'warn')) : (it.evidencias.length ? chip(it.evidencias.length + ' evidence item(s)', 'ok') : '')) + '<button type="button" class="ps-btn peq" data-a="pedirExt" data-v="' + e(id) + '">Ask an external entity</button></div></div>' +
        (recebido ? '<div class="ps-aviso ok ps-mt">' + e(recebido.entidade_externa) + ' sent ' + e(fmtV(id, recebido.valor)) + ' ' + e(c.unidade_medida) + '. <button type="button" class="ps-btn peq" data-a="usarExt" data-v="' + e(recebido.id) + '">Use this value</button></div>' : '') + '</div>';
    }).join('');
    return '<div class="ps-card">' + cabCartao('Import file', 'doc') +
      '<div class="ps-drop"><button type="button" class="ps-btn pri" data-a="importar">Import file</button><button type="button" class="ps-btn" data-a="tplExcel">Template Excel</button><button type="button" class="ps-btn" data-a="tplCsv">Template CSV</button><button type="button" class="ps-btn" data-a="impExemplo">Test with a sample file</button><span class="ps-mut ps-small">Excel (.xlsx), CSV or JSON</span></div>' +
      (rel ? relatorioImport(m, rel) : '') + '</div>' +
      '<div class="ps-card ps-com-acao">' + cabCartao('Requested data', 'tarefa', ferrDados(m)) + (U.dadosVista === 'grid' ? corpoGrelha(m) : linhas) +
      '<div class="ps-sticky"><span class="ps-small ps-mut" aria-live="polite">' + feitos + ' of ' + m.indicadores.length + ' indicators with a value</span><button type="button" id="btn-submeter" class="ps-btn pri" data-a="submeter">Submit milestone</button></div></div>';
  };
  /* --- Pedido de dados ---------------------------------------------------- */
  var pedidoTopo = function (m) {
    var p = P.passoAtual(m), recolha = !!p && p.tipo === 'recolha', fics = P.ficheirosPedidos(m), obrig = fics.filter(function (f) { return f.obrigatorio; }), fOk = obrig.filter(function (f) { return f.entregues.length; }).length;
    var faltas = recolha ? P.faltasSubmissao(m) : [], comFalta = {}, erros = 0, alertas = 0;
    faltas.forEach(function (f) { if (f.campo === 'val' || f.campo === 'just' || f.campo === 'met') comFalta[f.id] = 1; });
    m.indicadores.forEach(function (id) { var it = P.item(id, m.ano), v = P.validarItem(it); if (v.erros.length) erros++; if (v.alertas.length && !String(it.justificacao || '').trim()) alertas++; });
    var dOk = recolha ? m.indicadores.filter(function (id) { return !comFalta[id]; }).length : preenchidos(m), tot = m.indicadores.length + obrig.length, pct = tot ? Math.round(((dOk + fOk) / tot) * 100) : 100, C2 = 2 * Math.PI * 36;
    var titulo = !p ? 'Delivered and approved' : !recolha ? 'Delivered, now with ' + P.nomeResp(m, p.responsavel) : faltas.length ? faltas.length + (faltas.length === 1 ? ' item still needed' : ' items still needed') : 'Everything is ready to submit';
    var txt = !recolha ? 'This is what was requested and what was delivered.' : 'Provide the data and the files below by ' + P.fmtDataAno(m.prazo) + '. Every value is checked against the prior year and the rules of its indicator.';
    var passo = function (n, nome, det, ok) { return '<li class="' + (ok ? 'ok' : '') + '"><span class="n" aria-hidden="true">' + (ok ? svg(I.tick, 14) : n) + '</span><b>' + e(nome) + '</b><small>' + e(det) + '</small></li>'; };
    return '<div class="ps-card ps-ped"><div class="ps-ped-top"><div class="ps-ped-anel" role="img" aria-label="' + pct + '% ready"><svg viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="36"/><circle class="v" cx="44" cy="44" r="36" stroke-dasharray="' + (C2 * pct / 100).toFixed(1) + ' ' + C2.toFixed(1) + '" transform="rotate(-90 44 44)"/></svg><b>' + pct + '%</b></div>' +
      '<div class="ps-ped-txt"><span class="ps-ped-k">Data request</span><h2>' + e(titulo) + '</h2><p>' + e(txt) + '</p></div></div>' +
      '<ol class="ps-ped-passos">' + passo(1, 'Provide the data', dOk + ' of ' + m.indicadores.length + ' data points', dOk === m.indicadores.length) + passo(2, 'Attach the files', fOk + ' of ' + obrig.length + ' required files', fOk === obrig.length) + passo(3, 'Validate', erros ? erros + ' with errors' : alertas ? alertas + ' alerts to justify' : 'No open issues', !erros && !alertas && preenchidos(m) === m.indicadores.length) + '</ol>' +
      (faltas.length ? '<details class="ps-ped-faltas" id="ped-faltas"><summary>See what is missing (' + faltas.length + ')</summary><ul>' + faltas.slice(0, 12).map(function (f) { return '<li><button type="button" class="ps-btn liga" data-a="irFalta" data-campo="' + e(f.campo) + '" data-id="' + e(f.id) + '">' + e(f.msg) + '</button></li>'; }).join('') + (faltas.length > 12 ? '<li class="ps-mut ps-small">And ' + (faltas.length - 12) + ' more.</li>' : '') + '</ul></details>' : '') + '</div>';
  };
  var cartaoFicheiros = function (m) {
    var usr = u(), pode = P.podePreencher(m, usr), gere = P.gereTudo(usr) && !P.concluida(m), fics = P.ficheirosPedidos(m);
    return '<div class="ps-card">' + cabCartao('Requested files', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'File' }, { t: 'Why it is requested' }, { t: 'Format' }, { t: 'Delivered' }, { t: 'Status' }], fics.map(function (f) {
      var ent = f.entregues, acao = (P.folhaAcoes ? P.folhaAcoes(m, f, pode) + ' ' : '') + (pode ? '<button type="button" id="fp-' + e(f.id) + '" class="ps-btn peq' + (ent.length ? '' : ' pri') + '" data-a="ficEntregar" data-v="' + e(f.id) + '">' + (ent.length ? 'Add another' : 'Upload') + '</button>' : '') + (gere && f.proprio ? ' <button type="button" class="ps-btn peq err" data-a="ficRetirar" data-v="' + e(f.id) + '">Remove</button>' : '');
      return [e(f.nome) + (f.obrigatorio ? '' : ' <span class="ps-mut ps-small">(optional)</span>'), e(f.motivo || '-'), e(f.formatos.length ? f.formatos.join(', ') : 'Any'), (ent.length ? ent.map(function (x) { return '<span class="ps-small">' + e(x.ficheiro) + '<br><span class="ps-mut">' + e(x.por) + (x.origem === 'grid' ? ' · filled in on the platform' : '') + '</span></span>'; }).join('<br>') : '<span class="ps-mut">-</span>') + (P.folhaEstado ? P.folhaEstado(m, f) : ''), '<span class="ps-sp">' + (ent.length ? chip('Delivered', 'ok') : f.obrigatorio ? chip('Missing', 'warn') : chip('Optional')) + acao + '</span>'];
    }), 'No files requested for this milestone.') +
      (gere ? '<div class="ps-form ps-mt ps-fic-novo">' + campo('fp-nome', 'Request another file', '<input id="fp-nome" class="ps-in" placeholder="Nome do ficheiro pedido">') + '<label class="ps-chk"><input id="fp-obr" type="checkbox" checked> Required</label><button type="button" class="ps-btn" data-a="ficPedir">Add to the request</button></div>' : '') + '</div></div>';
  };
  var ferrDados = function (m) {
    return '<div class="ps-sp"><div class="ps-seg" role="group" aria-label="View"><button type="button" class="' + (U.dadosVista === 'grid' ? '' : 'on') + '" data-a="dadosVista" data-v="form">' + (P.podePreencher(m, u()) ? 'Form' : 'Table') + '</button><button type="button" class="' + (U.dadosVista === 'grid' ? 'on' : '') + '" data-a="dadosVista" data-v="grid">Grid</button></div><button type="button" class="ps-btn peq" data-a="dadosExcel">Export to Excel</button></div>';
  };

  /* --- Grelha de dados ---------------------------------------------------- */
  var bruNum = function (v) { return v === null || v === undefined ? '' : String(v).replace('.', ','); };
  var cfgDados = function (m) {
    var pode = P.podePreencher(m, u());
    return {
      id: 'gr-' + m.id, titulo: 'Requested data', vazio: 'No data requested.',
      dica: pode ? 'Copy from Excel and paste here with Ctrl+V. Double-click or type to edit. Ctrl+Z undoes.' : 'Read only. Select cells and copy them to Excel with Ctrl+C.',
      cols: [{ k: 'id', t: 'ID' }, { k: 'nome', t: 'Indicator', larg: 280 }, { k: 'un', t: 'Unit' }, { k: 'ant', t: String(m.ano - 1), dir: 1 }, { k: 'valor', t: m.ano + ' value', dir: 1, edita: pode, larg: 110 }, { k: 'var', t: 'Change %', dir: 1 }, { k: 'qual', t: 'Data quality', edita: pode, larg: 110 }, { k: 'metodo', t: 'Estimation method', edita: pode, larg: 170 }, { k: 'just', t: 'Justification', edita: pode, larg: 220 }, { k: 'evid', t: 'Evidence', larg: 130 }, { k: 'res', t: 'Validation', larg: 130 }],
      linhas: m.indicadores.map(function (id) {
        var c = P.cat(id), it = P.item(id, m.ano), v = P.validarItem(it), ant = P.valorAnterior(id, m.ano), tem = it.valor !== null, msg = v.erros.concat(v.alertas).join(' ');
        var evid = it.evidencias.map(function (x) { return x.ficheiro; }).join(', ');
        return { id: id, c: {
          id: { t: id }, nome: { t: c.nome }, un: { t: c.unidade_medida },
          ant: { t: ant === null || ant === undefined ? '' : fmtV(id, ant), bruto: bruNum(ant), num: typeof ant === 'number' ? ant : null },
          valor: { t: it.rascunho || (tem ? fmtV(id, it.valor) : ''), bruto: it.rascunho || bruNum(it.valor), num: it.valor, cls: v.erros.length ? 'err' : v.alertas.length ? 'alerta' : !tem && pode ? 'falta' : '', tip: msg },
          'var': { t: v.variacao === null ? '' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1), bruto: v.variacao === null ? '' : bruNum(Math.round(v.variacao * 10) / 10), num: v.variacao === null ? null : Math.round(v.variacao * 10) / 10 },
          qual: { t: P.QUALIDADE_TXT[it.qualidade] }, metodo: { t: it.metodo || '', cls: it.qualidade === 'estimado' && !String(it.metodo || '').trim() ? 'falta' : '' },
          just: { t: it.justificacao || '', cls: v.alertas.length && !String(it.justificacao || '').trim() ? 'falta' : '', tip: v.alertas.length && !String(it.justificacao || '').trim() ? 'A justification is required because of the alert.' : '' },
          evid: { t: evid, cls: c.evidencia_obrigatoria && !evid ? 'falta' : '', tip: c.evidencia_obrigatoria && !evid ? 'Required evidence missing. Upload it in Requested files.' : '' },
          res: { t: v.erros.length ? 'Error' : v.alertas.length ? 'Alert' : tem ? 'Valid' : 'To fill in', html: v.erros.length ? chip('Error', 'err') : v.alertas.length ? chip(v.alertas.length + ' alert(s)', 'warn') : tem ? chip('Valid', 'ok') : chip('To fill in'), tip: msg }
        } };
      }),
      aoAplicar: function (lista, origem) { return aplicarDados(m, lista, origem); },
      aoColar: function (mat) { return planoColagem(m, mat); },
      aoColado: function (rel) {
        U.colRel[m.id] = rel;
        toast(rel.aplicados + ' cell(s) updated from your copy.' + (rel.recusados.length + rel.ignorados.length ? ' See the notes under the grid.' : ''), rel.aplicados ? 'ok' : 'err');
        R();
      },
      aoRecusar: function () { toast('This milestone is read only for you right now.', 'err'); },
      aoAnular: function (n) { toast(n + ' cell(s) restored.', 'ok'); }
    };
  };
  var corpoGrelha = function (m) {
    var rel = U.colRel[m.id], notas = rel ? rel.recusados.concat(rel.ignorados) : [];
    var cfg = cfgDados(m);
    return '<div class="ps-card-body">' + window.PortalGrelha.html(cfg) + (notas.length ? '<div class="ps-aviso warn ps-mt" role="status"><div class="ps-sp-b"><b>Not applied from your copy</b><button type="button" class="ps-btn liga" data-a="colRelFechar">Dismiss</button></div><ul class="ps-notas">' + notas.slice(0, 15).map(function (n) { return '<li>' + e(n) + '</li>'; }).join('') + '</ul>' + (notas.length > 15 ? '<small>And ' + (notas.length - 15) + ' more.</small>' : '') + '</div>' : '') + '</div>';
  };
  var aplicarDados = function (m, lista, origem) {
    var usr = u(), n = 0, rec = [];
    if (!P.podePreencher(m, usr)) return { aplicados: 0, recusados: ['This milestone is read only for you right now.'], semAlteracao: true };
    lista.forEach(function (a) {
      var c = P.cat(a.id), it = P.item(a.id, m.ano);
      if (a.k === 'valor') {
        var s = P.limparColado(a.valor), num = s === '' ? null : P.lerNumero(s);
        if (s === '' ? (it.valor === null && !it.rascunho) : num === null ? it.rascunho === s : (num === it.valor && !it.rascunho)) return;
        P.gravarValor(m, a.id, s, usr, origem === 'colar' && num !== null ? 'paste from Excel' : undefined);
        n++;
        if (s !== '' && num === null) rec.push(c.nome + ': "' + s + '" is not a number. It stays marked in the grid.');
      } else if (a.k === 'qual') {
        if (!String(a.valor).trim()) return;
        var q = P.lerQualidade(a.valor);
        if (!q) { rec.push(c.nome + ': quality "' + a.valor + '" not recognised. Use Measured, Calculated or Estimated.'); return; }
        if (it.qualidade !== q) { it.qualidade = q; if (q !== 'estimado') it.metodo = ''; n++; }
      } else if (a.k === 'metodo' || a.k === 'just') {
        var campo2 = a.k === 'metodo' ? 'metodo' : 'justificacao', t = String(a.valor);
        if (a.k === 'metodo' && it.qualidade !== 'estimado' && t.trim()) { rec.push(c.nome + ': an estimation method only applies to Estimated data.'); return; }
        if (String(it[campo2] || '') !== t) { it[campo2] = t; n++; }
      }
    });
    if (n) { if (origem === 'colar') P.evento(m, n + ' cells updated by paste from Excel.', usr.nome); P.guardar(); }
    R();
    return { aplicados: n, recusados: rec, semAlteracao: !n };
  };
  /* Colar "assume bem": procura cabecalhos e indicadores no que veio, para nao depender da ordem do Excel */
  var norm = function (s) { return String(s === null || s === undefined ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\s]+/g, ' ').trim(); };
  var planoColagem = function (m, mat) {
    var ano = String(m.ano), ALIAS = { id: ['id', 'indicator id', 'indicador id', 'codigo', 'code', 'ref'], nome: ['indicator', 'indicador', 'nome', 'name', 'indicator name', 'designacao'], un: ['unit', 'unidade', 'unidade de medida', 'unit of measure', 'un'], valor: ['value', 'valor', ano, ano + ' value', 'valor ' + ano, 'value ' + ano], qual: ['data quality', 'quality', 'qualidade', 'qualidade dos dados'], metodo: ['estimation method', 'method', 'metodo', 'metodo de estimativa'], just: ['justification', 'justificacao', 'justificativa'] };
    var porId = {}, porNome = {};
    S.cat.forEach(function (c) { porId[norm(c.id)] = c; porNome[norm(c.nome)] = c; });
    var achar = function (txt) { var k = norm(txt); return porId[k] || porNome[k] || null; };
    var mapa = {}, cab = mat[0] || [];
    cab.forEach(function (t, i) { var k = norm(t); Object.keys(ALIAS).forEach(function (a) { if (ALIAS[a].indexOf(k) > -1 && mapa[a] === undefined) mapa[a] = i; }); });
    var comCab = (mapa.id !== undefined || mapa.nome !== undefined) && (mapa.valor !== undefined || mapa.just !== undefined || mapa.qual !== undefined);
    var dados = comCab ? mat.slice(1) : mat, base = comCab ? 2 : 1;
    if (!comCab) {
      /* Sem cabecalho: a primeira coluna tem de identificar os indicadores, e o valor e a primeira coluna com numeros */
      var cheias = dados.filter(function (l) { return String(l[0] || '').trim(); });
      if (!cheias.length || !dados[0] || dados[0].length < 2 || cheias.filter(function (l) { return achar(l[0]); }).length * 2 < cheias.length) return null;
      mapa = { id: 0 };
      for (var ci = 1; ci < dados[0].length && mapa.valor === undefined; ci++) {
        var cels = dados.map(function (l) { return P.limparColado(l[ci]); }).filter(Boolean);
        if (cels.length && cels.filter(function (x) { return P.lerNumero(x) !== null; }).length * 2 >= cels.length) mapa.valor = ci;
        else if (cels.length && dados.some(function (l) { var c0 = achar(l[0]); return c0 && norm(l[ci]) === norm(c0.unidade_medida); })) mapa.un = ci;
        else if (cels.length && dados.some(function (l) { var c0 = achar(l[0]); return c0 && norm(l[ci]) === norm(c0.nome); })) mapa.nome = ci;
      }
      if (mapa.valor === undefined) return null;
    }
    var lista = [], ign = [], colId = mapa.id !== undefined ? mapa.id : mapa.nome;
    dados.forEach(function (l, ix) {
      if (!l.some(function (x) { return String(x).trim(); })) return;
      var ref = 'Row ' + (ix + base), c = achar(l[colId]) || (mapa.nome !== undefined ? achar(l[mapa.nome]) : null);
      if (!c) { ign.push(ref + ': "' + l[colId] + '" is not an indicator.'); return; }
      if (m.indicadores.indexOf(c.id) < 0) { ign.push(ref + ': ' + c.nome + ' is not part of this milestone.'); return; }
      if (mapa.un !== undefined && String(l[mapa.un] || '').trim() && norm(l[mapa.un]) !== norm(c.unidade_medida)) { ign.push(ref + ': ' + c.nome + ' must be in ' + c.unidade_medida + ', not ' + l[mapa.un] + '.'); return; }
      ['valor', 'qual', 'metodo', 'just'].forEach(function (k) { if (mapa[k] !== undefined && l[mapa[k]] !== undefined) lista.push({ id: c.id, k: k, valor: l[mapa[k]] }); });
    });
    return { lista: lista, ignorados: ign };
  };
  var exportarGrelha = function (cfg, ficheiro, folha, extra) {
    var cols = cfg.cols.filter(function (c) { return !c.semExport; });
    var linhas = [cols.map(function (c) { return c.t; })].concat(cfg.linhas.map(function (l) {
      return cols.map(function (c) { var x = l.c[c.k] || {}; return typeof x.num === 'number' ? x.num : x.t === undefined ? '' : x.t; });
    }));
    var wb = window.XLSX.utils.book_new(), ws = window.XLSX.utils.aoa_to_sheet(linhas);
    ws['!cols'] = cols.map(function (c) { return { wch: Math.max(10, Math.round((c.larg || 80) / 7)) }; });
    window.XLSX.utils.book_append_sheet(wb, ws, folha);
    if (extra) window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(extra.linhas), extra.nome);
    window.XLSX.writeFile(wb, ficheiro);
    return linhas;
  };
  P.exportarGrelha = exportarGrelha;
  P.cfgDados = function (m) { return cfgDados(m); };
  var folhaFicheiros = function (m) {
    return { nome: 'Requested files', linhas: [['File', 'Why it is requested', 'Format', 'Required', 'Delivered']].concat(P.ficheirosPedidos(m).map(function (f) { return [f.nome, f.motivo || '', f.formatos.join(', '), f.obrigatorio ? 'Yes' : 'No', f.entregues.map(function (x) { return x.ficheiro; }).join(', ')]; })) };
  };

  /* --- Explorador de dados (cilindro) ------------------------------------- */
  var estadoExp = function (m) {
    /* Por pessoa: quem troca de perfil nao herda camadas nem dados a que nao tem acesso */
    var chave = m.id + ':' + u().login;
    if (U.exp[chave]) return U.exp[chave];
    var usr = u(), vis = m.indicadores.filter(function (id) { return P.podeVerIndicador(P.cat(id), usr); });
    var abertos = S.cat.filter(function (k) { return P.podeVerIndicador(k, usr); }), primeiro = vis.length ? P.cat(vis[0]).tema : abertos.length ? abertos[0].tema : Object.keys(P.TEMAS)[0];
    return (U.exp[chave] = { dom: primeiro, sel: vis.slice(), q: '' });
  };
  var idsDominio = function (tema) { var usr = u(); return S.cat.filter(function (c) { return c.tema === tema && P.podeVerIndicador(c, usr); }).map(function (c) { return c.id; }); };
  var cilindro = function (doms, ativo) {
    var H = 52, ry = 15, x0 = 12, x1 = 252, rx = (x1 - x0) / 2, cx = (x0 + x1) / 2, alt = ry * 2 + doms.length * H + 8;
    var banda = function (d, i) {
      var y = ry + 2 + i * H, on = d.tema === ativo, fechado = !d.ok.length, q = Math.max(55, 100 - i * 11);
      var cor = fechado ? '#B6C0CE' : on ? 'var(--accent)' : 'color-mix(in srgb,var(--primary) ' + q + '%,var(--secondary))';
      var lado = 'M' + x0 + ' ' + y + ' A' + rx + ' ' + ry + ' 0 0 0 ' + x1 + ' ' + y + ' L' + x1 + ' ' + (y + H) + ' A' + rx + ' ' + ry + ' 0 0 1 ' + x0 + ' ' + (y + H) + ' Z';
      return '<g class="ps-cil-b' + (on ? ' on' : '') + (fechado ? ' fechado' : '') + '"' + (fechado ? '' : ' data-a="expDom" data-v="' + e(d.tema) + '"') + ' style="--f:' + cor + '"><path class="lado" d="' + lado + '"/><path d="' + lado + '" fill="url(#ps-cil-luz)"/><ellipse class="topo" cx="' + cx + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '"/>' +
        '<text x="' + cx + '" y="' + (y + ry + H / 2 - 2) + '" text-anchor="middle">' + e(d.tema) + '</text><text class="det" x="' + cx + '" y="' + (y + ry + H / 2 + 12) + '" text-anchor="middle">' + (fechado ? 'No access' : d.ok.length + ' of ' + d.todos.length + ' available') + '</text></g>';
    };
    var gs = '';
    for (var i = doms.length - 1; i >= 0; i--) gs += banda(doms[i], i);
    return '<svg class="ps-cil" viewBox="0 0 280 ' + alt + '" role="img" aria-label="Data store with ' + doms.length + ' data domains"><defs><linearGradient id="ps-cil-luz" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".22" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient></defs>' + gs + '</svg>';
  };
  var ultimoPonto = function (id) { var pts = serieDe(id); return pts.length ? pts[pts.length - 1] : null; };
  var faisca = function (pts) {
    var l = pts.slice(-10);
    if (l.length < 2) return '<span class="ps-mut">-</span>';
    var vs = l.map(function (p) { return p.v; }), mi = Math.min.apply(null, vs), ma = Math.max.apply(null, vs), W = 84, Hh = 22, xy = l.map(function (p, i) { return [(i / (l.length - 1)) * (W - 6) + 3, ma === mi ? Hh / 2 : Hh - 3 - ((p.v - mi) / (ma - mi)) * (Hh - 6)]; });
    var u2 = xy[xy.length - 1];
    return '<svg class="ps-faisca" width="' + W + '" height="' + Hh + '" viewBox="0 0 ' + W + ' ' + Hh + '" aria-hidden="true"><polyline points="' + xy.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/><circle cx="' + u2[0].toFixed(1) + '" cy="' + u2[1].toFixed(1) + '" r="2.8"/></svg>';
  };
  var cfgRelatorio = function (m) {
    var x = estadoExp(m), usr = u(), ids = x.sel.filter(function (id) { return P.podeVerIndicador(P.cat(id), usr); }), series = {}, anos = {};
    ids.forEach(function (id) { series[id] = serieDe(id); series[id].forEach(function (p) { anos[p.ano] = 1; }); });
    var lAnos = Object.keys(anos).map(Number).sort().slice(-4);
    return {
      id: 'gr-rel-' + m.id, titulo: 'Your report', vazio: 'Select data points to build your report.', dica: 'Read only. Select cells and copy them to Excel with Ctrl+C, or export the whole report.',
      cols: [{ k: 'id', t: 'ID' }, { k: 'nome', t: 'Indicator', larg: 260 }, { k: 'emp', t: 'Company', larg: 130 }, { k: 'atr', t: 'Assigned to', larg: 150 }, { k: 'un', t: 'Unit' }].concat(lAnos.map(function (a) { return { k: 'a' + a, t: String(a), dir: 1, larg: 84 }; })).concat([{ k: 'var', t: 'Change %', dir: 1 }, { k: 'tend', t: 'Trend', larg: 100, semExport: true }, { k: 'est', t: 'Status', larg: 120 }]),
      linhas: ids.map(function (id) {
        var c = P.cat(id), mx = P.msDoIndicador(id), est = mx ? P.estadoIndicador(mx, id) : { txt: 'To collect', cls: '' }, a = mx ? P.atribuido(mx) : null, pts = series[id], o = { id: { t: id }, nome: { t: c.nome }, emp: { t: mx ? mx.empresa : '' }, atr: { t: a ? a.nome : '' }, un: { t: c.unidade_medida } };
        lAnos.forEach(function (an) { var pt = pts.filter(function (p) { return p.ano === an; }).pop(); o['a' + an] = pt ? { t: fmtV(id, pt.v), bruto: bruNum(pt.v), num: pt.v, cls: pt.nota === 'pending approval' ? 'pend' : '', tip: pt.nota === 'pending approval' ? 'Pending approval' : '' } : { t: '' }; });
        var fim = pts[pts.length - 1], ant2 = pts[pts.length - 2], va = fim && ant2 && ant2.v ? Math.round(((fim.v - ant2.v) / Math.abs(ant2.v)) * 1000) / 10 : null;
        o['var'] = { t: va === null ? '' : (va > 0 ? '+' : '') + P.fmtNum(va, 1), bruto: bruNum(va), num: va };
        o.tend = { t: '', html: faisca(pts) };
        o.est = { t: est.txt, html: chip(est.txt, est.cls) };
        return { id: id, c: o };
      })
    };
  };
  var sepExplorar = function (m) {
    var usr = u(), x = estadoExp(m), doms = Object.keys(P.TEMAS).map(function (t) { var todos = S.cat.filter(function (c) { return c.tema === t; }); return { tema: t, todos: todos, ok: todos.filter(function (c) { return P.podeVerIndicador(c, usr); }) }; });
    var totOk = doms.reduce(function (s, d) { return s + d.ok.length; }, 0), totT = doms.reduce(function (s, d) { return s + d.todos.length; }, 0), dom = doms.filter(function (d) { return d.tema === x.dom; })[0] || doms[0];
    var q = norm(x.q), lista = dom.ok.filter(function (c) { return !q || norm(c.id + ' ' + c.nome).indexOf(q) > -1; });
    var perfil = P.PERFIS[usr.perfil] + (usr.unidade ? ', ' + usr.unidade : '');
    var cfg = cfgRelatorio(m);
    return '<div class="ps-card"><div class="ps-exp"><div class="ps-exp-esq"><h2>Data store</h2><p class="ps-mut ps-small">Pick a layer to browse it.</p>' + cilindro(doms, dom.tema) + '<div class="ps-exp-acesso"><b>' + totOk + ' of ' + totT + '</b> data points open to you<br><span class="ps-mut">' + e(perfil) + '</span></div></div>' +
      '<div class="ps-exp-dir"><div class="ps-sp-b"><div><h2>' + e(dom.tema) + '</h2><p class="ps-mut ps-small">' + dom.ok.length + ' data points available' + (dom.todos.length > dom.ok.length ? ', ' + (dom.todos.length - dom.ok.length) + ' outside your access' : '') + '</p></div><div class="ps-sp"><button type="button" class="ps-btn peq" data-a="expTodos">Select all</button><button type="button" class="ps-btn peq" data-a="expLimpar">Clear report</button></div></div>' +
      '<div class="ps-mt">' + campo('exp-q', 'Search this layer', '<input id="exp-q" class="ps-in" value="' + e(x.q) + '" data-c="expBusca" autocomplete="off">') + '</div>' +
      (lista.length ? '<ul class="ps-exp-lista">' + lista.map(function (c) {
        var pt = ultimoPonto(c.id), mx = P.msDoIndicador(c.id), est = mx ? P.estadoIndicador(mx, c.id) : { txt: 'To collect', cls: '' };
        return '<li><label><input id="exp-' + e(c.id) + '" type="checkbox" data-c="expSel" data-id="' + e(c.id) + '"' + (x.sel.indexOf(c.id) > -1 ? ' checked' : '') + '><span class="ps-mono">' + e(c.id) + '</span><span class="n">' + e(c.nome) + '</span><span class="v ps-num">' + (pt ? e(fmtV(c.id, pt.v)) + ' <small>' + e(c.unidade_medida) + ' · ' + pt.ano + '</small>' : '<small>No value yet</small>') + '</span>' + chip(est.txt, est.cls) + '</label></li>';
      }).join('') + '</ul>' : vazio(dom.ok.length ? 'Nothing matches your search.' : 'You have no access to this layer.')) + '</div></div></div>' +
      '<div class="ps-card">' + cabCartao('Your report (' + cfg.linhas.length + ')', 'ativ', '<button type="button" class="ps-btn peq pri" data-a="expExcel"' + (cfg.linhas.length ? '' : ' disabled') + '>Export to Excel</button>') + '<div class="ps-card-body">' + window.PortalGrelha.html(cfg) + '</div></div>';
  };
  var relatorioImport = function (m, rel) {
    if (rel.erro || rel.erroFormato) return '<div class="ps-card-body"><div class="ps-aviso err" role="alert">' + e(rel.erro || rel.erroFormato) + '</div></div>';
    var usadas = rel.linhas.filter(function (l) { return l.estado !== 'vazia'; });
    var nv = usadas.filter(function (l) { return l.estado === 'valida'; }).length, na = usadas.filter(function (l) { return l.estado === 'alerta'; }).length, nr = usadas.filter(function (l) { return l.estado === 'rejeitada'; }).length;
    return '<div class="ps-card-body"><div class="ps-sp-b"><b>Result of ' + e(rel.nome) + '</b>' + (nv + na ? '<button type="button" class="ps-btn pri" data-a="impAplicar">Apply ' + (nv + na) + ' valid rows</button>' : '') + '</div>' +
      '<div class="ps-res-tot">' + chip(nv + ' valid', 'ok') + chip(na + ' with alerts', 'warn') + chip(nr + ' with errors', 'err') + chip(rel.emFalta.length + ' missing from the file') + '</div>' +
      (rel.desconhecidas.length ? '<div class="ps-aviso warn">Unknown columns, ignored: ' + e(rel.desconhecidas.join(', ')) + '</div>' : '') +
      tabela([{ t: 'Row' }, { t: 'Indicator' }, { t: 'Value' }, { t: 'Result' }, { t: 'Reason' }], usadas.map(function (l) {
        return ['Row ' + l.n, e(l.indicador), e(l.valor), l.estado === 'valida' ? chip('Valid', 'ok') : l.estado === 'alerta' ? chip('With alert', 'warn') : chip('Rejected', 'err'), e(l.motivos.join(' '))];
      })) + '</div>';
  };
  var sepRevisao = function (m) {
    var p = P.passoAtual(m), rot = p.tipo === 'parecer' ? 'Give favourable opinion' : p.tipo === 'aprovacao' ? 'Approve and lock' : 'Complete review';
    return '<div class="ps-card ps-com-acao">' + cabCartao(p.nome, 'tarefa', ferrDados(m)) + '<div class="ps-card-body">' + (U.dadosVista === 'grid' ? corpoGrelha(m) : tabela([{ t: 'Indicator' }, { t: 'Value', dir: 1 }, { t: String(m.ano - 1), dir: 1 }, { t: 'Change', dir: 1 }, { t: 'Alerts and justification' }, { t: 'Quality' }], m.indicadores.map(function (id) {
      var it = P.item(id, m.ano), v = P.validarItem(it), ant = P.valorAnterior(id, m.ano);
      return [linkFicha(id) + (P.formulaTxt ? '<span class="ps-ind-form">ƒ ' + e(P.formulaTxt(id)) + '</span>' : ''), celValor(m, id) + ' ' + e(P.cat(id).unidade_medida), ant === null || ant === undefined ? '-' : fmtV(id, ant), v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%', v.alertas.length ? '<span class="ps-small">' + e(v.alertas.join(' ')) + '<br><b>Justification:</b> ' + e(it.justificacao || '-') + '</span>' : chip('No alerts', 'ok'), e(P.QUALIDADE_TXT[it.qualidade])];
    }))) + '<div class="ps-mt">' + campo('rev-com', 'Comment (required to return)', '<textarea id="rev-com" class="ps-ta"></textarea>') + '</div></div><div class="ps-sticky"><button type="button" class="ps-btn err" data-a="devolver">Return to the unit</button><button type="button" class="ps-btn pri" data-a="concluirPasso">' + e(rot) + '</button></div></div>';
  };
  var sepLeitura = function (m) {
    var msg = P.concluida(m) ? 'Milestone completed. Approved values only change by restatement.' : 'The current step is with ' + P.nomeResp(m, P.passoAtual(m).responsavel) + '. You can view the values.';
    return '<div class="ps-card">' + cabCartao('Requested data', 'doc', ferrDados(m)) + '<div class="ps-card-body"><div class="ps-aviso">' + e(msg) + '</div>' + (U.dadosVista === 'grid' ? corpoGrelha(m) : tabela([{ t: 'Indicator' }, { t: 'Value', dir: 1 }, { t: String(m.ano - 1), dir: 1 }, { t: 'Status' }, { t: 'Quality' }], m.indicadores.map(function (id) {
      var est = P.estadoIndicador(m, id), it = P.item(id, m.ano), ant = P.valorAnterior(id, m.ano);
      return [linkFicha(id) + marcaAmostra(id) + (it.reexpresso ? ' ' + chip('Restated', 'warn') : '') + (P.formulaTxt ? '<span class="ps-ind-form">ƒ ' + e(P.formulaTxt(id)) + '</span>' : ''), celValor(m, id) + ' ' + e(P.cat(id).unidade_medida), ant === null || ant === undefined ? '-' : fmtV(id, ant), chip(est.txt, est.cls), e(P.QUALIDADE_TXT[it.qualidade])];
    }))) + '</div></div>';
  };
  var sepEvidencias = function (m) {
    var obrig = m.indicadores.filter(function (id) { return P.cat(id).evidencia_obrigatoria; }), comEv = obrig.filter(function (id) { return P.item(id, m.ano).evidencias.length; }).length, usr = u();
    return '<div class="ps-card">' + cabCartao('Evidence and quality', 'doc', chip(comEv + ' of ' + obrig.length + ' required evidence items attached', comEv === obrig.length ? 'ok' : 'warn')) + '<div class="ps-card-body">' +
      tabela([{ t: 'Indicator' }, { t: 'Quality' }, { t: 'Method' }, { t: 'Evidence' }], m.indicadores.map(function (id) {
        var it = P.item(id, m.ano), c = P.cat(id);
        return [linkFicha(id), e(P.QUALIDADE_TXT[it.qualidade]), e(it.metodo || '-'), (it.evidencias.length ? it.evidencias.map(function (x) { return e(x.ficheiro); }).join(', ') : c.evidencia_obrigatoria ? chip('Required, missing', 'warn') : '-')];
      })) + '<h3 class="ps-grupo-t">General milestone documents</h3>' + (m.documentos_gerais.length ? '<ul class="ps-list">' + m.documentos_gerais.map(function (d) { return '<li class="ps-row"><span class="ps-row-ico">' + svg(I.doc, 18) + '</span><span class="ps-row-txt"><b>' + e(d.ficheiro) + '</b><span>' + e(d.por) + ' · ' + e(P.fmtDataHora(d.em)) + '</span></span></li>'; }).join('') + '</ul>' : '<p class="ps-mut ps-small">No general documents yet.</p>') +
      (P.acompanha(m, usr) ? '<button type="button" class="ps-btn ps-mt" data-a="anexarGeral">Attach general document</button>' : '') + '</div></div>';
  };
  var sepExternos = function (m) {
    var usr = u(), l = S.ext.filter(function (x) { return x.milestone_id === m.id; });
    var pode = P.acompanha(m, usr) && !P.concluida(m);
    var EST = { pendente: ['Pending', 'warn'], recebido: ['Received', 'info'], aplicado: ['Applied', 'ok'] };
    return '<div class="ps-card">' + cabCartao('External contributions', 'doc', pode ? '<button type="button" class="ps-btn peq" data-a="pedirExt">New request</button>' : '') + '<div class="ps-card-body">' + tabela([{ t: 'Indicator' }, { t: 'Entity' }, { t: 'Request' }, { t: 'Due' }, { t: 'Value' }, { t: 'Status' }], l.map(function (x) {
      var acao = x.estado === 'recebido' && P.podePreencher(m, usr) ? ' <button type="button" class="ps-btn peq" data-a="usarExt" data-v="' + e(x.id) + '">Use this value</button>' : '';
      return [e(P.cat(x.indicador_id).nome), e(x.entidade_externa), e(x.descricao), e(P.fmtData(x.prazo)), x.valor === null ? '-' : e(fmtV(x.indicador_id, x.valor)), chip(EST[x.estado][0], EST[x.estado][1]) + acao];
    }), 'No requests to external entities on this milestone yet.') + '</div></div>';
  };
  var cartaoPedidos = function (lista) {
    var usr = u();
    return lista.map(function (a) {
      var est = a.estado === 'aberto' ? chip('Open', 'warn') : a.estado === 'respondido' ? chip('Answered', 'info') : chip('Resolved', 'ok');
      var pode = a.estado === 'aberto' && P.podeResponderAuditor(a, usr);
      return '<div class="ps-ind"><div class="ps-sp-b"><b>' + e(P.cat(a.indicador_id).nome) + '</b>' + est + '</div><p class="ps-mt">' + e(a.texto) + '</p><small class="ps-mut">' + e(a.por) + ' · ' + e(P.fmtDataHora(a.em)) + '</small>' +
        (a.resposta ? '<div class="ps-aviso ps-mt"><b>Answer from ' + e(a.resposta.por) + ':</b> ' + e(a.resposta.texto) + '</div>' : '') +
        (pode ? '<div class="ps-mt">' + campo('ra-' + a.id, 'Answer', '<textarea id="ra-' + e(a.id) + '" class="ps-ta"></textarea>') + '<button type="button" class="ps-btn pri ps-mt" data-a="responderAud" data-v="' + e(a.id) + '">Answer</button></div>' : '') +
        (a.estado === 'respondido' && (usr.perfil === 'auditor' || usr.perfil === 'admin') ? '<button type="button" class="ps-btn ps-mt" data-a="resolverAud" data-v="' + e(a.id) + '">Mark as resolved</button>' : '') + '</div>';
    }).join('');
  };
  var sepAuditoria = function (m) {
    var ped = S.aud.filter(function (a) { var x = P.msDoIndicador(a.indicador_id, m.ano); return x && x.id === m.id; });
    return '<div class="ps-card">' + cabCartao('Traceability matrix', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Indicator' }, { t: 'Value', dir: 1 }, { t: 'ESRS' }, { t: 'GRI' }, { t: 'Submitted by' }, { t: 'Approved by' }, { t: 'Evidence' }], P.rastreabilidade(m).map(function (r) {
      return [linkFicha(r.indicador_id) + marcaAmostra(r.indicador_id), r.valor === null ? '-' : e(fmtV(r.indicador_id, r.valor)), e(r.esrs), e(r.gri), e(r.submetido_por || '-'), e(r.aprovado_por || '-'), e(r.evidencias || '-')];
    })) + '</div></div><div class="ps-card">' + cabCartao('Requests on this milestone', 'ativ') + (ped.length ? cartaoPedidos(ped) : vazio('No auditor requests on this milestone.')) + '</div>';
  };
  var sepConversa = function (m) {
    var usr = u();
    var msgs = m.comentarios.map(function (c) { var eu = c.autor === usr.nome; return '<div class="ps-msg ' + (eu ? 'eu' : '') + (c.sistema ? ' sis' : '') + '"><small>' + e(c.autor) + ' · ' + e(P.fmtDataHora(c.em)) + '</small><p>' + e(c.texto) + '</p></div>'; }).join('');
    var evs = m.eventos.slice().reverse().map(function (x) { return '<li>' + e(x.texto) + '<small>' + e(x.por) + ' · ' + e(P.fmtDataHora(x.em)) + '</small></li>'; }).join('');
    return '<div class="ps-card">' + cabCartao('Conversation', 'ativ') + '<div class="ps-chat">' + (msgs || '<div class="ps-mut ps-small">No comments yet.</div>') + '</div>' + '<div class="ps-card-body ps-sp"><div class="ps-campo ps-cresce"><label class="ps-sr" for="chat-txt">Comment</label><input id="chat-txt" class="ps-in" placeholder="Write a comment"></div><button type="button" class="ps-btn pri" data-a="comentar">Send</button></div></div>' +
      '<div class="ps-card">' + cabCartao('History', 'cal') + '<ul class="ps-ev">' + evs + '</ul></div>';
  };

  /* --- Consolidado ------------------------------------------------------- */
  var CORES_V = { a: 'var(--v-aprov)', r: 'var(--v-rev)', p: 'var(--v-pre)', f: 'var(--v-falta)' };
  var LEG_V = '<div class="ps-vleg"><span style="--c:var(--v-aprov)"><i></i>Approved</span><span style="--c:var(--v-rev)"><i></i>Reported, in review</span><span style="--c:var(--v-pre)"><i></i>In progress</span><span style="--c:var(--v-falta)"><i></i>To report</span></div>';
  var situacao = function (lista) {
    var n = { a: 0, r: 0, p: 0, f: 0, t: lista.length };
    lista.forEach(function (c) {
      var m = P.msDoIndicador(c.id);
      if (!m) { n.f++; return; }
      var it = P.item(c.id, m.ano);
      if (P.concluida(m)) n.a++;
      else if (P.passoAtual(m).tipo !== 'recolha') n.r++;
      else if (it.valor !== null) n.p++;
      else n.f++;
    });
    return n;
  };
  var barra = function (titulo, n) {
    var seg = [['a', 'Approved'], ['r', 'Reported, in review'], ['p', 'In progress'], ['f', 'To report']].filter(function (s) { return n[s[0]] > 0; });
    return '<div class="ps-bar"><div class="ps-bar-t">' + e(titulo) + '<span>' + n.a + ' of ' + n.t + ' approved</span></div><div class="ps-bar-g" role="img" aria-label="' + e(titulo + ': ' + n.a + ' approved, ' + n.r + ' in review, ' + n.p + ' in progress, ' + n.f + ' to report') + '">' + seg.map(function (s) {
      return '<i style="flex:' + n[s[0]] + ' 1 0;--c:' + CORES_V[s[0]] + '" data-tip="' + e(s[1] + ': ' + n[s[0]]) + '"></i>';
    }).join('') + '</div></div>';
  };
  var QUADRO_TXT = { Desempenho: 'Performance', Ambientais: 'Environmental', Sociais: 'Social', Governance: 'Governance', ESRS: 'ESRS' };
  var catVisivel = function (incl) { return S.cat.filter(function (c) { return incl || !c.novo_esrs; }); };
  Blocos['consolidado'] = function () {
    var incl = U.consEsrs, cat = catVisivel(incl), tot = situacao(cat), ms = P.msCiclo().filter(function (m) { return incl || m.periodicidade !== 'Novos dados ESRS'; });
    var conc = ms.filter(P.concluida).length, qual = { medido: 0, calculado: 0, estimado: 0 };
    cat.forEach(function (c) { var it = P.item(c.id); if (it && it.valor !== null) qual[it.qualidade]++; });
    var totQ = qual.medido + qual.calculado + qual.estimado;
    var metas = S.metas.map(function (x) {
      var m = P.msDoIndicador(x.indicador_id), it = P.item(x.indicador_id), v = m && P.concluida(m) ? it.valor : null, base = P.valorAnterior(x.indicador_id, S.ciclo.ano), pct;
      if (x.sentido === 'subir') pct = v === null ? 0 : Math.min(100, (v / x.valor_meta) * 100);
      else pct = v === null || base === null || !base ? 0 : Math.max(0, Math.min(100, (1 - v / base) * 100));
      return '<div class="ps-meta"><div class="ps-meta-t">' + e(x.nome) + '<span>Target: ' + e(P.fmtNum(x.valor_meta, 0)) + ' ' + e(x.unidade) + ' in ' + x.ano_meta + ' · Current: ' + (v === null ? 'pending approval' : e(fmtV(x.indicador_id, v))) + '</span></div><div class="ps-meta-b"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
    var areas = P.UNIDADES.map(function (un) {
      var cs = cat.filter(function (c) { return c.unidade_negocio === un; }), mss = ms.filter(function (m) { return m.unidade === un; });
      if (!cs.length) return '';
      var s = situacao(cs), atraso = mss.some(function (m) { return P.estadoMs(m).cod === 'atraso'; });
      var est = s.a === s.t ? chip('All approved', 'ok') : atraso ? chip('Overdue', 'err') : s.a + s.r === s.t ? chip('All reported', 'rev') : chip('In progress', 'info');
      return '<details class="ps-card ps-mt" id="area-' + e(un.replace(/\W/g, '')) + '"><summary class="ps-card-head ps-sp-b ps-sumario"><b>' + e(un) + '</b><span class="ps-sp">' + est + '<span class="ps-mut ps-small">' + s.a + ' of ' + s.t + ' approved · ' + mss.length + ' milestones</span></span></summary><div class="ps-card-body">' +
        tabela([{ t: 'Indicator' }, { t: 'Value', dir: 1 }, { t: 'Status' }], cs.map(function (c) {
          var m = P.msDoIndicador(c.id), est2 = m ? P.estadoIndicador(m, c.id) : { txt: 'To collect', cls: '' }, it = P.item(c.id);
          return [linkFicha(c.id), it && it.valor !== null ? e(fmtV(c.id, it.valor) + ' ' + c.unidade_medida) : '-', chip(est2.txt, est2.cls)];
        })) + '</div></details>';
    }).join('');
    var quadros = P.QUADROS.filter(function (q) { return incl || q !== 'ESRS'; });
    return '<div class="ps-filtros"><label class="ps-chk"><input id="cons-esrs" type="checkbox" data-c="consEsrs"' + (incl ? ' checked' : '') + '> Include ESRS track</label></div>' +
      '<div class="ps-kpis"><div class="ps-kpi"><span>Indicators reported by areas</span><b>' + (tot.a + tot.r) + '</b><small>of ' + tot.t + '</small></div><div class="ps-kpi"><span>Approved and consolidated</span><b>' + tot.a + '</b><small>' + Math.round((tot.a / Math.max(tot.t, 1)) * 100) + '% of the report</small></div><div class="ps-kpi"><span>Completed milestones</span><b>' + conc + '</b><small>of ' + ms.length + '</small></div></div>' +
      '<div class="ps-grid2 ps-mt"><div class="ps-card">' + cabCartao('Targets and trajectory', 'ativ') + '<div class="ps-card-body">' + metas + '</div></div><div class="ps-card">' + cabCartao('Data quality', 'tarefa') + '<div class="ps-card-body"><div class="ps-kpis"><div class="ps-kpi"><span>Measured</span><b>' + qual.medido + '</b></div><div class="ps-kpi"><span>Calculated</span><b>' + qual.calculado + '</b></div><div class="ps-kpi"><span>Estimated</span><b>' + qual.estimado + '</b></div></div><p class="ps-mut ps-small ps-mt">' + totQ + ' indicators with a value.</p></div></div></div>' +
      '<div class="ps-grid2 ps-mt"><div class="ps-card">' + cabCartao('By report table', 'doc') + '<div class="ps-card-body">' + LEG_V + quadros.map(function (q) { return barra(QUADRO_TXT[q] || q, situacao(cat.filter(function (c) { return c.quadro === q; }))); }).join('') + '</div></div><div class="ps-card">' + cabCartao('By topic', 'doc') + '<div class="ps-card-body">' + LEG_V + Object.keys(P.TEMAS).map(function (t) { return barra(t, situacao(cat.filter(function (c) { return c.tema === t; }))); }).join('') + '</div></div></div>' +
      '<h2 class="ps-grupo-t ps-mt-l">By area</h2>' + areas;
  };

  /* --- Documentos -------------------------------------------------------- */
  var TIPO_DOC = { eletricidade: 'Electricity', 'água': 'Water', 'combustível': 'Fuel' };
  var difTel = function (d) { return d.leitura_telemetria ? ((d.consumo - d.leitura_telemetria) / d.leitura_telemetria) * 100 : null; };
  var unidadeDoc = function (t) { return t === 'eletricidade' ? 'kWh' : t === 'água' ? 'm³' : 'litres'; };
  Blocos['documentos'] = function () {
    var linhas = S.docs.map(function (d) {
      var dif = difTel(d), fora = dif !== null && Math.abs(dif) > 5;
      return [e(d.fornecedor) + '<br><small class="ps-mut">' + e(TIPO_DOC[d.tipo] || d.tipo) + ' · ' + e(d.periodo) + '</small>', e(d.instalacao) + '<br><small class="ps-mut">' + e(d.entidade) + '</small>', e(P.fmtNum(d.consumo, 0)) + ' ' + unidadeDoc(d.tipo), e(P.fmtNum(d.valor_sem_iva, 2)) + ' €', dif === null ? '-' : (fora ? chip((dif > 0 ? '+' : '') + P.fmtNum(dif, 1) + '%', 'err') : chip((dif > 0 ? '+' : '') + P.fmtNum(dif, 1) + '%', 'ok')),
        d.estado === 'distribuída' ? chip('Distributed', 'ok') : (fora ? chip('Validate with supplier', 'err') : '<button type="button" class="ps-btn peq" data-a="distribuir" data-v="' + e(d.id) + '">Confirm and distribute</button>')];
    });
    var alerta = S.docs.filter(function (d) { var x = difTel(d); return x !== null && Math.abs(x) > 5 && d.estado !== 'distribuída'; });
    var dist = S.docs.filter(function (d) { return d.estado === 'distribuída'; });
    var soma = function (f) { return dist.reduce(function (a, d) { return a + (Number(d[f]) || 0); }, 0); };
    return (alerta.length ? '<div class="ps-aviso err" role="alert">' + alerta.length + ' invoice(s) more than 5% off telemetry. They go to Finance to validate with the supplier before payment.</div>' : '') +
      '<div class="ps-card">' + cabCartao('Invoice inbox', 'doc', '<button type="button" class="ps-btn pri peq" data-a="docNova">Upload invoice</button>') + (U.docNova ? formFatura() : '') + '<div class="ps-card-body">' + tabela([{ t: 'Invoice' }, { t: 'Site' }, { t: 'Consumption', dir: 1 }, { t: 'Excl. VAT', dir: 1 }, { t: 'Against telemetry' }, { t: 'Status' }], linhas) + '</div></div>' +
      '<h2 class="ps-grupo-t ps-mt-l">One document, three destinations</h2><div class="ps-grid3"><div class="ps-card">' + cabCartao('Sustainability') + '<div class="ps-card-body ps-small">Consumption and renewable percentage.<div class="ps-mt"><b class="ps-num">' + dist.length + '</b> invoices distributed</div></div></div><div class="ps-card">' + cabCartao('Accounting') + '<div class="ps-card-body ps-small">Amount, VAT and cost centre.<div class="ps-mt"><b class="ps-num">' + e(P.fmtNum(soma('valor_sem_iva'), 2)) + ' €</b> excl. VAT, <b class="ps-num">' + e(P.fmtNum(soma('iva'), 2)) + ' €</b> VAT</div></div></div><div class="ps-card">' + cabCartao('Operations') + '<div class="ps-card-body ps-small">Consumption by site.<div class="ps-mt">' + (dist.map(function (d) { return e(d.instalacao); }).join(', ') || '-') + '</div></div></div></div>' +
      '<p class="ps-mut ps-small ps-mt">Fields are confirmed by whoever uploads the invoice.</p>';
  };
  var formFatura = function () {
    var f = function (id, lab, tipo, extra) { return campo('nf-' + id, lab, '<input id="nf-' + id + '" class="ps-in" type="' + (tipo || 'text') + '"' + (extra || '') + '>'); };
    return '<div class="ps-card-body ps-sep-baixo"><div class="ps-form">' + campo('nf-tipo', 'Type', '<select id="nf-tipo" class="ps-sel">' + opt('eletricidade', 'Electricity') + opt('água', 'Water') + opt('combustível', 'Fuel') + '</select>') +
      f('fornecedor', 'Supplier') + f('periodo', 'Period') + f('instalacao', 'Site') + campo('nf-entidade', 'Company', '<select id="nf-entidade" class="ps-sel">' + S.ent.map(function (x) { return opt(x.nome); }).join('') + '</select>') +
      f('consumo', 'Consumption (kWh, m³ or litres)', 'text', ' inputmode="decimal"') + f('valor', 'Amount excl. VAT (€)', 'text', ' inputmode="decimal"') + f('iva', 'VAT (€)', 'text', ' inputmode="decimal"') + f('renov', '% renewable', 'text', ' inputmode="decimal"') + f('cc', 'Cost centre') + f('tele', 'Telemetry reading', 'text', ' inputmode="decimal"') +
      '</div><div class="ps-sp ps-mt"><button type="button" class="ps-btn pri" data-a="docGuardar">Save invoice</button><button type="button" class="ps-btn" data-a="docNova">Cancel</button></div></div>';
  };

  /* --- Relatorio --------------------------------------------------------- */
  Blocos['relatorio'] = function () {
    var ano = S.ciclo.ano, nomes = { Desempenho: 'Performance (group perimeter)', Ambientais: 'Environmental (majority companies)', Sociais: 'Social (majority companies)', Governance: 'Governance (majority companies)', ESRS: 'ESRS track' };
    return '<div class="ps-sp ps-nao-imprimir ps-filtros"><button type="button" class="ps-btn pri" data-a="relExcel">Export to Excel</button><button type="button" class="ps-btn" data-a="imprimir">Print or save as PDF</button></div>' +
      '<div class="ps-so-imprimir ps-sp-b ps-rel-topo"><span data-marca-c="logo-claro"></span><b>Report ' + ano + '</b></div>' +
      P.QUADROS.map(function (q) {
        return '<div class="ps-card ps-mt">' + cabCartao(nomes[q], 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Indicator' }, { t: 'Unit' }, { t: String(ano), dir: 1 }, { t: String(ano - 1), dir: 1 }, { t: 'Status' }], S.cat.filter(function (c) { return c.quadro === q; }).map(function (c) {
          var m = P.msDoIndicador(c.id, ano), apr = m && P.concluida(m), it = P.item(c.id, ano), est = m ? P.estadoIndicador(m, c.id) : { txt: 'To collect', cls: '' }, ant = P.valorAnterior(c.id, ano);
          return [e(c.nome) + (it && it.reexpresso ? ' ' + chip('Restated', 'warn') : ''), e(c.unidade_medida), apr && it.valor !== null ? e(fmtV(c.id, it.valor)) : '-', ant === null || ant === undefined ? '-' : e(fmtV(c.id, ant)), chip(est.txt, est.cls)];
        })) + '</div></div>';
      }).join('');
  };

  /* --- Historico --------------------------------------------------------- */
  /* Serie ilustrativa 2011 a 2024, so para demonstracao: a especificacao nao traz os valores */
  var SERIES = {
    A03: [24.6, 23.91, 23.11, 22.65, 22.07, 21.38, 20.81, 20.12, 19.54, 19.08, 18.62, 18.16, 17.7, 17.36],
    A01: [49.44, 49.92, 50.28, 50.52, 51, 51.36, 51.6, 51.96, 52.32, 52.56, 52.8, 53.04, 53.4, 53.62]
  };
  var serieDe = function (id) {
    var pts = [], c = P.cat(id);
    if (SERIES[id]) SERIES[id].forEach(function (v, i) { pts.push({ ano: 2011 + i, v: v, nota: 'historical' }); });
    if (c.ano_anterior !== null && c.ano_anterior !== undefined) pts.push({ ano: 2025, v: c.ano_anterior, nota: 'prior year' });
    Object.keys(S.items).forEach(function (k) {
      var it = S.items[k];
      if (it.id !== id || it.valor === null) return;
      var m = P.ms(it.milestone_id);
      pts.push({ ano: it.ano, v: it.valor, nota: m && P.concluida(m) ? 'approved' : 'pending approval', corrente: true });
    });
    return pts.sort(function (a, b) { return a.ano - b.ano; });
  };
  var graficoLinha = function (pts, unid, casas) {
    /* A largura acompanha o ecra, para o texto nao encolher no telemovel */
    var movel = window.innerWidth < 820, W = movel ? 400 : 1100, H = movel ? 240 : 320, L = 48, R = 14, T = 14, B = 28;
    var vs = pts.map(function (p) { return p.v; }), min = Math.min.apply(null, vs), max = Math.max.apply(null, vs), pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1;
    var lo = Math.max(min - pad, min >= 0 ? 0 : -Infinity), hi = max + pad;
    var x = function (i) { return pts.length < 2 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1); }, y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var grelha = [0, 1, 2, 3].map(function (i) { var v = lo + ((hi - lo) * i) / 3; return '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"></line><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + e(P.fmtNum(v, casas > 1 ? 1 : casas)) + '</text>'; }).join('');
    var firme = pts.filter(function (p) { return p.nota !== 'pending approval'; }), d = firme.map(function (p) { var i = pts.indexOf(p); return (x(i)).toFixed(1) + ',' + y(p.v).toFixed(1); }).join(' ');
    var passo = movel ? Math.max(1, Math.ceil(pts.length / 5)) : pts.length > 12 ? 2 : 1;
    var marcas = pts.map(function (p, i) {
      var larg = pts.length > 1 ? (W - L - R) / (pts.length - 1) : 80;
      return '<g class="pt"><line class="x" x1="' + x(i) + '" x2="' + x(i) + '" y1="' + T + '" y2="' + (H - B) + '"></line><circle class="p ' + (p.corrente ? 'at' : '') + '" cx="' + x(i) + '" cy="' + y(p.v) + '" r="5"></circle>' + (i % passo === 0 || i === pts.length - 1 ? '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + p.ano + '</text>' : '') +
        '<rect class="h" x="' + (x(i) - larg / 2) + '" y="' + T + '" width="' + larg + '" height="' + (H - T - B) + '" data-tip="' + e(p.ano + ': ' + P.fmtNum(p.v, casas) + ' ' + unid + ' (' + p.nota + ')') + '"></rect></g>';
    }).join('');
    return '<svg class="ps-lin" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Annual series in ' + e(unid) + '">' + grelha + (firme.length > 1 ? '<polyline class="l" points="' + d + '"></polyline>' : '') + marcas + '</svg>';
  };
  Blocos['historico'] = function () {
    var id = U.histInd, c = P.cat(id), pts = serieDe(id);
    return '<div class="ps-filtros">' + campo('h-ind', 'Indicator', '<select id="h-ind" class="ps-sel" data-c="histInd">' + S.cat.map(function (x) { return opt(x.id, x.nome + ' (' + x.unidade_medida + ')', id); }).join('') + '</select>') + '<button type="button" class="ps-btn" data-a="histJson">Export approved values as JSON</button></div>' +
      '<div class="ps-card">' + cabCartao(c.nome, 'ativ', '<span class="ps-mut ps-small">' + e(c.unidade_medida) + '</span>') + '<div class="ps-card-body">' + (pts.length ? graficoLinha(pts, c.unidade_medida, c.casas_decimais) : vazio('No values for this indicator yet.')) +
      '<div class="ps-mt-l">' + tabela([{ t: 'Year' }, { t: 'Value', dir: 1 }, { t: 'Source' }], pts.slice().reverse().map(function (p) { return [String(p.ano), e(P.fmtNum(p.v, c.casas_decimais)), e(p.nota)]; })) + '</div></div></div>';
  };

  /* --- Auditoria --------------------------------------------------------- */
  Blocos['auditoria'] = function () {
    var usr = u(), ms = P.msCiclo(), apr = P.aprovados(), comEv = apr.filter(function (a) { return P.item(a.id).evidencias.length; }).length;
    var est = apr.filter(function (a) { return P.item(a.id).qualidade === 'estimado'; }).length, reex = apr.filter(function (a) { return P.item(a.id).reexpresso; }).length, abertos = S.aud.filter(function (a) { return a.estado !== 'resolvido'; });
    var pedidosDe = function (m) { return abertos.filter(function (a) { var x = P.msDoIndicador(a.indicador_id); return x && x.id === m.id; }).length; };
    var naAmostra = function (m) { return m.indicadores.some(function (id) { return S.amostra.indexOf(id) > -1; }); };
    var f = U.audFiltro, lista = ms.filter(function (m) { return f === 'concluidas' ? P.concluida(m) : f === 'abertos' ? pedidosDe(m) > 0 : f === 'amostra' ? naAmostra(m) : true; });
    var podeAmostra = usr.perfil === 'auditor' || usr.perfil === 'admin';
    return '<div class="ps-kpis"><div class="ps-kpi"><span>Approved with evidence</span><b>' + (apr.length ? Math.round((comEv / apr.length) * 100) : 0) + '%</b><small>' + comEv + ' of ' + apr.length + '</small></div><div class="ps-kpi"><span>Estimated values</span><b>' + est + '</b></div><div class="ps-kpi"><span>Restated values</span><b>' + reex + '</b></div><div class="ps-kpi"><span>Open requests</span><b>' + abertos.length + '</b></div></div>' +
      '<div class="ps-sp ps-mt">' + (podeAmostra ? '<button type="button" class="ps-btn pri" data-a="amostra">Select a sample of 5</button>' : '') + '<button type="button" class="ps-btn" data-a="dataRoom">Export data room (Excel)</button>' + (usr.perfil === 'auditor' || usr.perfil === 'admin' ? '<button type="button" class="ps-btn" data-a="novoPedAud">New information request</button>' : '') + '</div>' +
      (S.amostra.length ? '<div class="ps-card ps-mt">' + cabCartao('Sample', 'tarefa') + '<ul class="ps-list">' + S.amostra.map(function (id) { var m = P.msDoIndicador(id); return '<li class="ps-row"><span class="ps-row-txt">' + linkFicha(id) + '<span>' + e(m ? m.nome : '') + '</span></span></li>'; }).join('') + '</ul></div>' : '') +
      '<div class="ps-card ps-mt">' + cabCartao('Milestones', 'doc', '<div class="ps-seg" role="group" aria-label="Filter">' + [['todas', 'All'], ['concluidas', 'Completed'], ['abertos', 'With open requests'], ['amostra', 'In the sample']].map(function (x) { return '<button type="button" class="' + (f === x[0] ? 'on' : '') + '" data-a="audFiltro" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>') + '<div class="ps-card-body">' + tabela([{ t: 'Milestone' }, { t: 'Company' }, { t: 'Assigned to' }, { t: 'Status' }, { t: 'Approved', dir: 1 }, { t: 'Required evidence', dir: 1 }, { t: 'Estimated', dir: 1 }, { t: 'Restated', dir: 1 }, { t: 'Open requests', dir: 1 }], lista.map(function (m) {
        var ob = m.indicadores.filter(function (id) { return P.cat(id).evidencia_obrigatoria; }), okEv = ob.filter(function (id) { return P.item(id, m.ano).evidencias.length; }).length;
        return ['<a href="' + rota('Milestone/' + m.id + '?sep=auditoria') + '">' + e(m.nome) + '</a>', e(m.empresa), atribHtml(m), estChip(m), P.concluida(m) ? m.indicadores.length + '/' + m.indicadores.length : '0/' + m.indicadores.length, okEv + '/' + ob.length, m.indicadores.filter(function (id) { return P.item(id, m.ano).qualidade === 'estimado'; }).length, m.indicadores.filter(function (id) { return P.item(id, m.ano).reexpresso; }).length, pedidosDe(m)];
      }), 'No milestones match this filter.') + '</div></div>' +
      '<div class="ps-card ps-mt">' + cabCartao('Information requests', 'ativ') + (S.aud.length ? cartaoPedidos(S.aud) : vazio('No requests yet.')) + '</div>';
  };

  /* --- Pedidos de dados (entidade externa) ------------------------------- */
  Blocos['pedidos'] = function () {
    var usr = u(), meus = S.ext.filter(function (x) { return x.entidade_externa === usr.nome; }), grupos = {};
    meus.forEach(function (x) { (grupos[x.milestone_id] = grupos[x.milestone_id] || []).push(x); });
    var ids = Object.keys(grupos);
    if (!ids.length) return '<div class="ps-card">' + vazio('There are no requests for your organisation.') + '</div>';
    return ids.map(function (mid) {
      var m = P.ms(mid);
      return '<div class="ps-card ps-mt">' + cabCartao(m ? m.nome : mid, 'doc') + grupos[mid].map(function (x) {
        var c = P.cat(x.indicador_id), aberto = x.estado === 'pendente';
        return '<div class="ps-ind"><div class="ps-sp-b"><b>' + e(c.nome) + ' (' + e(c.unidade_medida) + ')</b>' + (aberto ? chip('Due ' + P.fmtData(x.prazo), 'warn') : chip('Sent', 'ok')) + '</div><p class="ps-mt">' + e(x.descricao) + '</p>' +
          (aberto ? '<div class="ps-form ps-mt">' + campo('xv-' + x.id, 'Value', '<input id="xv-' + e(x.id) + '" class="ps-in" inputmode="decimal">') + campo('xe-' + x.id, 'Supporting document', '<input id="xe-' + e(x.id) + '" class="ps-in" type="file">') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="enviarExt" data-v="' + e(x.id) + '">Send</button>' :
            '<p class="ps-mut ps-small ps-mt">Value sent: ' + e(fmtV(x.indicador_id, x.valor)) + (x.evidencia ? ' · ' + e(x.evidencia) : '') + ' · ' + e(P.fmtDataHora(x.respondido_em)) + '</p>') + '</div>';
      }).join('') + '</div>';
    }).join('');
  };

  /* --- Backoffice -------------------------------------------------------- */
  var BO = [['indicadores', 'Indicators and milestones'], ['ciclo', 'Reporting cycle'], ['materialidade', 'Materiality and frameworks'], ['utilizadores', 'Users and profiles'], ['externas', 'External entities'], ['wfbase', 'Base workflow'], ['calendario', 'Calendar'], ['regras', 'Validation rules'], ['marca', 'Brand'], ['areas', 'Data consumer areas'], ['entidades', 'Companies'], ['departamentos', 'Departments'], ['dados', 'Data and storage']];
  var B = {};
  Blocos['backoffice'] = function () {
    return '<div class="ps-bo"><nav class="ps-bo-tabs" aria-label="Backoffice sections">' + BO.map(function (t) { return '<button type="button" class="ps-bo-tab ' + (U.boTab === t[0] ? 'on' : '') + '" data-a="boTab" data-v="' + t[0] + '"' + (U.boTab === t[0] ? ' aria-current="true"' : '') + '>' + e(t[1]) + '</button>'; }).join('') + '</nav><div class="ps-col">' + B[U.boTab]() + '</div></div>';
  };
  B.ciclo = function () {
    return '<div class="ps-card">' + cabCartao('Reporting cycle', 'cal') + '<div class="ps-card-body"><div class="ps-kpis"><div class="ps-kpi"><span>Current year</span><b>' + S.ciclo.ano + '</b></div><div class="ps-kpi"><span>Cycle milestones</span><b>' + P.msCiclo().length + '</b></div><div class="ps-kpi"><span>Closed cycles</span><b>' + (S.ciclo.fechados || []).length + '</b><small>' + e((S.ciclo.fechados || []).join(', ')) + '</small></div></div>' +
      '<p class="ps-mt">Opening the ' + (S.ciclo.ano + 1) + ' cycle closes the current one and creates the milestones for the new year from the base workflow.</p><button type="button" class="ps-btn pri ps-mt" data-a="abrirCiclo">Open the ' + (S.ciclo.ano + 1) + ' cycle</button></div></div>';
  };
  var MAT_TXT = { material: 'Material', 'não material': 'Not material', 'por avaliar': 'To assess' };
  B.materialidade = function () {
    var cob = S.mat.map(function (x) {
      var cs = S.cat.filter(function (c) { return c.esrs === x.norma; }), apr = cs.filter(function (c) { var m = P.msDoIndicador(c.id); return m && P.concluida(m); }).length;
      return [ '<b>' + e(x.norma) + '</b> ' + e(x.tema), '<select id="mat-' + x.norma + '" class="ps-sel" aria-label="Assessment of ' + e(x.norma) + '" data-c="matAval" data-id="' + x.norma + '">' + ['material', 'não material', 'por avaliar'].map(function (o) { return opt(o, MAT_TXT[o], x.avaliacao); }).join('') + '</select>', '<input id="matj-' + x.norma + '" class="ps-in" aria-label="Justification of ' + e(x.norma) + '" value="' + e(x.justificacao) + '" data-c="matJust" data-id="' + x.norma + '">', cs.length + ' indicators, ' + apr + ' approved' + (x.avaliacao === 'material' && !cs.length ? ' ' + chip('No indicators', 'err') : '')];
    });
    var ref = S.cat.map(function (c) { var m = P.msDoIndicador(c.id), est = m ? P.estadoIndicador(m, c.id) : { txt: '-', cls: '' }; return [e(c.nome), e(m ? m.id : '-'), e(c.esrs_requisito), e(c.gri), e(c.utilizado_por.filter(function (x) { return x !== 'REL'; }).join(', ') || '-'), chip(est.txt, est.cls)]; });
    return '<div class="ps-card">' + cabCartao('Materiality', 'tarefa') + '<div class="ps-card-body">' + tabela([{ t: 'Standard' }, { t: 'Assessment' }, { t: 'Justification' }, { t: 'Coverage' }], cob) + '<p class="ps-mut ps-small ps-mt">The mapping uses the 2023 ESRS numbering and must be reviewed once the delegated act for the simplified ESRS is published.</p></div></div>' +
      '<div class="ps-card">' + cabCartao('One data point, several frameworks', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Indicator' }, { t: 'Milestone' }, { t: 'ESRS' }, { t: 'GRI' }, { t: 'Other users' }, { t: 'Status' }], ref) + '</div></div>';
  };
  B.utilizadores = function () {
    return '<div class="ps-card">' + cabCartao('Users and profiles', 'tarefa') + '<div class="ps-card-body">' + tabela([{ t: 'Name' }, { t: 'Login' }, { t: 'Profile' }, { t: 'Unit' }], S.users.map(function (x) {
      return [e(x.nome), '<span class="ps-mono">' + e(x.login) + '</span>', '<select id="up-' + e(x.login) + '" class="ps-sel" aria-label="Profile of ' + e(x.nome) + '" data-c="userPerfil" data-id="' + e(x.login) + '">' + Object.keys(P.PERFIS).map(function (k) { return opt(k, P.PERFIS[k], x.perfil); }).join('') + '</select>', '<select id="uu-' + e(x.login) + '" class="ps-sel" aria-label="Unit of ' + e(x.nome) + '" data-c="userUnidade" data-id="' + e(x.login) + '">' + opt('', '-', x.unidade) + P.UNIDADES.map(function (o) { return opt(o, o, x.unidade); }).join('') + '</select>'];
    })) + '<h3 class="ps-grupo-t">New user</h3><div class="ps-form">' + campo('nu-nome', 'Name', '<input id="nu-nome" class="ps-in">') + campo('nu-login', 'Login', '<input id="nu-login" class="ps-in">') + campo('nu-perfil', 'Profile', '<select id="nu-perfil" class="ps-sel">' + Object.keys(P.PERFIS).map(function (k) { return opt(k, P.PERFIS[k], 'resp'); }).join('') + '</select>') + campo('nu-un', 'Unit', '<select id="nu-un" class="ps-sel">' + opt('', '-') + P.UNIDADES.map(function (o) { return opt(o); }).join('') + '</select>') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="userNovo">Add user</button></div></div>';
  };
  B.externas = function () {
    return '<div class="ps-card">' + cabCartao('External entities: requests and status', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Entity' }, { t: 'Indicator' }, { t: 'Milestone' }, { t: 'Company' }, { t: 'Due' }, { t: 'Status' }], S.ext.map(function (x) {
      var cl = { pendente: 'warn', recebido: 'info', aplicado: 'ok' }[x.estado], mx = P.ms(x.milestone_id);
      return [e(x.entidade_externa), e(P.cat(x.indicador_id).nome), '<a href="' + rota('Milestone/' + x.milestone_id + '?sep=externos') + '">' + e(mx ? mx.nome : x.milestone_id) + '</a>', e(mx ? mx.empresa : '-'), e(P.fmtData(x.prazo)), chip({ pendente: 'Pending', recebido: 'Received', aplicado: 'Applied' }[x.estado], cl)];
    }), 'No requests yet.') + '</div></div>';
  };
  B.wfbase = function () {
    return '<div class="ps-card">' + cabCartao('Base workflow', 'ativ', '<button type="button" class="ps-btn peq" data-a="abrirWfBase">Change base workflow</button>') + '<div class="ps-card-body">' + tabela([{ t: 'Step' }, { t: 'Type' }, { t: 'Owner' }], S.wfbase.map(function (p, i) { return [(i + 1) + '. ' + e(p.nome), e(P.TIPOS_PASSO[p.tipo]), e(P.nomeResp(null, p.responsavel))]; })) + '<p class="ps-mut ps-small ps-mt">Applies to new milestones. When saving, you can also apply it to those not yet started and not adjusted.</p></div></div>';
  };
  B.indicadores = function () {
    var q = U.indBusca.toLowerCase(), l = S.cat.filter(function (c) { return !q || (c.nome + ' ' + c.id + ' ' + c.unidade_negocio).toLowerCase().indexOf(q) > -1; });
    return '<div class="ps-card">' + cabCartao('Indicators (' + S.cat.length + ')', 'doc') + '<div class="ps-card-body">' + campo('ind-busca', 'Search', '<input id="ind-busca" class="ps-in" value="' + e(U.indBusca) + '" data-c="indBusca">') + '<div class="ps-mt">' + tabela([{ t: 'Indicator' }, { t: 'Unit' }, { t: 'Department' }, { t: 'Type' }, { t: 'Frequency' }, { t: 'Table' }, { t: 'Required evidence' }], l.map(function (c) {
      return [linkFicha(c.id, c.id + ' ' + c.nome), e(c.unidade_medida), e(c.unidade_negocio), c.tipo === 'derivado' ? 'Derived' : 'Base', e(PERIODO_TXT[c.periodicidade] || c.periodicidade), e(QUADRO_TXT[c.quadro] || c.quadro), '<label class="ps-chk"><input id="evo-' + e(c.id) + '" type="checkbox" data-c="evObrig" data-id="' + e(c.id) + '"' + (c.evidencia_obrigatoria ? ' checked' : '') + '><span class="ps-sr">Required evidence for ' + e(c.nome) + '</span></label>'];
    }), 'No indicators found.') + '</div></div></div>' +
      '<div class="ps-card">' + cabCartao('Cycle milestones (' + P.msCiclo().length + ')', 'tarefa') + '<div class="ps-card-body">' + tabela([{ t: 'Milestone' }, { t: 'Company' }, { t: 'Assigned to' }, { t: 'Indicators', dir: 1 }, { t: 'Due' }, { t: 'Status' }], P.msCiclo().map(function (m) {
        return ['<a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a>', '<select id="bo-emp-' + e(m.id) + '" class="ps-sel" aria-label="Company of ' + e(m.nome) + '" data-c="msEmpresa" data-id="' + e(m.id) + '">' + S.ent.map(function (x) { return opt(x.nome, x.nome, m.empresa); }).join('') + '</select>', P.concluida(m) || P.passoAtual(m).tipo !== 'recolha' ? atribHtml(m) : '<select id="bo-atr-' + e(m.id) + '" class="ps-sel" aria-label="Assigned to, ' + e(m.nome) + '" data-c="msAtrib" data-id="' + e(m.id) + '">' + opt('', m.unidade + ' (department)', m.atribuido_a || '') + P.atribuiveis(m).map(function (x) { return opt(x.login, x.nome, m.atribuido_a || ''); }).join('') + '</select>', m.indicadores.length, '<input id="pz-' + e(m.id) + '" class="ps-in" type="date" aria-label="Due date of ' + e(m.nome) + '" value="' + e(m.prazo) + '" data-c="msPrazo" data-id="' + e(m.id) + '">', estChip(m)];
      })) + '</div></div>';
  };
  var MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  B.calendario = function () {
    return '<div class="ps-card">' + cabCartao('Reporting windows', 'cal', '<button type="button" class="ps-btn peq" data-a="janNova">New window</button>') + '<div class="ps-card-body">' + tabela([{ t: 'Window' }, { t: 'Topic' }, { t: 'Months' }, { t: 'First day' }, { t: 'Last day' }, { t: 'Actions' }], S.janelas.map(function (j, i) {
      return ['<input id="jn-' + i + '" class="ps-in" aria-label="Window name" value="' + e(j.nome) + '" data-c="janNome" data-id="' + i + '">', '<select id="jt-' + i + '" class="ps-sel" aria-label="Topic" data-c="janTema" data-id="' + i + '">' + Object.keys(P.TEMAS).map(function (t) { return opt(t, t, j.tema); }).join('') + '</select>', '<input id="jm-' + i + '" class="ps-in" aria-label="Months, 1 to 12, comma separated" value="' + e(j.meses.join(', ')) + '" data-c="janMeses" data-id="' + i + '"><small class="ps-mut">' + (j.meses.length === 12 ? 'All' : j.meses.map(function (x) { return MESES[x - 1]; }).join(', ')) + '</small>', '<input id="ji-' + i + '" class="ps-in" type="number" min="1" max="31" aria-label="First day" value="' + j.dia_inicio + '" data-c="janIni" data-id="' + i + '">', '<input id="jf-' + i + '" class="ps-in" type="number" min="1" max="31" aria-label="Last day" value="' + j.dia_fim + '" data-c="janFim" data-id="' + i + '">', '<button type="button" class="ps-btn peq err" data-a="janApagar" data-v="' + i + '">Remove</button>'];
    }), 'No windows yet.') + '<p class="ps-mut ps-small ps-mt">Windows set when data is collected. Each milestone due date sets when it is delivered.</p></div></div>';
  };
  B.regras = function () {
    var q = U.regraBusca.toLowerCase(), l = S.cat.filter(function (c) { return !q || (c.nome + ' ' + c.id).toLowerCase().indexOf(q) > -1; });
    return '<div class="ps-card">' + cabCartao('Validation rules: threshold by indicator', 'tarefa') + '<div class="ps-card-body">' + campo('reg-busca', 'Search', '<input id="reg-busca" class="ps-in" value="' + e(U.regraBusca) + '" data-c="regraBusca">') + '<div class="ps-mt">' + tabela([{ t: 'Indicator' }, { t: 'Threshold (%)' }, { t: 'Consistency rules' }], l.map(function (c) {
      return [e(c.id + ' ' + c.nome), '<input id="lim-' + e(c.id) + '" class="ps-in ps-num" type="number" min="0" aria-label="Threshold of ' + e(c.nome) + '" value="' + c.limiar_variacao_pct + '" data-c="limiar" data-id="' + e(c.id) + '">', c.regras_coerencia.length ? '<span class="ps-small">' + e(c.regras_coerencia.join(' ')) + '</span>' : '-'];
    }), 'No indicators found.') + '</div></div></div>';
  };
  var ROT_COR = { primary: 'Primary', secondary: 'Secondary', accent: 'Accent', bg: 'Background', text: 'Text' };
  B.marca = function () {
    if (!U.marca) U.marca = JSON.parse(JSON.stringify(S.marca));
    var m = U.marca, cores = m.cores, avisos = [];
    if (P.contraste(cores.primary, '#FFFFFF') < 4.5) avisos.push('The primary colour has low contrast with white text on buttons and the hero.');
    if (P.contraste(cores.text, cores.bg) < 4.5) avisos.push('The text colour has low contrast with the background.');
    var prev = m.logotipo ? '<img src="' + e(m.logotipo) + '" alt="Logo preview" data-logo-prev>' : 'No logo: the platform shows the name.';
    return '<div class="ps-card">' + cabCartao('Logo', 'doc') + '<div class="ps-card-body"><div class="ps-form">' + campo('mc-logo', 'Web link to the logo image', '<input id="mc-logo" class="ps-in" type="url" inputmode="url" placeholder="https://example.com/logo.png" value="' + e(m.logotipo) + '" data-c="mcLogo">') + '<div><span class="ps-lab">Preview</span><div class="ps-logo-prev" data-campo="logo-prev">' + prev + '</div></div></div><p class="ps-mut ps-small ps-mt" id="logo-estado" role="status">' + e(U.logoEstado || 'Once saved, this logo appears across the whole platform.') + '</p></div></div>' +
      '<div class="ps-card">' + cabCartao('Name', 'tarefa') + '<div class="ps-card-body"><div class="ps-form">' + campo('mc-nome', 'Platform name', '<input id="mc-nome" class="ps-in" value="' + e(m.nome) + '" data-c="mcNome">') + campo('mc-sub', 'Subtitle', '<input id="mc-sub" class="ps-in" value="' + e(m.subtitulo) + '" data-c="mcSub">') + '</div></div></div>' +
      '<div class="ps-card">' + cabCartao('Colours', 'ativ') + '<div class="ps-card-body"><div class="ps-cores">' + Object.keys(ROT_COR).map(function (k) { return '<div><label class="ps-lab" for="cor-t-' + k + '">' + ROT_COR[k] + '</label><div class="ps-cor"><input id="cor-' + k + '" type="color" aria-label="Choose colour ' + ROT_COR[k] + '" value="' + e(cores[k]) + '" data-i="mcCor" data-id="' + k + '"><input id="cor-t-' + k + '" class="ps-in" maxlength="7" value="' + e(cores[k]) + '" data-c="mcCorT" data-id="' + k + '"></div></div>'; }).join('') + '</div>' +
      avisos.map(function (a) { return '<div class="ps-aviso warn ps-mt">' + e(a) + '</div>'; }).join('') +
      '<h3 class="ps-grupo-t">Suggested palettes</h3><div class="ps-pal">' + P.PALETAS.map(function (p, i) { return '<button type="button" data-a="mcPaleta" data-v="' + i + '"><span>' + ['primary', 'secondary', 'accent'].map(function (k) { return '<i style="--c:' + p.cores[k] + '"></i>'; }).join('') + '</span>' + e(p.nome) + '</button>'; }).join('') + '</div>' +
      '<h3 class="ps-grupo-t">Preview</h3><div class="ps-pre-marca"><div class="ps-pre-top">' + (m.logotipo ? '<img src="' + e(m.logotipo) + '" alt="" class="ps-logo-mini" data-logo-mini>' : '<span class="ps-marca-mono" aria-hidden="true">' + e(sigla(m.nome)) + '</span>') + '<span class="ps-marca-txt">' + e(m.nome) + '<small>' + e(m.subtitulo) + '</small></span></div><div class="ps-pre-hero ps-fundo-marca"><b>' + e(m.nome) + '</b></div><div class="ps-pre-b"><span class="ps-btn pri">Primary button</span><span class="ps-btn">Secondary</span>' + chip('In collection', 'info') + chip('Approved', 'ok') + '</div></div></div>' +
      '<div class="ps-sticky ps-mt"><button type="button" class="ps-btn pri" data-a="mcGuardar">Save brand</button></div></div>' +
      '<div class="ps-card">' + cabCartao('Brand copy', 'doc') + '<div class="ps-card-body ps-sp"><button type="button" class="ps-btn" data-a="mcExportar">Export</button><button type="button" class="ps-btn" data-a="mcImportar">Import</button><button type="button" class="ps-btn err" data-a="mcRepor">Reset</button></div></div>';
  };
  B.areas = function () {
    return '<div class="ps-card">' + cabCartao('Data consumer areas', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Code' }, { t: 'Area' }, { t: 'What it uses it for' }, { t: 'Indicators', dir: 1 }], S.areas.map(function (a, i) {
      return ['<span class="ps-mono">' + e(a.codigo) + '</span>', '<input id="an-' + i + '" class="ps-in" aria-label="Area" value="' + e(a.nome) + '" data-c="areaNome" data-id="' + i + '">', '<input id="au-' + i + '" class="ps-in" aria-label="What it uses it for" value="' + e(a.uso) + '" data-c="areaUso" data-id="' + i + '">', S.cat.filter(function (c) { return c.utilizado_por.indexOf(a.codigo) > -1; }).length];
    })) + '</div></div>';
  };
  B.entidades = function () {
    return '<div class="ps-card">' + cabCartao('Companies', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Company' }, { t: 'Group perimeter' }, { t: 'Majority perimeter' }, { t: 'Milestones', dir: 1 }, { t: 'Actions' }], S.ent.map(function (x, i) {
      return ['<input id="en-' + i + '" class="ps-in" aria-label="Company name" value="' + e(x.nome) + '" data-c="entNome" data-id="' + i + '">', '<label class="ps-chk"><input id="eg-' + i + '" type="checkbox" data-c="entGrupo" data-id="' + i + '"' + (x.perimetro_grupo ? ' checked' : '') + '> Yes</label>', '<label class="ps-chk"><input id="em-' + i + '" type="checkbox" data-c="entMaior" data-id="' + i + '"' + (x.perimetro_maioritario ? ' checked' : '') + '> Yes</label>', S.ms.filter(function (m) { return m.empresa === x.nome; }).length, '<button type="button" class="ps-btn peq err" data-a="entApagar" data-v="' + i + '">Remove</button>'];
    })) + '<h3 class="ps-grupo-t">New company</h3><div class="ps-sp">' + '<input id="ent-novo" class="ps-in ps-cresce" aria-label="New company name" placeholder="Company name">' + '<button type="button" class="ps-btn pri" data-a="entNova">Add company</button></div></div></div>';
  };
  B.departamentos = function () {
    return '<div class="ps-card">' + cabCartao('Departments', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Department' }, { t: 'In use', dir: 1 }, { t: 'Actions' }], S.deps.map(function (x, i) {
      return ['<input id="dp-' + i + '" class="ps-in" aria-label="Department name" value="' + e(x.nome) + '" data-c="depNome" data-id="' + i + '">', P.usosDepartamento(x.nome), '<button type="button" class="ps-btn peq err" data-a="depApagar" data-v="' + i + '">Remove</button>'];
    })) + '<h3 class="ps-grupo-t">New department</h3><div class="ps-sp">' + '<input id="dep-novo" class="ps-in ps-cresce" aria-label="New department name" placeholder="Department name">' + '<button type="button" class="ps-btn pri" data-a="depNova">Add department</button></div><p class="ps-mut ps-small ps-mt">Departments are the tags on milestones and the business units of users and indicators. Renaming one updates them all.</p></div></div>';
  };
  B.dados = function () {
    return '<div class="ps-card">' + cabCartao('Data and storage', 'doc') + '<div class="ps-card-body"><div class="ps-sp"><button type="button" class="ps-btn" data-a="dadosExportar">Export all data</button>' + (P.online() ? '' : '<button type="button" class="ps-btn" data-a="dadosImportar">Import data</button><button type="button" class="ps-btn err" data-a="dadosRepor">Reset data</button>') + '</div></div></div>';
  };

  /* --- Paineis laterais -------------------------------------------------- */
  var abrePainel = function (tipo, args) { U.painel = { tipo: tipo, args: args || {} }; U.painelFoco = true; R(); };
  var fechaPainel = function () { U.painel = null; R(); };
  var Pn = {};
  Pn.ficha = function (a) {
    var id = a.id, c = P.cat(id), m = P.msDoIndicador(id), it = P.item(id), usr = u();
    if (!m || !it) return { t: c.nome, b: vazio('This indicator has no milestone in this cycle.') };
    var v = P.validarItem(it), ant = P.valorAnterior(id, m.ano), est = P.estadoIndicador(m, id);
    var refs = (S.mat.filter(function (x) { return x.norma === c.esrs; })[0] || {}).avaliacao;
    var b = '<div class="ps-sp">' + chip(est.txt, est.cls) + marcaAmostra(id) + (it.reexpresso ? chip('Restated', 'warn') : '') + '</div><div class="ps-kpis"><div class="ps-kpi"><span>' + (m.ano - 1) + '</span><b>' + (ant === null || ant === undefined ? '-' : e(fmtV(id, ant))) + '</b></div><div class="ps-kpi"><span>' + m.ano + '</span><b>' + (it.valor === null ? '-' : e(fmtV(id, it.valor))) + '</b></div><div class="ps-kpi"><span>Change</span><b>' + (v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%') + '</b></div></div>' +
      (v.alertas.length ? '<div class="ps-aviso warn">' + v.alertas.map(e).join('<br>') + '</div>' : '') + (it.justificacao ? '<div><span class="ps-lab">Justification</span>' + e(it.justificacao) + '</div>' : '') +
      '<p class="ps-ficha-desc">' + e(P.esrsDe(id).desc) + '</p>' +
      '<dl class="ps-det"><dt>Year and unit</dt><dd>' + m.ano + ' · ' + e(c.unidade_medida) + '</dd><dt>Milestone</dt><dd>' + e(m.nome) + '</dd><dt>Type</dt><dd>' + (c.tipo === 'derivado' ? 'Derived' : 'Base data') + '</dd>' + (c.formula ? '<dt>Formula</dt><dd>' + e(c.formula) + '</dd>' : '') + '<dt>Threshold</dt><dd>' + c.limiar_variacao_pct + '%</dd><dt>Users</dt><dd>' + e(c.utilizado_por.join(', ')) + '</dd><dt>Quality</dt><dd>' + e(P.QUALIDADE_TXT[it.qualidade]) + (it.metodo ? ' · ' + e(it.metodo) : '') + '</dd><dt>Evidence</dt><dd>' + (it.evidencias.map(function (x) { return e(x.ficheiro); }).join(', ') || '-') + '</dd><dt>ESRS datapoint</dt><dd>' + (P.esrsDe(id).dps.length ? '<span class="ps-mono">' + e(P.esrsDe(id).dps.join(', ')) + '</span>' : 'Entity-specific') + '</dd><dt>Frameworks</dt><dd>ESRS ' + e(c.esrs_requisito) + (refs ? ' (' + e(MAT_TXT[refs] || refs) + ')' : '') + ' · GRI ' + e(c.gri) + '</dd></dl>' +
      '<div><h3 class="ps-grupo-t">Value history</h3>' + (it.versoes.length ? '<ul class="ps-ev ps-sem-pad">' + it.versoes.slice().reverse().map(function (x) { return '<li><b class="ps-num">' + e(fmtV(id, x.valor)) + '</b> · ' + e(x.origem) + (x.motivo ? '. Reason: ' + e(x.motivo) : '') + '<small>' + e(x.por) + ' · ' + e(P.fmtDataHora(x.em)) + '</small></li>'; }).join('') + '</ul>' : '<p class="ps-mut ps-small">No values yet.</p>') + '</div>';
    if (P.concluida(m) && P.podeReexpressar(usr)) b += '<div class="ps-card ps-card-body"><h3 class="ps-grupo-t ps-sem-topo">Restate approved value</h3><div class="ps-form">' + campo('rx-val', 'New value', '<input id="rx-val" class="ps-in" inputmode="decimal">') + campo('rx-mot', 'Reason (required)', '<input id="rx-mot" class="ps-in">') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="reexpressar" data-v="' + e(id) + '">Restate value</button></div>';
    if (usr.perfil === 'auditor' || usr.perfil === 'admin') b += '<div class="ps-card ps-card-body"><h3 class="ps-grupo-t ps-sem-topo">Auditor information request</h3>' + campo('pa-txt', 'What you need to know', '<textarea id="pa-txt" class="ps-ta"></textarea>') + '<button type="button" class="ps-btn ps-mt" data-a="pedidoAud" data-v="' + e(id) + '">Send request</button></div>';
    return { t: c.nome, s: c.id, b: b, p: '<a class="ps-btn" href="' + rota('Milestone/' + m.id) + '" data-a="fecharPainel" data-nao-impedir="1">Open the milestone</a>' };
  };
  Pn.tecnica = function (a) {
    var m = msAtual(), sec = a.sec || 'schema', b = '<div class="ps-seg" role="group" aria-label="Tabs">' + [['schema', 'File schema'], ['json', 'JSON Schema'], ['tpl', 'Templates'], ['api', 'API and integrations']].map(function (s) { return '<button type="button" class="' + (sec === s[0] ? 'on' : '') + '" data-a="tecSec" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (sec === 'schema') {
      var D = [['milestone_id', 'string', 'Yes', 'Must be ' + m.id + '.'], ['indicator_id', 'string', 'Yes', 'Only this milestone\'s indicators: ' + m.indicadores.join(', ') + '.'], ['indicator_name', 'string', 'No', 'For human reading only. It is ignored.'], ['entity', 'string', 'No', 'Defaults to Consolidado.'], ['period', 'string', 'Yes', 'Must be ' + m.ano + '.'], ['value', 'number', 'Yes', 'Accepts a decimal comma or point.'], ['unit', 'string', 'Yes', 'Same as the indicator unit.'], ['justification', 'string', 'No', 'Required when there are alerts.'], ['source_system', 'string', 'No', 'Source system of the data.'], ['evidence_ref', 'string', 'No', 'Required for indicators with required evidence.'], ['data_quality', 'string', 'No', 'measured, calculated or estimated.'], ['estimation_method', 'string', 'No', 'Required when data_quality is estimated.']];
      b += tabela([{ t: 'Field' }, { t: 'Type' }, { t: 'Required' }, { t: 'Rule' }], D.map(function (x) { return ['<span class="ps-mono">' + x[0] + '</span>', x[1], x[2], e(x[3])]; }));
    } else if (sec === 'json') {
      b += '<div class="ps-sp"><button type="button" class="ps-btn peq" data-a="schemaCopiar">Copy</button><button type="button" class="ps-btn peq" data-a="schemaDesc">Download</button></div><pre class="ps-pre" tabindex="0">' + e(JSON.stringify(P.jsonSchema(m), null, 2)) + '</pre>';
    } else if (sec === 'tpl') {
      b += '<p>Templates for this milestone, with the indicators and year already in place.</p><div class="ps-sp"><button type="button" class="ps-btn pri" data-a="tplExcel">Template Excel</button><button type="button" class="ps-btn" data-a="tplCsv">Template CSV</button></div>';
    } else {
      var ex = { milestone_id: m.id, submitted_by: 'svc-integration@example.com', source_system: 'ERP', records: [{ indicator_id: m.indicadores[0], entity: 'Consolidado', period: String(m.ano), value: 10, unit: P.cat(m.indicadores[0]).unidade_medida, data_quality: 'measured' }] };
      b += '<div class="ps-aviso warn">Planned integration contract.</div><dl class="ps-det"><dt>Get the schema</dt><dd class="ps-mono">GET /api/v1/milestones/' + e(m.id) + '/schema</dd><dt>Send values</dt><dd class="ps-mono">POST /api/v1/milestones/' + e(m.id) + '/submissions</dd><dt>Webhook</dt><dd class="ps-mono">milestone.step_completed</dd></dl><pre class="ps-pre" tabindex="0">' + e(JSON.stringify(ex, null, 2)) + '</pre>';
    }
    return { t: 'Technical view', s: m.nome, b: b, largo: true };
  };
  Pn.pedirExt = function (a) {
    var m = msAtual(), ext = S.users.filter(function (x) { return x.perfil === 'ext'; });
    return { t: 'Ask an external entity', s: m.nome, b: campo('px-ind', 'Indicator', '<select id="px-ind" class="ps-sel">' + m.indicadores.map(function (id) { return opt(id, P.cat(id).nome, a.id); }).join('') + '</select>') + campo('px-ent', 'Entity', '<select id="px-ent" class="ps-sel">' + ext.map(function (x) { return opt(x.nome); }).join('') + '</select>') + campo('px-desc', 'What is being requested', '<textarea id="px-desc" class="ps-ta"></textarea>') + campo('px-prazo', 'Due date', '<input id="px-prazo" class="ps-in" type="date" value="' + e(P.diasDe(14)) + '">'), p: '<button type="button" class="ps-btn pri" data-a="pxCriar">Create request</button>' };
  };
  Pn.novoPedAud = function () {
    var apr = S.cat;
    return { t: 'New information request', b: campo('na-ind', 'Indicator', '<select id="na-ind" class="ps-sel">' + apr.map(function (c) { return opt(c.id, c.nome); }).join('') + '</select>') + campo('na-txt', 'What you need to know', '<textarea id="na-txt" class="ps-ta"></textarea>'), p: '<button type="button" class="ps-btn pri" data-a="naCriar">Send request</button>' };
  };
  var respOpts = function (sel) {
    return [opt('unidade', 'Milestone unit', sel), opt('esg', 'Sustainability team', sel), opt('admin', 'Administrator', sel)].concat(P.UNIDADES.map(function (x) { return opt('area:' + x, x, sel); })).join('');
  };
  Pn.wf = function (a) {
    var base = a.base, m = base ? null : msAtual(), d = U.wfDraft, atual = m ? m.passo_atual : -1;
    var linhas = d.map(function (p, i) {
      var feito = i < atual, ehAtual = i === atual, auto = p.responsavel === 'sistema', fixo = i === 0 || feito || ehAtual;
      var nome = feito ? '<b>' + e(p.nome) + '</b>' : '<input id="wfn-' + i + '" class="ps-in" aria-label="Name of step ' + (i + 1) + '" value="' + e(p.nome) + '" data-c="wfNome" data-id="' + i + '">';
      var tipo = fixo || auto ? '<span class="ps-small ps-mut">' + e(P.TIPOS_PASSO[p.tipo]) + '</span>' : '<select id="wft-' + i + '" class="ps-sel" aria-label="Type of step ' + (i + 1) + '" data-c="wfTipo" data-id="' + i + '">' + ['revisao', 'parecer', 'aprovacao'].map(function (t) { return opt(t, P.TIPOS_PASSO[t], p.tipo); }).join('') + '</select>';
      var resp = feito ? '<span class="ps-small ps-mut">' + e(P.nomeResp(m, p.responsavel)) + '</span>' : auto ? '<span class="ps-small ps-mut">Automatic</span>' : '<select id="wfr-' + i + '" class="ps-sel" aria-label="Owner of step ' + (i + 1) + '" data-c="wfResp" data-id="' + i + '">' + respOpts(p.responsavel) + '</select>';
      var mov = !fixo && p.tipo !== 'publicacao';
      var ultimaMov = i + 1 < d.length && d[i + 1].tipo !== 'publicacao';
      var primeiraMov = i - 1 > Math.max(atual, 0);
      return '<div class="ps-wfe ' + (feito ? 'bloq' : '') + '"><span class="ps-wfe-n">' + (feito ? svg(I.tick, 14) : i + 1) + '</span><div class="ps-wfe-c">' + nome + tipo + resp + '</div><div class="ps-wfe-a">' + (mov ? '<button type="button" id="wfc-' + i + '" data-a="wfMover" data-v="' + i + '" data-d="-1" aria-label="Move up"' + (primeiraMov ? '' : ' disabled') + '>' + svg(I.cima, 14) + '</button><button type="button" id="wfb-' + i + '" data-a="wfMover" data-v="' + i + '" data-d="1" aria-label="Move down"' + (ultimaMov ? '' : ' disabled') + '>' + svg(I.baixo, 14) + '</button>' : '') + (fixo ? '' : '<button type="button" id="wfx-' + i + '" data-a="wfRemover" data-v="' + i + '" aria-label="Remove">' + svg(I.lixo, 14) + '</button>') + '</div></div>';
    }).join('');
    return { t: base ? 'Change base workflow' : 'Change workflow', s: base ? 'Applies to new milestones.' : m.nome,
      b: (m ? '<div class="ps-aviso">Completed steps are locked. On the current step, only the name and owner can change.</div>' : '') + '<div class="ps-col">' + linhas + '</div><div class="ps-sp"><button type="button" class="ps-btn" data-a="wfAdd">Add step</button>' + (m ? '<button type="button" class="ps-btn" data-a="wfRepor">Reset from the base workflow</button>' : '') + '</div>' + (base ? '<label class="ps-chk"><input id="wf-aplica" type="checkbox"> Also apply to milestones not yet started and not adjusted</label>' : ''),
      p: '<button type="button" class="ps-btn" data-a="fecharPainel">Cancel</button><button type="button" class="ps-btn pri" data-a="wfGuardar">Save workflow</button>', largo: true };
  };
  var pintarPainel = function () {
    var h = document.querySelector('[data-painel]');
    if (!h) return;
    if (!U.painel) { h.innerHTML = ''; h.hidden = true; document.body.style.overflow = ''; return; }
    var r = Pn[U.painel.tipo](U.painel.args);
    h.hidden = false;
    document.body.style.overflow = 'hidden';
    var corpo = h.querySelector('.ps-pan-b'), sy = corpo && h.getAttribute('data-painel-tipo') === U.painel.tipo ? corpo.scrollTop : 0;
    h.setAttribute('data-painel-tipo', U.painel.tipo);
    h.innerHTML = '<div class="ps-pan-f" data-a="fecharPainel"></div><div class="ps-pan ' + (r.largo ? 'largo' : '') + (r.cls ? ' ' + r.cls : '') + '" role="dialog" aria-modal="true" aria-labelledby="pan-t"><div class="ps-pan-h"><div><h2 id="pan-t" tabindex="-1">' + e(r.t) + '</h2>' + (r.s ? '<div class="ps-mut ps-small">' + e(r.s) + '</div>' : '') + '</div><button type="button" class="ps-x" data-a="fecharPainel" aria-label="Close">×</button></div><div class="ps-pan-b">' + r.b + '</div>' + (r.p ? '<div class="ps-pan-p">' + r.p + '</div>' : '') + '</div>';
    if (sy) { var nb = h.querySelector('.ps-pan-b'); if (nb) nb.scrollTop = sy; }
    if (U.painelFoco) { U.painelFoco = false; var t = document.getElementById('pan-t'); if (t) t.focus(); }
  };

  /* --- Render e rotas ---------------------------------------------------- */
  var lerRota = function () {
    var pag, arg = '', q = {};
    if (MODO === 'hash') {
      var h = (location.hash || '').replace(/^#\/?/, ''), pq = h.split('?'), seg = pq[0].split('/');
      pag = seg[0]; arg = seg[1] || '';
      new URLSearchParams(pq[1] || '').forEach(function (v, k) { q[k] = v; });
    } else {
      var sec = document.querySelector('[data-pagina]');
      pag = sec ? sec.getAttribute('data-pagina') : '';
      new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; });
      arg = q.id || '';
    }
    if (!P.online() && q.perfil && P.user(q.perfil)) P.entrar(q.perfil);
    var usr = u(), per = paginasPermitidas(usr);
    if (per.indexOf(pag) < 0 || (pag === 'Milestone' && !P.ms(arg))) pag = usr ? (usr.perfil === 'ext' ? 'Pedidos' : pag === 'Milestone' ? 'Milestones' : 'Inicio') : 'Entrada';
    return { pag: pag, arg: arg, q: q };
  };
  var R = function () {
    var ativo = document.activeElement, idF = ativo && ativo.id, ini = null, fim = null;
    try { ini = ativo.selectionStart; fim = ativo.selectionEnd; } catch (x) { /* nem todos os campos tem selecao */ }
    var sy = window.scrollY;
    var pag = U.rota.pag;
    if (window.PortalGrelha) window.PortalGrelha.antes();
    document.querySelectorAll('[data-pagina]').forEach(function (s) { s.hidden = s.getAttribute('data-pagina') !== pag; });
    pintarCabecalho();
    pintarMarca();
    if (pag === 'Inicio') pintarHero();
    var sec = document.querySelector('[data-pagina="' + pag + '"]');
    if (sec) sec.querySelectorAll('[data-bloco]').forEach(function (b) {
      var f = Blocos[b.getAttribute('data-bloco')];
      if (!f) return;
      var abertos = [].map.call(b.querySelectorAll('details[open]'), function (d) { return d.id; });
      b.innerHTML = f();
      abertos.forEach(function (i) { var d = document.getElementById(i); if (d) d.open = true; });
    });
    pintarMarca();
    pintarPainel();
    if (window.PortalGrelha) window.PortalGrelha.depois();
    if (!U.painelFoco && idF && document.getElementById(idF) && ativo !== document.getElementById(idF)) {
      var n = document.getElementById(idF);
      n.focus({ preventScroll: true });
      try { if (ini !== null) n.setSelectionRange(ini, fim); } catch (x2) { /* tipo de campo sem selecao */ }
    }
    window.scrollTo(0, sy);
  };
  var navegar = function () {
    var ant = U.rota.pag + '/' + U.rota.arg;
    U.rota = lerRota();
    var novo = U.rota.pag + '/' + U.rota.arg;
    U.msFiltro.minhas = U.rota.pag === 'Milestones' && !!U.rota.q.minhas;
    var empRota = U.rota.pag === 'Milestones' && U.rota.q.empresa ? S.ent.filter(function (x) { return x.id === U.rota.q.empresa; })[0] : null;
    U.msFiltro.empresa = empRota ? empRota.nome : '';
    if (U.rota.q.sep) U.sep = U.rota.q.sep;
    else if (ant !== novo) U.sep = 'dados';
    U.menu = null; U.painel = null;
    var hd = document.querySelector('[data-cabecalho]');
    if (hd) hd.classList.remove('open');
    if (U.marca) { U.marca = null; U.logoEstado = ''; P.aplicarMarca(); }
    R();
    if (ant !== novo) window.scrollTo(0, 0);
    if (U.rota.q.sep) { var alvoSec = document.getElementById('sec-' + U.rota.q.sep); if (alvoSec) alvoSec.scrollIntoView({ block: 'start' }); }
    var alvo = U.rota.pag;
    if (MODO === 'hash' && !location.hash && alvo !== 'Entrada') location.replace('#/' + alvo);
  };
  P.irPara = function (r) { if (MODO === 'hash') { if (location.hash === '#/' + r) navegar(); else location.hash = '/' + r; } else location.href = rota(r); };
  P.render = R;
  P.ui = U;

  /* --- Ficheiros --------------------------------------------------------- */
  var escolherFicheiro = function (aceita, cb) {
    var i = document.createElement('input');
    i.type = 'file'; if (aceita) i.accept = aceita; i.hidden = true;
    document.body.appendChild(i);
    i.addEventListener('change', function () { if (i.files[0]) cb(i.files[0]); i.remove(); });
    i.click();
  };
  P.importarFicheiroM = function (m, file) {
    return P.lerFicheiro(file).then(function (r) {
      var rel = r.erro ? { erro: r.erro, nome: r.nome } : P.validarImportacao(m, r.linhas);
      rel.nome = r.nome;
      U.imp[m.id] = rel;
      R();
      return rel;
    });
  };
  var lerJSON = function (file, cb) { var r = new FileReader(); r.onload = function () { try { cb(JSON.parse(r.result)); } catch (x) { toast('The file is not valid JSON.', 'err'); } }; r.readAsText(file); };

  /* --- Acoes (clique) ---------------------------------------------------- */
  var res = function (r, okMsg) { if (r.erro) { toast(r.erro, 'err'); return false; } if (okMsg) toast(okMsg, 'ok'); R(); return true; };
  var val = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
  var A = {
    entrar: function (d) { P.entrar(d.v); var usr = P.user(d.v); P.irPara(usr.perfil === 'ext' ? 'Pedidos' : 'Inicio'); },
    sair: function () { P.sair(); if (P.online()) { window.PortalBackend.sair(); P.estadoVazio(); } U.menu = null; U.cal = null; P.irPara('Entrada'); },
    menuNotif: function () { U.menu = U.menu === 'notif' ? null : 'notif'; R(); },
    menuConta: function () { U.menu = U.menu === 'conta' ? null : 'conta'; R(); },
    fecharMenu: function () { U.menu = null; },
    toggleNav: function () { var h = document.querySelector('[data-cabecalho]'); h.classList.toggle('open'); },
    maisNav: function () { var h = document.querySelector('[data-cabecalho]'); h.classList.toggle('open'); window.scrollTo(0, 0); },
    calDia: function (d) { U.cal.dia = +d.v; R(); },
    calMes: function (d) { var n = U.cal.mes + (+d.v), dt = new Date(U.cal.ano, n, 1); U.cal = { ano: dt.getFullYear(), mes: dt.getMonth(), dia: 1 }; R(); },
    calHoje: function () { U.cal = null; R(); },
    msVista: function (d) { U.msVista = d.v; R(); },
    msEmpTodas: function () { U.msEmpTodas = !U.msEmpTodas; R(); },
    msExcel: function () { exportarMilestones(msFiltradas()); },
    dadosVista: function (d) { U.dadosVista = d.v; R(); },
    dadosExcel: function () { var m = msAtual(); exportarGrelha(cfgDados(m), 'data-request-' + m.id + '-' + m.ano + '.xlsx', 'Data', folhaFicheiros(m)); toast('Excel file exported.', 'ok'); },
    colRelFechar: function () { delete U.colRel[msAtual().id]; R(); },
    irFalta: function (d) {
      if (d.campo !== 'fic' && d.campo !== 'evi') U.dadosVista = 'form';
      R();
      var el = document.getElementById({ val: 'v-', just: 'j-', met: 'm-', evi: 'fp-ev:', fic: 'fp-' }[d.campo] + d.id);
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
    },
    ficEntregar: function (d) { var m = msAtual(); escolherFicheiro('', function (f) { var r = P.entregarFicheiro(m, d.v, f.name, u()); if (r.erro) return toast(r.erro, 'err'); toast('File delivered.', 'ok'); R(); }); },
    ficPedir: function () { var c = document.getElementById('fp-obr'); var r = P.pedirFicheiro(msAtual(), val('fp-nome'), c && c.checked, u()); res(r, 'File added to the request.'); },
    ficRetirar: function (d) { res(P.retirarPedidoFicheiro(msAtual(), d.v, u()), 'File removed from the request.'); },
    expDom: function (d) { estadoExp(msAtual()).dom = d.v; R(); },
    expTodos: function () { var x = estadoExp(msAtual()); idsDominio(x.dom).forEach(function (id) { if (x.sel.indexOf(id) < 0) x.sel.push(id); }); R(); },
    expLimpar: function () { estadoExp(msAtual()).sel = []; R(); },
    expExcel: function () { var m = msAtual(); exportarGrelha(cfgRelatorio(m), 'report-' + m.id + '-' + m.ano + '.xlsx', 'Report'); toast('Report exported to Excel.', 'ok'); },
    entVista: function (d) { U.entVista = d.v; R(); },
    msTagDel: function (d) { var m = msAtual(); m.departamentos = m.departamentos.filter(function (x) { return x !== d.v; }); P.evento(m, 'Department tag removed: ' + d.v + '.', u().nome); P.guardar(); R(); },
    sep: function (d) { U.sep = d.v; var s = document.getElementById('sec-' + d.v); if (s) setTimeout(function () { s.scrollIntoView({ block: 'start' }); }, 0); },
    ficha: function (d) { abrePainel('ficha', { id: d.v }); },
    fecharPainel: function () { fechaPainel(); },
    abrirTecnica: function (d) { abrePainel('tecnica', { sec: d.v || 'schema' }); },
    tecSec: function (d) { U.painel.args.sec = d.v; R(); },
    schemaCopiar: function () { var t = JSON.stringify(P.jsonSchema(msAtual()), null, 2); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('JSON Schema copied.', 'ok'); }, function () { toast('Could not copy. Use Download.', 'err'); }); else toast('Could not copy. Use Download.', 'err'); },
    schemaDesc: function () { var m = msAtual(); P.descarregar('schema-' + m.id + '.json', JSON.stringify(P.jsonSchema(m), null, 2), 'application/json'); },
    tplExcel: function () { P.templateExcel(msAtual()); },
    tplCsv: function () { P.templateCSV(msAtual()); },
    importar: function () { var m = msAtual(); escolherFicheiro('.xlsx,.csv,.json,.xls', function (f) { P.importarFicheiroM(m, f); }); },
    impExemplo: function () { var m = msAtual(), rel = P.validarImportacao(m, P.exemploImportacao(m)); rel.nome = 'exemplo-com-erros.xlsx'; U.imp[m.id] = rel; R(); },
    impAplicar: function () { var m = msAtual(), rel = U.imp[m.id], n = P.aplicarImportacao(m, rel, rel.nome, u()); delete U.imp[m.id]; toast(n + ' rows applied.', 'ok'); R(); },
    anexar: function (d) { var m = msAtual(), it = P.item(d.v, m.ano); escolherFicheiro('', function (f) { P.anexar(it, f.name, u()); P.evento(m, 'Evidence attached to ' + P.cat(d.v).nome + ': ' + f.name + '.', u().nome); P.guardar(); toast('Evidence attached.', 'ok'); R(); }); },
    anexarGeral: function () { var m = msAtual(), usr = u(); escolherFicheiro('', function (f) { m.documentos_gerais.push({ ficheiro: f.name, por: usr.nome, em: new Date().toISOString() }); P.evento(m, 'General document attached: ' + f.name + '.', usr.nome); P.guardar(); toast('Document attached.', 'ok'); R(); }); },
    submeter: function () {
      var m = msAtual(), r = P.submeter(m, u());
      if (r.erro) return toast(r.erro, 'err');
      if (r.faltas) {
        toast(r.faltas.length === 1 ? r.faltas[0].msg : r.faltas.length + ' items missing. ' + r.faltas[0].msg, 'err');
        var f = r.faltas[0];
        if (f.campo !== 'fic' && U.dadosVista === 'grid') { U.dadosVista = 'form'; R(); }
        var el = document.getElementById({ val: 'v-', just: 'j-', met: 'm-', evi: 'e-', fic: 'fp-' }[f.campo] + f.id);
        if (el) el.focus();
        return;
      }
      toast('Milestone submitted.', 'ok'); R();
    },
    concluirPasso: function () { var m = msAtual(), t = P.passoAtual(m).tipo, r = P.concluirPasso(m, u(), val('rev-com')); res(r, t === 'parecer' ? 'Opinion given.' : t === 'aprovacao' ? 'Values approved and locked.' : 'Review completed.'); },
    devolver: function () { var r = P.devolver(msAtual(), u(), val('rev-com')); if (r.erro) { toast(r.erro, 'err'); var c = document.getElementById('rev-com'); if (c) c.focus(); return; } U.sep = 'dados'; toast('Milestone returned to the unit.', 'ok'); R(); },
    comentar: function () { var t = val('chat-txt').trim(), m = msAtual(); if (!t) return toast('Write a comment.', 'err'); m.comentarios.push({ autor: u().nome, texto: t, em: new Date().toISOString() }); P.guardar(); R(); },
    pedirExt: function (d) { abrePainel('pedirExt', { id: d.v }); },
    pxCriar: function () { var r = P.criarPedidoExterno(msAtual(), val('px-ind'), val('px-ent'), val('px-desc'), val('px-prazo'), u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; toast('Request created.', 'ok'); R(); },
    usarExt: function (d) { var x = S.ext.filter(function (y) { return y.id === d.v; })[0]; res(P.usarExterno(x, u()), 'Value applied to the indicator.'); },
    enviarExt: function (d) { var x = S.ext.filter(function (y) { return y.id === d.v; })[0], fi = document.getElementById('xe-' + d.v), nome = fi && fi.files[0] ? fi.files[0].name : ''; res(P.responderExterno(x, val('xv-' + d.v), nome, u()), 'Value sent.'); },
    reexpressar: function (d) { var r = P.reexpressar(P.msDoIndicador(d.v), d.v, val('rx-val'), val('rx-mot'), u()); res(r, 'Value restated.'); },
    pedidoAud: function (d) { res(P.criarPedidoAuditor(d.v, val('pa-txt'), u()), 'Request sent to the unit.'); },
    novoPedAud: function () { abrePainel('novoPedAud'); },
    naCriar: function () { var r = P.criarPedidoAuditor(val('na-ind'), val('na-txt'), u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; toast('Request sent to the unit.', 'ok'); R(); },
    responderAud: function (d) { var a = S.aud.filter(function (x) { return x.id === d.v; })[0]; res(P.responderAuditor(a, val('ra-' + d.v), u()), 'Answer sent to the auditor.'); },
    resolverAud: function (d) { var a = S.aud.filter(function (x) { return x.id === d.v; })[0]; res(P.resolverAuditor(a, u()), 'Request resolved.'); },
    amostra: function () { res(P.sortearAmostra(u()), 'Sample of 5 indicators selected.'); },
    dataRoom: function () { P.exportarDataRoom(); toast('Data room exported.', 'ok'); },
    audFiltro: function (d) { U.audFiltro = d.v; R(); },
    relExcel: function () { P.exportarRelatorio(); },
    imprimir: function () { window.print(); },
    histJson: function () { P.descarregar('valores-aprovados.json', JSON.stringify(P.valoresAprovados(), null, 2), 'application/json'); },
    docNova: function () { U.docNova = !U.docNova; R(); },
    docGuardar: function () {
      var cons = P.lerNumero(val('nf-consumo')), v = P.lerNumero(val('nf-valor')), iva = P.lerNumero(val('nf-iva'));
      if (!val('nf-fornecedor').trim() || !val('nf-periodo').trim() || !val('nf-instalacao').trim() || cons === null || v === null || iva === null) return toast('Fill in supplier, period, site, consumption, amount and VAT.', 'err');
      S.docs.unshift({ id: 'D' + Date.now(), tipo: val('nf-tipo'), fornecedor: val('nf-fornecedor').trim(), periodo: val('nf-periodo').trim(), instalacao: val('nf-instalacao').trim(), entidade: val('nf-entidade'), consumo: cons, valor_sem_iva: v, iva: iva, percentagem_renovavel: P.lerNumero(val('nf-renov')), centro_custo: val('nf-cc').trim(), leitura_telemetria: P.lerNumero(val('nf-tele')), estado: 'em conferência' });
      U.docNova = false; P.guardar(); toast('Invoice saved for checking.', 'ok'); R();
    },
    distribuir: function (d) { var x = S.docs.filter(function (y) { return y.id === d.v; })[0]; x.estado = 'distribuída'; P.guardar(); toast('Invoice distributed.', 'ok'); R(); },
    boTab: function (d) { if (U.marca) { U.marca = null; U.logoEstado = ''; P.aplicarMarca(); } U.boTab = d.v; R(); },
    abrirCiclo: function () { if (!window.confirm('Open the ' + (S.ciclo.ano + 1) + ' cycle? The current cycle will be closed.')) return; var r = P.abrirCiclo(u()); if (res(r, 'Cycle ' + r.ano + ' opened with ' + r.criadas + ' milestones.')) { U.cal = null; } },
    userNovo: function () { var l = val('nu-login').trim(), n = val('nu-nome').trim(); if (!l || !n) return toast('Enter the name and login.', 'err'); if (P.user(l)) return toast('That login already exists.', 'err'); S.users.push({ login: l, nome: n, perfil: val('nu-perfil'), unidade: val('nu-un') }); P.guardar(); toast('User added.', 'ok'); R(); },
    abrirWf: function () { U.wfDraft = JSON.parse(JSON.stringify(msAtual().passos)); abrePainel('wf', {}); },
    abrirWfBase: function () { U.wfDraft = JSON.parse(JSON.stringify(S.wfbase)); abrePainel('wf', { base: true }); },
    wfAdd: function () { var d = U.wfDraft, pub = -1; d.forEach(function (p, i) { if (p.tipo === 'publicacao') pub = i; }); d.splice(pub > -1 ? pub : d.length, 0, P.passoNovo('parecer')); R(); },
    wfRemover: function (d) { U.wfDraft.splice(+d.v, 1); R(); },
    wfMover: function (d, el) { var i = +d.v, j = i + (+el.getAttribute('data-d')), l = U.wfDraft, t = l[i]; l[i] = l[j]; l[j] = t; R(); },
    wfRepor: function () { U.wfDraft = P.repostoDoBase(msAtual()); R(); },
    wfGuardar: function () {
      if (U.painel.args.base) {
        var ap = document.getElementById('wf-aplica'), r = P.guardarWorkflowBase(U.wfDraft, ap && ap.checked);
        if (r.erro) return toast(r.erro, 'err');
        U.painel = null; toast('Base workflow saved' + (r.aplicadas ? ' and applied to ' + r.aplicadas + ' milestones.' : '.'), 'ok'); return R();
      }
      var q = P.guardarWorkflow(msAtual(), U.wfDraft, u());
      if (q.erro) return toast(q.erro, 'err');
      U.painel = null; toast('Workflow saved.', 'ok'); R();
    },
    janNova: function () { S.janelas.push({ nome: 'Nova janela', tema: 'Governance', meses: [1], dia_inicio: 1, dia_fim: 10 }); P.guardar(); R(); },
    janApagar: function (d) { S.janelas.splice(+d.v, 1); P.guardar(); R(); },
    entNova: function () { res(P.criarEmpresa(val('ent-novo').trim()), 'Company added.'); },
    entApagar: function (d) { res(P.apagarEmpresa(S.ent[+d.v]), 'Company removed.'); },
    depNova: function () { res(P.criarDepartamento(val('dep-novo').trim()), 'Department added.'); },
    depApagar: function (d) { res(P.apagarDepartamento(S.deps[+d.v]), 'Department removed.'); },
    mcPaleta: function (d) { U.marca.cores = JSON.parse(JSON.stringify(P.PALETAS[+d.v].cores)); P.aplicarMarca(Object.assign({}, U.marca)); R(); },
    mcGuardar: function () {
      var r = P.guardarMarca(JSON.parse(JSON.stringify(U.marca)));
      if (r.erro) return toast(r.erro, 'err');
      toast('Brand saved. It now applies across the platform.', 'ok'); R();
    },
    mcExportar: function () { P.descarregar('marca.json', JSON.stringify(S.marca, null, 2), 'application/json'); },
    mcImportar: function () { escolherFicheiro('.json', function (f) { lerJSON(f, function (o) { var e2 = P.validarMarca(o); if (e2) return toast(e2, 'err'); U.marca = { nome: String(o.nome || P.MARCA_BASE.nome), subtitulo: String(o.subtitulo || ''), logotipo: String(o.logotipo || ''), cores: o.cores }; P.aplicarMarca(U.marca); toast('Brand imported. Check it and save.', 'ok'); R(); }); }); },
    mcRepor: function () { U.marca = JSON.parse(JSON.stringify(P.MARCA_BASE)); U.logoEstado = ''; P.aplicarMarca(U.marca); toast('Original values restored. Check them and save.'); R(); },
    dadosExportar: function () { P.descarregar('portal-dados.json', JSON.stringify(P.exportarTudo(), null, 2), 'application/json'); },
    dadosImportar: function () { if (P.online()) return toast('Data lives in the database and is not replaced from a file.', 'err'); escolherFicheiro('.json', function (f) { lerJSON(f, function (o) { var er = P.importarTudo(o); if (er) return toast(er, 'err'); toast('Data imported.', 'ok'); U.marca = null; R(); }); }); },
    dadosRepor: function () { if (P.online()) return toast('Data is not reset from the browser.', 'err'); if (!window.confirm('Reset the data? All changes made in this browser will be lost.')) return; P.reporDemonstracao(); P.aplicarMarca(); U.marca = null; U.imp = {}; toast('Data reset.', 'ok'); R(); }
  };

  /* --- Campos (mudanca) -------------------------------------------------- */
  var mudouMarca = function () { P.aplicarMarca(U.marca); agendar(); };
  var C = {
    valor: function (el) { var m = msAtual(); P.gravarValor(m, el.dataset.id, el.value, u()); },
    just: function (el) { P.item(el.dataset.id, msAtual().ano).justificacao = el.value; P.guardar(); },
    qual: function (el) { var it = P.item(el.dataset.id, msAtual().ano); it.qualidade = el.value; if (el.value !== 'estimado') it.metodo = ''; P.guardar(); },
    metodo: function (el) { P.item(el.dataset.id, msAtual().ano).metodo = el.value; P.guardar(); },
    msDepF: function (el) { U.msFiltro.dep = el.value; },
    msMinhas: function (el) { U.msFiltro.minhas = el.checked; },
    msAtrib: function (el) { var m = el.dataset.id ? P.ms(el.dataset.id) : msAtual(), r = P.atribuir(m, el.value, u()); if (r.erro) toast(r.erro, 'err'); },
    expSel: function (el) { var x = estadoExp(msAtual()); if (el.checked) { if (x.sel.indexOf(el.dataset.id) < 0) x.sel.push(el.dataset.id); } else x.sel = x.sel.filter(function (i) { return i !== el.dataset.id; }); },
    expBusca: function (el) { estadoExp(msAtual()).q = el.value; },
    msEmpresa: function (el) { var m = el.dataset.id ? P.ms(el.dataset.id) : msAtual(); m.empresa = el.value; P.evento(m, 'Company changed to ' + el.value + '.', u().nome); P.guardar(); },
    msTagAdd: function (el) { if (!el.value) return; var m = msAtual(); m.departamentos.push(el.value); P.evento(m, 'Department tag added: ' + el.value + '.', u().nome); P.guardar(); },
    msEstado: function (el) { U.msFiltro.estado = el.value; },
    msEsrs: function (el) { U.msFiltro.esrs = el.checked; },
    consEsrs: function (el) { U.consEsrs = el.checked; },
    histInd: function (el) { U.histInd = el.value; },
    indBusca: function (el) { U.indBusca = el.value; },
    regraBusca: function (el) { U.regraBusca = el.value; },
    evObrig: function (el) { P.cat(el.dataset.id).evidencia_obrigatoria = el.checked; P.guardar(); },
    msPrazo: function (el) { if (el.value) { var m = P.ms(el.dataset.id); m.prazo = el.value; P.evento(m, 'Due date changed to ' + P.fmtData(el.value) + '.', u().nome); P.guardar(); } },
    matAval: function (el) { S.mat.filter(function (x) { return x.norma === el.dataset.id; })[0].avaliacao = el.value; P.guardar(); },
    matJust: function (el) { S.mat.filter(function (x) { return x.norma === el.dataset.id; })[0].justificacao = el.value; P.guardar(); },
    userPerfil: function (el) { P.user(el.dataset.id).perfil = el.value; P.guardar(); },
    userUnidade: function (el) { P.user(el.dataset.id).unidade = el.value; P.guardar(); },
    limiar: function (el) { var n = Number(el.value); if (el.value !== '' && n >= 0) { P.cat(el.dataset.id).limiar_variacao_pct = n; P.guardar(); } },
    janNome: function (el) { S.janelas[+el.dataset.id].nome = el.value; P.guardar(); },
    janTema: function (el) { S.janelas[+el.dataset.id].tema = el.value; P.guardar(); },
    janMeses: function (el) { var l = el.value.split(/[,;\s]+/).map(Number).filter(function (x) { return x >= 1 && x <= 12; }); if (l.length) { S.janelas[+el.dataset.id].meses = l; P.guardar(); } else toast('Enter months from 1 to 12.', 'err'); },
    janIni: function (el) { var n = +el.value; if (n >= 1 && n <= 31) { S.janelas[+el.dataset.id].dia_inicio = n; P.guardar(); } },
    janFim: function (el) { var n = +el.value; if (n >= 1 && n <= 31) { S.janelas[+el.dataset.id].dia_fim = n; P.guardar(); } },
    areaNome: function (el) { S.areas[+el.dataset.id].nome = el.value; P.guardar(); },
    areaUso: function (el) { S.areas[+el.dataset.id].uso = el.value; P.guardar(); },
    entNome: function (el) { var r = P.renomearEmpresa(S.ent[+el.dataset.id], el.value.trim()); if (r.erro) toast(r.erro, 'err'); },
    depNome: function (el) { var r = P.renomearDepartamento(S.deps[+el.dataset.id], el.value.trim()); if (r.erro) toast(r.erro, 'err'); },
    entGrupo: function (el) { S.ent[+el.dataset.id].perimetro_grupo = el.checked; P.guardar(); },
    entMaior: function (el) { S.ent[+el.dataset.id].perimetro_maioritario = el.checked; P.guardar(); },
    wfNome: function (el) { U.wfDraft[+el.dataset.id].nome = el.value; },
    wfResp: function (el) { U.wfDraft[+el.dataset.id].responsavel = el.value; },
    wfTipo: function (el) { var p = U.wfDraft[+el.dataset.id]; p.tipo = el.value; if (el.value !== 'parecer' && p.responsavel.indexOf('area:') === 0) p.responsavel = 'esg'; },
    mcLogo: function (el) {
      var v = el.value.trim();
      if (!P.urlLogoValida(v)) { U.logoEstado = 'The link must start with http:// or https://.'; return; }
      U.marca.logotipo = v; U.logoEstado = v ? 'Loading the image.' : '';
    },
    mcNome: function (el) { U.marca.nome = el.value; },
    mcSub: function (el) { U.marca.subtitulo = el.value; },
    mcCorT: function (el) { if (/^#[0-9a-fA-F]{6}$/.test(el.value)) { U.marca.cores[el.dataset.id] = el.value; P.aplicarMarca(U.marca); } else toast('Use a colour in #RRGGBB format.', 'err'); }
  };
  var Live = {
    mcCor: function (el) { U.marca.cores[el.dataset.id] = el.value; var t = document.getElementById('cor-t-' + el.dataset.id); if (t) t.value = el.value; mudouMarca(); }
  };

  /* Renderiza depois do clique: se o rato estiver em baixo, o botao tem de sobreviver ate ao click */
  var ptr = false, pend = false, tmr = null;
  var agendar = function () {
    if (ptr) { pend = true; return; }
    clearTimeout(tmr);
    tmr = setTimeout(R, 0);
  };
  var fimPtr = function () { ptr = false; if (pend) { pend = false; clearTimeout(tmr); tmr = setTimeout(R, 60); } };

  /* --- Tooltip ----------------------------------------------------------- */
  var tip = null;
  var mostrarTip = function (ev2) {
    var t = ev2.target.closest && ev2.target.closest('[data-tip]');
    if (!t) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'ps-tip'; tip.style.position = 'fixed'; document.body.appendChild(tip); }
    tip.textContent = t.getAttribute('data-tip');
    tip.hidden = false;
    var r = t.getBoundingClientRect();
    tip.style.left = Math.max(70, Math.min(window.innerWidth - 70, r.left + r.width / 2)) + 'px';
    tip.style.top = (t.tagName === 'rect' ? r.top + 24 : r.top - 4) + 'px';
  };

  /* --- Arranque ---------------------------------------------------------- */
  P.iniciar = function () {
    P.carregar();
    P.aplicarMarca();
    if (window.PortalGrelha) window.PortalGrelha.instalar();
    document.addEventListener('click', function (ev2) {
      var t = ev2.target.closest('[data-a]');
      if (U.menu && !ev2.target.closest('[data-menu]') && !(t && /^menu/.test(t.getAttribute('data-a')))) { U.menu = null; R(); }
      if (t) {
        var fn = A[t.getAttribute('data-a')];
        if (t.tagName !== 'A' ) ev2.preventDefault();
        if (fn) fn(t.dataset, t);
      }
    });
    document.addEventListener('change', function (ev2) {
      var t = ev2.target.closest('[data-c]');
      if (t && C[t.getAttribute('data-c')]) { C[t.getAttribute('data-c')](t); agendar(); }
    });
    document.addEventListener('input', function (ev2) {
      var t = ev2.target.closest('[data-i]');
      if (t && Live[t.getAttribute('data-i')]) Live[t.getAttribute('data-i')](t);
    });
    document.addEventListener('pointerdown', function () { ptr = true; }, true);
    document.addEventListener('pointerup', fimPtr, true);
    document.addEventListener('pointercancel', fimPtr, true);
    document.addEventListener('keydown', function (ev2) {
      if (ev2.key === 'Escape') { if (U.painel) fechaPainel(); else if (U.menu) { U.menu = null; R(); } }
    });
    document.addEventListener('mouseover', mostrarTip);
    document.addEventListener('focusin', mostrarTip);
    /* Se o link do logotipo falhar, mostra-se o nome e nunca uma imagem partida */
    document.addEventListener('error', function (ev2) {
      var t = ev2.target;
      if (!t || t.tagName !== 'IMG') return;
      if (t.hasAttribute('data-logo')) {
        var chipLogo = t.closest('.ps-logo-chip');
        if (chipLogo) chipLogo.remove();
        else { var s = document.createElement('span'); s.className = 'ps-marca-mono'; s.setAttribute('aria-hidden', 'true'); s.textContent = sigla(nomeMarca()); t.replaceWith(s); }
      } else if (t.hasAttribute('data-logo-prev')) {
        U.logoEstado = 'The image at this link could not be loaded. Check that the link opens the image directly.';
        var el = document.getElementById('logo-estado'); if (el) el.textContent = U.logoEstado;
        var c = document.querySelector('[data-campo="logo-prev"]'); if (c) c.textContent = 'Image unavailable';
      } else if (t.hasAttribute('data-logo-mini')) { t.remove(); }
    }, true);
    document.addEventListener('load', function (ev2) {
      var t = ev2.target;
      if (t && t.tagName === 'IMG' && t.hasAttribute('data-logo-prev')) {
        U.logoEstado = 'Image loaded. Once saved, this logo appears across the whole platform.';
        var el = document.getElementById('logo-estado'); if (el) el.textContent = U.logoEstado;
      }
    }, true);
    window.addEventListener('hashchange', navegar);
    if (P.online()) return arrancarOnline();
    /* Entrada direta: sem ecra de entrada, abre logo com o perfil indicado. "Trocar de perfil" continua a mostrar a lista. */
    var direto = window.PORTAL_ENTRADA_DIRETA;
    if (direto && !P.sessao() && P.user(direto)) P.entrar(direto);
    navegar();
  };

  /* --- Online: login e dados do Supabase --------------------------------- */
  var arrancarOnline = function () {
    var B = window.PortalBackend;
    var txtPerfis = document.querySelector('.ps-ent-dir > h2');
    if (txtPerfis) txtPerfis.textContent = 'Sign in';
    var notaPerfis = document.querySelector('.ps-ent-dir > p');
    if (notaPerfis) notaPerfis.textContent = 'Use your account details.';
    B.aoFalhar = function (x) {
      toast('Could not save: ' + x.message + ' Showing the data from the database again.', 'err');
      return B.carregar(S).then(function () { P.aplicarMarca(); R(); });
    };
    var aposLogin = function () {
      return B.carregar(S).then(function (login) {
        if (!login) { B.sair(); P.estadoVazio(); throw new Error('This account has no profile yet. Contact the administrator.'); }
        P.entrar(login);
        P.aplicarMarca();
        var usr = P.user(login);
        if ((location.hash || '').replace(/^#\/?/, '')) navegar(); else P.irPara(usr.perfil === 'ext' ? 'Pedidos' : 'Inicio');
      });
    };
    document.addEventListener('submit', function (ev2) {
      if (!ev2.target.matches('[data-login]')) return;
      ev2.preventDefault();
      U.aEntrar = true; U.loginErro = '';
      var email = val('lg-email').trim(), senha = val('lg-senha');
      R();
      B.entrar(email, senha).then(aposLogin).catch(function (x) {
        U.loginErro = x.codigo === 'invalid_credentials' ? 'Incorrect email or password.' : x.message;
      }).then(function () {
        U.aEntrar = false;
        if (!P.sessao()) { R(); var c = document.getElementById('lg-email'); if (c) c.value = email; }
      });
    });
    B.carregarMarca().then(function (mc) { if (mc) { S.marca = mc; P.aplicarMarca(); } if (!B.temSessao()) navegar(); });
    if (B.temSessao()) {
      aposLogin().catch(function (x) { B.sair(); P.sair(); U.loginErro = x.message; navegar(); });
    } else {
      P.sair();
    }
  };
  /* As paginas de controlo (portal-gestao.js) acrescentam-se aqui */
  P.ext = { msAtual: function () { return msAtual(); }, Pn: Pn, abrePainel: function (t, a) { abrePainel(t, a); }, Blocos: Blocos, A: A, C: C, U: U, e: e, svg: svg, I: I, rota: rota, chip: chip, estChip: estChip, cabCartao: cabCartao, vazio: vazio, opt: opt, campo: campo, tabela: tabela, toast: toast, R: R, val: val, res: res, escolherFicheiro: escolherFicheiro, atribHtml: atribHtml, iniciais: iniciais, u: u, fmtV: fmtV, prazoTxt: prazoTxt };
  document.addEventListener('DOMContentLoaded', P.iniciar);
})();
