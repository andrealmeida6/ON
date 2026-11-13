/* ============================================================================
   portal-app.js - instalar como aplicacao (PWA)
   Regista o service worker para o browser mostrar "Instalar aplicacao" (Edge, Chrome)
   ou "Adicionar ao ecra principal" (Safari no iPhone). So em https ou localhost.
   O endereco do service worker vem de window.PORTAL_SW (no GitHub, "sw.js" na raiz do site);
   no Power Pages e "/sw.js".
   ============================================================================ */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https:|^http:\/\/localhost/.test(location.href)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(window.PORTAL_SW || '/sw.js').catch(function () { /* sem instalacao, o site funciona igual */ });
  });
})();
