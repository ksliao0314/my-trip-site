// 導入 Workbox 函式庫
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// 讓 Service Worker 在安裝後立即接管頁面
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// --- 增強離線功能：定義所有App Shell核心資源 ---
// 這些是確保應用程式基本外觀與功能可以離線運作的檔案。
// --- FIX: 只保留最核心的檔案，避免 404 錯誤 ---
const APP_SHELL_ASSETS = [
  { url: './index.html', revision: '20250711-02' }, // HTML主檔案
  { url: './manifest.json', revision: '20250711-02' }, // PWA 設定檔
  { url: './trip-data.json', revision: '20250711-02' }, // 核心行程資料
];

// 預先快取所有定義好的核心資源 (Precaching)
// 這些檔案會在 Service Worker 安裝時就被下載並快取起來
workbox.precaching.precacheAndRoute(APP_SHELL_ASSETS);

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
// 2.1 預報天氣快取策略（3天、64筆）
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://api.open-meteo.com',
  new workbox.strategies.NetworkFirst({
    cacheName: 'weather-forecast-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 3 * 24 * 60 * 60, // 3天
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);
// 2.2 歷史天氣快取策略（180天、64筆）
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://archive-api.open-meteo.com',
  new workbox.strategies.NetworkFirst({
    cacheName: 'weather-archive-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 180 * 24 * 60 * 60, // 180天
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// 3. 針對圖片的快取策略 (CacheFirst)
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

// 4. 針對 JS 檔案的路由快取策略
workbox.routing.registerRoute(
  ({ url }) => url.pathname.includes('/scripts/'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'js-cache',
    plugins: [
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
