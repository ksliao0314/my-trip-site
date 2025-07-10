// event-listeners.js
// 集中管理所有事件監聽器

import { scrollToToday, checkForUpdates, openFoodieModal, updateStatusDashboard } from './main.js';
import { initPullToRefresh } from './pullToRefresh.ts';

const DEBUG = false;

export function registerEventListeners(appState, data, allWeatherData) {
    // Service Worker 註冊與更新（已搬移）
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                const updateBar = document.getElementById('update-notification');
                                if (updateBar) updateBar.style.display = 'block';
                            }
                        });
                    });
                }).catch(error => { if (DEBUG) console.log('ServiceWorker 註冊失敗：', error); });
        });
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
        const reloadButton = document.getElementById('reload-button');
        if(reloadButton) {
            reloadButton.addEventListener('click', () => {
                navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg && reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
        }
    }

    // Slider (行程日選擇拉桿)
    const daySlider = document.getElementById('day-slider');
    if(daySlider) {
        daySlider.max = data.tripInfo.totalDays;
        daySlider.addEventListener('input', () => {
            const targetDay = parseInt(daySlider.value);
            const targetDayData = data.itinerary[targetDay - 1];
            if (targetDayData) {
                appState.currentDisplayDate = targetDayData.date;
                updateStatusDashboard(appState.currentDisplayDate, data, appState.allWeatherData, 0); 
            }
        });
    }

    // Modal focus trap 與統一關閉邏輯
    function closeModal(modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        modal.setAttribute('aria-hidden', 'true');
        // 若有動畫，延遲 hidden
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
    function openModal(modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            modal.setAttribute('aria-hidden', 'false');
            // focus 第一個可互動元素
            const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
            const focusableEls = modal.querySelectorAll(focusableSelectors);
            if (focusableEls.length > 0) {
                focusableEls[0].focus();
            }
        }, 10);
    }
    function trapFocus(modal) {
        const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableEls = modal.querySelectorAll(focusableSelectors);
        if (focusableEls.length === 0) return;
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        function handler(e) {
            if (modal.classList.contains('hidden')) return;
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl.focus();
                    }
                } else {
                    if (document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl.focus();
                    }
                }
            } else if (e.key === 'Escape') {
                closeModal(modal);
            }
        }
        modal.addEventListener('keydown', handler);
    }
    // Tip Calculator Modal
    const tipCalculatorBtn = document.getElementById('tip-calculator-btn');
    const tipCalculatorModal = document.getElementById('tip-calculator-modal');
    const modalBillInput = document.getElementById('modal-bill-amount');
    const modalTipSelect = document.getElementById('modal-tip-rate');
    const modalTipResult = document.getElementById('modal-tip-result');
    const modalTotalResult = document.getElementById('modal-total-result');
    if (tipCalculatorBtn && tipCalculatorModal && modalBillInput && modalTipSelect && modalTipResult && modalTotalResult) {
        tipCalculatorBtn.addEventListener('click', () => {
            modalBillInput.value = '';
            modalTipResult.textContent = '-';
            modalTotalResult.textContent = '-';
            modalTipSelect.value = '18';
            openModal(tipCalculatorModal);
        });
        trapFocus(tipCalculatorModal);
        // Tip Calculator 計算邏輯
        function calculateModalTip() {
            const bill = parseFloat(modalBillInput.value);
            const tipRate = parseFloat(modalTipSelect.value);
            if (isNaN(bill) || isNaN(tipRate) || bill < 0) {
                modalTipResult.textContent = '-';
                modalTotalResult.textContent = '-';
                return;
            }
            const tip = Math.round(bill * tipRate) / 100;
            const total = bill + tip;
            modalTipResult.textContent = tip.toFixed(2);
            modalTotalResult.textContent = total.toFixed(2);
        }
        modalBillInput.addEventListener('input', calculateModalTip);
        modalTipSelect.addEventListener('change', calculateModalTip);
        tipCalculatorModal.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => closeModal(tipCalculatorModal)));
        tipCalculatorModal.addEventListener('click', e => (e.target === tipCalculatorModal) && closeModal(tipCalculatorModal));
    }

    // Touch 滑動切換天數
    const statusCard = document.getElementById('status-card-content');
    if (statusCard) {
        let touchStartX = 0;
        let touchEndX = 0;
        let isSliderInteraction = false; 
        const swipeThreshold = 50; 
        statusCard.addEventListener('touchstart', (event) => {
            if (event.target.id === 'day-slider') {
                isSliderInteraction = true;
                return; 
            }
            isSliderInteraction = false;
            touchStartX = event.changedTouches[0].screenX;
        }, { passive: true });
        statusCard.addEventListener('touchend', (event) => {
            if (isSliderInteraction) {
                isSliderInteraction = false;
                return;
            }
            touchEndX = event.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) < swipeThreshold) return; 
            const { itinerary, tripInfo } = data;
            const lastAvailableDate = itinerary[itinerary.length - 1].date;
            if (swipeDistance < 0) { // Swipe Left
                const [year, month, day] = appState.currentDisplayDate.split('-').map(Number);
                const currentDateObj = new Date(Date.UTC(year, month - 1, day));
                currentDateObj.setUTCDate(currentDateObj.getUTCDate() + 1);
                const newDate = currentDateObj.toISOString().split('T')[0];
                if (newDate <= lastAvailableDate) { 
                    appState.currentDisplayDate = newDate;
                    updateStatusDashboard(appState.currentDisplayDate, data, appState.allWeatherData, 1);
                }
            } else { // Swipe Right
                const [year, month, day] = appState.currentDisplayDate.split('-').map(Number);
                const currentDateObj = new Date(Date.UTC(year, month - 1, day));
                currentDateObj.setUTCDate(currentDateObj.getUTCDate() - 1);
                const newDate = currentDateObj.toISOString().split('T')[0];
                if (newDate >= tripInfo.tripStartDate) {
                    appState.currentDisplayDate = newDate;
                    updateStatusDashboard(appState.currentDisplayDate, data, appState.allWeatherData, -1); 
                }
            }
        }, { passive: true });
    }

    // Print 按鈕
    const printBtn = document.getElementById('print-btn');
    const mobilePrintBtn = document.getElementById('mobile-print-btn');
    function triggerPrint() {
        window.print();
    }
    printBtn?.addEventListener('click', triggerPrint);
    mobilePrintBtn?.addEventListener('click', triggerPrint);

    // 快取清除
    const mobileClearWeatherCacheBtn = document.getElementById('mobile-clear-weather-cache-btn');
    mobileClearWeatherCacheBtn?.addEventListener('click', () => {
        localStorage.removeItem('weatherDataCache');
        window.location.reload();
    });

    // Today 按鈕
    const todayBtn = document.getElementById('today-btn');
    todayBtn?.addEventListener('click', () => {
        scrollToToday();
    });

    // 下載最新行程按鈕（桌面版與行動版）
    const refreshBtn = document.getElementById('refresh-btn');
    const mobileRefreshBtn = document.getElementById('mobile-refresh-btn');
    refreshBtn?.addEventListener('click', () => {
        if (typeof checkForUpdates === 'function') checkForUpdates();
    });
    mobileRefreshBtn?.addEventListener('click', () => {
        if (typeof checkForUpdates === 'function') checkForUpdates();
    });

    // 下拉更新（Pull to Refresh）統一初始化
    initPullToRefresh({
        dashboardSelector: '#status-dashboard-section',
        indicatorSelector: '#pull-to-refresh-indicator',
        onRefresh: () => {
            if (typeof checkForUpdates === 'function') checkForUpdates();
        }
    });

    // 行動版菜單開關、導航等可依需求繼續補充

    // 美食 Modal 事件監聽器（只註冊一次）
    const foodieModal = document.getElementById('foodie-modal');
    if (foodieModal) {
        trapFocus(foodieModal);
        const modalTabs = foodieModal.querySelector('#modal-tabs');
        const modalContent = foodieModal.querySelector('#modal-content');
        // tab 切換
        modalTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-tab')) {
                const cityKey = e.target.dataset.city;
                if (openFoodieModal) {
                    openFoodieModal(cityKey);
                }
            }
        });
        // 關閉按鈕
        foodieModal.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => closeModal(foodieModal)));
        // 點擊遮罩關閉
        foodieModal.addEventListener('click', e => {
            if (e.target === foodieModal) {
                closeModal(foodieModal);
            }
        });
    }

    // City Select Modal
    const citySelectModal = document.getElementById('city-select-modal');
    if (citySelectModal) {
        trapFocus(citySelectModal);
        citySelectModal.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => closeModal(citySelectModal)));
        citySelectModal.addEventListener('click', e => {
            if (e.target === citySelectModal) {
                closeModal(citySelectModal);
            }
        });
    }
} 
