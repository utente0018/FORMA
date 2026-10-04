// Service worker: l'app funziona offline. Con la rete prende sempre l'ultima versione;
// senza rete usa la copia salvata. Le immagini degli esercizi si salvano la prima volta che le vedi.
// I tuoi dati NON stanno qui: sono nel database del telefono e gli aggiornamenti non li toccano.
const SHELL = 'forma-shell-v3';
const MEDIA = 'forma-media-v1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'plan.js', 'manifest.webmanifest', 'data/exercises.json', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(MEDIA).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // file dell'app: prima la rete (max 3 secondi), poi la copia salvata
  e.respondWith(caches.open(SHELL).then(async c => {
    try {
      const res = await Promise.race([fetch(req, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch {
      const hit = await c.match(req, { ignoreSearch: true });
      return hit || (await c.match('index.html'));
    }
  }));
});
