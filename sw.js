// Service worker: deixa o app abrir mesmo sem internet.
// Ao publicar uma nova versão, aumente o número abaixo.
const VERSAO = 'af-v1';
const ARQUIVOS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './maskable-512.png',
  './apple-touch-icon.png', './favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Página: tenta a rede primeiro (pega atualizações), cai no cache se estiver offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(VERSAO).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fontes do Google e arquivos locais: cache primeiro, atualiza em segundo plano.
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(r => {
          if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); }
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
