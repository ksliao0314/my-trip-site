// ui.js - 處理所有和畫面(UI)相關的操作，包含渲染、互動、modal、RWD、事件監聽等
// 本檔案為 UI 控制大總管，請將所有 DOM 操作、互動、事件邏輯集中於此，方便維護
import { state } from './state.js';

/**
 * 顯示 toast 訊息
 * @param {string} message 
 */
export function showToast(message) {
  const toastEl = document.getElementById('toast-notification');
  const toastMessageEl = document.getElementById('toast-message');
  if (!toastEl || !toastMessageEl) return;
  toastMessageEl.textContent = message;
  toastEl.classList.remove('hidden', 'opacity-0');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toastEl.classList.add('opacity-0');
    setTimeout(() => toastEl.classList.add('hidden'), 300);
  }, 3000);
}

export function getWeatherIcon(code) {
  const icons = {
    0: '☀️', 1: '🌤️', 2: '⛅️', 3: '☁️', 45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
    66: '🌧️', 67: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
    80: '🌧️', 81: '🌧️', 82: '暴雨', 85: '🌨️', 86: '🌨️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };
  return icons[code] || '🌡️';
}

export function getWeatherReminder(code) {
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) return '今日有雨，記得帶傘！';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '可能會下雪，注意保暖！';
  if ([0, 1].includes(code)) return '天氣晴朗，注意防曬！';
  if ([2, 3].includes(code)) return '多雲天氣，適合出遊。';
  if ([45, 48].includes(code)) return '有霧，行車請注意安全。';
  return '祝您有美好的一天！';
}

export function populateDayCardWeather(allWeatherData) {
  try {
    const weatherDisplays = document.querySelectorAll('.weather-display');
    if (!allWeatherData) {
      weatherDisplays.forEach(el => { el.innerHTML = '...'; });
      return;
    }
    document.querySelectorAll('[data-weather-city]').forEach(dayEl => {
      const date = dayEl.dataset.date;
      const city = dayEl.dataset.weatherCity;
      const weatherDisplay = dayEl.querySelector('.weather-display');
      if (city && allWeatherData[city] && weatherDisplay && allWeatherData[city].time) {
        const dayIndex = allWeatherData[city].time.indexOf(date);
        if (dayIndex !== -1) {
          const temp = Math.round(allWeatherData[city].temperature_2m_max[dayIndex]);
          const icon = getWeatherIcon(allWeatherData[city].weather_code[dayIndex]);
          weatherDisplay.innerHTML = `${icon} ${temp}°C`;
        } else {
          weatherDisplay.textContent = '無資料';
        }
      } else if (weatherDisplay) {
        weatherDisplay.textContent = 'N/A';
      }
    });
  } catch (err) {
    console.error('渲染天氣資料時發生錯誤:', err);
  }
}

export function renderItinerary(itineraryData, container) {
  try {
    if (!itineraryData || !container) return;
    let htmlContent = '';
    const renderedCitySections = new Set();
    itineraryData.forEach(day => {
      let sectionIdAttr = '';
      if (day.cityTarget && !renderedCitySections.has(day.cityTarget)) {
        sectionIdAttr = `id="${day.cityTarget}"`;
        renderedCitySections.add(day.cityTarget);
      }
      const tagsHtml = day.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
      const activitiesHtml = day.activities.map(activity => `<div class="activity-block"><h4 class="font-bold text-lg text-blue-800">${activity.title}</h4><ul class="list-disc list-inside mt-2 text-gray-700 space-y-1">${activity.items.map(item => `<li>${item}</li>`).join('')}</ul></div>`).join('');
      let reminderHtml = day.reminder ? `<div class="mt-4 p-4 bg-amber-100/60 rounded-lg border-l-4 border-amber-400"><h4 class="font-bold text-amber-800 flex items-center mb-2">${day.reminder.title}</h4><ul class="list-disc list-inside mt-2 text-amber-900/80 space-y-1">${day.reminder.items.map(item => `<li>${item}</li>`).join('')}</ul></div>` : '';
      let infoBoxHtml = day.infoBox ? `<div class="mt-4 p-4 bg-teal-100/60 rounded-lg border-l-4 border-teal-400"><h4 class="font-bold text-teal-800 flex items-center mb-2">${day.infoBox.title}</h4><ul class="list-disc list-inside mt-2 text-teal-900/80 space-y-1">${day.infoBox.items.map(item => `<li>${item}</li>`).join('')}</ul></div>` : '';
      htmlContent += `<div class="trip-card-wrapper" ${sectionIdAttr} data-day="${day.day}" data-date="${day.date}" data-day-group="${day.dayGroup}" data-city-target="${day.cityTarget}" data-weather-city="${day.weatherCity}">
        <details class="trip-card bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 overflow-hidden" ${day.day === 1 ? 'open' : ''}>
          <summary class="${day.isTravelDay ? 'summary-travel-day' : ''} flex justify-between items-center">
            <div>
              <p class="text-sm font-medium ${day.isTravelDay ? 'text-amber-700' : 'text-indigo-600'}">${day.subTitle}</p>
              <h3 id="day${day.day}" class="text-xl sm:text-2xl font-bold mt-1 text-gray-900">${day.title}</h3>
            </div>
            <div class="flex items-center space-x-3 sm:space-x-4">
              <div class="weather-display flex-shrink-0 text-right"></div>
              <div class="summary-arrow flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </summary>
          <div class="p-4 sm:p-6 border-t border-gray-200">
            <div class="my-3 flex flex-wrap justify-between items-start gap-2">
              <div>${tagsHtml}</div>
            </div>
            <div class="space-y-6">${activitiesHtml}${infoBoxHtml}${reminderHtml}</div>
          </div>
        </details>
      </div>`;
    });
    container.innerHTML = htmlContent;
  } catch (err) {
    console.error('渲染行程資料時發生錯誤:', err);
    if (container) container.innerHTML = '<p class="text-center text-red-600 font-bold">行程渲染失敗，請稍後再試。</p>';
  }
}

export function updateStatusDashboard(date, data, allWeatherData, direction = 0) {
  try {
    const { itinerary, hotels, transport, tripInfo } = data;
    const targetDayData = itinerary.find(d => d.date === date);
    state.currentDisplayDate = date;
    const statusDateEl = document.getElementById('status-date');
    if (!targetDayData) {
      if (statusDateEl) statusDateEl.textContent = '旅程已結束';
      return;
    }
    // ...（其餘 UI 更新邏輯依需求搬移，並加上元素存在判斷）...
  } catch (err) {
    console.error('更新行程要覽時發生錯誤:', err);
  }
}

/**
 * 綁定主要 UI 事件（如 mobile menu, modal, RWD, 按鈕等）
 * 應於 main.js 初始化時呼叫
 */
export function bindUIEventListeners() {
  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenuPanel = document.getElementById('mobile-menu-panel');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  if (mobileMenuBtn && mobileMenuPanel && mobileMenuOverlay) {
    const toggleMenu = () => {
      const isOpen = !mobileMenuPanel.classList.contains('is-open');
      mobileMenuPanel.classList.toggle('is-open', isOpen);
      mobileMenuPanel.classList.toggle('hidden', !isOpen);
      mobileMenuOverlay.classList.toggle('is-open', isOpen);
      mobileMenuOverlay.classList.toggle('hidden', !isOpen);
      document.body.classList.toggle('modal-open', isOpen);
    };
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    mobileMenuOverlay.addEventListener('click', toggleMenu);
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', toggleMenu);
    });
  }

  // Modal 控制（以 foodieModal 為例，可依需求擴充）
  const foodieModal = document.getElementById('foodie-modal');
  if (foodieModal) {
    foodieModal.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => closeModal(foodieModal)));
    foodieModal.addEventListener('click', e => (e.target === foodieModal) && closeModal(foodieModal));
  }
  // ...可依需求擴充其他 modal 控制...

  // RWD: sticky nav scroll 狀態
  const mainNav = document.getElementById('main-nav');
  if (mainNav) {
    window.addEventListener('scroll', () => mainNav.classList.toggle('scrolled', window.scrollY > 0));
  }

  // 按鈕 aria-label 建議
  document.querySelectorAll('button').forEach(btn => {
    if (!btn.hasAttribute('aria-label') && btn.textContent.trim() !== '') {
      btn.setAttribute('aria-label', btn.textContent.trim());
    }
  });
}

/**
 * 關閉 modal（通用）
 * @param {HTMLElement} modal 
 */
export function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  setTimeout(() => modal.classList.add('hidden'), 300);
} 
