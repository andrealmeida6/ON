/* ============================================================================
   sw.js - service worker do ESG Data Hub (instalar como aplicacao)
   So existe para o browser oferecer "Instalar aplicacao". Nao guarda nada em cache:
   as paginas e os ficheiros vem sempre da rede, para nunca se ver uma versao antiga.
   Sem rede, as paginas mostram um aviso simples.
   ============================================================================ */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (ev) { ev.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (ev) {
  if (ev.request.mode !== 'navigate') return;
  ev.respondWith(fetch(ev.request).catch(function () {
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ESG Data Hub</title><body style="font-family:system-ui,sans-serif;padding:40px;color:#0C233C;background:#F4F7FC"><h2>ESG Data Hub</h2><p>No internet connection. Connect and try again.</p></body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }));
});
