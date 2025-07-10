// main.js
// 應用程式的主要進入點

import { appState } from './state.js';
import { fetchTripData, fetchAllWeatherData } from './api-service.js';
import { renderItinerary, updateStatusDashboard, showToast } from './ui-render.js';
import { registerEventListeners } from './event-listeners.js';

// 移除 window 掛載
// export 需要給 event-listeners.js 用的函式
export { updateStatusDashboard };

export function scrollToToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    const dashboardSection = document.getElementById('status-dashboard-section');
    if (dashboardSection) {
        const mainNav = document.getElementById('main-nav');
        const offset = mainNav ? mainNav.offsetHeight : 60;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = dashboardSection.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
    const tripData = appState.tripData;
    const allWeatherData = appState.allWeatherData;
    if (tripData && typeof updateStatusDashboard === 'function') {
        const isTripActive = todayString >= tripData.tripInfo.tripStartDate && todayString < tripData.tripInfo.tripEndDate;
        appState.currentDisplayDate = isTripActive ? todayString : tripData.tripInfo.tripStartDate;
        updateStatusDashboard(appState.currentDisplayDate, tripData, allWeatherData);
    }
}

export function checkForUpdates() {
    if (!('serviceWorker' in navigator)) {
        showToast('您的瀏覽器不支援離線功能。');
        return;
    }
    navigator.serviceWorker.ready.then(registration => {
        showToast('正在檢查最新行程...');
        registration.update().then(() => {
            if (registration.installing) {
                showToast('Service Worker 正在安裝新版本。');
            } else if (registration.waiting) {
                showToast('有新的 Service Worker 正在等待啟用。請重新整理頁面。');
            } else {
                showToast('您的行程已是最新版本！');
            }
        }).catch(error => {
            showToast('檢查更新失敗，請確認網路連線。');
        });
    }).catch(error => {
        showToast('離線功能尚未啟用，請稍後再試或重新整理頁面。');
    });
}

export function openFoodieModal(cityKey) {
    const foodieModal = document.getElementById('foodie-modal');
    const modalTabs = foodieModal.querySelector('#modal-tabs');
    const modalContent = foodieModal.querySelector('#modal-content');
    const data = appState.tripData;
    if (!data || !data.foodie || !data.foodie[cityKey]) return;
    let tabsHTML = '';
    Object.keys(data.foodie).forEach(city => tabsHTML += `<button class="modal-tab" data-city="${city}">${data.foodie[city].name}</button>`);
    modalTabs.innerHTML = tabsHTML;
    function switchFoodieTab(cityKey) {
        const cityData = data.foodie[cityKey];
        if (!cityData) return;
        modalTabs.querySelectorAll('.modal-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.city === cityKey));
        let contentHTML = '';
        cityData.categories.forEach(category => {
            contentHTML += `<div class="mb-4"><h3 class="text-lg font-bold text-gray-800 border-b-2 border-indigo-200 pb-1 mb-2">${category.name}</h3><div class="space-y-3">`;
            category.items.forEach(item => {
                const placesHTML = item.places.map(p => `<a href="${p.link}" target="_blank" class="hover:underline">${p.name}</a>`).join('、');
                contentHTML += `<div><p class="font-semibold text-gray-700">${item.name}</p><p class="text-sm text-gray-500">${item.desc}</p><p class="text-sm text-gray-700">推薦：${placesHTML}</p></div>`;
            });
            contentHTML += '</div></div>';
        });
        modalContent.innerHTML = contentHTML;
    }
    // 只渲染內容，不註冊事件
    switchFoodieTab(cityKey);
    foodieModal.classList.remove('hidden');
    setTimeout(() => {
        foodieModal.classList.add('active');
        document.body.classList.add('modal-open');
    }, 10);
}

async function initApp() {
    try {
        const data = await fetchTripData();
        appState.tripData = data;
        const itineraryContainer = document.getElementById('itinerary-container');
        renderItinerary(data.itinerary, itineraryContainer);
        // 取得天氣資料
        const allWeatherData = await fetchAllWeatherData(data.itinerary);
        appState.allWeatherData = allWeatherData;
        // 決定初始顯示日期
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        const tripInfo = data.tripInfo;
        const itinerary = data.itinerary;
        let initialDateToShow = tripInfo.tripStartDate;
        const lastAvailableDate = itinerary[itinerary.length - 1].date;
        if (todayString >= tripInfo.tripStartDate && todayString <= tripInfo.tripEndDate) {
            if (itinerary.find(d => d.date === todayString)) {
                initialDateToShow = todayString;
            } else if (todayString > lastAvailableDate) {
                initialDateToShow = lastAvailableDate;
            }
        } else if (todayString > tripInfo.tripEndDate) {
            initialDateToShow = lastAvailableDate;
        }
        appState.currentDisplayDate = initialDateToShow;
        // 初始化狀態儀表板
        updateStatusDashboard(appState.currentDisplayDate, data, allWeatherData);
        // 註冊所有事件監聽器
        registerEventListeners(appState, data, allWeatherData);
    } catch (error) {
        if (__DEV__) console.error('初始化失敗:', error);
    }
}

function updateNavHeightVar() {
    const nav = document.getElementById('main-nav');
    const navHeight = nav ? nav.offsetHeight : 68;
    document.documentElement.style.setProperty('--nav-h', `${navHeight}px`);
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavHeightVar();
    window.addEventListener('resize', updateNavHeightVar);
    initApp();
});

// 初始化 globalThis.app 命名空間
if (!globalThis.app) globalThis.app = {};
globalThis.app.updateStatusDashboard = updateStatusDashboard;
globalThis.app.scrollToToday = scrollToToday;
globalThis.app.checkForUpdates = checkForUpdates;
globalThis.app.openFoodieModal = openFoodieModal; 