// 簡化的 Service Worker
// 只處理核心功能，避免 404 錯誤

const CACHE_NAME = 'trip-site-v20250711-02';
const CACHE_FILES = [
  './index.html',
  './manifest.json',
  './trip-data.json'
];

// 安裝時快取核心檔案
self.addEventListener('install', (event) => {
  console.log('Service Worker 安裝中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('快取核心檔案...');
        return cache.addAll(CACHE_FILES);
      })
      .catch((error) => {
        console.log('快取失敗:', error);
      })
  );
  self.skipWaiting();
});

// 啟用時清理舊快取
self.addEventListener('activate', (event) => {
  console.log('Service Worker 啟用中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 只處理 GET 請求
  if (request.method !== 'GET') return;
  
  // 處理核心檔案
  if (CACHE_FILES.some(file => request.url.includes(file.replace('./', '')))) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // 優先從快取提供
          if (response) {
            return response;
          }
          // 如果快取沒有，從網路取得
          return fetch(request);
        })
    );
    return;
  }
  
  // 處理天氣 API
  if (request.url.includes('api.open-meteo.com') || request.url.includes('archive-api.open-meteo.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 如果網路請求成功，快取結果
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open('weather-cache').then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 如果網路失敗，嘗試從快取取得
          return caches.match(request);
        })
    );
    return;
  }
  
  // 其他請求直接從網路取得
  event.respondWith(fetch(request));
});

// 監聽來自頁面的訊息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('收到 SKIP_WAITING 訊息');
    self.skipWaiting();
  }
});
