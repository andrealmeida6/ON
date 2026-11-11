/* ============================================================================
   portal-chat.js - comentarios nas milestones e nos indicadores, e o chat
   Cada comentario guarda o passo do workflow em que a milestone estava e,
   quando e sobre um indicador, o indicador. O chat (botao no canto inferior
   direito) mostra uma conversa por milestone, como uma app de mensagens.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, S = P.S, X = P.ext;
  var A = X.A, C = X.C, U = X.U, e = X.e, svg = X.svg, I = X.I, rota = X.rota, toast = X.toast, R = X.R, u = X.u;

  /* --- Modelo ---------------------------------------------------------------- */
  var passoDe = function (m) { var p = P.passoAtual(m); return p ? p.nome : 'Completed'; };
  P.passoDoComentario = passoDe;
  P.comentar = function (m, usr, texto, indId) {
    var t = String(texto || '').trim();
    if (!t) return { erro: 'Write a comment.' };
    if (!usr) return { erro: 'Sign in to comment.' };
    var c = { autor: usr.nome, texto: t, em: new Date().toISOString(), passo: passoDe(m) };
    if (indId) c.indicador = indId;
    m.comentarios.push(c);
    P.guardar();
    return { ok: true, comentario: c };
  };
  P.comentariosDe = function (m, indId) { return (m.comentarios || []).filter(function (c) { return !indId || c.indicador === indId; }); };
  /* As milestones de cada pessoa: quem gere e o auditor veem todas; um departamento ve as suas e as que tem passos seus */
  P.msDoChat = function (usr) {
    if (!usr || usr.perfil === 'ext') return [];
    return P.msCiclo().filter(function (m) {
      if (P.gereTudo(usr) || usr.perfil === 'auditor') return true;
      if ((S.ext || []).some(function (x) { return x.tipo === 'ajuda' && x.para === usr.login && x.milestone_id === m.id; })) return true;
      return P.unidadesDe(usr).some(function (un) { return m.unidade === un || (m.departamentos || []).indexOf(un) > -1 || m.passos.some(function (p) { return p.responsavel === 'area:' + un; }); });
    });
  };
  /* Lidas: so neste navegador, por pessoa */
  var CH = (P.prefixo || '') + 'esg_chat_read', lidos = {};
  try { lidos = JSON.parse(localStorage.getItem(CH)) || {}; } catch (x) { lidos = {}; }
  var gravarLidos = function () { try { localStorage.setItem(CH, JSON.stringify(lidos)); } catch (x) { /* fica em memoria */ } };
  var porLer = function (m, usr) { var l = (lidos[usr.login] || {})[m.id] || ''; return (m.comentarios || []).filter(function (c) { return c.autor !== usr.nome && c.em > l; }).length; };
  var marcarLida = function (m, usr) { lidos[usr.login] = lidos[usr.login] || {}; lidos[usr.login][m.id] = new Date().toISOString(); gravarLidos(); };
  P.chatPorLer = function (usr) { return P.msDoChat(usr).reduce(function (n, m) { return n + porLer(m, usr); }, 0); };

  /* --- Pecas comuns -------------------------------------------------------- */
  var COR = ['#00338D', '#1E49E2', '#0C8A7B', '#7213EA', '#B5480B', '#00788C', '#AB0D82', '#3D6B00', '#6B4E00', '#2B5797', '#8A1538'];
  var cor = function (s) { var h = 0; String(s).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return COR[h % COR.length]; };
  var sigla = function (un) { return String(un).split(/[\s,&]+/).filter(function (w) { return w.length > 2 || /^[A-Z]/.test(w); }).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); };
  var hora = function (iso) { var d = new Date(iso), hj = new Date(); if (d.toDateString() === hj.toDateString()) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); var on = new Date(hj.getTime() - 864e5); if (d.toDateString() === on.toDateString()) return 'Yesterday'; return P.fmtData(iso.slice(0, 10)); };
  var dia = function (iso) { var d = new Date(iso), hj = new Date(); if (d.toDateString() === hj.toDateString()) return 'Today'; var on = new Date(hj.getTime() - 864e5); if (d.toDateString() === on.toDateString()) return 'Yesterday'; return P.fmtDataAno(iso); };
  /* Tags de uma mensagem: o passo do workflow e o indicador */
  var tagsMsg = function (c) {
    return (c.passo ? '<span class="ps-cm-passo" title="Workflow step when the comment was written">' + svg(I.relogio || I.cal, 11) + e(c.passo) + '</span>' : '') +
      (c.indicador ? '<span class="ps-cm-ind" title="' + e((P.cat(c.indicador) || {}).nome || '') + '">' + e(c.indicador) + '</span>' : '');
  };
  P.htmlMensagens = function (lista, usr, compacto) {
    var ult = '', html = '';
    lista.forEach(function (c) {
      var d = dia(c.em), eu = c.autor === usr.nome;
      if (!compacto && d !== ult) { html += '<li class="ps-cm-dia"><span>' + e(d) + '</span></li>'; ult = d; }
      html += '<li class="ps-cm' + (eu ? ' eu' : '') + (c.sistema ? ' sis' : '') + '">' + (eu ? '' : '<b style="--c:' + cor(c.autor) + '">' + e(c.autor) + '</b>') + '<p>' + e(c.texto) + '</p><span class="ps-cm-rod">' + tagsMsg(c) + '<time datetime="' + e(c.em) + '">' + e(compacto ? P.fmtDataHora(c.em) : new Date(c.em).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) + '</time></span></li>';
    });
    return html;
  };
  var compositor = function (pref, m, indFixo) {
    var inds = m.indicadores;
    return '<div class="ps-cm-comp"><div class="ps-cm-comp-t"><span class="ps-cm-passo agora" title="This comment will be tagged with the current step">' + svg(I.relogio || I.cal, 11) + e(passoDe(m)) + '</span>' +
      (indFixo ? '<span class="ps-cm-ind">' + e(indFixo) + '</span>' : '<label class="ps-sr" for="' + pref + '-ind">About</label><select id="' + pref + '-ind" class="ps-cm-sel" data-c="cmInd" data-id="' + pref + '"><option value="">Whole task</option>' + inds.map(function (id) { return '<option value="' + e(id) + '"' + ((U.cmInd || {})[pref] === id ? ' selected' : '') + '>' + e(id + ': ' + P.cat(id).nome) + '</option>'; }).join('') + '</select>') + '</div>' +
      '<div class="ps-cm-comp-b"><label class="ps-sr" for="' + pref + '-txt">Message</label><textarea id="' + pref + '-txt" class="ps-cm-txt" rows="1" placeholder="Write a message" data-enviar="' + pref + '">' + e((U.cmRasc || {})[pref] || '') + '</textarea>' +
      '<button type="button" class="ps-cm-env" data-a="cmEnviar" data-v="' + pref + '" aria-label="Send">' + svg('<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/>', 18) + '</button></div></div>';
  };

  /* --- Conversa na milestone ----------------------------------------------- */
  X.sepConversa = function (m) {
    var usr = u(), lista = P.comentariosDe(m);
    var evs = m.eventos.slice().reverse().map(function (x) { return '<li>' + e(x.texto) + '<small>' + P.quemHtml(x.por) + ', ' + e(P.fmtDataHora(x.em)) + '</small></li>'; }).join('');
    return '<div class="ps-card">' + X.cabCartao('Conversation', 'ativ', '<button type="button" class="ps-btn liga" data-a="chatAbrir" data-v="' + e(m.id) + '">Open in chat</button>') +
      '<ul class="ps-cm-lista ps-cm-ms" aria-label="Comments">' + (P.htmlMensagens(lista, usr) || '<li class="ps-cm-vazio">No comments yet. Each comment is tagged with the workflow step it was written in.</li>') + '</ul>' + compositor('msc', m) + '</div>' +
      '<div class="ps-card">' + X.cabCartao('History', 'cal') + '<ul class="ps-ev">' + evs + '</ul></div>';
  };
  /* Botao de comentarios de cada indicador, na lista do pedido de dados */
  P.botaoComentarInd = function (m, id) {
    var n = P.comentariosDe(m, id).length;
    return '<button type="button" class="ps-cm-bt' + (n ? ' tem' : '') + '" data-a="cmIndAbrir" data-v="' + e(id) + '" aria-label="' + (n ? n + ' comment(s) on ' : 'Comment on ') + e(id) + '" title="Comments on this indicator">' + svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 15) + (n ? '<span>' + n + '</span>' : '') + '</button>';
  };
  X.Pn.comInd = function (a) {
    var m = P.ms(a.m), c = P.cat(a.id), usr = u(), lista = P.comentariosDe(m, a.id);
    return {
      t: c.nome, s: a.id + ': ' + m.nome,
      b: '<ul class="ps-cm-lista ps-cm-pan" aria-label="Comments on ' + e(c.nome) + '">' + (P.htmlMensagens(lista, usr) || '<li class="ps-cm-vazio">No comments on this indicator yet.</li>') + '</ul>' + compositor('cmi', m, a.id),
      p: '<button type="button" class="ps-btn liga" data-a="chatAbrir" data-v="' + e(m.id) + '">See the whole conversation</button><span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fecharPainel">Close</button>'
    };
  };

  /* --- Chat: uma conversa por milestone ------------------------------------- */
  var estado = function () { return U.chat || (U.chat = { aberto: false, ms: null, q: '', filtro: 'todas' }); };
  P.pintarChat = function () {
    var raiz = document.querySelector('[data-chatapp]'), usr = u();
    if (!raiz) return;
    if (!usr || usr.perfil === 'ext' || document.body.classList.contains('ps-sem-sessao')) { raiz.innerHTML = ''; return; }
    var st = estado(), n = P.chatPorLer(usr);
    var fab = '<button type="button" class="ps-chat-fab' + (st.aberto ? ' on' : '') + '" data-a="chatToggle" aria-expanded="' + st.aberto + '" aria-controls="ps-chat-jan" aria-label="' + (st.aberto ? 'Close chat' : 'Open chat' + (n ? ', ' + n + ' unread' : '')) + '">' +
      (st.aberto ? svg('<path d="M18 6 6 18M6 6l12 12"/>', 22) : svg('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>', 24)) + (n && !st.aberto ? '<span class="ps-chat-fab-n">' + (n > 99 ? '99+' : n) + '</span>' : '') + '</button>';
    if (!st.aberto) { raiz.innerHTML = fab; return; }
    var scrollAnt = raiz.querySelector('.ps-ch-msgs'), noFundo = !scrollAnt || scrollAnt.scrollHeight - scrollAnt.scrollTop - scrollAnt.clientHeight < 40, sy = scrollAnt ? scrollAnt.scrollTop : 0, msAnt = raiz.getAttribute('data-ms');
    var lista = P.msDoChat(usr), q = (st.q || '').toLowerCase();
    var ult = function (m) { var l = m.comentarios || []; return l.length ? l[l.length - 1] : null; };
    var conv = lista.filter(function (m) {
      if (q && (m.nome + ' ' + m.unidade + ' ' + P.rotPeriodo(m)).toLowerCase().indexOf(q) < 0) return false;
      if (st.filtro === 'porLer') return porLer(m, usr) > 0;
      if (st.filtro === 'comigo') return P.esperaPor(m, usr);
      if (st.filtro === 'ativas') return (m.comentarios || []).length > 0;
      return true;
    }).sort(function (a, b) { var x = ult(a), y = ult(b); if (x && y) return x.em < y.em ? 1 : -1; if (x) return -1; if (y) return 1; return a.prazo < b.prazo ? -1 : 1; });
    var ativa = st.ms ? P.ms(st.ms) : null;
    if (ativa) marcarLida(ativa, usr);
    var itens = conv.map(function (m) {
      var l = ult(m), k = porLer(m, usr), est = P.estadoMs(m);
      return '<li><button type="button" class="ps-ch-it' + (ativa && ativa.id === m.id ? ' on' : '') + '" data-a="chatMs" data-v="' + e(m.id) + '">' +
        '<span class="ps-ch-av" style="--c:' + cor(m.unidade) + '" aria-hidden="true">' + e(sigla(m.unidade)) + '</span>' +
        '<span class="ps-ch-it-c"><span class="ps-ch-it-l1"><b>' + e(m.nome) + '</b><time>' + (l ? e(hora(l.em)) : '') + '</time></span>' +
        '<span class="ps-ch-it-l2"><span class="ps-ch-prev">' + (l ? (l.autor === usr.nome ? 'You: ' : e(l.autor.split(' ')[0]) + ': ') + e(l.texto) : '<i>' + e(est.txt) + ', no messages yet</i>') + '</span>' + (k ? '<span class="ps-ch-n" aria-label="' + k + ' unread">' + k + '</span>' : '') + '</span></span></button></li>';
    }).join('');
    var FILTROS = [['todas', 'All'], ['ativas', 'With messages'], ['porLer', 'Unread'], ['comigo', 'With me']];
    var esq = '<div class="ps-ch-esq"><div class="ps-ch-esq-h"><h2>Chats</h2><span>' + lista.length + ' tasks</span></div>' +
      '<div class="ps-ch-pesq"><label class="ps-sr" for="ch-q">Search tasks</label>' + svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 15) + '<input id="ch-q" placeholder="Search tasks" value="' + e(st.q || '') + '" data-c="chatQ" autocomplete="off"></div>' +
      '<div class="ps-ch-filt" role="tablist" aria-label="Filter chats">' + FILTROS.map(function (f) { return '<button type="button" role="tab" aria-selected="' + (st.filtro === f[0]) + '" class="' + (st.filtro === f[0] ? 'on' : '') + '" data-a="chatFiltro" data-v="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<ul class="ps-ch-lista">' + (itens || '<li class="ps-ch-nada">No tasks match.</li>') + '</ul></div>';
    var dir;
    if (!ativa) dir = '<div class="ps-ch-dir vazio"><div>' + svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 40) + '<h3>One chat per task</h3><p>Pick a task to talk with the people working on it. Every message is tagged with the workflow step the task was in.</p></div></div>';
    else {
      var est = P.estadoMs(ativa), msgs = P.comentariosDe(ativa);
      dir = '<div class="ps-ch-dir"><div class="ps-ch-dir-h"><button type="button" class="ps-ch-volta" data-a="chatVolta" aria-label="Back to chats">' + svg('<path d="m15 18-6-6 6-6"/>', 20) + '</button>' +
        '<span class="ps-ch-av" style="--c:' + cor(ativa.unidade) + '" aria-hidden="true">' + e(sigla(ativa.unidade)) + '</span><div class="ps-ch-dir-t"><b>' + e(ativa.nome) + '</b><span>' + (P.tagPer ? P.tagPer(ativa) : '') + ' ' + e(ativa.unidade) + ', ' + e(est.txt) + '</span></div>' +
        '<a class="ps-btn peq" href="' + rota('Milestone/' + ativa.id) + '" data-a="chatIr">Open</a></div>' +
        '<ul class="ps-cm-lista ps-ch-msgs" aria-label="Messages" aria-live="polite">' + (P.htmlMensagens(msgs, usr) || '<li class="ps-cm-vazio">No messages yet. Say what you need: the message is tagged with “' + e(passoDe(ativa)) + '”.</li>') + '</ul>' + compositor('chc', ativa) + '</div>';
    }
    raiz.setAttribute('data-ms', ativa ? ativa.id : '');
    raiz.innerHTML = fab + '<section id="ps-chat-jan" class="ps-ch' + (ativa ? ' com-ms' : '') + '" role="dialog" aria-label="Task chats">' + esq + dir + '</section>';
    var ms = raiz.querySelector('.ps-ch-msgs');
    if (ms) ms.scrollTop = noFundo || msAnt !== (ativa && ativa.id) ? ms.scrollHeight : sy;
  };

  /* --- Acoes ------------------------------------------------------------------ */
  var enviar = function (pref) {
    var usr = u(), m = pref === 'chc' ? P.ms(estado().ms) : X.msAtual(), el = document.getElementById(pref + '-txt');
    if (!m || !el) return;
    var ind = pref === 'cmi' ? U.painel && U.painel.args.id : (U.cmInd || {})[pref] || null;
    var r = P.comentar(m, usr, el.value, ind);
    if (r.erro) return toast(r.erro, 'err');
    el.value = ''; if (U.cmRasc) delete U.cmRasc[pref];
    if (pref === 'chc') marcarLida(m, usr);
    R();
    var n = document.getElementById(pref + '-txt'); if (n) n.focus({ preventScroll: true });
  };
  A.cmEnviar = function (d) { enviar(d.v); };
  A.cmIndAbrir = function (d) { X.abrePainel('comInd', { m: X.msAtual().id, id: d.v }); };
  A.chatToggle = function () { var st = estado(); st.aberto = !st.aberto; document.body.classList.toggle('ps-chat-aberto', st.aberto); R(); if (st.aberto) { var q = document.getElementById(st.ms ? 'chc-txt' : 'ch-q'); if (q) q.focus({ preventScroll: true }); } };
  A.chatAbrir = function (d) { var st = estado(); st.aberto = true; st.ms = d.v; U.painel = null; document.body.classList.add('ps-chat-aberto'); R(); };
  A.chatMs = function (d) { estado().ms = d.v; R(); var t = document.getElementById('chc-txt'); if (t && window.matchMedia('(min-width:721px)').matches) t.focus({ preventScroll: true }); };
  A.chatVolta = function () { estado().ms = null; R(); };
  A.chatFiltro = function (d) { estado().filtro = d.v; R(); };
  A.chatIr = function () { var st = estado(); st.aberto = false; document.body.classList.remove('ps-chat-aberto'); };
  C.chatQ = function (el) { estado().q = el.value; };
  C.cmInd = function (el) { U.cmInd = U.cmInd || {}; U.cmInd[el.dataset.id] = el.value; };
  /* Enter envia; Shift+Enter muda de linha. A pesquisa filtra enquanto se escreve. */
  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (t && t.getAttribute && t.getAttribute('data-enviar') && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); enviar(t.getAttribute('data-enviar')); }
    if (ev.key === 'Escape' && estado().aberto && !U.painel) { estado().aberto = false; document.body.classList.remove('ps-chat-aberto'); R(); }
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t && t.id === 'ch-q') { estado().q = t.value; var pos = t.selectionStart; R(); var n = document.getElementById('ch-q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* sem selecao */ } } }
    if (t && t.classList && t.classList.contains('ps-cm-txt')) { U.cmRasc = U.cmRasc || {}; U.cmRasc[t.getAttribute('data-enviar')] = t.value; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }
  });
})();
