/* ============================================================================
   portal-paginas.js - desenha as paginas e liga as acoes
   Cada web page tem <section data-pagina="X"> com blocos <div data-bloco="y">.
   Aqui so se preenchem os blocos, por isso funciona igual no mockup (todas as
   paginas no mesmo ficheiro) e no portal (uma pagina por URL).
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S;
  var MODO = window.PORTAL_MODO || 'portal';
  var e = function (v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var U = { rota: { pag: '', arg: '', q: {} }, sep: 'dados', msFiltro: { unidade: '', estado: 'todas', esrs: true }, msVista: 'lista', imp: {}, cal: null, consEsrs: false, histInd: 'A03', audFiltro: 'todas', boTab: 'ciclo', painel: null, menu: null, docNova: false, indBusca: '', marca: null, regraBusca: '', logoEstado: '' };

  /* --- Icones ------------------------------------------------------------ */
  var svg = function (d, t) { return '<svg width="' + (t || 16) + '" height="' + (t || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var I = {
    tick: '<path d="M20 6L9 17l-5-5"/>', doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    tarefa: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>', cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    ativ: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', voltar: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', cima: '<polyline points="18 15 12 9 6 15"/>', baixo: '<polyline points="6 9 12 15 18 9"/>', lixo: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>'
  };

  /* --- Componentes ------------------------------------------------------- */
  var rota = function (r) {
    if (MODO === 'mockup') return '#/' + r;
    var q = r.split('?'), p = q[0].split('/');
    return '/' + p[0].toLowerCase() + '/' + (p[1] || q[1] ? '?' + [p[1] ? 'id=' + p[1] : '', q[1] || ''].filter(Boolean).join('&') : '');
  };
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
    return '<span class="ps-mini-wf" role="img" aria-label="Passo ' + Math.min(m.passo_atual + 1, m.passos.length) + ' de ' + m.passos.length + '">' + m.passos.map(function (p, i) { return '<i class="' + (i < m.passo_atual ? 'ok' : i === m.passo_atual ? 'at' : '') + '" title="' + e(p.nome) + '"></i>'; }).join('') + '</span>';
  };
  var passoTxt = function (m) {
    if (P.concluida(m)) return 'Todos os passos concluídos';
    var p = P.passoAtual(m);
    return p.nome + ' · ' + P.nomeResp(m, p.responsavel);
  };
  var prazoTxt = function (m) {
    if (P.concluida(m)) return P.fmtData(m.prazo);
    var d = P.diasAte(m.prazo);
    return P.fmtData(m.prazo) + (d < 0 ? ' · há ' + Math.abs(d) + ' dias' : d === 0 ? ' · hoje' : ' · em ' + d + ' dias');
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
  var monograma = function () { return '<span class="ps-marca-mono" aria-hidden="true">' + e(iniciais(nomeMarca()).toUpperCase()) + '</span>'; };
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
    var base = ['Inicio', 'Pendentes', 'Milestones', 'Milestone', 'Consolidado', 'Documentos', 'Relatorio', 'Historico', 'Auditoria'];
    if (P.gereTudo(usr)) base.push('Backoffice');
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
        menu.innerHTML = '<div class="ps-menu-head"><b>Notificações</b>' + notifs.length + ' em aberto</div><div class="ps-menu-sec">' + (notifs.length ? notifs.map(function (n) {
          return '<a class="ps-menu-it" href="' + rota(n.rota) + '" data-a="fecharMenu"><i class="ps-menu-dot ' + e(n.cls) + '"></i><span>' + e(n.texto) + '<small>' + e(n.sub) + '</small></span></a>';
        }).join('') : vazio('Sem notificações.')) + '</div>';
      } else if (U.menu === 'conta') {
        menu.innerHTML = '<div class="ps-menu-head"><b>' + e(usr.nome) + '</b>' + e(P.PERFIS[usr.perfil]) + (usr.unidade ? ' · ' + e(usr.unidade) : '') + '</div><div class="ps-menu-sec"><button class="ps-menu-it" type="button" data-a="sair">' + (P.online() ? 'Terminar sessão' : 'Trocar de perfil') + '</button></div>';
      }
    }
  };

  /* --- Entrada ----------------------------------------------------------- */
  var Blocos = {};
  Blocos['entrada-perfis'] = function () {
    if (P.online()) {
      return '<form class="ps-login" data-login>' +
        campo('lg-email', 'Email', '<input id="lg-email" class="ps-in" type="email" autocomplete="username" required>') +
        campo('lg-senha', 'Palavra-passe', '<input id="lg-senha" class="ps-in" type="password" autocomplete="current-password" required>') +
        (U.loginErro ? '<div class="ps-aviso err" role="alert">' + e(U.loginErro) + '</div>' : '') +
        '<button type="submit" class="ps-btn pri"' + (U.aEntrar ? ' disabled' : '') + '>' + (U.aEntrar ? 'A entrar' : 'Entrar') + '</button></form>';
    }
    var grupos = [['Administração', 'admin'], ['Sustentabilidade', 'esg'], ['Responsáveis pelos dados', 'resp'], ['Auditoria', 'auditor'], ['Entidades externas', 'ext']];
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
    return '<li><a class="ps-row" href="' + rota('Milestone/' + m.id) + '"><span class="ps-row-ico ' + ico + '">' + svg(I.doc, 18) + '</span><span class="ps-row-txt"><b>' + e(m.nome) + '</b><span>' + e(passoTxt(m)) + ' · prazo ' + e(prazoTxt(m)) + '</span></span>' + estChip(m) + (cta ? '<span class="ps-row-cta">' + e(cta) + '</span>' : '') + '</a></li>';
  };
  var ctaPasso = function (m) { var p = P.passoAtual(m); return !p ? '' : p.tipo === 'recolha' ? 'Preencher' : p.tipo === 'parecer' ? 'Dar parecer' : p.tipo === 'aprovacao' ? 'Aprovar' : 'Rever'; };
  var pintarHero = function () {
    var usr = u(), n = contagens(usr), set = function (k, v) { var el = document.querySelector('[data-campo="' + k + '"]'); if (el) el.textContent = v; };
    var h = new Date().getHours();
    set('hero-ciclo', 'Ciclo de reporting ' + S.ciclo.ano);
    set('hero-data', new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Lisbon' }).format(new Date()));
    set('hero-ola', (h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite') + ', ' + usr.nome);
    set('hero-frase', n.pend ? 'Tem ' + n.pend + (n.pend === 1 ? ' milestone à sua espera.' : ' milestones à sua espera.') : 'Não tem milestones à sua espera neste momento.');
    set('kpi-pend', n.pend); set('kpi-atraso', n.atraso); set('kpi-rev', n.rev); set('kpi-conc', n.conc);
    document.querySelectorAll('[data-kpi-rota]').forEach(function (a) { a.setAttribute('href', rota(a.getAttribute('data-kpi-rota'))); });
  };
  Blocos['inicio-pendentes'] = function () {
    var l = pendentesDe(u()), mostrar = l.slice(0, 5);
    return '<div class="ps-dock">' + cabCartao('Milestones pendentes consigo', 'tarefa', '<a class="ps-btn liga" href="' + rota('Pendentes') + '">Ver todas (' + l.length + ')</a>') +
      (mostrar.length ? '<ul class="ps-list">' + mostrar.map(function (m) { return linhaMs(m, ctaPasso(m)); }).join('') + '</ul>' : vazio('Nada à sua espera.')) + '</div>';
  };
  Blocos['inicio-entregas'] = function () {
    var usr = u(), cols = [['Em atraso', [], 'atraso'], ['Próximos 7 dias', [], ''], ['8 a 21 dias', [], ''], ['Mais tarde', [], '']];
    P.msCiclo().forEach(function (m) {
      var p = P.passoAtual(m);
      if (!p || p.tipo !== 'recolha') return;
      var d = P.diasAte(m.prazo);
      cols[d < 0 ? 0 : d <= 7 ? 1 : d <= 21 ? 2 : 3][1].push(m);
    });
    return '<div class="ps-card">' + cabCartao('Próximas entregas', 'cal') + '<div class="ps-tl">' + cols.map(function (c) {
      c[1].sort(function (a, b) { return a.prazo < b.prazo ? -1 : 1; });
      return '<div class="ps-tl-col ' + c[2] + '"><h4>' + e(c[0]) + ' <span class="ps-n">' + c[1].length + '</span></h4>' + (c[1].length ? c[1].slice(0, 6).map(function (m) {
        return '<a class="ps-tl-it" href="' + rota('Milestone/' + m.id) + '"><b>' + e(m.nome) + '</b><small>' + e(P.fmtData(m.prazo)) + '</small>' + (P.podeAgir(m, usr) ? '<span class="ps-tl-tag">consigo</span>' : '') + '</a>';
      }).join('') + (c[1].length > 6 ? '<a class="ps-btn liga" href="' + rota('Milestones') + '">Mais ' + (c[1].length - 6) + '</a>' : '') : '<div class="ps-mut ps-small">Nada aqui.</div>') + '</div>';
    }).join('') + '</div></div>';
  };
  var classeCal = function (m) { var c = P.estadoMs(m).cod; return c === 'concluida' ? 'ok' : (c === 'atraso' || c === 'devolvida') ? 'err' : (c === 'revisao' || c === 'parecer' || c === 'aprovacao') ? 'rev' : ''; };
  var janelasDoDia = function (a, me, d) { return S.janelas.filter(function (j) { return j.meses.indexOf(me + 1) > -1 && d >= j.dia_inicio && d <= j.dia_fim; }); };
  Blocos['inicio-calendario'] = function () {
    var hoje = new Date();
    if (!U.cal) U.cal = { ano: hoje.getFullYear(), mes: hoje.getMonth(), dia: hoje.getDate() };
    var a = U.cal.ano, me = U.cal.mes, prim = new Date(a, me, 1), n = new Date(a, me + 1, 0).getDate(), desloc = (prim.getDay() + 6) % 7, iso = function (d) { return a + '-' + String(me + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
    var porDia = {};
    P.msCiclo().forEach(function (m) { (porDia[m.prazo] = porDia[m.prazo] || []).push(m); });
    var cel = '';
    ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].forEach(function (x) { cel += '<div class="ps-cal-sem" aria-hidden="true">' + x + '</div>'; });
    for (var i = 0; i < desloc; i++) cel += '<div></div>';
    for (var d = 1; d <= n; d++) {
      var ms = porDia[iso(d)] || [], cl = ['ps-cal-d'];
      if (janelasDoDia(a, me, d).length) cl.push('jan');
      if (iso(d) === P.hojeISO()) cl.push('hoje');
      if (d === U.cal.dia) cl.push('sel');
      cel += '<button type="button" id="cal-' + d + '" class="' + cl.join(' ') + '" data-a="calDia" data-v="' + d + '" aria-label="' + d + ', ' + ms.length + ' prazos"' + (d === U.cal.dia ? ' aria-pressed="true"' : '') + '>' + d + (ms.length ? '<span class="pts">' + ms.slice(0, 3).map(function (m) { return '<i class="' + classeCal(m) + '"></i>'; }).join('') + '</span>' : '') + '</button>';
    }
    var ds = U.cal.dia, msDia = porDia[iso(ds)] || [], jan = janelasDoDia(a, me, ds);
    var nomeMes = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(prim);
    var atrasadas = P.msCiclo().filter(function (m) { return P.estadoMs(m).cod === 'atraso'; });
    return '<aside class="ps-cal ps-fundo-marca" aria-label="Calendário"><div class="ps-cal-h"><h2>Calendário</h2><div class="ps-cal-nav"><button type="button" data-a="calMes" data-v="-1" aria-label="Mês anterior">‹</button><button type="button" data-a="calHoje">Hoje</button><button type="button" data-a="calMes" data-v="1" aria-label="Mês seguinte">›</button></div></div>' +
      '<div class="ps-cal-mes">' + e(nomeMes) + '</div><div class="ps-cal-g">' + cel + '</div>' +
      '<div class="ps-cal-leg"><span><i></i>Em recolha</span><span><i class="err"></i>Atraso ou devolvida</span><span><i class="rev"></i>Em revisão</span><span><i class="ok"></i>Concluída</span></div>' +
      '<div class="ps-cal-det"><h3>' + ds + ' de ' + e(new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(prim)) + '</h3>' +
      (jan.length ? jan.map(function (j) { return '<div class="ps-cal-jan" style="--c:' + e(P.TEMAS[j.tema] || '#888') + '"><i></i>' + e(j.nome) + '</div>'; }).join('') : '') +
      (msDia.length ? msDia.map(function (m) { return '<a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a>'; }).join('') : '<div class="ps-mut">Sem milestones com prazo neste dia.</div>') +
      (P.gereTudo(u()) && atrasadas.length ? '<button type="button" class="ps-btn peq ps-mt" data-a="lembrete">Enviar lembrete às ' + atrasadas.length + ' em atraso</button>' : '') + '</div></aside>';
  };

  /* --- Pendentes --------------------------------------------------------- */
  Blocos['pendentes'] = function () {
    var usr = u(), grupo = function (t, l, cta, ico) { return '<div class="ps-card ps-mt">' + cabCartao(t + ' (' + l.length + ')', ico) + (l.length ? '<ul class="ps-list">' + l.map(function (m) { return linhaMs(m, cta ? ctaPasso(m) : ''); }).join('') + '</ul>' : vazio('Nada aqui.')) + '</div>'; };
    var mine = pendentesDe(usr);
    if (usr.perfil === 'resp') {
      return grupo('Para preencher e submeter', mine.filter(function (m) { return P.passoAtual(m).tipo === 'recolha'; }), true, 'tarefa') +
        grupo('Para dar parecer', mine.filter(function (m) { return P.passoAtual(m).tipo === 'parecer'; }), true, 'ativ') +
        grupo('Para acompanhar', P.msCiclo().filter(function (m) { return m.unidade === usr.unidade && !P.concluida(m) && !P.podeAgir(m, usr); }), false, 'doc');
    }
    if (usr.perfil === 'auditor') return grupo('Milestones concluídas para auditar', P.msCiclo().filter(P.concluida), false, 'doc');
    return grupo('Para rever e aprovar', mine.filter(function (m) { return P.passoAtual(m).tipo !== 'recolha' || usr.perfil !== 'esg'; }), true, 'tarefa');
  };

  /* --- Milestones -------------------------------------------------------- */
  Blocos['milestones'] = function () {
    var f = U.msFiltro;
    var lista = P.msCiclo().filter(function (m) {
      var c = P.estadoMs(m).cod;
      if (f.unidade && m.unidade !== f.unidade) return false;
      if (f.estado === 'curso' && c === 'concluida') return false;
      if (f.estado === 'atraso' && c !== 'atraso') return false;
      if (f.estado === 'concluidas' && c !== 'concluida') return false;
      if (!f.esrs && m.periodicidade === 'Novos dados ESRS') return false;
      return true;
    });
    var filtros = '<div class="ps-filtros">' + campo('f-un', 'Unidade de negócio', '<select id="f-un" class="ps-sel" data-c="msUnidade">' + opt('', 'Todas', f.unidade) + P.UNIDADES.map(function (x) { return opt(x, x, f.unidade); }).join('') + '</select>') +
      campo('f-es', 'Estado', '<select id="f-es" class="ps-sel" data-c="msEstado">' + opt('todas', 'Todas', f.estado) + opt('curso', 'Em curso', f.estado) + opt('atraso', 'Em atraso', f.estado) + opt('concluidas', 'Concluídas', f.estado) + '</select>') +
      '<label class="ps-chk"><input id="f-esrs" type="checkbox" data-c="msEsrs"' + (f.esrs ? ' checked' : '') + '> Incluir caminho ESRS</label>' +
      '<div class="ps-seg" role="group" aria-label="Vista"><button type="button" class="' + (U.msVista === 'lista' ? 'on' : '') + '" data-a="msVista" data-v="lista">Lista</button><button type="button" class="' + (U.msVista === 'board' ? 'on' : '') + '" data-a="msVista" data-v="board">Board</button></div></div>';
    if (!lista.length) return filtros + '<div class="ps-card">' + vazio('Nenhuma milestone com estes filtros.') + '</div>';
    if (U.msVista === 'board') {
      var cols = [['Recolha', ['recolha', 'atraso', 'devolvida']], ['Revisão e parecer', ['revisao', 'parecer']], ['Aprovação', ['aprovacao']], ['Concluídas', ['concluida']]];
      return filtros + '<div class="ps-board">' + cols.map(function (c) {
        var it = lista.filter(function (m) { return c[1].indexOf(P.estadoMs(m).cod) > -1; });
        return '<div class="ps-board-col"><h3>' + e(c[0]) + '<span class="ps-n">' + it.length + '</span></h3>' + it.map(function (m) {
          return '<a class="ps-board-it" href="' + rota('Milestone/' + m.id) + '"><b>' + e(m.nome) + '</b>' + miniWf(m) + '<div class="ps-sp-b ps-mt">' + estChip(m) + '<span class="ps-mut ps-small">' + e(P.fmtData(m.prazo)) + '</span></div></a>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
    var grupos = P.UNIDADES.filter(function (x) { return lista.some(function (m) { return m.unidade === x; }); });
    return filtros + '<div class="ps-card"><div class="ps-card-body">' + grupos.map(function (g) {
      return '<h2 class="ps-grupo-t">' + e(g) + '</h2>' + tabela(
        [{ t: 'Milestone' }, { t: 'Passo atual e responsável' }, { t: 'Workflow' }, { t: 'Prazo' }, { t: 'Estado' }],
        lista.filter(function (m) { return m.unidade === g; }).map(function (m) {
          return [ '<a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a>', e(passoTxt(m)), miniWf(m), '<span class="ps-nowrap">' + e(prazoTxt(m)) + '</span>', estChip(m) ];
        }));
    }).join('') + '</div></div>';
  };

  /* --- Milestone --------------------------------------------------------- */
  var msAtual = function () { return P.ms(U.rota.arg); };
  var preenchidos = function (m) { return m.indicadores.filter(function (id) { return P.item(id, m.ano).valor !== null; }).length; };
  var usados = function (m) { var o = {}; m.indicadores.forEach(function (id) { P.cat(id).utilizado_por.forEach(function (x) { o[x] = 1; }); }); return Object.keys(o); };
  Blocos['milestone-cabecalho'] = function () {
    var m = msAtual(), d = P.diasAte(m.prazo);
    var ext = S.ext.filter(function (x) { return x.milestone_id === m.id; }).length;
    return '<nav class="ps-mig" aria-label="Caminho"><a href="' + rota('Inicio') + '">Início</a><span>/</span><a href="' + rota('Milestones') + '">Milestones</a><span>/</span><span>' + e(m.unidade) + '</span><span>/</span><b>' + e(m.nome) + '</b></nav>' +
      '<div class="ps-ban"><div class="ps-ban-top"><div><div class="ps-ban-tags"><span class="ps-ban-tag">' + e(m.ano) + '</span><span class="ps-ban-tag">' + e(m.periodicidade) + '</span>' + (m.periodicidade === 'Novos dados ESRS' ? '<span class="ps-ban-tag">Caminho ESRS</span>' : '') + (m.workflow_ajustado ? '<span class="ps-ban-tag">Workflow ajustado</span>' : '') + '</div>' +
      '<h1>' + e(m.nome) + '</h1><div class="ps-ban-sub">Ano de reporting ' + e(m.ano) + ' · ' + e(m.unidade) + ' · utilizadores do dado: ' + e(usados(m).join(', ')) + '</div></div>' +
      '<div class="ps-ban-dir"><div class="ps-ban-pill"><small>Prazo</small>' + e(P.fmtDataAno(m.prazo)) + '</div>' + estChip(m) + '<button type="button" class="ps-btn" data-a="abrirTecnica">Visão técnica</button></div></div>' +
      '<div class="ps-ban-stats"><div class="ps-ban-stat"><b>' + preenchidos(m) + '/' + m.indicadores.length + '</b><span>Indicadores preenchidos</span></div><div class="ps-ban-stat"><b>' + m.indicadores.filter(function (id) { return P.item(id, m.ano).evidencias.length; }).length + '</b><span>Com evidência</span></div><div class="ps-ban-stat"><b>' + ext + '</b><span>Pedidos externos</span></div><div class="ps-ban-stat"><b>' + (P.concluida(m) ? '-' : d + 'd') + '</b><span>Até ao prazo</span></div></div></div>';
  };
  Blocos['milestone-workflow'] = function () {
    var m = msAtual(), feitos = Math.min(m.passo_atual, m.passos.length), pct = Math.round((feitos / m.passos.length) * 100);
    return '<div class="ps-card ps-mt">' + cabCartao('Workflow da milestone', 'ativ', '<div class="ps-sp"><div class="ps-leg"><span><i class="ok"></i>Concluído</span><span><i class="at"></i>Atual</span><span><i></i>Por fazer</span></div>' + (P.podeAlterarWorkflow(m, u()) ? '<button type="button" class="ps-btn peq" data-a="abrirWf">Alterar workflow</button>' : '') + '</div>') +
      '<div class="ps-wf-barra ps-mt" role="img" aria-label="' + pct + '% dos passos concluídos"><i style="width:' + pct + '%"></i></div><div class="ps-wf">' + m.passos.map(function (p, i) {
        var c = i < m.passo_atual ? 'ok' : i === m.passo_atual ? (m.devolvida ? 'at dev' : 'at') : '';
        return '<div class="ps-wf-p ' + c + '"' + (i === m.passo_atual ? ' aria-current="step"' : '') + '><div class="ps-wf-n">' + e(p.nome) + '</div><div class="ps-wf-c">' + (i < m.passo_atual ? svg(I.tick, 18) : m.devolvida && i === m.passo_atual ? svg(I.voltar, 18) : i + 1) + '</div><div class="ps-wf-r">' + (p.concluido_em ? '<b>' + e(P.fmtData(p.concluido_em)) + '</b><br>' + e(p.concluido_por) : i === m.passo_atual ? '<b>Atual</b><br>' + e(P.nomeResp(m, p.responsavel)) : e(P.nomeResp(m, p.responsavel))) + '</div></div>';
      }).join('') + '</div></div>';
  };
  Blocos['milestone-corpo'] = function () {
    var m = msAtual(), usr = u(), decide = P.podeAgir(m, usr) && P.passoAtual(m).tipo !== 'recolha';
    var nAud = S.aud.filter(function (a) { var x = P.msDoIndicador(a.indicador_id, m.ano); return x && x.id === m.id && a.estado !== 'resolvido'; }).length;
    var nExt = S.ext.filter(function (x) { return x.milestone_id === m.id && x.estado !== 'aplicado'; }).length;
    var seps = [['dados', decide ? 'Revisão' : 'Dados', 0], ['evidencias', 'Evidências e qualidade', 0], ['externos', 'Contributos externos', nExt], ['auditoria', 'Auditoria', nAud], ['conversa', 'Conversa e histórico', m.comentarios.length]];
    var html = U.sep === 'evidencias' ? sepEvidencias(m) : U.sep === 'externos' ? sepExternos(m) : U.sep === 'auditoria' ? sepAuditoria(m) : U.sep === 'conversa' ? sepConversa(m) : decide ? sepRevisao(m) : P.podePreencher(m, usr) ? sepRecolha(m) : sepLeitura(m);
    return '<div class="ps-seps" role="tablist">' + seps.map(function (s) { return '<button type="button" role="tab" aria-selected="' + (U.sep === s[0]) + '" class="ps-sep ' + (U.sep === s[0] ? 'on' : '') + '" data-a="sep" data-v="' + s[0] + '">' + e(s[1]) + (s[2] ? '<span class="n">' + s[2] + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="ps-grid-side"><div class="ps-col">' + html + '</div><div class="ps-col"><div class="ps-card">' + cabCartao('Detalhes') + '<div class="ps-card-body"><dl class="ps-det"><dt>Unidade</dt><dd>' + e(m.unidade) + '</dd><dt>Passo atual</dt><dd>' + e(P.concluida(m) ? 'Concluída' : P.passoAtual(m).nome) + '</dd><dt>Responsável</dt><dd>' + e(P.concluida(m) ? '-' : P.nomeResp(m, P.passoAtual(m).responsavel)) + '</dd><dt>Prazo</dt><dd>' + e(prazoTxt(m)) + '</dd><dt>Indicadores</dt><dd>' + m.indicadores.length + '</dd></dl></div></div></div></div>';
  };
  var celValor = function (m, id) { var it = P.item(id, m.ano); return it.valor === null ? '-' : fmtV(id, it.valor); };
  var linkFicha = function (id, txt) { return '<button type="button" class="ps-btn liga" data-a="ficha" data-v="' + e(id) + '">' + e(txt || P.cat(id).nome) + '</button>'; };
  var marcaAmostra = function (id) { return S.amostra.indexOf(id) > -1 ? ' ' + chip('Amostra', 'rev') : ''; };

  var sepRecolha = function (m) {
    var usr = u(), rel = U.imp[m.id], feitos = preenchidos(m);
    var linhas = m.indicadores.map(function (id) {
      var c = P.cat(id), it = P.item(id, m.ano), v = P.validarItem(it), ant = P.valorAnterior(id, m.ano);
      var txtBruto = it.rascunho || (it.valor === null ? '' : String(it.valor).replace('.', ','));
      var cls = v.erros.length ? 'erro' : v.alertas.length ? 'alerta' : '';
      var res = v.erros.length ? chip('Erro', 'err') : v.alertas.length ? chip(v.alertas.length + ' alerta(s)', 'warn') : it.valor !== null ? chip('Válido', 'ok') : chip('Por preencher');
      var recebido = S.ext.filter(function (x) { return x.indicador_id === id && x.milestone_id === m.id && x.estado === 'recebido'; })[0];
      return '<div class="ps-ind" id="ind-' + e(id) + '"><div class="ps-ind-top"><div class="ps-ind-nome"><button type="button" data-a="ficha" data-v="' + e(id) + '">' + e(c.nome) + '</button><small>' + e(c.unidade_medida) + ' · ' + (c.tipo === 'derivado' ? 'Derivado' : 'Dado base') + ' · ' + e(c.perimetro) + '</small></div>' +
        '<div><span class="ps-ind-k">' + (m.ano - 1) + '</span><span class="ps-num">' + (ant === null || ant === undefined ? '-' : fmtV(id, ant)) + '</span></div>' +
        '<div class="ps-ind-campo"><label class="ps-ind-k" for="v-' + e(id) + '">Valor ' + e(m.ano) + '</label><input id="v-' + e(id) + '" class="ps-in ps-num ' + cls + '" inputmode="decimal" autocomplete="off" value="' + e(txtBruto) + '" data-c="valor" data-id="' + e(id) + '"' + (v.erros.length ? ' aria-invalid="true" aria-describedby="err-' + e(id) + '"' : '') + '></div>' +
        '<div><span class="ps-ind-k">Variação</span><span class="ps-num">' + (v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%') + '</span></div><div>' + res + '</div></div>' +
        (v.erros.length ? '<div id="err-' + e(id) + '" class="ps-ind-msg ps-mt" role="alert">' + e(v.erros[0]) + '</div>' : '') +
        (v.alertas.length ? '<div class="ps-ind-just"><ul>' + v.alertas.map(function (a) { return '<li>' + e(a) + '</li>'; }).join('') + '</ul><label class="ps-lab" for="j-' + e(id) + '">Justificação (obrigatória)</label><textarea id="j-' + e(id) + '" class="ps-ta" data-c="just" data-id="' + e(id) + '">' + e(it.justificacao) + '</textarea></div>' : '') +
        '<div class="ps-ind-sub">' + campo('q-' + id, 'Qualidade do dado', '<select id="q-' + e(id) + '" class="ps-sel" data-c="qual" data-id="' + e(id) + '">' + opt('medido', 'Medido', it.qualidade) + opt('calculado', 'Calculado', it.qualidade) + opt('estimado', 'Estimado', it.qualidade) + '</select>') +
        (it.qualidade === 'estimado' ? campo('m-' + id, 'Método de estimativa (obrigatório)', '<input id="m-' + e(id) + '" class="ps-in" value="' + e(it.metodo) + '" data-c="metodo" data-id="' + e(id) + '">') : '') +
        '<div class="ps-sp"><button type="button" id="e-' + e(id) + '" class="ps-btn peq" data-a="anexar" data-v="' + e(id) + '">Anexar evidência</button>' + (c.evidencia_obrigatoria ? (it.evidencias.length ? chip('Evidência anexada', 'ok') : chip('Evidência obrigatória', 'warn')) : (it.evidencias.length ? chip(it.evidencias.length + ' evidência(s)', 'ok') : '')) + '<button type="button" class="ps-btn peq" data-a="pedirExt" data-v="' + e(id) + '">Pedir a entidade externa</button></div></div>' +
        (recebido ? '<div class="ps-aviso ok ps-mt">' + e(recebido.entidade_externa) + ' enviou ' + e(fmtV(id, recebido.valor)) + ' ' + e(c.unidade_medida) + '. <button type="button" class="ps-btn peq" data-a="usarExt" data-v="' + e(recebido.id) + '">Usar este valor</button></div>' : '') + '</div>';
    }).join('');
    return '<div class="ps-card">' + cabCartao('Importar ficheiro', 'doc', '<button type="button" class="ps-btn peq" data-a="abrirTecnica" data-v="schema">Ver schema</button>') +
      '<div class="ps-drop"><button type="button" class="ps-btn pri" data-a="importar">Importar ficheiro</button><button type="button" class="ps-btn" data-a="tplExcel">Template Excel</button><button type="button" class="ps-btn" data-a="tplCsv">Template CSV</button><button type="button" class="ps-btn" data-a="impExemplo">Testar com ficheiro de exemplo</button><span class="ps-mut ps-small">Excel (.xlsx), CSV ou JSON</span></div>' +
      (rel ? relatorioImport(m, rel) : '') + '</div>' +
      '<div class="ps-card ps-com-acao">' + cabCartao('Entrada e validação', 'tarefa', '<span class="ps-mut ps-small">Guarda ao sair de cada campo</span>') + linhas +
      '<div class="ps-sticky"><span class="ps-small ps-mut" aria-live="polite">' + feitos + ' de ' + m.indicadores.length + ' indicadores com valor</span><button type="button" id="btn-submeter" class="ps-btn pri" data-a="submeter">Submeter milestone</button></div></div>';
  };
  var relatorioImport = function (m, rel) {
    if (rel.erro || rel.erroFormato) return '<div class="ps-card-body"><div class="ps-aviso err" role="alert">' + e(rel.erro || rel.erroFormato) + '</div></div>';
    var usadas = rel.linhas.filter(function (l) { return l.estado !== 'vazia'; });
    var nv = usadas.filter(function (l) { return l.estado === 'valida'; }).length, na = usadas.filter(function (l) { return l.estado === 'alerta'; }).length, nr = usadas.filter(function (l) { return l.estado === 'rejeitada'; }).length;
    return '<div class="ps-card-body"><div class="ps-sp-b"><b>Resultado de ' + e(rel.nome) + '</b>' + (nv + na ? '<button type="button" class="ps-btn pri" data-a="impAplicar">Aplicar ' + (nv + na) + ' linhas válidas</button>' : '') + '</div>' +
      '<div class="ps-res-tot">' + chip(nv + ' válidas', 'ok') + chip(na + ' com alertas', 'warn') + chip(nr + ' com erros', 'err') + chip(rel.emFalta.length + ' em falta no ficheiro') + '</div>' +
      (rel.desconhecidas.length ? '<div class="ps-aviso warn">Colunas desconhecidas, ignoradas: ' + e(rel.desconhecidas.join(', ')) + '</div>' : '') +
      tabela([{ t: 'Linha' }, { t: 'Indicador' }, { t: 'Valor' }, { t: 'Resultado' }, { t: 'Motivo' }], usadas.map(function (l) {
        return ['Linha ' + l.n, e(l.indicador), e(l.valor), l.estado === 'valida' ? chip('Válida', 'ok') : l.estado === 'alerta' ? chip('Com alerta', 'warn') : chip('Rejeitada', 'err'), e(l.motivos.join(' '))];
      })) + '</div>';
  };
  var sepRevisao = function (m) {
    var p = P.passoAtual(m), rot = p.tipo === 'parecer' ? 'Dar parecer favorável' : p.tipo === 'aprovacao' ? 'Aprovar e bloquear' : 'Concluir revisão';
    return '<div class="ps-card ps-com-acao">' + cabCartao(p.nome, 'tarefa') + '<div class="ps-card-body">' + tabela([{ t: 'Indicador' }, { t: 'Valor', dir: 1 }, { t: String(m.ano - 1), dir: 1 }, { t: 'Variação', dir: 1 }, { t: 'Alertas e justificação' }, { t: 'Qualidade' }], m.indicadores.map(function (id) {
      var it = P.item(id, m.ano), v = P.validarItem(it), ant = P.valorAnterior(id, m.ano);
      return [linkFicha(id), celValor(m, id) + ' ' + e(P.cat(id).unidade_medida), ant === null || ant === undefined ? '-' : fmtV(id, ant), v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%', v.alertas.length ? '<span class="ps-small">' + e(v.alertas.join(' ')) + '<br><b>Justificação:</b> ' + e(it.justificacao || '-') + '</span>' : chip('Sem alertas', 'ok'), e(P.QUALIDADE_TXT[it.qualidade])];
    })) + '<div class="ps-mt">' + campo('rev-com', 'Comentário (obrigatório para devolver)', '<textarea id="rev-com" class="ps-ta"></textarea>') + '</div></div><div class="ps-sticky"><button type="button" class="ps-btn err" data-a="devolver">Devolver à unidade</button><button type="button" class="ps-btn pri" data-a="concluirPasso">' + e(rot) + '</button></div></div>';
  };
  var sepLeitura = function (m) {
    var msg = P.concluida(m) ? 'Milestone concluída. Os valores aprovados só mudam por reexpressão.' : 'O passo atual está com ' + P.nomeResp(m, P.passoAtual(m).responsavel) + '. Pode consultar os valores.';
    return '<div class="ps-card">' + cabCartao('Dados', 'doc') + '<div class="ps-card-body"><div class="ps-aviso">' + e(msg) + '</div>' + tabela([{ t: 'Indicador' }, { t: 'Valor', dir: 1 }, { t: String(m.ano - 1), dir: 1 }, { t: 'Estado' }, { t: 'Qualidade' }], m.indicadores.map(function (id) {
      var est = P.estadoIndicador(m, id), it = P.item(id, m.ano), ant = P.valorAnterior(id, m.ano);
      return [linkFicha(id) + marcaAmostra(id) + (it.reexpresso ? ' ' + chip('Reexpresso', 'warn') : ''), celValor(m, id) + ' ' + e(P.cat(id).unidade_medida), ant === null || ant === undefined ? '-' : fmtV(id, ant), chip(est.txt, est.cls), e(P.QUALIDADE_TXT[it.qualidade])];
    })) + '</div></div>';
  };
  var sepEvidencias = function (m) {
    var obrig = m.indicadores.filter(function (id) { return P.cat(id).evidencia_obrigatoria; }), comEv = obrig.filter(function (id) { return P.item(id, m.ano).evidencias.length; }).length, usr = u();
    return '<div class="ps-card">' + cabCartao('Evidências e qualidade', 'doc', chip(comEv + ' de ' + obrig.length + ' evidências obrigatórias anexadas', comEv === obrig.length ? 'ok' : 'warn')) + '<div class="ps-card-body">' +
      tabela([{ t: 'Indicador' }, { t: 'Qualidade' }, { t: 'Método' }, { t: 'Evidências' }], m.indicadores.map(function (id) {
        var it = P.item(id, m.ano), c = P.cat(id);
        return [linkFicha(id), e(P.QUALIDADE_TXT[it.qualidade]), e(it.metodo || '-'), (it.evidencias.length ? it.evidencias.map(function (x) { return e(x.ficheiro); }).join(', ') : c.evidencia_obrigatoria ? chip('Obrigatória em falta', 'warn') : '-')];
      })) + '<h3 class="ps-grupo-t">Documentos gerais da milestone</h3>' + (m.documentos_gerais.length ? '<ul class="ps-list">' + m.documentos_gerais.map(function (d) { return '<li class="ps-row"><span class="ps-row-ico">' + svg(I.doc, 18) + '</span><span class="ps-row-txt"><b>' + e(d.ficheiro) + '</b><span>' + e(d.por) + ' · ' + e(P.fmtDataHora(d.em)) + '</span></span></li>'; }).join('') + '</ul>' : '<p class="ps-mut ps-small">Ainda não há documentos gerais.</p>') +
      (P.acompanha(m, usr) ? '<button type="button" class="ps-btn ps-mt" data-a="anexarGeral">Anexar documento geral</button>' : '') + '</div></div>';
  };
  var sepExternos = function (m) {
    var usr = u(), l = S.ext.filter(function (x) { return x.milestone_id === m.id; });
    var pode = P.acompanha(m, usr) && !P.concluida(m);
    var EST = { pendente: ['Pendente', 'warn'], recebido: ['Recebido', 'info'], aplicado: ['Aplicado', 'ok'] };
    return '<div class="ps-card">' + cabCartao('Contributos externos', 'doc', pode ? '<button type="button" class="ps-btn peq" data-a="pedirExt">Novo pedido</button>' : '') + '<div class="ps-card-body">' + tabela([{ t: 'Indicador' }, { t: 'Entidade' }, { t: 'Pedido' }, { t: 'Prazo' }, { t: 'Valor' }, { t: 'Estado' }], l.map(function (x) {
      var acao = x.estado === 'recebido' && P.podePreencher(m, usr) ? ' <button type="button" class="ps-btn peq" data-a="usarExt" data-v="' + e(x.id) + '">Usar este valor</button>' : '';
      return [e(P.cat(x.indicador_id).nome), e(x.entidade_externa), e(x.descricao), e(P.fmtData(x.prazo)), x.valor === null ? '-' : e(fmtV(x.indicador_id, x.valor)), chip(EST[x.estado][0], EST[x.estado][1]) + acao];
    }), 'Ainda não há pedidos a entidades externas nesta milestone.') + '</div></div>';
  };
  var cartaoPedidos = function (lista) {
    var usr = u();
    return lista.map(function (a) {
      var est = a.estado === 'aberto' ? chip('Aberto', 'warn') : a.estado === 'respondido' ? chip('Respondido', 'info') : chip('Resolvido', 'ok');
      var pode = a.estado === 'aberto' && P.podeResponderAuditor(a, usr);
      return '<div class="ps-ind"><div class="ps-sp-b"><b>' + e(P.cat(a.indicador_id).nome) + '</b>' + est + '</div><p class="ps-mt">' + e(a.texto) + '</p><small class="ps-mut">' + e(a.por) + ' · ' + e(P.fmtDataHora(a.em)) + '</small>' +
        (a.resposta ? '<div class="ps-aviso ps-mt"><b>Resposta de ' + e(a.resposta.por) + ':</b> ' + e(a.resposta.texto) + '</div>' : '') +
        (pode ? '<div class="ps-mt">' + campo('ra-' + a.id, 'Resposta', '<textarea id="ra-' + e(a.id) + '" class="ps-ta"></textarea>') + '<button type="button" class="ps-btn pri ps-mt" data-a="responderAud" data-v="' + e(a.id) + '">Responder</button></div>' : '') +
        (a.estado === 'respondido' && (usr.perfil === 'auditor' || usr.perfil === 'admin') ? '<button type="button" class="ps-btn ps-mt" data-a="resolverAud" data-v="' + e(a.id) + '">Dar por resolvido</button>' : '') + '</div>';
    }).join('');
  };
  var sepAuditoria = function (m) {
    var ped = S.aud.filter(function (a) { var x = P.msDoIndicador(a.indicador_id, m.ano); return x && x.id === m.id; });
    return '<div class="ps-card">' + cabCartao('Matriz de rastreabilidade', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Indicador' }, { t: 'Valor', dir: 1 }, { t: 'ESRS' }, { t: 'GRI' }, { t: 'Submetido por' }, { t: 'Aprovado por' }, { t: 'Evidências' }], P.rastreabilidade(m).map(function (r) {
      return [linkFicha(r.indicador_id) + marcaAmostra(r.indicador_id), r.valor === null ? '-' : e(fmtV(r.indicador_id, r.valor)), e(r.esrs), e(r.gri), e(r.submetido_por || '-'), e(r.aprovado_por || '-'), e(r.evidencias || '-')];
    })) + '</div></div><div class="ps-card">' + cabCartao('Pedidos sobre esta milestone', 'ativ') + (ped.length ? cartaoPedidos(ped) : vazio('Sem pedidos do auditor nesta milestone.')) + '</div>';
  };
  var sepConversa = function (m) {
    var usr = u();
    var msgs = m.comentarios.map(function (c) { var eu = c.autor === usr.nome; return '<div class="ps-msg ' + (eu ? 'eu' : '') + (c.sistema ? ' sis' : '') + '"><small>' + e(c.autor) + ' · ' + e(P.fmtDataHora(c.em)) + '</small><p>' + e(c.texto) + '</p></div>'; }).join('');
    var evs = m.eventos.slice().reverse().map(function (x) { return '<li>' + e(x.texto) + '<small>' + e(x.por) + ' · ' + e(P.fmtDataHora(x.em)) + '</small></li>'; }).join('');
    return '<div class="ps-card">' + cabCartao('Conversa', 'ativ') + '<div class="ps-chat">' + (msgs || '<div class="ps-mut ps-small">Ainda não há comentários.</div>') + '</div>' + '<div class="ps-card-body ps-sp"><div class="ps-campo ps-cresce"><label class="ps-sr" for="chat-txt">Comentário</label><input id="chat-txt" class="ps-in" placeholder="Escreva um comentário"></div><button type="button" class="ps-btn pri" data-a="comentar">Enviar</button></div></div>' +
      '<div class="ps-card">' + cabCartao('Histórico', 'cal') + '<ul class="ps-ev">' + evs + '</ul></div>';
  };

  /* --- Consolidado ------------------------------------------------------- */
  var CORES_V = { a: 'var(--v-aprov)', r: 'var(--v-rev)', p: 'var(--v-pre)', f: 'var(--v-falta)' };
  var LEG_V = '<div class="ps-vleg"><span style="--c:var(--v-aprov)"><i></i>Aprovado</span><span style="--c:var(--v-rev)"><i></i>Reportado em revisão</span><span style="--c:var(--v-pre)"><i></i>Em preenchimento</span><span style="--c:var(--v-falta)"><i></i>Por reportar</span></div>';
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
    var seg = [['a', 'Aprovado'], ['r', 'Reportado em revisão'], ['p', 'Em preenchimento'], ['f', 'Por reportar']].filter(function (s) { return n[s[0]] > 0; });
    return '<div class="ps-bar"><div class="ps-bar-t">' + e(titulo) + '<span>' + n.a + ' de ' + n.t + ' aprovados</span></div><div class="ps-bar-g" role="img" aria-label="' + e(titulo + ': ' + n.a + ' aprovados, ' + n.r + ' em revisão, ' + n.p + ' em preenchimento, ' + n.f + ' por reportar') + '">' + seg.map(function (s) {
      return '<i style="flex:' + n[s[0]] + ' 1 0;--c:' + CORES_V[s[0]] + '" data-tip="' + e(s[1] + ': ' + n[s[0]]) + '"></i>';
    }).join('') + '</div></div>';
  };
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
      return '<div class="ps-meta"><div class="ps-meta-t">' + e(x.nome) + '<span>Meta: ' + e(P.fmtNum(x.valor_meta, 0)) + ' ' + e(x.unidade) + ' em ' + x.ano_meta + ' · Atual: ' + (v === null ? 'por aprovar' : e(fmtV(x.indicador_id, v))) + '</span></div><div class="ps-meta-b"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
    var areas = P.UNIDADES.map(function (un) {
      var cs = cat.filter(function (c) { return c.unidade_negocio === un; }), mss = ms.filter(function (m) { return m.unidade === un; });
      if (!cs.length) return '';
      var s = situacao(cs), atraso = mss.some(function (m) { return P.estadoMs(m).cod === 'atraso'; });
      var est = s.a === s.t ? chip('Tudo aprovado', 'ok') : atraso ? chip('Com atraso', 'err') : s.a + s.r === s.t ? chip('Tudo reportado', 'rev') : chip('Em curso', 'info');
      return '<details class="ps-card ps-mt" id="area-' + e(un.replace(/\W/g, '')) + '"><summary class="ps-card-head ps-sp-b ps-sumario"><b>' + e(un) + '</b><span class="ps-sp">' + est + '<span class="ps-mut ps-small">' + s.a + ' de ' + s.t + ' aprovados · ' + mss.length + ' milestones</span></span></summary><div class="ps-card-body">' +
        tabela([{ t: 'Indicador' }, { t: 'Valor', dir: 1 }, { t: 'Estado' }], cs.map(function (c) {
          var m = P.msDoIndicador(c.id), est2 = m ? P.estadoIndicador(m, c.id) : { txt: 'Por recolher', cls: '' }, it = P.item(c.id);
          return [linkFicha(c.id), it && it.valor !== null ? e(fmtV(c.id, it.valor) + ' ' + c.unidade_medida) : '-', chip(est2.txt, est2.cls)];
        })) + '</div></details>';
    }).join('');
    var quadros = P.QUADROS.filter(function (q) { return incl || q !== 'ESRS'; });
    return '<div class="ps-filtros"><label class="ps-chk"><input id="cons-esrs" type="checkbox" data-c="consEsrs"' + (incl ? ' checked' : '') + '> Incluir caminho ESRS</label></div>' +
      '<div class="ps-kpis"><div class="ps-kpi"><span>Indicadores reportados pelas áreas</span><b>' + (tot.a + tot.r) + '</b><small>de ' + tot.t + '</small></div><div class="ps-kpi"><span>Aprovados e consolidados</span><b>' + tot.a + '</b><small>' + Math.round((tot.a / Math.max(tot.t, 1)) * 100) + '% do relatório</small></div><div class="ps-kpi"><span>Milestones concluídas</span><b>' + conc + '</b><small>de ' + ms.length + '</small></div></div>' +
      '<div class="ps-grid2 ps-mt"><div class="ps-card">' + cabCartao('Metas e trajetória', 'ativ') + '<div class="ps-card-body">' + metas + '</div></div><div class="ps-card">' + cabCartao('Qualidade dos dados', 'tarefa') + '<div class="ps-card-body"><div class="ps-kpis"><div class="ps-kpi"><span>Medido</span><b>' + qual.medido + '</b></div><div class="ps-kpi"><span>Calculado</span><b>' + qual.calculado + '</b></div><div class="ps-kpi"><span>Estimado</span><b>' + qual.estimado + '</b></div></div><p class="ps-mut ps-small ps-mt">' + totQ + ' indicadores com valor.</p></div></div></div>' +
      '<div class="ps-grid2 ps-mt"><div class="ps-card">' + cabCartao('Por quadro do relatório', 'doc') + '<div class="ps-card-body">' + LEG_V + quadros.map(function (q) { return barra(q, situacao(cat.filter(function (c) { return c.quadro === q; }))); }).join('') + '</div></div><div class="ps-card">' + cabCartao('Por tema', 'doc') + '<div class="ps-card-body">' + LEG_V + Object.keys(P.TEMAS).map(function (t) { return barra(t, situacao(cat.filter(function (c) { return c.tema === t; }))); }).join('') + '</div></div></div>' +
      '<h2 class="ps-grupo-t ps-mt-l">Por área</h2>' + areas;
  };

  /* --- Documentos -------------------------------------------------------- */
  var difTel = function (d) { return d.leitura_telemetria ? ((d.consumo - d.leitura_telemetria) / d.leitura_telemetria) * 100 : null; };
  var unidadeDoc = function (t) { return t === 'eletricidade' ? 'kWh' : t === 'água' ? 'm³' : 'litros'; };
  Blocos['documentos'] = function () {
    var linhas = S.docs.map(function (d) {
      var dif = difTel(d), fora = dif !== null && Math.abs(dif) > 5;
      return [e(d.fornecedor) + '<br><small class="ps-mut">' + e(d.tipo) + ' · ' + e(d.periodo) + '</small>', e(d.instalacao) + '<br><small class="ps-mut">' + e(d.entidade) + '</small>', e(P.fmtNum(d.consumo, 0)) + ' ' + unidadeDoc(d.tipo), e(P.fmtNum(d.valor_sem_iva, 2)) + ' €', dif === null ? '-' : (fora ? chip((dif > 0 ? '+' : '') + P.fmtNum(dif, 1) + '%', 'err') : chip((dif > 0 ? '+' : '') + P.fmtNum(dif, 1) + '%', 'ok')),
        d.estado === 'distribuída' ? chip('Distribuída', 'ok') : (fora ? chip('Validar com fornecedor', 'err') : '<button type="button" class="ps-btn peq" data-a="distribuir" data-v="' + e(d.id) + '">Confirmar e distribuir</button>')];
    });
    var alerta = S.docs.filter(function (d) { var x = difTel(d); return x !== null && Math.abs(x) > 5 && d.estado !== 'distribuída'; });
    var dist = S.docs.filter(function (d) { return d.estado === 'distribuída'; });
    var soma = function (f) { return dist.reduce(function (a, d) { return a + (Number(d[f]) || 0); }, 0); };
    return (alerta.length ? '<div class="ps-aviso err" role="alert">' + alerta.length + ' fatura(s) com diferença acima de 5% face à telemetria. Seguem para a Financeira validar com o fornecedor antes do pagamento.</div>' : '') +
      '<div class="ps-card">' + cabCartao('Caixa de faturas', 'doc', '<button type="button" class="ps-btn pri peq" data-a="docNova">Carregar fatura</button>') + (U.docNova ? formFatura() : '') + '<div class="ps-card-body">' + tabela([{ t: 'Fatura' }, { t: 'Instalação' }, { t: 'Consumo', dir: 1 }, { t: 'Sem IVA', dir: 1 }, { t: 'Face à telemetria' }, { t: 'Estado' }], linhas) + '</div></div>' +
      '<h2 class="ps-grupo-t ps-mt-l">Um documento, três destinos</h2><div class="ps-grid3"><div class="ps-card">' + cabCartao('Sustentabilidade') + '<div class="ps-card-body ps-small">Consumo e percentagem renovável.<div class="ps-mt"><b class="ps-num">' + dist.length + '</b> faturas distribuídas</div></div></div><div class="ps-card">' + cabCartao('Contabilidade') + '<div class="ps-card-body ps-small">Valor, IVA e centro de custo.<div class="ps-mt"><b class="ps-num">' + e(P.fmtNum(soma('valor_sem_iva'), 2)) + ' €</b> sem IVA, <b class="ps-num">' + e(P.fmtNum(soma('iva'), 2)) + ' €</b> de IVA</div></div></div><div class="ps-card">' + cabCartao('Operações') + '<div class="ps-card-body ps-small">Consumo por instalação.<div class="ps-mt">' + (dist.map(function (d) { return e(d.instalacao); }).join(', ') || '-') + '</div></div></div></div>' +
      '<p class="ps-mut ps-small ps-mt">Os campos são confirmados por quem carrega a fatura. A leitura automática é uma capacidade a avaliar.</p>';
  };
  var formFatura = function () {
    var f = function (id, lab, tipo, extra) { return campo('nf-' + id, lab, '<input id="nf-' + id + '" class="ps-in" type="' + (tipo || 'text') + '"' + (extra || '') + '>'); };
    return '<div class="ps-card-body ps-sep-baixo"><div class="ps-form">' + campo('nf-tipo', 'Tipo', '<select id="nf-tipo" class="ps-sel">' + opt('eletricidade', 'Eletricidade') + opt('água', 'Água') + opt('combustível', 'Combustível') + '</select>') +
      f('fornecedor', 'Fornecedor') + f('periodo', 'Período') + f('instalacao', 'Instalação') + campo('nf-entidade', 'Entidade', '<select id="nf-entidade" class="ps-sel">' + S.ent.map(function (x) { return opt(x.nome); }).join('') + '</select>') +
      f('consumo', 'Consumo (kWh, m³ ou litros)', 'text', ' inputmode="decimal"') + f('valor', 'Valor sem IVA (€)', 'text', ' inputmode="decimal"') + f('iva', 'IVA (€)', 'text', ' inputmode="decimal"') + f('renov', '% renovável', 'text', ' inputmode="decimal"') + f('cc', 'Centro de custo') + f('tele', 'Leitura de telemetria', 'text', ' inputmode="decimal"') +
      '</div><div class="ps-sp ps-mt"><button type="button" class="ps-btn pri" data-a="docGuardar">Guardar fatura</button><button type="button" class="ps-btn" data-a="docNova">Cancelar</button></div></div>';
  };

  /* --- Relatorio --------------------------------------------------------- */
  Blocos['relatorio'] = function () {
    var ano = S.ciclo.ano, nomes = { Desempenho: 'Desempenho (perímetro do grupo)', Ambientais: 'Ambientais (empresas maioritárias)', Sociais: 'Sociais (empresas maioritárias)', Governance: 'Governance (empresas maioritárias)', ESRS: 'Caminho ESRS' };
    return '<div class="ps-sp ps-nao-imprimir ps-filtros"><button type="button" class="ps-btn pri" data-a="relExcel">Exportar para Excel</button><button type="button" class="ps-btn" data-a="imprimir">Imprimir ou guardar em PDF</button></div>' +
      '<div class="ps-so-imprimir ps-sp-b ps-rel-topo"><span data-marca-c="logo-claro"></span><b>Relatório ' + ano + '</b></div>' +
      P.QUADROS.map(function (q) {
        return '<div class="ps-card ps-mt">' + cabCartao(nomes[q], 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Indicador' }, { t: 'Unidade' }, { t: String(ano), dir: 1 }, { t: String(ano - 1), dir: 1 }, { t: 'Estado' }], S.cat.filter(function (c) { return c.quadro === q; }).map(function (c) {
          var m = P.msDoIndicador(c.id, ano), apr = m && P.concluida(m), it = P.item(c.id, ano), est = m ? P.estadoIndicador(m, c.id) : { txt: 'Por recolher', cls: '' }, ant = P.valorAnterior(c.id, ano);
          return [e(c.nome) + (it && it.reexpresso ? ' ' + chip('Reexpresso', 'warn') : ''), e(c.unidade_medida), apr && it.valor !== null ? e(fmtV(c.id, it.valor)) : '-', ant === null || ant === undefined ? '-' : e(fmtV(c.id, ant)), chip(est.txt, est.cls)];
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
    if (SERIES[id]) SERIES[id].forEach(function (v, i) { pts.push({ ano: 2011 + i, v: v, nota: 'ilustrativo' }); });
    if (c.ano_anterior !== null && c.ano_anterior !== undefined) pts.push({ ano: 2025, v: c.ano_anterior, nota: 'ano anterior' });
    Object.keys(S.items).forEach(function (k) {
      var it = S.items[k];
      if (it.id !== id || it.valor === null) return;
      var m = P.ms(it.milestone_id);
      pts.push({ ano: it.ano, v: it.valor, nota: m && P.concluida(m) ? 'aprovado' : 'por aprovar', corrente: true });
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
    var firme = pts.filter(function (p) { return p.nota !== 'por aprovar'; }), d = firme.map(function (p) { var i = pts.indexOf(p); return (x(i)).toFixed(1) + ',' + y(p.v).toFixed(1); }).join(' ');
    var passo = movel ? Math.max(1, Math.ceil(pts.length / 5)) : pts.length > 12 ? 2 : 1;
    var marcas = pts.map(function (p, i) {
      var larg = pts.length > 1 ? (W - L - R) / (pts.length - 1) : 80;
      return '<g class="pt"><line class="x" x1="' + x(i) + '" x2="' + x(i) + '" y1="' + T + '" y2="' + (H - B) + '"></line><circle class="p ' + (p.corrente ? 'at' : '') + '" cx="' + x(i) + '" cy="' + y(p.v) + '" r="5"></circle>' + (i % passo === 0 || i === pts.length - 1 ? '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + p.ano + '</text>' : '') +
        '<rect class="h" x="' + (x(i) - larg / 2) + '" y="' + T + '" width="' + larg + '" height="' + (H - T - B) + '" data-tip="' + e(p.ano + ': ' + P.fmtNum(p.v, casas) + ' ' + unid + ' (' + p.nota + ')') + '"></rect></g>';
    }).join('');
    return '<svg class="ps-lin" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Série anual em ' + e(unid) + '">' + grelha + (firme.length > 1 ? '<polyline class="l" points="' + d + '"></polyline>' : '') + marcas + '</svg>';
  };
  Blocos['historico'] = function () {
    var id = U.histInd, c = P.cat(id), pts = serieDe(id), ilus = !!SERIES[id];
    return '<div class="ps-filtros">' + campo('h-ind', 'Indicador', '<select id="h-ind" class="ps-sel" data-c="histInd">' + S.cat.map(function (x) { return opt(x.id, x.nome + ' (' + x.unidade_medida + ')', id); }).join('') + '</select>') + '<button type="button" class="ps-btn" data-a="histJson">Exportar valores aprovados em JSON</button></div>' +
      '<div class="ps-card">' + cabCartao(c.nome, 'ativ', '<span class="ps-mut ps-small">' + e(c.unidade_medida) + '</span>') + '<div class="ps-card-body">' + (ilus ? '<div class="ps-aviso warn">A série de 2011 a 2024 é ilustrativa, só para demonstração. Falta carregar a série publicada.</div>' : '') + (pts.length ? graficoLinha(pts, c.unidade_medida, c.casas_decimais) : vazio('Ainda não há valores para este indicador.')) +
      '<div class="ps-mt-l">' + tabela([{ t: 'Ano' }, { t: 'Valor', dir: 1 }, { t: 'Origem' }], pts.slice().reverse().map(function (p) { return [String(p.ano), e(P.fmtNum(p.v, c.casas_decimais)), e(p.nota)]; })) + '</div></div></div>';
  };

  /* --- Auditoria --------------------------------------------------------- */
  Blocos['auditoria'] = function () {
    var usr = u(), ms = P.msCiclo(), apr = P.aprovados(), comEv = apr.filter(function (a) { return P.item(a.id).evidencias.length; }).length;
    var est = apr.filter(function (a) { return P.item(a.id).qualidade === 'estimado'; }).length, reex = apr.filter(function (a) { return P.item(a.id).reexpresso; }).length, abertos = S.aud.filter(function (a) { return a.estado !== 'resolvido'; });
    var pedidosDe = function (m) { return abertos.filter(function (a) { var x = P.msDoIndicador(a.indicador_id); return x && x.id === m.id; }).length; };
    var naAmostra = function (m) { return m.indicadores.some(function (id) { return S.amostra.indexOf(id) > -1; }); };
    var f = U.audFiltro, lista = ms.filter(function (m) { return f === 'concluidas' ? P.concluida(m) : f === 'abertos' ? pedidosDe(m) > 0 : f === 'amostra' ? naAmostra(m) : true; });
    var podeAmostra = usr.perfil === 'auditor' || usr.perfil === 'admin';
    return '<div class="ps-kpis"><div class="ps-kpi"><span>Aprovados com evidência</span><b>' + (apr.length ? Math.round((comEv / apr.length) * 100) : 0) + '%</b><small>' + comEv + ' de ' + apr.length + '</small></div><div class="ps-kpi"><span>Valores estimados</span><b>' + est + '</b></div><div class="ps-kpi"><span>Valores reexpressos</span><b>' + reex + '</b></div><div class="ps-kpi"><span>Pedidos em aberto</span><b>' + abertos.length + '</b></div></div>' +
      '<div class="ps-sp ps-mt">' + (podeAmostra ? '<button type="button" class="ps-btn pri" data-a="amostra">Selecionar amostra de 5</button>' : '') + '<button type="button" class="ps-btn" data-a="dataRoom">Exportar data room (Excel)</button>' + (usr.perfil === 'auditor' || usr.perfil === 'admin' ? '<button type="button" class="ps-btn" data-a="novoPedAud">Novo pedido de informação</button>' : '') + '</div>' +
      (S.amostra.length ? '<div class="ps-card ps-mt">' + cabCartao('Amostra', 'tarefa') + '<ul class="ps-list">' + S.amostra.map(function (id) { var m = P.msDoIndicador(id); return '<li class="ps-row"><span class="ps-row-txt">' + linkFicha(id) + '<span>' + e(m ? m.nome : '') + '</span></span></li>'; }).join('') + '</ul></div>' : '') +
      '<div class="ps-card ps-mt">' + cabCartao('Milestones', 'doc', '<div class="ps-seg" role="group" aria-label="Filtro">' + [['todas', 'Todas'], ['concluidas', 'Concluídas'], ['abertos', 'Com pedidos abertos'], ['amostra', 'Na amostra']].map(function (x) { return '<button type="button" class="' + (f === x[0] ? 'on' : '') + '" data-a="audFiltro" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>') + '<div class="ps-card-body">' + tabela([{ t: 'Milestone' }, { t: 'Estado' }, { t: 'Aprovados', dir: 1 }, { t: 'Evidência obrigatória', dir: 1 }, { t: 'Estimados', dir: 1 }, { t: 'Reexpressos', dir: 1 }, { t: 'Pedidos abertos', dir: 1 }], lista.map(function (m) {
        var ob = m.indicadores.filter(function (id) { return P.cat(id).evidencia_obrigatoria; }), okEv = ob.filter(function (id) { return P.item(id, m.ano).evidencias.length; }).length;
        return ['<a href="' + rota('Milestone/' + m.id + '?sep=auditoria') + '">' + e(m.nome) + '</a>', estChip(m), P.concluida(m) ? m.indicadores.length + '/' + m.indicadores.length : '0/' + m.indicadores.length, okEv + '/' + ob.length, m.indicadores.filter(function (id) { return P.item(id, m.ano).qualidade === 'estimado'; }).length, m.indicadores.filter(function (id) { return P.item(id, m.ano).reexpresso; }).length, pedidosDe(m)];
      }), 'Nenhuma milestone com este filtro.') + '</div></div>' +
      '<div class="ps-card ps-mt">' + cabCartao('Pedidos de informação', 'ativ') + (S.aud.length ? cartaoPedidos(S.aud) : vazio('Ainda não há pedidos.')) + '</div>';
  };

  /* --- Pedidos de dados (entidade externa) ------------------------------- */
  Blocos['pedidos'] = function () {
    var usr = u(), meus = S.ext.filter(function (x) { return x.entidade_externa === usr.nome; }), grupos = {};
    meus.forEach(function (x) { (grupos[x.milestone_id] = grupos[x.milestone_id] || []).push(x); });
    var ids = Object.keys(grupos);
    if (!ids.length) return '<div class="ps-card">' + vazio('Não há pedidos para a sua organização.') + '</div>';
    return ids.map(function (mid) {
      var m = P.ms(mid);
      return '<div class="ps-card ps-mt">' + cabCartao(m ? m.nome : mid, 'doc') + grupos[mid].map(function (x) {
        var c = P.cat(x.indicador_id), aberto = x.estado === 'pendente';
        return '<div class="ps-ind"><div class="ps-sp-b"><b>' + e(c.nome) + ' (' + e(c.unidade_medida) + ')</b>' + (aberto ? chip('Prazo ' + P.fmtData(x.prazo), 'warn') : chip('Enviado', 'ok')) + '</div><p class="ps-mt">' + e(x.descricao) + '</p>' +
          (aberto ? '<div class="ps-form ps-mt">' + campo('xv-' + x.id, 'Valor', '<input id="xv-' + e(x.id) + '" class="ps-in" inputmode="decimal">') + campo('xe-' + x.id, 'Documento de suporte', '<input id="xe-' + e(x.id) + '" class="ps-in" type="file">') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="enviarExt" data-v="' + e(x.id) + '">Enviar</button>' :
            '<p class="ps-mut ps-small ps-mt">Valor enviado: ' + e(fmtV(x.indicador_id, x.valor)) + (x.evidencia ? ' · ' + e(x.evidencia) : '') + ' · ' + e(P.fmtDataHora(x.respondido_em)) + '</p>') + '</div>';
      }).join('') + '</div>';
    }).join('');
  };

  /* --- Backoffice -------------------------------------------------------- */
  var BO = [['ciclo', 'Ciclo de reporting'], ['materialidade', 'Materialidade e referenciais'], ['utilizadores', 'Utilizadores e perfis'], ['externas', 'Entidades externas'], ['wfbase', 'Workflow base'], ['indicadores', 'Indicadores e milestones'], ['calendario', 'Calendário'], ['regras', 'Regras de validação'], ['marca', 'Marca'], ['areas', 'Áreas consumidoras do dado'], ['entidades', 'Entidades e perímetros'], ['dados', 'Dados e armazenamento']];
  var B = {};
  Blocos['backoffice'] = function () {
    return '<div class="ps-bo"><nav class="ps-bo-tabs" aria-label="Secções do backoffice">' + BO.map(function (t) { return '<button type="button" class="ps-bo-tab ' + (U.boTab === t[0] ? 'on' : '') + '" data-a="boTab" data-v="' + t[0] + '"' + (U.boTab === t[0] ? ' aria-current="true"' : '') + '>' + e(t[1]) + '</button>'; }).join('') + '</nav><div class="ps-col">' + B[U.boTab]() + '</div></div>';
  };
  B.ciclo = function () {
    return '<div class="ps-card">' + cabCartao('Ciclo de reporting', 'cal') + '<div class="ps-card-body"><div class="ps-kpis"><div class="ps-kpi"><span>Ano em curso</span><b>' + S.ciclo.ano + '</b></div><div class="ps-kpi"><span>Milestones do ciclo</span><b>' + P.msCiclo().length + '</b></div><div class="ps-kpi"><span>Ciclos fechados</span><b>' + (S.ciclo.fechados || []).length + '</b><small>' + e((S.ciclo.fechados || []).join(', ')) + '</small></div></div>' +
      '<p class="ps-mt">Abrir o ciclo de ' + (S.ciclo.ano + 1) + ' fecha o ciclo atual e cria as milestones do novo ano a partir do workflow base.</p><button type="button" class="ps-btn pri ps-mt" data-a="abrirCiclo">Abrir ciclo de ' + (S.ciclo.ano + 1) + '</button></div></div>';
  };
  B.materialidade = function () {
    var cob = S.mat.map(function (x) {
      var cs = S.cat.filter(function (c) { return c.esrs === x.norma; }), apr = cs.filter(function (c) { var m = P.msDoIndicador(c.id); return m && P.concluida(m); }).length;
      return [ '<b>' + e(x.norma) + '</b> ' + e(x.tema), '<select id="mat-' + x.norma + '" class="ps-sel" aria-label="Avaliação de ' + e(x.norma) + '" data-c="matAval" data-id="' + x.norma + '">' + ['material', 'não material', 'por avaliar'].map(function (o) { return opt(o, o[0].toUpperCase() + o.slice(1), x.avaliacao); }).join('') + '</select>', '<input id="matj-' + x.norma + '" class="ps-in" aria-label="Justificação de ' + e(x.norma) + '" value="' + e(x.justificacao) + '" data-c="matJust" data-id="' + x.norma + '">', cs.length + ' indicadores, ' + apr + ' aprovados' + (x.avaliacao === 'material' && !cs.length ? ' ' + chip('Sem indicadores', 'err') : '')];
    });
    var ref = S.cat.map(function (c) { var m = P.msDoIndicador(c.id), est = m ? P.estadoIndicador(m, c.id) : { txt: '-', cls: '' }; return [e(c.nome), e(m ? m.id : '-'), e(c.esrs_requisito), e(c.gri), e(c.utilizado_por.filter(function (x) { return x !== 'REL'; }).join(', ') || '-'), chip(est.txt, est.cls)]; });
    return '<div class="ps-card">' + cabCartao('Materialidade', 'tarefa') + '<div class="ps-card-body">' + tabela([{ t: 'Norma' }, { t: 'Avaliação' }, { t: 'Justificação' }, { t: 'Cobertura' }], cob) + '<p class="ps-mut ps-small ps-mt">O mapeamento usa a numeração das ESRS de 2023 e tem de ser revisto quando o ato delegado das ESRS simplificadas for publicado.</p></div></div>' +
      '<div class="ps-card">' + cabCartao('Um dado, vários referenciais', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Indicador' }, { t: 'Milestone' }, { t: 'ESRS' }, { t: 'GRI' }, { t: 'Outros utilizadores' }, { t: 'Estado' }], ref) + '</div></div>';
  };
  B.utilizadores = function () {
    return '<div class="ps-card">' + cabCartao('Utilizadores e perfis', 'tarefa') + '<div class="ps-card-body">' + tabela([{ t: 'Nome' }, { t: 'Login' }, { t: 'Perfil' }, { t: 'Unidade' }], S.users.map(function (x) {
      return [e(x.nome), '<span class="ps-mono">' + e(x.login) + '</span>', '<select id="up-' + e(x.login) + '" class="ps-sel" aria-label="Perfil de ' + e(x.nome) + '" data-c="userPerfil" data-id="' + e(x.login) + '">' + Object.keys(P.PERFIS).map(function (k) { return opt(k, P.PERFIS[k], x.perfil); }).join('') + '</select>', '<select id="uu-' + e(x.login) + '" class="ps-sel" aria-label="Unidade de ' + e(x.nome) + '" data-c="userUnidade" data-id="' + e(x.login) + '">' + opt('', '-', x.unidade) + P.UNIDADES.map(function (o) { return opt(o, o, x.unidade); }).join('') + '</select>'];
    })) + '<h3 class="ps-grupo-t">Novo utilizador</h3><div class="ps-form">' + campo('nu-nome', 'Nome', '<input id="nu-nome" class="ps-in">') + campo('nu-login', 'Login', '<input id="nu-login" class="ps-in">') + campo('nu-perfil', 'Perfil', '<select id="nu-perfil" class="ps-sel">' + Object.keys(P.PERFIS).map(function (k) { return opt(k, P.PERFIS[k], 'resp'); }).join('') + '</select>') + campo('nu-un', 'Unidade', '<select id="nu-un" class="ps-sel">' + opt('', '-') + P.UNIDADES.map(function (o) { return opt(o); }).join('') + '</select>') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="userNovo">Adicionar utilizador</button></div></div>';
  };
  B.externas = function () {
    return '<div class="ps-card">' + cabCartao('Entidades externas: pedidos e estado', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Entidade' }, { t: 'Indicador' }, { t: 'Milestone' }, { t: 'Prazo' }, { t: 'Estado' }], S.ext.map(function (x) {
      var cl = { pendente: 'warn', recebido: 'info', aplicado: 'ok' }[x.estado];
      return [e(x.entidade_externa), e(P.cat(x.indicador_id).nome), '<a href="' + rota('Milestone/' + x.milestone_id + '?sep=externos') + '">' + e(x.milestone_id) + '</a>', e(P.fmtData(x.prazo)), chip(x.estado[0].toUpperCase() + x.estado.slice(1), cl)];
    }), 'Ainda não há pedidos.') + '</div></div>';
  };
  B.wfbase = function () {
    return '<div class="ps-card">' + cabCartao('Workflow base', 'ativ', '<button type="button" class="ps-btn peq" data-a="abrirWfBase">Alterar workflow base</button>') + '<div class="ps-card-body">' + tabela([{ t: 'Passo' }, { t: 'Tipo' }, { t: 'Responsável' }], S.wfbase.map(function (p, i) { return [(i + 1) + '. ' + e(p.nome), e(P.TIPOS_PASSO[p.tipo]), e(P.nomeResp(null, p.responsavel))]; })) + '<p class="ps-mut ps-small ps-mt">Aplica-se às milestones novas. Ao guardar, pode aplicá-lo também às que ainda não começaram e não foram ajustadas.</p></div></div>';
  };
  B.indicadores = function () {
    var q = U.indBusca.toLowerCase(), l = S.cat.filter(function (c) { return !q || (c.nome + ' ' + c.id + ' ' + c.unidade_negocio).toLowerCase().indexOf(q) > -1; });
    return '<div class="ps-card">' + cabCartao('Indicadores (' + S.cat.length + ')', 'doc') + '<div class="ps-card-body">' + campo('ind-busca', 'Pesquisar', '<input id="ind-busca" class="ps-in" value="' + e(U.indBusca) + '" data-c="indBusca">') + '<div class="ps-mt">' + tabela([{ t: 'Indicador' }, { t: 'Unidade' }, { t: 'Unidade de negócio' }, { t: 'Tipo' }, { t: 'Periodicidade' }, { t: 'Quadro' }, { t: 'Evidência obrigatória' }], l.map(function (c) {
      return [linkFicha(c.id, c.id + ' ' + c.nome), e(c.unidade_medida), e(c.unidade_negocio), c.tipo === 'derivado' ? 'Derivado' : 'Base', e(c.periodicidade), e(c.quadro), '<label class="ps-chk"><input id="evo-' + e(c.id) + '" type="checkbox" data-c="evObrig" data-id="' + e(c.id) + '"' + (c.evidencia_obrigatoria ? ' checked' : '') + '><span class="ps-sr">Evidência obrigatória em ' + e(c.nome) + '</span></label>'];
    }), 'Nenhum indicador encontrado.') + '</div></div></div>' +
      '<div class="ps-card">' + cabCartao('Milestones do ciclo (' + P.msCiclo().length + ')', 'tarefa') + '<div class="ps-card-body">' + tabela([{ t: 'Milestone' }, { t: 'Indicadores' }, { t: 'Prazo' }, { t: 'Estado' }], P.msCiclo().map(function (m) {
        return ['<a href="' + rota('Milestone/' + m.id) + '">' + e(m.nome) + '</a>', e(m.indicadores.join(', ')), '<input id="pz-' + e(m.id) + '" class="ps-in" type="date" aria-label="Prazo de ' + e(m.nome) + '" value="' + e(m.prazo) + '" data-c="msPrazo" data-id="' + e(m.id) + '">', estChip(m)];
      })) + '</div></div>';
  };
  var MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  B.calendario = function () {
    return '<div class="ps-card">' + cabCartao('Janelas de reporting', 'cal', '<button type="button" class="ps-btn peq" data-a="janNova">Nova janela</button>') + '<div class="ps-card-body">' + tabela([{ t: 'Janela' }, { t: 'Tema' }, { t: 'Meses' }, { t: 'Dia inicial' }, { t: 'Dia final' }, { t: 'Ações' }], S.janelas.map(function (j, i) {
      return ['<input id="jn-' + i + '" class="ps-in" aria-label="Nome da janela" value="' + e(j.nome) + '" data-c="janNome" data-id="' + i + '">', '<select id="jt-' + i + '" class="ps-sel" aria-label="Tema" data-c="janTema" data-id="' + i + '">' + Object.keys(P.TEMAS).map(function (t) { return opt(t, t, j.tema); }).join('') + '</select>', '<input id="jm-' + i + '" class="ps-in" aria-label="Meses, de 1 a 12, separados por vírgula" value="' + e(j.meses.join(', ')) + '" data-c="janMeses" data-id="' + i + '"><small class="ps-mut">' + (j.meses.length === 12 ? 'Todos' : j.meses.map(function (x) { return MESES[x - 1]; }).join(', ')) + '</small>', '<input id="ji-' + i + '" class="ps-in" type="number" min="1" max="31" aria-label="Dia inicial" value="' + j.dia_inicio + '" data-c="janIni" data-id="' + i + '">', '<input id="jf-' + i + '" class="ps-in" type="number" min="1" max="31" aria-label="Dia final" value="' + j.dia_fim + '" data-c="janFim" data-id="' + i + '">', '<button type="button" class="ps-btn peq err" data-a="janApagar" data-v="' + i + '">Remover</button>'];
    }), 'Ainda não há janelas.') + '<p class="ps-mut ps-small ps-mt">As janelas definem quando se recolhe. O prazo de cada milestone define quando se entrega.</p></div></div>';
  };
  B.regras = function () {
    var q = U.regraBusca.toLowerCase(), l = S.cat.filter(function (c) { return !q || (c.nome + ' ' + c.id).toLowerCase().indexOf(q) > -1; });
    return '<div class="ps-card">' + cabCartao('Regras de validação: limiar por indicador', 'tarefa') + '<div class="ps-card-body">' + campo('reg-busca', 'Pesquisar', '<input id="reg-busca" class="ps-in" value="' + e(U.regraBusca) + '" data-c="regraBusca">') + '<div class="ps-mt">' + tabela([{ t: 'Indicador' }, { t: 'Limiar (%)' }, { t: 'Regras de coerência' }], l.map(function (c) {
      return [e(c.id + ' ' + c.nome), '<input id="lim-' + e(c.id) + '" class="ps-in ps-num" type="number" min="0" aria-label="Limiar de ' + e(c.nome) + '" value="' + c.limiar_variacao_pct + '" data-c="limiar" data-id="' + e(c.id) + '">', c.regras_coerencia.length ? '<span class="ps-small">' + e(c.regras_coerencia.join(' ')) + '</span>' : '-'];
    }), 'Nenhum indicador encontrado.') + '</div></div></div>';
  };
  var ROT_COR = { primary: 'Principal', secondary: 'Secundária', accent: 'Destaque', bg: 'Fundo', text: 'Texto' };
  B.marca = function () {
    if (!U.marca) U.marca = JSON.parse(JSON.stringify(S.marca));
    var m = U.marca, cores = m.cores, avisos = [];
    if (P.contraste(cores.primary, '#FFFFFF') < 4.5) avisos.push('A cor principal tem pouco contraste com texto branco nos botões e no hero.');
    if (P.contraste(cores.text, cores.bg) < 4.5) avisos.push('A cor do texto tem pouco contraste com a cor de fundo.');
    var prev = m.logotipo ? '<img src="' + e(m.logotipo) + '" alt="Pré-visualização do logótipo" data-logo-prev>' : 'Sem logótipo: a plataforma mostra o nome.';
    return '<div class="ps-card">' + cabCartao('Logótipo', 'doc') + '<div class="ps-card-body"><div class="ps-form">' + campo('mc-logo', 'Link web da imagem do logótipo', '<input id="mc-logo" class="ps-in" type="url" inputmode="url" placeholder="https://exemplo.pt/logotipo.png" value="' + e(m.logotipo) + '" data-c="mcLogo">') + '<div><span class="ps-lab">Pré-visualização</span><div class="ps-logo-prev" data-campo="logo-prev">' + prev + '</div></div></div><p class="ps-mut ps-small ps-mt" id="logo-estado" role="status">' + e(U.logoEstado || 'Ao guardar, este logótipo passa a aparecer em toda a plataforma.') + '</p></div></div>' +
      '<div class="ps-card">' + cabCartao('Nome', 'tarefa') + '<div class="ps-card-body"><div class="ps-form">' + campo('mc-nome', 'Nome da plataforma', '<input id="mc-nome" class="ps-in" value="' + e(m.nome) + '" data-c="mcNome">') + campo('mc-sub', 'Subtítulo', '<input id="mc-sub" class="ps-in" value="' + e(m.subtitulo) + '" data-c="mcSub">') + '</div></div></div>' +
      '<div class="ps-card">' + cabCartao('Cores', 'ativ') + '<div class="ps-card-body"><div class="ps-cores">' + Object.keys(ROT_COR).map(function (k) { return '<div><label class="ps-lab" for="cor-t-' + k + '">' + ROT_COR[k] + '</label><div class="ps-cor"><input id="cor-' + k + '" type="color" aria-label="Escolher cor ' + ROT_COR[k] + '" value="' + e(cores[k]) + '" data-i="mcCor" data-id="' + k + '"><input id="cor-t-' + k + '" class="ps-in" maxlength="7" value="' + e(cores[k]) + '" data-c="mcCorT" data-id="' + k + '"></div></div>'; }).join('') + '</div>' +
      avisos.map(function (a) { return '<div class="ps-aviso warn ps-mt">' + e(a) + '</div>'; }).join('') +
      '<h3 class="ps-grupo-t">Paletas sugeridas</h3><div class="ps-pal">' + P.PALETAS.map(function (p, i) { return '<button type="button" data-a="mcPaleta" data-v="' + i + '"><span>' + ['primary', 'secondary', 'accent'].map(function (k) { return '<i style="--c:' + p.cores[k] + '"></i>'; }).join('') + '</span>' + e(p.nome) + '</button>'; }).join('') + '</div>' +
      '<h3 class="ps-grupo-t">Pré-visualização</h3><div class="ps-pre-marca"><div class="ps-pre-top">' + (m.logotipo ? '<img src="' + e(m.logotipo) + '" alt="" class="ps-logo-mini" data-logo-mini>' : '<span class="ps-marca-mono" aria-hidden="true">' + e(iniciais(m.nome || 'P').toUpperCase()) + '</span>') + '<span class="ps-marca-txt">' + e(m.nome) + '<small>' + e(m.subtitulo) + '</small></span></div><div class="ps-pre-hero ps-fundo-marca"><b>' + e(m.nome) + '</b>Ciclo de reporting ' + S.ciclo.ano + '</div><div class="ps-pre-b"><span class="ps-btn pri">Botão principal</span><span class="ps-btn">Secundário</span>' + chip('Em recolha', 'info') + chip('Aprovado', 'ok') + '</div></div></div>' +
      '<div class="ps-sticky ps-mt"><button type="button" class="ps-btn pri" data-a="mcGuardar">Guardar marca</button></div></div>' +
      '<div class="ps-card">' + cabCartao('Cópia da marca', 'doc') + '<div class="ps-card-body ps-sp"><button type="button" class="ps-btn" data-a="mcExportar">Exportar</button><button type="button" class="ps-btn" data-a="mcImportar">Importar</button><button type="button" class="ps-btn err" data-a="mcRepor">Repor</button></div></div>';
  };
  B.areas = function () {
    return '<div class="ps-card">' + cabCartao('Áreas consumidoras do dado', 'doc') + '<div class="ps-card-body">' + tabela([{ t: 'Código' }, { t: 'Área' }, { t: 'Para que usa' }, { t: 'Indicadores', dir: 1 }], S.areas.map(function (a, i) {
      return ['<span class="ps-mono">' + e(a.codigo) + '</span>', '<input id="an-' + i + '" class="ps-in" aria-label="Área" value="' + e(a.nome) + '" data-c="areaNome" data-id="' + i + '">', '<input id="au-' + i + '" class="ps-in" aria-label="Para que usa" value="' + e(a.uso) + '" data-c="areaUso" data-id="' + i + '">', S.cat.filter(function (c) { return c.utilizado_por.indexOf(a.codigo) > -1; }).length];
    })) + '</div></div>';
  };
  B.entidades = function () {
    return '<div class="ps-card">' + cabCartao('Entidades e perímetros', 'doc', '<button type="button" class="ps-btn peq" data-a="entNova">Nova entidade</button>') + '<div class="ps-card-body">' + tabela([{ t: 'Entidade' }, { t: 'Perímetro do grupo' }, { t: 'Perímetro maioritário' }], S.ent.map(function (x, i) {
      return ['<input id="en-' + i + '" class="ps-in" aria-label="Nome da entidade" value="' + e(x.nome) + '" data-c="entNome" data-id="' + i + '">', '<label class="ps-chk"><input id="eg-' + i + '" type="checkbox" data-c="entGrupo" data-id="' + i + '"' + (x.perimetro_grupo ? ' checked' : '') + '> Sim</label>', '<label class="ps-chk"><input id="em-' + i + '" type="checkbox" data-c="entMaior" data-id="' + i + '"' + (x.perimetro_maioritario ? ' checked' : '') + '> Sim</label>'];
    })) + '</div></div>';
  };
  B.dados = function () {
    return '<div class="ps-card">' + cabCartao('Dados e armazenamento', 'doc') + '<div class="ps-card-body"><div class="ps-aviso warn">Neste mockup os dados ficam no navegador. Em produção passam para a base de dados.</div><div class="ps-sp"><button type="button" class="ps-btn" data-a="dadosExportar">Exportar todos os dados</button><button type="button" class="ps-btn" data-a="dadosImportar">Importar dados</button><button type="button" class="ps-btn err" data-a="dadosRepor">Repor demonstração</button></div></div></div>';
  };

  /* --- Paineis laterais -------------------------------------------------- */
  var abrePainel = function (tipo, args) { U.painel = { tipo: tipo, args: args || {} }; U.painelFoco = true; R(); };
  var fechaPainel = function () { U.painel = null; R(); };
  var Pn = {};
  Pn.ficha = function (a) {
    var id = a.id, c = P.cat(id), m = P.msDoIndicador(id), it = P.item(id), usr = u();
    if (!m || !it) return { t: c.nome, b: vazio('Este indicador não tem milestone neste ciclo.') };
    var v = P.validarItem(it), ant = P.valorAnterior(id, m.ano), est = P.estadoIndicador(m, id);
    var refs = (S.mat.filter(function (x) { return x.norma === c.esrs; })[0] || {}).avaliacao;
    var b = '<div class="ps-sp">' + chip(est.txt, est.cls) + marcaAmostra(id) + (it.reexpresso ? chip('Reexpresso', 'warn') : '') + '</div><div class="ps-kpis"><div class="ps-kpi"><span>' + (m.ano - 1) + '</span><b>' + (ant === null || ant === undefined ? '-' : e(fmtV(id, ant))) + '</b></div><div class="ps-kpi"><span>' + m.ano + '</span><b>' + (it.valor === null ? '-' : e(fmtV(id, it.valor))) + '</b></div><div class="ps-kpi"><span>Variação</span><b>' + (v.variacao === null ? '-' : (v.variacao > 0 ? '+' : '') + P.fmtNum(v.variacao, 1) + '%') + '</b></div></div>' +
      (v.alertas.length ? '<div class="ps-aviso warn">' + v.alertas.map(e).join('<br>') + '</div>' : '') + (it.justificacao ? '<div><span class="ps-lab">Justificação</span>' + e(it.justificacao) + '</div>' : '') +
      '<dl class="ps-det"><dt>Ano e unidade</dt><dd>' + m.ano + ' · ' + e(c.unidade_medida) + '</dd><dt>Milestone</dt><dd>' + e(m.nome) + '</dd><dt>Tipo</dt><dd>' + (c.tipo === 'derivado' ? 'Derivado' : 'Dado base') + '</dd>' + (c.formula ? '<dt>Fórmula</dt><dd>' + e(c.formula) + '</dd>' : '') + '<dt>Limiar</dt><dd>' + c.limiar_variacao_pct + '%</dd><dt>Utilizadores</dt><dd>' + e(c.utilizado_por.join(', ')) + '</dd><dt>Qualidade</dt><dd>' + e(P.QUALIDADE_TXT[it.qualidade]) + (it.metodo ? ' · ' + e(it.metodo) : '') + '</dd><dt>Evidências</dt><dd>' + (it.evidencias.map(function (x) { return e(x.ficheiro); }).join(', ') || '-') + '</dd><dt>Referenciais</dt><dd>ESRS ' + e(c.esrs_requisito) + (refs ? ' (' + e(refs) + ')' : '') + ' · GRI ' + e(c.gri) + '</dd></dl>' +
      '<div><h3 class="ps-grupo-t">Histórico de valores</h3>' + (it.versoes.length ? '<ul class="ps-ev ps-sem-pad">' + it.versoes.slice().reverse().map(function (x) { return '<li><b class="ps-num">' + e(fmtV(id, x.valor)) + '</b> · ' + e(x.origem) + (x.motivo ? '. Motivo: ' + e(x.motivo) : '') + '<small>' + e(x.por) + ' · ' + e(P.fmtDataHora(x.em)) + '</small></li>'; }).join('') + '</ul>' : '<p class="ps-mut ps-small">Ainda sem valores.</p>') + '</div>';
    if (P.concluida(m) && P.podeReexpressar(usr)) b += '<div class="ps-card ps-card-body"><h3 class="ps-grupo-t ps-sem-topo">Reexpressar valor aprovado</h3><div class="ps-form">' + campo('rx-val', 'Novo valor', '<input id="rx-val" class="ps-in" inputmode="decimal">') + campo('rx-mot', 'Motivo (obrigatório)', '<input id="rx-mot" class="ps-in">') + '</div><button type="button" class="ps-btn pri ps-mt" data-a="reexpressar" data-v="' + e(id) + '">Reexpressar valor</button></div>';
    if (usr.perfil === 'auditor' || usr.perfil === 'admin') b += '<div class="ps-card ps-card-body"><h3 class="ps-grupo-t ps-sem-topo">Pedido de informação do auditor</h3>' + campo('pa-txt', 'O que precisa de saber', '<textarea id="pa-txt" class="ps-ta"></textarea>') + '<button type="button" class="ps-btn ps-mt" data-a="pedidoAud" data-v="' + e(id) + '">Enviar pedido</button></div>';
    return { t: c.nome, s: c.id, b: b, p: '<a class="ps-btn" href="' + rota('Milestone/' + m.id) + '" data-a="fecharPainel" data-nao-impedir="1">Abrir a milestone</a>' };
  };
  Pn.tecnica = function (a) {
    var m = msAtual(), sec = a.sec || 'schema', b = '<div class="ps-seg" role="group" aria-label="Separadores">' + [['schema', 'Schema do ficheiro'], ['json', 'JSON Schema'], ['tpl', 'Templates'], ['api', 'API e integrações']].map(function (s) { return '<button type="button" class="' + (sec === s[0] ? 'on' : '') + '" data-a="tecSec" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (sec === 'schema') {
      var D = [['milestone_id', 'string', 'Sim', 'Tem de ser ' + m.id + '.'], ['indicator_id', 'string', 'Sim', 'Só os indicadores desta milestone: ' + m.indicadores.join(', ') + '.'], ['indicator_name', 'string', 'Não', 'Apenas para leitura humana. É ignorado.'], ['entity', 'string', 'Não', 'Por omissão, Consolidado.'], ['period', 'string', 'Sim', 'Tem de ser ' + m.ano + '.'], ['value', 'number', 'Sim', 'Aceita vírgula ou ponto decimal.'], ['unit', 'string', 'Sim', 'Igual à unidade do indicador.'], ['justification', 'string', 'Não', 'Obrigatória quando há alertas.'], ['source_system', 'string', 'Não', 'Sistema de origem do dado.'], ['evidence_ref', 'string', 'Não', 'Obrigatória nos indicadores com evidência obrigatória.'], ['data_quality', 'string', 'Não', 'measured, calculated ou estimated.'], ['estimation_method', 'string', 'Não', 'Obrigatório quando data_quality é estimated.']];
      b += tabela([{ t: 'Campo' }, { t: 'Tipo' }, { t: 'Obrigatório' }, { t: 'Regra' }], D.map(function (x) { return ['<span class="ps-mono">' + x[0] + '</span>', x[1], x[2], e(x[3])]; }));
    } else if (sec === 'json') {
      b += '<div class="ps-sp"><button type="button" class="ps-btn peq" data-a="schemaCopiar">Copiar</button><button type="button" class="ps-btn peq" data-a="schemaDesc">Descarregar</button></div><pre class="ps-pre" tabindex="0">' + e(JSON.stringify(P.jsonSchema(m), null, 2)) + '</pre>';
    } else if (sec === 'tpl') {
      b += '<p>Templates desta milestone, já com os indicadores e o ano.</p><div class="ps-sp"><button type="button" class="ps-btn pri" data-a="tplExcel">Template Excel</button><button type="button" class="ps-btn" data-a="tplCsv">Template CSV</button></div>';
    } else {
      var ex = { milestone_id: m.id, submitted_by: 'svc-integracao@empresa.pt', source_system: 'ERP', records: [{ indicator_id: m.indicadores[0], entity: 'Consolidado', period: String(m.ano), value: 10, unit: P.cat(m.indicadores[0]).unidade_medida, data_quality: 'measured' }] };
      b += '<div class="ps-aviso warn">Contrato proposto para integrações futuras. Fica a fechar no desenho técnico.</div><dl class="ps-det"><dt>Obter o schema</dt><dd class="ps-mono">GET /api/v1/milestones/' + e(m.id) + '/schema</dd><dt>Enviar valores</dt><dd class="ps-mono">POST /api/v1/milestones/' + e(m.id) + '/submissions</dd><dt>Webhook</dt><dd class="ps-mono">milestone.step_completed</dd></dl><pre class="ps-pre" tabindex="0">' + e(JSON.stringify(ex, null, 2)) + '</pre>';
    }
    return { t: 'Visão técnica', s: m.nome, b: b, largo: true };
  };
  Pn.pedirExt = function (a) {
    var m = msAtual(), ext = S.users.filter(function (x) { return x.perfil === 'ext'; });
    return { t: 'Pedir a entidade externa', s: m.nome, b: campo('px-ind', 'Indicador', '<select id="px-ind" class="ps-sel">' + m.indicadores.map(function (id) { return opt(id, P.cat(id).nome, a.id); }).join('') + '</select>') + campo('px-ent', 'Entidade', '<select id="px-ent" class="ps-sel">' + ext.map(function (x) { return opt(x.nome); }).join('') + '</select>') + campo('px-desc', 'O que se pede', '<textarea id="px-desc" class="ps-ta"></textarea>') + campo('px-prazo', 'Prazo', '<input id="px-prazo" class="ps-in" type="date" value="' + e(P.diasDe(14)) + '">'), p: '<button type="button" class="ps-btn pri" data-a="pxCriar">Criar pedido</button>' };
  };
  Pn.novoPedAud = function () {
    var apr = S.cat;
    return { t: 'Novo pedido de informação', b: campo('na-ind', 'Indicador', '<select id="na-ind" class="ps-sel">' + apr.map(function (c) { return opt(c.id, c.nome); }).join('') + '</select>') + campo('na-txt', 'O que precisa de saber', '<textarea id="na-txt" class="ps-ta"></textarea>'), p: '<button type="button" class="ps-btn pri" data-a="naCriar">Enviar pedido</button>' };
  };
  var respOpts = function (sel) {
    return [opt('unidade', 'Unidade da milestone', sel), opt('esg', 'Equipa de sustentabilidade', sel), opt('admin', 'Administrador', sel)].concat(P.UNIDADES.map(function (x) { return opt('area:' + x, x, sel); })).join('');
  };
  Pn.wf = function (a) {
    var base = a.base, m = base ? null : msAtual(), d = U.wfDraft, atual = m ? m.passo_atual : -1;
    var linhas = d.map(function (p, i) {
      var feito = i < atual, ehAtual = i === atual, auto = p.responsavel === 'sistema', fixo = i === 0 || feito || ehAtual;
      var nome = feito ? '<b>' + e(p.nome) + '</b>' : '<input id="wfn-' + i + '" class="ps-in" aria-label="Nome do passo ' + (i + 1) + '" value="' + e(p.nome) + '" data-c="wfNome" data-id="' + i + '">';
      var tipo = fixo || auto ? '<span class="ps-small ps-mut">' + e(P.TIPOS_PASSO[p.tipo]) + '</span>' : '<select id="wft-' + i + '" class="ps-sel" aria-label="Tipo do passo ' + (i + 1) + '" data-c="wfTipo" data-id="' + i + '">' + ['revisao', 'parecer', 'aprovacao'].map(function (t) { return opt(t, P.TIPOS_PASSO[t], p.tipo); }).join('') + '</select>';
      var resp = feito ? '<span class="ps-small ps-mut">' + e(P.nomeResp(m, p.responsavel)) + '</span>' : auto ? '<span class="ps-small ps-mut">Automático</span>' : '<select id="wfr-' + i + '" class="ps-sel" aria-label="Responsável do passo ' + (i + 1) + '" data-c="wfResp" data-id="' + i + '">' + respOpts(p.responsavel) + '</select>';
      var mov = !fixo && p.tipo !== 'publicacao';
      var ultimaMov = i + 1 < d.length && d[i + 1].tipo !== 'publicacao';
      var primeiraMov = i - 1 > Math.max(atual, 0);
      return '<div class="ps-wfe ' + (feito ? 'bloq' : '') + '"><span class="ps-wfe-n">' + (feito ? svg(I.tick, 14) : i + 1) + '</span><div class="ps-wfe-c">' + nome + tipo + resp + '</div><div class="ps-wfe-a">' + (mov ? '<button type="button" id="wfc-' + i + '" data-a="wfMover" data-v="' + i + '" data-d="-1" aria-label="Subir"' + (primeiraMov ? '' : ' disabled') + '>' + svg(I.cima, 14) + '</button><button type="button" id="wfb-' + i + '" data-a="wfMover" data-v="' + i + '" data-d="1" aria-label="Descer"' + (ultimaMov ? '' : ' disabled') + '>' + svg(I.baixo, 14) + '</button>' : '') + (fixo ? '' : '<button type="button" id="wfx-' + i + '" data-a="wfRemover" data-v="' + i + '" aria-label="Remover">' + svg(I.lixo, 14) + '</button>') + '</div></div>';
    }).join('');
    return { t: base ? 'Alterar workflow base' : 'Alterar workflow', s: base ? 'Aplica-se às milestones novas.' : m.nome,
      b: (m ? '<div class="ps-aviso">Passos concluídos ficam bloqueados. No passo atual só muda o nome e o responsável.</div>' : '') + '<div class="ps-col">' + linhas + '</div><div class="ps-sp"><button type="button" class="ps-btn" data-a="wfAdd">Acrescentar passo</button>' + (m ? '<button type="button" class="ps-btn" data-a="wfRepor">Repor a partir do workflow base</button>' : '') + '</div>' + (base ? '<label class="ps-chk"><input id="wf-aplica" type="checkbox"> Aplicar também às milestones que ainda não começaram e não foram ajustadas</label>' : ''),
      p: '<button type="button" class="ps-btn" data-a="fecharPainel">Cancelar</button><button type="button" class="ps-btn pri" data-a="wfGuardar">Guardar workflow</button>', largo: true };
  };
  var pintarPainel = function () {
    var h = document.querySelector('[data-painel]');
    if (!h) return;
    if (!U.painel) { h.innerHTML = ''; h.hidden = true; document.body.style.overflow = ''; return; }
    var r = Pn[U.painel.tipo](U.painel.args);
    h.hidden = false;
    document.body.style.overflow = 'hidden';
    h.innerHTML = '<div class="ps-pan-f" data-a="fecharPainel"></div><div class="ps-pan ' + (r.largo ? 'largo' : '') + '" role="dialog" aria-modal="true" aria-labelledby="pan-t"><div class="ps-pan-h"><div><h2 id="pan-t" tabindex="-1">' + e(r.t) + '</h2>' + (r.s ? '<div class="ps-mut ps-small">' + e(r.s) + '</div>' : '') + '</div><button type="button" class="ps-x" data-a="fecharPainel" aria-label="Fechar">×</button></div><div class="ps-pan-b">' + r.b + '</div>' + (r.p ? '<div class="ps-pan-p">' + r.p + '</div>' : '') + '</div>';
    if (U.painelFoco) { U.painelFoco = false; var t = document.getElementById('pan-t'); if (t) t.focus(); }
  };

  /* --- Render e rotas ---------------------------------------------------- */
  var lerRota = function () {
    var pag, arg = '', q = {};
    if (MODO === 'mockup') {
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
    if (U.rota.q.sep) U.sep = U.rota.q.sep;
    else if (ant !== novo) U.sep = 'dados';
    U.menu = null; U.painel = null;
    var hd = document.querySelector('[data-cabecalho]');
    if (hd) hd.classList.remove('open');
    if (U.marca) { U.marca = null; U.logoEstado = ''; P.aplicarMarca(); }
    R();
    if (ant !== novo) window.scrollTo(0, 0);
    var alvo = U.rota.pag;
    if (MODO === 'mockup' && !location.hash && alvo !== 'Entrada') location.replace('#/' + alvo);
  };
  P.irPara = function (r) { if (MODO === 'mockup') { if (location.hash === '#/' + r) navegar(); else location.hash = '/' + r; } else location.href = rota(r); };
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
  var lerJSON = function (file, cb) { var r = new FileReader(); r.onload = function () { try { cb(JSON.parse(r.result)); } catch (x) { toast('O ficheiro não é um JSON válido.', 'err'); } }; r.readAsText(file); };

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
    lembrete: function () { var usr = u(), l = P.msCiclo().filter(function (m) { return P.estadoMs(m).cod === 'atraso'; }); l.forEach(function (m) { P.evento(m, 'Lembrete enviado à unidade.', usr.nome); }); P.guardar(); toast('Lembrete enviado a ' + l.length + ' milestones em atraso.', 'ok'); R(); },
    msVista: function (d) { U.msVista = d.v; R(); },
    sep: function (d) { U.sep = d.v; R(); },
    ficha: function (d) { abrePainel('ficha', { id: d.v }); },
    fecharPainel: function () { fechaPainel(); },
    abrirTecnica: function (d) { abrePainel('tecnica', { sec: d.v || 'schema' }); },
    tecSec: function (d) { U.painel.args.sec = d.v; R(); },
    schemaCopiar: function () { var t = JSON.stringify(P.jsonSchema(msAtual()), null, 2); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('JSON Schema copiado.', 'ok'); }, function () { toast('Não foi possível copiar. Use Descarregar.', 'err'); }); else toast('Não foi possível copiar. Use Descarregar.', 'err'); },
    schemaDesc: function () { var m = msAtual(); P.descarregar('schema-' + m.id + '.json', JSON.stringify(P.jsonSchema(m), null, 2), 'application/json'); },
    tplExcel: function () { P.templateExcel(msAtual()); },
    tplCsv: function () { P.templateCSV(msAtual()); },
    importar: function () { var m = msAtual(); escolherFicheiro('.xlsx,.csv,.json,.xls', function (f) { P.importarFicheiroM(m, f); }); },
    impExemplo: function () { var m = msAtual(), rel = P.validarImportacao(m, P.exemploImportacao(m)); rel.nome = 'exemplo-com-erros.xlsx'; U.imp[m.id] = rel; R(); },
    impAplicar: function () { var m = msAtual(), rel = U.imp[m.id], n = P.aplicarImportacao(m, rel, rel.nome, u()); delete U.imp[m.id]; toast(n + ' linhas aplicadas.', 'ok'); R(); },
    anexar: function (d) { var m = msAtual(), it = P.item(d.v, m.ano); escolherFicheiro('', function (f) { P.anexar(it, f.name, u()); P.evento(m, 'Evidência anexada em ' + P.cat(d.v).nome + ': ' + f.name + '.', u().nome); P.guardar(); toast('Evidência anexada.', 'ok'); R(); }); },
    anexarGeral: function () { var m = msAtual(), usr = u(); escolherFicheiro('', function (f) { m.documentos_gerais.push({ ficheiro: f.name, por: usr.nome, em: new Date().toISOString() }); P.evento(m, 'Documento geral anexado: ' + f.name + '.', usr.nome); P.guardar(); toast('Documento anexado.', 'ok'); R(); }); },
    submeter: function () {
      var m = msAtual(), r = P.submeter(m, u());
      if (r.erro) return toast(r.erro, 'err');
      if (r.faltas) {
        toast(r.faltas.length === 1 ? r.faltas[0].msg : 'Faltam ' + r.faltas.length + ' itens. ' + r.faltas[0].msg, 'err');
        var f = r.faltas[0], el = document.getElementById({ val: 'v-', just: 'j-', met: 'm-', evi: 'e-' }[f.campo] + f.id);
        if (el) el.focus();
        return;
      }
      toast('Milestone submetida.', 'ok'); R();
    },
    concluirPasso: function () { var m = msAtual(), t = P.passoAtual(m).tipo, r = P.concluirPasso(m, u(), val('rev-com')); res(r, t === 'parecer' ? 'Parecer dado.' : t === 'aprovacao' ? 'Valores aprovados e bloqueados.' : 'Revisão concluída.'); },
    devolver: function () { var r = P.devolver(msAtual(), u(), val('rev-com')); if (r.erro) { toast(r.erro, 'err'); var c = document.getElementById('rev-com'); if (c) c.focus(); return; } U.sep = 'dados'; toast('Milestone devolvida à unidade.', 'ok'); R(); },
    comentar: function () { var t = val('chat-txt').trim(), m = msAtual(); if (!t) return toast('Escreva um comentário.', 'err'); m.comentarios.push({ autor: u().nome, texto: t, em: new Date().toISOString() }); P.guardar(); R(); },
    pedirExt: function (d) { abrePainel('pedirExt', { id: d.v }); },
    pxCriar: function () { var r = P.criarPedidoExterno(msAtual(), val('px-ind'), val('px-ent'), val('px-desc'), val('px-prazo'), u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; toast('Pedido criado.', 'ok'); R(); },
    usarExt: function (d) { var x = S.ext.filter(function (y) { return y.id === d.v; })[0]; res(P.usarExterno(x, u()), 'Valor aplicado ao indicador.'); },
    enviarExt: function (d) { var x = S.ext.filter(function (y) { return y.id === d.v; })[0], fi = document.getElementById('xe-' + d.v), nome = fi && fi.files[0] ? fi.files[0].name : ''; res(P.responderExterno(x, val('xv-' + d.v), nome, u()), 'Valor enviado.'); },
    reexpressar: function (d) { var r = P.reexpressar(P.msDoIndicador(d.v), d.v, val('rx-val'), val('rx-mot'), u()); res(r, 'Valor reexpresso.'); },
    pedidoAud: function (d) { res(P.criarPedidoAuditor(d.v, val('pa-txt'), u()), 'Pedido enviado à unidade.'); },
    novoPedAud: function () { abrePainel('novoPedAud'); },
    naCriar: function () { var r = P.criarPedidoAuditor(val('na-ind'), val('na-txt'), u()); if (r.erro) return toast(r.erro, 'err'); U.painel = null; toast('Pedido enviado à unidade.', 'ok'); R(); },
    responderAud: function (d) { var a = S.aud.filter(function (x) { return x.id === d.v; })[0]; res(P.responderAuditor(a, val('ra-' + d.v), u()), 'Resposta enviada ao auditor.'); },
    resolverAud: function (d) { var a = S.aud.filter(function (x) { return x.id === d.v; })[0]; res(P.resolverAuditor(a, u()), 'Pedido resolvido.'); },
    amostra: function () { res(P.sortearAmostra(u()), 'Amostra de 5 indicadores selecionada.'); },
    dataRoom: function () { P.exportarDataRoom(); toast('Data room exportada.', 'ok'); },
    audFiltro: function (d) { U.audFiltro = d.v; R(); },
    relExcel: function () { P.exportarRelatorio(); },
    imprimir: function () { window.print(); },
    histJson: function () { P.descarregar('valores-aprovados.json', JSON.stringify(P.valoresAprovados(), null, 2), 'application/json'); },
    docNova: function () { U.docNova = !U.docNova; R(); },
    docGuardar: function () {
      var cons = P.lerNumero(val('nf-consumo')), v = P.lerNumero(val('nf-valor')), iva = P.lerNumero(val('nf-iva'));
      if (!val('nf-fornecedor').trim() || !val('nf-periodo').trim() || !val('nf-instalacao').trim() || cons === null || v === null || iva === null) return toast('Preencha fornecedor, período, instalação, consumo, valor e IVA.', 'err');
      S.docs.unshift({ id: 'D' + Date.now(), tipo: val('nf-tipo'), fornecedor: val('nf-fornecedor').trim(), periodo: val('nf-periodo').trim(), instalacao: val('nf-instalacao').trim(), entidade: val('nf-entidade'), consumo: cons, valor_sem_iva: v, iva: iva, percentagem_renovavel: P.lerNumero(val('nf-renov')), centro_custo: val('nf-cc').trim(), leitura_telemetria: P.lerNumero(val('nf-tele')), estado: 'em conferência' });
      U.docNova = false; P.guardar(); toast('Fatura guardada em conferência.', 'ok'); R();
    },
    distribuir: function (d) { var x = S.docs.filter(function (y) { return y.id === d.v; })[0]; x.estado = 'distribuída'; P.guardar(); toast('Fatura distribuída.', 'ok'); R(); },
    boTab: function (d) { if (U.marca) { U.marca = null; U.logoEstado = ''; P.aplicarMarca(); } U.boTab = d.v; R(); },
    abrirCiclo: function () { if (!window.confirm('Abrir o ciclo de ' + (S.ciclo.ano + 1) + '? O ciclo atual fica fechado.')) return; var r = P.abrirCiclo(u()); if (res(r, 'Ciclo de ' + r.ano + ' aberto com ' + r.criadas + ' milestones.')) { U.cal = null; } },
    userNovo: function () { var l = val('nu-login').trim(), n = val('nu-nome').trim(); if (!l || !n) return toast('Indique o nome e o login.', 'err'); if (P.user(l)) return toast('Esse login já existe.', 'err'); S.users.push({ login: l, nome: n, perfil: val('nu-perfil'), unidade: val('nu-un') }); P.guardar(); toast('Utilizador adicionado.', 'ok'); R(); },
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
        U.painel = null; toast('Workflow base guardado' + (r.aplicadas ? ' e aplicado a ' + r.aplicadas + ' milestones.' : '.'), 'ok'); return R();
      }
      var q = P.guardarWorkflow(msAtual(), U.wfDraft, u());
      if (q.erro) return toast(q.erro, 'err');
      U.painel = null; toast('Workflow guardado.', 'ok'); R();
    },
    janNova: function () { S.janelas.push({ nome: 'Nova janela', tema: 'Governance', meses: [1], dia_inicio: 1, dia_fim: 10 }); P.guardar(); R(); },
    janApagar: function (d) { S.janelas.splice(+d.v, 1); P.guardar(); R(); },
    entNova: function () { S.ent.push({ nome: 'Nova entidade', perimetro_grupo: true, perimetro_maioritario: false }); P.guardar(); R(); },
    mcPaleta: function (d) { U.marca.cores = JSON.parse(JSON.stringify(P.PALETAS[+d.v].cores)); P.aplicarMarca(Object.assign({}, U.marca)); R(); },
    mcGuardar: function () {
      var r = P.guardarMarca(JSON.parse(JSON.stringify(U.marca)));
      if (r.erro) return toast(r.erro, 'err');
      toast('Marca guardada. Já se aplica a toda a plataforma.', 'ok'); R();
    },
    mcExportar: function () { P.descarregar('marca.json', JSON.stringify(S.marca, null, 2), 'application/json'); },
    mcImportar: function () { escolherFicheiro('.json', function (f) { lerJSON(f, function (o) { var e2 = P.validarMarca(o); if (e2) return toast(e2, 'err'); U.marca = { nome: String(o.nome || P.MARCA_BASE.nome), subtitulo: String(o.subtitulo || ''), logotipo: String(o.logotipo || ''), cores: o.cores }; P.aplicarMarca(U.marca); toast('Marca importada. Confirme e guarde.', 'ok'); R(); }); }); },
    mcRepor: function () { U.marca = JSON.parse(JSON.stringify(P.MARCA_BASE)); U.logoEstado = ''; P.aplicarMarca(U.marca); toast('Valores originais repostos. Confirme e guarde.'); R(); },
    dadosExportar: function () { P.descarregar('portal-dados.json', JSON.stringify(P.exportarTudo(), null, 2), 'application/json'); },
    dadosImportar: function () { if (P.online()) return toast('Online, os dados vivem na base de dados e não se substituem por ficheiro.', 'err'); escolherFicheiro('.json', function (f) { lerJSON(f, function (o) { var er = P.importarTudo(o); if (er) return toast(er, 'err'); toast('Dados importados.', 'ok'); U.marca = null; R(); }); }); },
    dadosRepor: function () { if (P.online()) return toast('Online, a demonstração não se repõe a partir do navegador.', 'err'); if (!window.confirm('Repor os dados de demonstração? Perde todas as alterações feitas neste navegador.')) return; P.reporDemonstracao(); P.aplicarMarca(); U.marca = null; U.imp = {}; toast('Demonstração reposta.', 'ok'); R(); }
  };

  /* --- Campos (mudanca) -------------------------------------------------- */
  var mudouMarca = function () { P.aplicarMarca(U.marca); agendar(); };
  var C = {
    valor: function (el) { var m = msAtual(); P.gravarValor(m, el.dataset.id, el.value, u()); },
    just: function (el) { P.item(el.dataset.id, msAtual().ano).justificacao = el.value; P.guardar(); },
    qual: function (el) { var it = P.item(el.dataset.id, msAtual().ano); it.qualidade = el.value; if (el.value !== 'estimado') it.metodo = ''; P.guardar(); },
    metodo: function (el) { P.item(el.dataset.id, msAtual().ano).metodo = el.value; P.guardar(); },
    msUnidade: function (el) { U.msFiltro.unidade = el.value; },
    msEstado: function (el) { U.msFiltro.estado = el.value; },
    msEsrs: function (el) { U.msFiltro.esrs = el.checked; },
    consEsrs: function (el) { U.consEsrs = el.checked; },
    histInd: function (el) { U.histInd = el.value; },
    indBusca: function (el) { U.indBusca = el.value; },
    regraBusca: function (el) { U.regraBusca = el.value; },
    evObrig: function (el) { P.cat(el.dataset.id).evidencia_obrigatoria = el.checked; P.guardar(); },
    msPrazo: function (el) { if (el.value) { var m = P.ms(el.dataset.id); m.prazo = el.value; P.evento(m, 'Prazo alterado para ' + P.fmtData(el.value) + '.', u().nome); P.guardar(); } },
    matAval: function (el) { S.mat.filter(function (x) { return x.norma === el.dataset.id; })[0].avaliacao = el.value; P.guardar(); },
    matJust: function (el) { S.mat.filter(function (x) { return x.norma === el.dataset.id; })[0].justificacao = el.value; P.guardar(); },
    userPerfil: function (el) { P.user(el.dataset.id).perfil = el.value; P.guardar(); },
    userUnidade: function (el) { P.user(el.dataset.id).unidade = el.value; P.guardar(); },
    limiar: function (el) { var n = Number(el.value); if (el.value !== '' && n >= 0) { P.cat(el.dataset.id).limiar_variacao_pct = n; P.guardar(); } },
    janNome: function (el) { S.janelas[+el.dataset.id].nome = el.value; P.guardar(); },
    janTema: function (el) { S.janelas[+el.dataset.id].tema = el.value; P.guardar(); },
    janMeses: function (el) { var l = el.value.split(/[,;\s]+/).map(Number).filter(function (x) { return x >= 1 && x <= 12; }); if (l.length) { S.janelas[+el.dataset.id].meses = l; P.guardar(); } else toast('Indique meses de 1 a 12.', 'err'); },
    janIni: function (el) { var n = +el.value; if (n >= 1 && n <= 31) { S.janelas[+el.dataset.id].dia_inicio = n; P.guardar(); } },
    janFim: function (el) { var n = +el.value; if (n >= 1 && n <= 31) { S.janelas[+el.dataset.id].dia_fim = n; P.guardar(); } },
    areaNome: function (el) { S.areas[+el.dataset.id].nome = el.value; P.guardar(); },
    areaUso: function (el) { S.areas[+el.dataset.id].uso = el.value; P.guardar(); },
    entNome: function (el) { S.ent[+el.dataset.id].nome = el.value; P.guardar(); },
    entGrupo: function (el) { S.ent[+el.dataset.id].perimetro_grupo = el.checked; P.guardar(); },
    entMaior: function (el) { S.ent[+el.dataset.id].perimetro_maioritario = el.checked; P.guardar(); },
    wfNome: function (el) { U.wfDraft[+el.dataset.id].nome = el.value; },
    wfResp: function (el) { U.wfDraft[+el.dataset.id].responsavel = el.value; },
    wfTipo: function (el) { var p = U.wfDraft[+el.dataset.id]; p.tipo = el.value; if (el.value !== 'parecer' && p.responsavel.indexOf('area:') === 0) p.responsavel = 'esg'; },
    mcLogo: function (el) {
      var v = el.value.trim();
      if (!P.urlLogoValida(v)) { U.logoEstado = 'O link tem de começar por http:// ou https://.'; return; }
      U.marca.logotipo = v; U.logoEstado = v ? 'A carregar a imagem.' : '';
    },
    mcNome: function (el) { U.marca.nome = el.value; },
    mcSub: function (el) { U.marca.subtitulo = el.value; },
    mcCorT: function (el) { if (/^#[0-9a-fA-F]{6}$/.test(el.value)) { U.marca.cores[el.dataset.id] = el.value; P.aplicarMarca(U.marca); } else toast('Use uma cor no formato #RRGGBB.', 'err'); }
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
        else { var s = document.createElement('span'); s.className = 'ps-marca-mono'; s.setAttribute('aria-hidden', 'true'); s.textContent = iniciais(nomeMarca()).toUpperCase(); t.replaceWith(s); }
      } else if (t.hasAttribute('data-logo-prev')) {
        U.logoEstado = 'Não foi possível carregar a imagem deste link. Confirme que o link abre a imagem diretamente.';
        var el = document.getElementById('logo-estado'); if (el) el.textContent = U.logoEstado;
        var c = document.querySelector('[data-campo="logo-prev"]'); if (c) c.textContent = 'Imagem indisponível';
      } else if (t.hasAttribute('data-logo-mini')) { t.remove(); }
    }, true);
    document.addEventListener('load', function (ev2) {
      var t = ev2.target;
      if (t && t.tagName === 'IMG' && t.hasAttribute('data-logo-prev')) {
        U.logoEstado = 'Imagem carregada. Ao guardar, este logótipo passa a aparecer em toda a plataforma.';
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
    if (txtPerfis) txtPerfis.textContent = 'Entrar';
    var notaPerfis = document.querySelector('.ps-ent-dir > p');
    if (notaPerfis) notaPerfis.textContent = 'Use o email e a palavra-passe da sua conta.';
    B.aoFalhar = function (x) {
      toast('Não foi possível guardar: ' + x.message + ' Mostramos de novo os dados da base de dados.', 'err');
      return B.carregar(S).then(function () { P.aplicarMarca(); R(); });
    };
    var aposLogin = function () {
      return B.carregar(S).then(function (login) {
        if (!login) { B.sair(); P.estadoVazio(); throw new Error('Esta conta ainda não tem perfil no portal. Fale com o administrador.'); }
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
        U.loginErro = x.codigo === 'invalid_credentials' ? 'Email ou palavra-passe incorretos.' : x.message;
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
  document.addEventListener('DOMContentLoaded', P.iniciar);
})();
