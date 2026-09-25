/* AgricWorld service worker — fast reloads.
   images/fonts: cache-first (they are immutable); html/css/js: stale-while-revalidate
   (instant paint from cache, refreshed in the background; the page is told when a newer file arrived). */
var VERSION = 'aw-v6';
var SHELL = ['./', 'assets/css/app.css', 'assets/js/icons.js', 'assets/js/vendor/supabase.js', 'assets/js/config.js', 'assets/js/data.js', 'assets/js/db.js', 'assets/js/app.js', 'assets/js/pages.js', 'assets/js/ai.js', 'assets/js/dashboards.js', 'assets/fonts/jakarta.woff2', 'assets/fonts/manrope.woff2'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () { }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function changed(a, b) {
  if (!a || !b) return false;
  var ea = a.headers.get('etag'), eb = b.headers.get('etag');
  if (ea && eb) return ea !== eb;
  var la = a.headers.get('content-length'), lb = b.headers.get('content-length');
  return !!(la && lb && la !== lb);
}
function notify() { self.clients.matchAll({ type: 'window' }).then(function (cs) { cs.forEach(function (c) { c.postMessage({ type: 'aw-update' }); }); }); }

self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;                 /* Supabase, Paystack, Stripe: never cached */
  if (url.pathname.indexOf('/api/') === 0 || /sw\.js$/.test(url.pathname)) return;
  var isStatic = /\.(jpg|jpeg|png|webp|svg|woff2?|ico)$/i.test(url.pathname);
  if (isStatic) {
    e.respondWith(caches.open(VERSION).then(function (c) { return c.match(req).then(function (hit) { return hit || fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; }); }); }));
    return;
  }
  var nav = req.mode === 'navigate';
  var key = nav ? new Request(url.origin + url.pathname) : req;
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(key).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res.ok && (res.type === 'basic' || res.type === 'default')) { if (hit && !nav && changed(hit, res)) notify(); c.put(key, res.clone()); }
        return res;
      }).catch(function () { return hit || (nav ? c.match(new Request(url.origin + '/')) : undefined); });
      return hit || net;
    });
  }));
});
