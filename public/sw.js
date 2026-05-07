self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Minimal fetch listener for PWA installability
  e.respondWith(
    fetch(e.request).catch(() => {
      return new Response('Offline');
    })
  );
});
