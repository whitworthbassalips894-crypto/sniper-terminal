// 狙击手战法 · 战术终端 PWA Service Worker
// 只负责缓存"应用外壳"本身（index.html / manifest / 图标），
// 让"添加到主屏幕"后可以像App一样有图标、全屏启动、离线也能打开界面。
//
// 重要：绝不缓存、不拦截 OKX / Binance / WxPusher 等跨域接口请求，
// 这些必须每次都走真实网络，否则行情数据会变成死数据。

const CACHE_NAME = 'sniper-terminal-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 非同源（行情接口/推送接口）或非GET请求：完全不接管，直接走网络
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
