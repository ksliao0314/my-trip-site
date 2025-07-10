// api-service.js
// 處理所有外部資料請求

import { cityCoordinates } from './config.js';

export async function fetchTripData() {
    try {
        const response = await fetch('trip-data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        // 離線時自動 fallback 到 service worker cache
        if ('caches' in window) {
            try {
                const cacheRes = await caches.match('trip-data.json');
                if (cacheRes && cacheRes.ok) {
                    return await cacheRes.json();
                }
            } catch (e) {
                // fallback 失敗
            }
        }
        throw err;
    }
}

export async function fetchAllWeatherData(itinerary) {
    if (!navigator.onLine && !navigator.serviceWorker.controller) {
        return {};
    }

    // 修正今天的日期計算 - 使用本地時區
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`; // 使用本地日期字串

    // 檢查本地快取
    const cachedWeatherData = localStorage.getItem('weatherDataCache');
    let existingData = {};
    let cacheTimestamp = 0;
    
    if (cachedWeatherData) {
        try {
            const parsed = JSON.parse(cachedWeatherData);
            existingData = parsed.data || {};
            cacheTimestamp = parsed.timestamp || 0;
        } catch (e) {
            // 天氣快取資料解析失敗，將重新取得
        }
    }

    // 檢查快取是否仍然有效（24小時內）
    const cacheAge = Date.now() - cacheTimestamp;
    const cacheValid = cacheAge < 24 * 60 * 60 * 1000; // 24小時
    // 分離過去日期和未來日期
    const pastDates = [];
    const futureDates = [];
    
    // 計算預報 API 的有效日期範圍（通常為未來 7-16 天）
    const maxForecastDays = 16; // Open-Meteo 預報 API 的最大天數
    const maxForecastDate = new Date(now);
    maxForecastDate.setDate(now.getDate() + maxForecastDays);
    const maxForecastDateStr = maxForecastDate.toISOString().split('T')[0];
    
    // 簡化：使用本地日期進行分類，但在 API 請求中指定目標城市時區
    itinerary.filter(day => day.weatherCity).forEach(day => {
        const requestDateStr = day.date;
        if (requestDateStr < todayStr) {
            pastDates.push({ city: day.weatherCity, date: day.date });
        } else if (requestDateStr <= maxForecastDateStr) {
            futureDates.push({ city: day.weatherCity, date: day.date });
        }
    });

    // 只 fetch 缺少的日期
    const allDates = [...pastDates, ...futureDates];
    const datesToFetch = allDates.filter(({ city, date }) => {
        const cityData = existingData[city];
        return !cityData || !cityData.time || !cityData.time.includes(date);
    });

    if (datesToFetch.length === 0 && cacheValid) {
        // 全部都有快取且快取有效，直接回傳
        return existingData;
    }

    // 只 fetch 缺少的資料，fetch 完再合併寫回 localStorage
    const promises = datesToFetch.map(async ({ city, date }) => {
        const { lat, lon } = cityCoordinates[city];
        const cityTimezones = {
            montreal: 'America/Montreal',
            quebec: 'America/Montreal', 
            niagara: 'America/Toronto',
            chicago: 'America/Chicago'
        };
        const timezone = cityTimezones[city] || 'auto';
        let url;
        if (date < todayStr) {
            url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${timezone}`;
        } else {
            url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${timezone}`;
        }
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`API error for ${city} on ${date}`);
            const data = await res.json();
            return { city, date, data: data.daily };
        } catch (error) {
            // 新增：離線時自動 fallback 到 service worker cache
            if ('caches' in window) {
                try {
                    const cacheRes = await caches.match(url);
                    if (cacheRes && cacheRes.ok) {
                        const data = await cacheRes.json();
                        return { city, date, data: data.daily };
                    }
                } catch (e) {
                    // fallback 失敗
                }
            }
            return null;
        }
    });

    const results = await Promise.all(promises);
    try {
        const allWeatherData = { ...existingData };
        results.filter(r => r).forEach(({ city, date, data }) => {
            if (!allWeatherData[city]) {
                allWeatherData[city] = { time: [], temperature_2m_max: [], temperature_2m_min: [], weather_code: [] };
            }
            const dateIndex = allWeatherData[city].time.indexOf(date);
            if (dateIndex === -1 && data && data.time && data.time.length > 0) {
                allWeatherData[city].time.push(data.time[0]);
                allWeatherData[city].temperature_2m_max.push(data.temperature_2m_max[0]);
                allWeatherData[city].temperature_2m_min.push(data.temperature_2m_min[0]);
                allWeatherData[city].weather_code.push(data.weather_code[0]);
            }
        });
        // 僅在有新資料時寫回 localStorage
        if (datesToFetch.length > 0) {
            try {
                localStorage.setItem('weatherDataCache', JSON.stringify({
                    data: allWeatherData,
                    timestamp: Date.now()
                }));
            } catch (e) {
                // 本地快取寫入失敗可忽略
            }
        }
        return allWeatherData;
    } catch (err) {
        throw err;
    }
} 
