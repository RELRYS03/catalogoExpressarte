self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  const home = new URL(self.registration.scope);
  if (request.method !== 'GET' || request.mode !== 'navigate' ||
      url.origin !== home.origin || url.pathname !== home.pathname) return;

  event.respondWith(fetch(request).catch(() => new Response(`<!doctype html>
    <html lang="pt-BR">
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Express’Arte Catálogo</title>
      <main>
        <h1>Catálogo sem conexão</h1>
        <p>Conecte-se à internet para consultar os produtos e preços atuais.</p>
        <a href="./">Tentar novamente</a>
      </main>
    </html>`, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    })));
});
