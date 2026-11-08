// Monetag Push Ads service worker integration
self.options = {
  "domain": "3nbf4.com",
  "zoneId": 12216156
};
self.lary = "";
importScripts("https://3nbf4.com/act/files/service-worker.min.js?r=sw");

const CACHE = 'paliaapk-hub-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      return await fetch(event.request);
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
