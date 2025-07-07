// main.js - 應用程式主要進入點，僅負責初始化與流程調度
import { state } from './state.js';
import { fetchTripData, fetchAllWeatherData, checkVersionAndUpdate } from './api.js';
import { renderItinerary, updateStatusDashboard, bindUIEventListeners, showToast } from './ui.js';

// 初始化流程
// 1. 綁定 UI 事件 2. 載入資料 3. 渲染畫面

document.addEventListener('DOMContentLoaded', async () => {
  try {
    bindUIEventListeners();
    state.tripData = await fetchTripData();
    const itineraryContainer = document.getElementById('itinerary-container');
    renderItinerary(state.tripData.itinerary, itineraryContainer);
    state.allWeatherData = await fetchAllWeatherData(state.tripData.itinerary);
    // 這裡可根據需求呼叫 updateStatusDashboard 或其他初始化

    // 綁定重新整理/檢查更新按鈕
    const reloadBtn = document.getElementById('reload-button') || document.getElementById('refresh-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', async () => {
        const localVersion = state.tripData?.tripInfo?.dataVersion || '';
        const result = await checkVersionAndUpdate(localVersion);
        if (result.status === 'update-available') {
          showToast('有新版本，正在更新...');
          // 觸發 Service Worker 更新
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            setTimeout(() => window.location.reload(), 1200);
          } else {
            window.location.reload();
          }
        } else if (result.status === 'up-to-date') {
          showToast('已是最新版本');
        } else {
          showToast('檢查更新失敗，請確認網路連線');
        }
      });
    }
  } catch (error) {
    const container = document.getElementById('itinerary-container');
    if (container) container.innerHTML = `<p class="text-center text-red-600 font-bold">行程資料載入失敗，請檢查 trip-data.json 檔案並確認網路連線。</p>`;
    console.error(error);
  }
}); 
