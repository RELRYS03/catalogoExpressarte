const CACHE_NAME = 'expressarte-importador-v4';
const SHELL = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg','../config.js'];
const DB_NAME = 'expressarte-share-v1';
function openShareDb() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME,1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('shares')) request.result.createObjectStore('shares',{keyPath:'id'}); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveShare(data) {
  const db = await openShareDb();
  await new Promise((resolve,reject) => {
    const tx = db.transaction('shares','readwrite');
    tx.objectStore('shares').put(data);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  db.close();
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method === 'POST' && url.pathname.endsWith('/compartilhar')) {
    event.respondWith((async () => {
      try {
        const form = await request.formData();
        const files = form.getAll('images').filter(item => item instanceof File && item.type.startsWith('image/')).slice(0,2);
        const payload = { id: crypto.randomUUID(), title: String(form.get('title') || ''), text: String(form.get('text') || ''), url: String(form.get('url') || ''), images: files, createdAt: Date.now() };
        await saveShare(payload);
        return Response.redirect(new URL('./?compartilhado=1', self.registration.scope),303);
      } catch {
        return Response.redirect(new URL('./?erro=compartilhamento', self.registration.scope),303);
      }
    })());
    return;
  }
  if (request.method === 'GET' && url.origin === self.location.origin && (url.pathname.startsWith(new URL(self.registration.scope).pathname) || url.pathname === new URL('../config.js', self.registration.scope).pathname)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request,copy)); }
      return response;
    }).catch(() => caches.match(request)));
  }
});
