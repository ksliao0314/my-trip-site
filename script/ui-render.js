// ui-render.js
// 負責所有畫面的渲染與更新

import { cityMap, cityTimezoneMap } from './config.js';

function getWeatherIcon(code) {
    const icons = { 0: '☀️', 1: '🌤️', 2: '⛅️', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️', 80: '🌧️', 81: '🌧️', 82: '暴雨', 85: '🌨️', 86: '🌨️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
    return icons[code] || '🌡️';
}
function getWeatherReminder(code) {
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) return '今日有雨，記得帶傘！';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '可能會下雪，注意保暖！';
    if ([0, 1].includes(code)) return '天氣晴朗，注意防曬！';
    if ([2, 3].includes(code)) return '多雲天氣，適合出遊。';
    if ([45, 48].includes(code)) return '有霧，行車請注意安全。';
    return '祝您有美好的一天！';
}

export function populateDayCardWeather(allWeatherData) {
    const weatherDisplays = document.querySelectorAll('.weather-display');
    if (!allWeatherData) { 
        weatherDisplays.forEach(el => { el.textContent = '…'; });
        return;
    }
    document.querySelectorAll('[data-weather-city]').forEach(dayEl => {
        const date = dayEl.dataset.date;
        const city = dayEl.dataset.weatherCity;
        const weatherDisplay = dayEl.querySelector('.weather-display');
        if (city && allWeatherData[city] && weatherDisplay && allWeatherData[city].time) {
            const dayIndex = allWeatherData[city].time.indexOf(date);
            if (dayIndex !== -1) {
                const temp = allWeatherData[city].temperature_2m_max[dayIndex];
                const code = allWeatherData[city].weather_code[dayIndex];
                if (temp !== null && temp !== undefined) {
                    const roundedTemp = Math.round(temp);
                    const icon = getWeatherIcon(code);
                    weatherDisplay.innerHTML = `${icon} ${roundedTemp}°C`;
                } else {
                    weatherDisplay.textContent = '…';
                }
            } else { 
                weatherDisplay.textContent = '無資料'; 
            }
        } else if (weatherDisplay) { 
            weatherDisplay.textContent = 'N/A'; 
        }
    });
}

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

export function updateStatusDashboard(date, data, allWeatherData, direction = 0) {
    const { itinerary, hotels, transport, tripInfo } = data;
    const targetDayData = itinerary.find(d => d.date === date);

    const statusCardContentEl = document.getElementById('status-card-content');
    const statusDateEl = document.getElementById('status-date');
    const statusCityNameEl = document.getElementById('status-city-name');
    const progressTextEl = document.getElementById('status-progress-text');
    const daySlider = document.getElementById('day-slider');
    const viewDetailsBtn = document.getElementById('view-details-btn');
    const foodieListBtn = document.getElementById('foodie-list-btn');
    // 天氣相關元素
    const weatherItemEl = document.getElementById('status-weather-item');
    const weatherIconEl = document.getElementById('status-weather-icon');
    const weatherTempEl = document.getElementById('status-weather-temp');
    const weatherReminderEl = document.getElementById('status-weather-reminder');
    // 住宿與交通元素
    const accommodationItemEl = document.getElementById('status-accommodation-item');
    const accommodationContentEl = document.getElementById('status-accommodation-content');
    const transportItemEl = document.getElementById('status-transport-item');
    const transportContentEl = document.getElementById('status-transport-content');
    const transportIconEl = document.getElementById('status-transport-icon');
    // 新增：每日主題元素
    const themeItemEl = document.getElementById('status-theme-item');
    const themeIconEl = document.getElementById('status-theme-icon');
    const themeTitleEl = document.getElementById('status-theme-title');
    const themeDescriptionEl = document.getElementById('status-theme-description');
    const travelDayIndicatorEl = document.getElementById('status-travel-day-indicator');
    const timeInfoEl = document.getElementById('status-time-info');
    const timeDiffEl = document.getElementById('status-time-diff');
    const paginationDotsContainer = document.getElementById('status-pagination-dots');

    const applyAnimation = (outClass, inClass, callback) => {
        statusCardContentEl.classList.remove('slide-in-left', 'slide-in-right', 'slide-out-left', 'slide-out-right');
        statusCardContentEl.classList.add(outClass);
        const handleOutAnimationEnd = () => {
            statusCardContentEl.removeEventListener('animationend', handleOutAnimationEnd);
            statusCardContentEl.classList.remove(outClass);
            callback();
            statusCardContentEl.classList.add(inClass);
            const handleInAnimationEnd = () => {
                statusCardContentEl.removeEventListener('animationend', handleInAnimationEnd);
                statusCardContentEl.classList.remove(inClass);
            };
            statusCardContentEl.addEventListener('animationend', handleInAnimationEnd);
        };
        statusCardContentEl.addEventListener('animationend', handleOutAnimationEnd);
    };

    const updateContent = () => {
        if (!targetDayData) {
            if(timeInfoEl) timeInfoEl.style.display = 'none';
            statusDateEl.textContent = '旅程已結束';
            if (statusCityNameEl) statusCityNameEl.textContent = '期待下次旅行！';
            progressTextEl.textContent = '-';
            if(daySlider) daySlider.value = 1;
            if(viewDetailsBtn) viewDetailsBtn.style.display = 'none';
            if(foodieListBtn) foodieListBtn.style.display = 'none';
            weatherItemEl.style.display = 'none';
            accommodationItemEl.style.display = 'none';
            transportItemEl.style.display = 'none';
            themeItemEl.style.display = 'none';
            if (travelDayIndicatorEl) travelDayIndicatorEl.style.display = 'none';
            if (paginationDotsContainer) paginationDotsContainer.innerHTML = '';
            return;
        }
        if(timeInfoEl) timeInfoEl.style.display = 'flex';
        if(viewDetailsBtn) viewDetailsBtn.style.display = 'block';
        const isMergedLastDay = targetDayData.subTitle.includes('~');
        if (isMergedLastDay) {
            const parts = targetDayData.subTitle.split('｜');
            const datePart = parts[1].trim();
            statusDateEl.innerHTML = datePart.replace('~', '<br class="sm:hidden">~ ');
        } else {
            const [year, month, day] = date.split('-').map(Number);
            const dateObj = new Date(Date.UTC(year, month - 1, day));
            const dayOfWeek = dateObj.toLocaleDateString('zh-TW', { weekday: 'long', timeZone: 'UTC' });
            const datePart = `${month}月${day}日`;
            statusDateEl.textContent = `${datePart} (${dayOfWeek.replace('星期','週')})`;
        }
        const cityKey = targetDayData.weatherCity;
        if (statusCityNameEl) statusCityNameEl.textContent = cityMap[cityKey] || '移動中';
        if (travelDayIndicatorEl) {
            travelDayIndicatorEl.style.display = targetDayData.isTravelDay ? 'inline-block' : 'none';
        }
        progressTextEl.textContent = `Day ${targetDayData.day} / ${tripInfo.totalDays}`;
        if (daySlider) {
            daySlider.value = targetDayData.day;
            const progress = ((targetDayData.day - daySlider.min) / (daySlider.max - daySlider.min)) * 100;
            daySlider.style.setProperty('--progress-width', `${progress}%`);
        }
        if (paginationDotsContainer) {
            let dotsHtml = '';
            for (let i = 0; i < tripInfo.totalDays; i++) {
                const dotDay = i + 1;
                const isActive = dotDay === targetDayData.day;
                dotsHtml += `<div class="pagination-dot ${isActive ? 'active' : ''}" data-day="${dotDay}"></div>`;
            }
            paginationDotsContainer.innerHTML = dotsHtml;
        }
        if (timeDiffEl) {
            const localTzKey = targetDayData.weatherCity;
            let diffText = '✈️ 飛行中';
            if (cityTimezoneMap[localTzKey]) {
                const diff = cityTimezoneMap[localTzKey];
                const sign = diff > 0 ? '+' : '';
                diffText = `與台灣時差 ${sign}${diff} 小時`;
            }
            timeDiffEl.textContent = diffText;
        }
        // --- 更新邏輯：每日主題 ---
        if (targetDayData.theme && !targetDayData.isTravelDay) {
            themeItemEl.style.display = 'flex';
            themeIconEl.textContent = targetDayData.theme.icon;
            themeTitleEl.textContent = targetDayData.theme.title;
            themeDescriptionEl.textContent = targetDayData.theme.description;
        } else {
            themeItemEl.style.display = 'none';
        }
        const cityWeather = allWeatherData ? allWeatherData[cityKey] : undefined;
        if (cityKey) {
            weatherItemEl.style.display = 'flex';
            if (cityWeather && cityWeather.time) { 
                const dayIndex = cityWeather.time.indexOf(date);
                if (dayIndex !== -1) {
                    const tempMax = cityWeather.temperature_2m_max[dayIndex];
                    const tempMin = cityWeather.temperature_2m_min[dayIndex];
                    const code = cityWeather.weather_code[dayIndex];
                    if (tempMax !== null && tempMax !== undefined && tempMin !== null && tempMin !== undefined) {
                        const roundedMax = Math.round(tempMax);
                        const roundedMin = Math.round(tempMin);
                        weatherIconEl.textContent = getWeatherIcon(code);
                        weatherTempEl.textContent = `${roundedMin}°C / ${roundedMax}°C`;
                        weatherReminderEl.textContent = getWeatherReminder(code);
                    } else {
                        weatherIconEl.textContent = '…';
                        weatherTempEl.textContent = '--°C / --°C';
                        weatherReminderEl.textContent = '…';
                    }
                } else { 
                    weatherIconEl.textContent = '❓';
                    weatherTempEl.textContent = '無預報';
                    weatherReminderEl.textContent = '無法取得本日天氣資訊。';
                }
            } else { 
                weatherIconEl.textContent = '…';
                weatherTempEl.textContent = '--°C / --°C';
                weatherReminderEl.textContent = '…';
            }
        } else {
            weatherItemEl.style.display = 'none';
        }
        const checkingIn = hotels.find(h => h.checkIn === date);
        const checkingOut = hotels.find(h => h.checkOut === date);
        const stayingAt = hotels.find(h => date >= h.checkIn && date < h.checkOut);
        let hotelHtml = '';
        if (checkingOut) {
            hotelHtml += `<div><span class="font-semibold text-red-600">[退房]</span> <a href="${checkingOut.mapLink}" target="_blank" class="hover:underline">${checkingOut.name}</a></div><div class="text-sm text-gray-600 pl-1">最晚退房：${checkingOut.checkOutTime}</div>`;
        }
        if (checkingIn) {
            const marginTop = checkingOut ? 'mt-2' : '';
            hotelHtml += `<div class="${marginTop}"><span class="font-semibold text-green-600">[入住]</span> <a href="${checkingIn.mapLink}" target="_blank" class="hover:underline">${checkingIn.name}</a></div><div class="text-sm text-gray-600 pl-1">最早入住：${checkingIn.checkInTime}</div>`;
        }
        if (!checkingIn && !checkingOut && stayingAt) {
            hotelHtml = `<p>住宿於 <a href="${stayingAt.mapLink}" target="_blank" class="hover:underline">${stayingAt.name}</a></p>`;
        }
        if (hotelHtml) {
            accommodationContentEl.innerHTML = hotelHtml;
            accommodationItemEl.style.display = 'flex';
        } else {
            accommodationContentEl.innerHTML = '';
            accommodationItemEl.style.display = 'none';
        }
        // 改進的交通項目篩選邏輯：考慮跨日航班的抵達時間
        let transportItems = transport.filter(t => {
            if (t.date === date) return true;
            if (t.type === '航班' && Array.isArray(t.details)) {
                return t.details.some(leg => {
                    const arrivalLocalDateStr = new Intl.DateTimeFormat('fr-CA', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        timeZone: leg.arrival.tz 
                    }).format(new Date(leg.arrival.time));
                    return arrivalLocalDateStr === date;
                });
            }
            return false;
        });
        if (transportItems.length > 0) {
            const iconMap = { '航班': '✈️', '火車': '🚄', '巴士': '🚌', '機場接送': '🚖' };
            transportIconEl.textContent = iconMap[transportItems[0].type] || '➡️';
            const transportHtml = transportItems.map(item => {
                if (item.type === '航班' && Array.isArray(item.details)) {
                    return item.details.map(leg => {
                        let depTime, arrTime, dateIndicator;
                        if (leg.flightCode === "日航 JL009") {
                            depTime = "01:30";
                            arrTime = "04:20";
                            dateIndicator = " (+1)";
                        } else if (leg.flightCode === "日航 JL097") {
                            depTime = "08:55";
                            arrTime = "11:35";
                            dateIndicator = "";
                        } else {
                            depTime = new Date(leg.departure.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: leg.departure.tz });
                            arrTime = new Date(leg.arrival.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: leg.arrival.tz });
                            const departureLocalDateStr = new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: leg.departure.tz }).format(new Date(leg.departure.time));
                            const arrivalLocalDateStr = new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: leg.arrival.tz }).format(new Date(leg.arrival.time));
                            dateIndicator = arrivalLocalDateStr > departureLocalDateStr ? ' (+1)' : '';
                        }
                        return `<div class="mb-1">
                            <p class="font-semibold">${leg.flightCode}</p>
                            <p class="text-sm">${leg.departure.airport} (${depTime}) → ${leg.arrival.airport} (${arrTime}${dateIndicator})</p>
                        </div>`;
                    }).join('');
                }
                return `<p>${item.details}</p>`;
            }).join('<div class="my-2 border-t border-dashed border-gray-300"></div>');
            transportContentEl.innerHTML = transportHtml;
            transportItemEl.style.display = 'flex';
        } else {
            transportContentEl.innerHTML = '';
            transportItemEl.style.display = 'none';
        }
        if (foodieListBtn && data.foodie && data.foodie[cityKey]) {
            foodieListBtn.style.display = 'block';
            foodieListBtn.onclick = () => window.openFoodieModal(cityKey);
        } else if (foodieListBtn) {
            foodieListBtn.style.display = 'none';
        }
    };
    if (direction === 1) { 
        applyAnimation('slide-out-left', 'slide-in-right', updateContent);
    } else if (direction === -1) {
        applyAnimation('slide-out-right', 'slide-in-left', updateContent);
    } else { 
        updateContent();
    }
}

function renderTags(tags) {
    return tags.map(tag => `<span class="tag">${tag}</span>`).join('');
}
function renderActivities(activities) {
    return activities.map(activity => `<div class="activity-block"><h4 class="font-bold text-lg text-blue-800">${activity.title}</h4><ul class="list-disc list-inside mt-2 text-gray-700 space-y-1">${activity.items.map(item => `<li>${item}</li>`).join('')}</ul></div>`).join('');
}
function renderReminder(reminder) {
    if (!reminder) return '';
    return `<div class="mt-4 p-4 bg-amber-100/60 rounded-lg border-l-4 border-amber-400"><h4 class="font-bold text-amber-800 flex items-center mb-2">${reminder.title}</h4><ul class="list-disc list-inside mt-2 text-amber-900/80 space-y-1">${reminder.items.map(item => `<li>${item}</li>`).join('')}</ul></div>`;
}
function renderInfoBox(infoBox) {
    if (!infoBox) return '';
    return `<div class="mt-4 p-4 bg-teal-100/60 rounded-lg border-l-4 border-teal-400"><h4 class="font-bold text-teal-800 flex items-center mb-2">${infoBox.title}</h4><ul class="list-disc list-inside mt-2 text-teal-900/80 space-y-1">${infoBox.items.map(item => `<li>${item}</li>`).join('')}</ul></div>`;
}

export function renderItinerary(itineraryData, container) {
    if (!itineraryData || !container) return;
    // 移除 skeleton 骨架
    container.innerHTML = '';
    let htmlContent = '';
    const renderedCitySections = new Set(); 

    itineraryData.forEach(day => {
        let sectionIdAttr = '';
        if (day.cityTarget && !renderedCitySections.has(day.cityTarget)) {
            sectionIdAttr = `id="${day.cityTarget}"`;
            renderedCitySections.add(day.cityTarget);
        }
        const tagsHtml = renderTags(day.tags);
        const activitiesHtml = renderActivities(day.activities);
        let reminderHtml = renderReminder(day.reminder);
        let infoBoxHtml = renderInfoBox(day.infoBox);
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
    // Intersection Observer 只對 viewport top ±200px 內的 .trip-card 加 is-visible
    const cards = container.querySelectorAll('.trip-card');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                } else {
                    entry.target.classList.remove('is-visible');
                }
            });
        }, { root: null, rootMargin: '200px 0px 200px 0px', threshold: 0.01 });
        cards.forEach(card => observer.observe(card));
    } else {
        // Fallback: 全部顯示
        cards.forEach(card => card.classList.add('is-visible'));
    }
} 