// 導入 Workbox 函式庫
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// --- 核心設定 ---
// 讓 Service Worker 在安裝後立即接管頁面，提供無縫更新體驗
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// --- 預先快取 (Precaching) ---
// 定義 App Shell 核心資源，這些檔案會在 Service Worker 安裝時立即下載並快取。
// 這確保了應用程式的基本外觀與功能可以完全離線運作。
// revision: null 表示我們手動管理版本，若為 null，Workbox 會在 URL 變更時才更新。
const APP_SHELL_ASSETS = [
  { url: 'index.html', revision: '20250707-02' }, // HTML主檔案 - 更新版本以解決天氣錯誤
  { url: 'manifest.json', revision: '20250702-01' }, // PWA 設定檔
  { url: 'trip-data.json', revision: '20250706-01' }, // 核心行程資料
  // --- 快取所有應用程式圖示 ---
  { url: 'apple-touch-icon.png', revision: null },
  { url: 'favicon.ico', revision: null },
  { url: 'favicon.svg', revision: null },
  { url: 'favicon-96x96.png', revision: null },
  { url: 'web-app-manifest-192x192.png', revision: null },
  { url: 'web-app-manifest-512x512.png', revision: null },
];
workbox.precaching.precacheAndRoute(APP_SHELL_ASSETS);


// --------------------------------------------------
// 運行時快取策略 (Runtime Caching Strategies)
// --------------------------------------------------

// 策略 1: 針對 CSS 和字體等靜態資源
// 使用 StaleWhileRevalidate：優先從快取提供以加快載入速度，同時在背景請求新版本以供下次使用。
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || 
               url.origin === 'https://fonts.gstatic.com' ||
               url.origin === 'https://cdn.tailwindcss.com',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-assets-cache',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// 策略 2: 針對所有天氣 API 請求 (優化合併)
// 動態選擇策略：對歷史資料使用 CacheFirst，對未來預報使用 NetworkFirst。
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://api.open-meteo.com' || url.origin === 'https://archive-api.open-meteo.com',
  ({ url }) => {
    // 如果是歷史天氣 API，使用 CacheFirst，因為歷史資料不會改變。
    if (url.origin === 'https://archive-api.open-meteo.com') {
      return new workbox.strategies.CacheFirst({
        cacheName: 'historical-weather-cache',
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 50, // 快取最多50筆歷史天氣
            maxAgeSeconds: 30 * 24 * 60 * 60, // 快取30天，防止錯誤快取永久存在
          }),
          new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      });
    }
    // 如果是天氣預報 API，使用 NetworkFirst，優先取得最新天氣。
    return new workbox.strategies.NetworkFirst({
      cacheName: 'forecast-weather-cache',
      networkTimeoutSeconds: 3, // 設定3秒超時，若網路太慢則直接從快取讀取
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 12 * 60 * 60, // 快取 12 小時
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    });
  }
);

// 策略 3: 針對圖片
// 使用 CacheFirst：圖片不常變更，優先從快取讀取可大幅提升效能。
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 快取 30 天
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// --- 導航備援 (Navigation Fallback) ---
// 當使用者離線或伺服器無法回應時，針對頁面導航請求提供一個備用的 HTML 頁面。
// 這確保了使用者總能看到應用程式的介面，而不是瀏覽器的錯誤頁面。
const handler = workbox.precaching.createHandlerBoundToURL('/index.html');
const navigationRoute = new workbox.routing.NavigationRoute(handler);
workbox.routing.registerRoute(navigationRoute);


// --- 與頁面的通訊 ---
// 監聽來自頁面的訊息，用來觸發 skipWaiting，讓新的 Service Worker 立即啟用。
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
