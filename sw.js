// 導入 Workbox 函式庫
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// 讓 Service Worker 在安裝後立即接管頁面
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// 預先快取核心靜態資源 (Precaching)
// 這些檔案會在 Service Worker 安裝時就被下載並快取起來
workbox.precaching.precacheAndRoute([
  { url: '/index.html', revision: '20240709-02' }, // 每次更新 index.html 時，請修改 revision
  { url: '/manifest.json', revision: '20240709-02' },
  { url: '/trip-data.json', revision: '20250701-02' }, // 新增：預先快取 trip-data.json，請隨資料更新此 revision
  // 您可以將 CSS 和 JS 檔案存在本地，然後在這裡加入快取
  // { url: '/style.css', revision: 'xxxx' },
  // { url: '/main.js', revision: 'xxxx' },
]);

// --------------------------------------------------
// 運行時快取策略 (Runtime Caching Strategies)
// --------------------------------------------------

// 1. 針對 Google Fonts 和 Tailwind CDN 的快取策略
// 使用 StaleWhileRevalidate：優先從快取提供，同時在背景更新。
// 這確保了即使離線，字體和樣式也能載入。
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || 
               url.origin === 'https://fonts.gstatic.com' ||
               url.origin === 'https://cdn.tailwindcss.com',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'google-fonts-and-tailwind',
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

// 3. **[新增]** 針對匯率 API 的快取策略 (StaleWhileRevalidate)
// 優先從快取提供，確保快速回應，同時在背景請求新資料。
// 這對歷史匯率（不會變）和即時匯率（需要更新）都是一個很好的平衡策略。
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://api.frankfurter.app',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'exchange-rate-api-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 20, // 最多快取 20 次匯率請求
        maxAgeSeconds: 24 * 60 * 60, // 快取 24 小時
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);


// 4. 針對圖片的快取策略 (CacheFirst)
// 優先從快取中讀取圖片，如果快取中沒有，才發出網路請求。
// 這對不常變更的圖片（如 PWA 圖示）非常有效。
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
