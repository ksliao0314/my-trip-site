// api.js - 負責所有外部 API 的請求 

export async function fetchTripData() {
  try {
    const response = await fetch('trip-data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error('載入行程資料失敗:', err);
    return null;
  }
}

const cityCoordinates = {
  montreal: { lat: 45.50, lon: -73.57 },
  quebec: { lat: 46.81, lon: -71.21 },
  niagara: { lat: 43.09, lon: -79.08 },
  chicago: { lat: 41.88, lon: -87.63 }
};

export async function fetchAllWeatherData(itinerary) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const uniqueCityDateRequests = [...new Set(itinerary.filter(day => day.weatherCity).map(day => JSON.stringify({ city: day.weatherCity, date: day.date })))].map(JSON.parse);
    const promises = uniqueCityDateRequests.map(async ({ city, date }) => {
      const { lat, lon } = cityCoordinates[city];
      const requestDate = new Date(date);
      let url;
      if (requestDate < today) {
        url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      } else {
        url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error for ${city} on ${date}`);
        const data = await res.json();
        return { city, date, data: data.daily };
      } catch (error) {
        console.error(`無法取得 ${city} 在 ${date} 的天氣資訊:`, error);
        return null;
      }
    });
    const results = await Promise.all(promises);
    const allWeatherData = {};
    results.filter(r => r).forEach(({ city, date, data }) => {
      if (!allWeatherData[city]) {
        allWeatherData[city] = { time: [], temperature_2m_max: [], temperature_2m_min: [], weather_code: [] };
      }
      const dateIndex = allWeatherData[city].time.indexOf(date);
      if (dateIndex === -1 && data && data.time) {
        allWeatherData[city].time.push(data.time[0]);
        allWeatherData[city].temperature_2m_max.push(data.temperature_2m_max[0]);
        allWeatherData[city].temperature_2m_min.push(data.temperature_2m_min[0]);
        allWeatherData[city].weather_code.push(data.weather_code[0]);
      }
    });
    return allWeatherData;
  } catch (err) {
    console.error('載入天氣資料失敗:', err);
    return null;
  }
}

/**
 * 檢查伺服器版本與本地版本，決定是否需要更新
 * @param {string} localVersion - 目前本地 trip-data.json 的版本號
 * @returns {Promise<{status: string, serverVersion?: string, localVersion?: string}>}
 */
export async function checkVersionAndUpdate(localVersion) {
  try {
    const res = await fetch('version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('version.json 讀取失敗');
    const data = await res.json();
    const serverVersion = data.version;
    if (!serverVersion) throw new Error('version.json 格式錯誤');
    if (serverVersion > localVersion) {
      return { status: 'update-available', serverVersion, localVersion };
    } else {
      return { status: 'up-to-date', serverVersion, localVersion };
    }
  } catch (err) {
    console.error('檢查版本時發生錯誤:', err);
    return { status: 'error', error: err.message };
  }
} 
