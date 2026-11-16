// Offline support for the web build. Inside the native app the files are already on the phone,
// so this never registers there (see src/main.tsx).
const CACHE = 'app-v2'
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './fonts.css', './bible/index.json'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  // Films and recorded audio stream straight from the network: they need range requests, and they are too big to cache whole.
  if (req.headers.has('range') || /\/(films|bible-audio|story|music|pano)\//.test(new URL(req.url).pathname) || /assets\.json$/.test(req.url)) return
  // Pages: network first so updates arrive, cache when offline.
  // Everything else (hashed code, Bible books, photos, fonts): cache first, refreshed in the background.
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req)
      const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res })
      if (req.mode === 'navigate') return fresh.catch(() => hit ?? cache.match('./'))
      if (hit) { fresh.catch(() => {}); return hit }
      return fresh
    }),
  )
})
