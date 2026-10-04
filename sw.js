// Service worker: l'app funziona offline. Le immagini degli esercizi si salvano la prima volta che le vedi.
const SHELL = 'forma-shell-v1';
const MEDIA = 'forma-media-v1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'data/exercises.json', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

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
  // immagini esercizi: prima la cache, poi la rete
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
  // file dell'app: risposta immediata dalla cache, aggiornamento in background
  e.respondWith(caches.open(SHELL).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
