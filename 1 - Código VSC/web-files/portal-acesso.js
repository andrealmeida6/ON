/* ============================================================================
   portal-acesso.js - entrada so com nome de utilizador (site do GitHub Pages)
   Antes de abrir a plataforma pede o utilizador. Sem palavra-passe: o nome e
   confirmado no Supabase (esg_acesso_entrar, 018_esg_acessos.sql) e, se existir
   e estiver ativo, entra-se com o nome, o perfil, os departamentos e as empresas
   dessa pessoa. Depois continua a poder trocar-se de perfil pelo avatar.
   So liga com window.PORTAL_ACESSO (index.html). O mockup e o Power Pages nao o usam.
   Nao e seguranca forte: serve para limitar quem abre o ambiente de testes.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal, CFG = window.PORTAL_PARTILHA;
  if (!P || !window.PORTAL_ACESSO || !CFG || !CFG.url || !CFG.chave || P.online()) return;
  var CHAVE = 'esg_acesso', acesso = null;
  var lerAcesso = function () { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { return null; } };
  var gravarAcesso = function (a) { try { localStorage.setItem(CHAVE, JSON.stringify(a)); } catch (e) { /* fica so nesta janela */ } };
  var esquecerAcesso = function () { try { localStorage.removeItem(CHAVE); } catch (e) { /* nada a limpar */ } };

  /* Confirma o nome no Supabase: devolve a pessoa, null se nao tem acesso, ou erro se a rede falhar */
  var confirmar = function (utilizador) {
    return fetch(CFG.url + '/rest/v1/rpc/esg_acesso_entrar', {
      method: 'POST',
      headers: { apikey: CFG.chave, Authorization: 'Bearer ' + CFG.chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_utilizador: utilizador })
    }).then(function (r) {
      if (!r.ok) throw new Error('Supabase ' + r.status);
      return r.text().then(function (t) { var v = t ? JSON.parse(t) : null; return v && v.login ? v : null; });
    });
  };

  /* A pessoa que entrou passa a existir na lista de pessoas da plataforma, com o perfil e as empresas do acesso */
  var garantirPessoa = function () {
    var S = P.S;
    if (!acesso || !S || !S.users) return;
    var x = P.user(acesso.login), antes = x ? JSON.stringify(x) : '';
    if (!x) { x = { login: acesso.login }; S.users.push(x); }
    x.nome = acesso.nome;
    x.perfil = acesso.perfil;
    x.empresas = (acesso.empresas || []).slice();
    P.definirUnidades(x, acesso.unidades || []);
    if (JSON.stringify(x) !== antes && P.guardar) P.guardar();
  };
  /* Ao carregar os dados, e quando chegam dados de outros navegadores (ambiente partilhado) */
  var carregar = P.carregar;
  P.carregar = function () { var r = carregar.apply(this, arguments); garantirPessoa(); return r; };
  var migrar = P.migrarDados;
  if (migrar) P.migrarDados = function () { var r = migrar.apply(this, arguments); garantirPessoa(); return r; };

  /* Ecra de entrada: cobre a pagina ate o nome ser confirmado */
  var mostrarEcra = function (fim) {
    var el = document.createElement('div');
    el.className = 'ps-acesso';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'ac-tit');
    el.innerHTML = '<div class="ps-ent"><div class="ps-ent-esq ps-fundo-marca"><div><b class="ps-acesso-marca">ESG Data Hub</b>' +
      '<h1>Record once, report with confidence.</h1><p>Access is limited to invited people.</p></div></div>' +
      '<div class="ps-ent-dir"><h2 id="ac-tit">Sign in</h2><p class="ps-mut">Enter your username or email.</p>' +
      '<form class="ps-login" data-acesso-form novalidate><div class="ps-campo"><label class="ps-lab" for="ac-user">Username or email</label>' +
      '<input id="ac-user" class="ps-in" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
      '<div class="ps-aviso err" role="alert" data-acesso-erro hidden></div>' +
      '<button type="submit" class="ps-btn pri">Continue</button></form></div></div>';
    document.body.appendChild(el);
    document.body.classList.add('ps-acesso-on');
    var form = el.querySelector('form'), input = el.querySelector('input'), btn = el.querySelector('button'), erro = el.querySelector('[data-acesso-erro]');
    var aviso = function (t) { erro.textContent = t; erro.hidden = !t; };
    input.focus();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nome = input.value.trim();
      if (!nome) { aviso('Enter your username or email.'); return; }
      btn.disabled = true; btn.textContent = 'Checking'; aviso('');
      confirmar(nome).then(function (a) {
        btn.disabled = false; btn.textContent = 'Continue';
        if (!a) { aviso('This user has no access. Ask the platform owner to add you.'); input.select(); return; }
        gravarAcesso(a);
        /* Quem entra comeca como si proprio, mesmo que esta janela tivesse outro perfil escolhido */
        P.sair();
        el.remove();
        document.body.classList.remove('ps-acesso-on');
        fim(a);
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Continue';
        aviso('Could not check the user. Check your connection and try again.');
      });
    });
  };

  var garantirAcesso = function () {
    return new Promise(function (ok) {
      var fim = function (a) { acesso = a; window.PORTAL_ENTRADA_DIRETA = a.login; ok(); };
      var guardado = lerAcesso();
      if (!guardado || !guardado.login) return mostrarEcra(fim);
      /* Volta a confirmar em cada visita: se o acesso foi retirado, pede o nome outra vez */
      confirmar(guardado.login).then(function (a) {
        if (a) { gravarAcesso(a); fim(a); } else { esquecerAcesso(); P.sair(); mostrarEcra(fim); }
      }).catch(function () { fim(guardado); });
    });
  };
  /* Corre antes de tudo o resto do arranque, incluindo o ambiente partilhado */
  var antes = P.antesIniciar;
  P.antesIniciar = function () { return garantirAcesso().then(function () { return antes ? antes() : null; }); };

  /* Sair de vez: esquece o utilizador e volta ao ecra de entrada */
  window.PortalAcesso = { nome: function () { return acesso ? acesso.nome : ''; } };
  if (P.ext && P.ext.A) P.ext.A.acessoSair = function () { esquecerAcesso(); P.sair(); location.reload(); };
})();
