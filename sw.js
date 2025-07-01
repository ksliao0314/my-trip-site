// 導入 Workbox 函式庫
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// 讓 Service Worker 在安裝後立即接管頁面
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// 預先快取核心靜態資源 (Precaching)
// 這些檔案會在 Service Worker 安裝時就被下載並快取起來
workbox.precaching.precacheAndRoute([
  { url: '/index.html', revision: '20250702-02' }, // 更新版本號
  { url: '/style.css', revision: '20250702-01' },  // 新增：快取本地樣式檔
  { url: '/manifest.json', revision: '20240709-02' }, 
  { url: '/trip-data.json', revision: '20250702-01' },
]);

// --------------------------------------------------
// 運行時快取策略 (Runtime Caching Strategies)
// --------------------------------------------------

// 1. 針對 Google Fonts 的快取策略
// 使用 StaleWhileRevalidate：優先從快取提供，同時在背景更新。
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || 
               url.origin === 'https://fonts.gstatic.com',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'google-fonts-cache',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// 2. 針對天氣 API 的快取策略 (NetworkFirst)
// 優先嘗試從網路取得最新資料，如果失敗（例如離線），則從快取中讀取舊資料。
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://api.open-meteo.com',
  new workbox.strategies.NetworkFirst({
    cacheName: 'weather-api-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 10, // 最多快取 10 次 API 請求
        maxAgeSeconds: 12 * 60 * 60, // 快取 12 小時
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// 3. 針對圖片的快取策略 (CacheFirst)
// 優先從快取中讀取圖片，如果快取中沒有，才發出網路請求。
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60, // 最多快取 60 張圖片
        maxAgeSeconds: 30 * 24 * 60 * 60, // 快取 30 天
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);


// 監聽來自頁面的訊息，用來觸發 skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
