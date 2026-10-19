/*
 * sw.js — delovanje brez povezave (FAZA 8 / P1)
 *
 * Aplikacija trdi "Offline ✓" v glavi, zato mora to res delovati. Service worker
 * predpomni lupino aplikacije in med sejo shranjuje naložene dele (JS/CSS/ikon).
 * Podatkov projektov NE shranjuje — ti živijo v IndexedDB in se backup izvozi.
 */

const CACHE_NAME = 'mera3d-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Posamezni elementi precache ne smejo pasti (npr. manifest, če ni v buildu),
      // zato jih shranimo posamično in ignoriramo napake.
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // zunanje slike (roksal.com) se ne predpomni

  // Navigacija: najprej omrežje (da dobimo svežo aplikacijo), ob izpadu predpomnjeno.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // Deli aplikacije (hashirana imena): najprej predpomnjeno, posodobi v ozadju.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
