// config.js
// 存放固定設定，如城市座標

export const cityCoordinates = {
    montreal: { lat: 45.5017, lon: -73.5673 },
    quebec: { lat: 46.8139, lon: -71.2082 },
    niagara: { lat: 43.0962, lon: -79.0377 },
    chicago: { lat: 41.8781, lon: -87.6298 }
};

// 城市名稱對照表
export const cityMap = {
  montreal: '蒙特婁',
  quebec: '魁北克市',
  niagara: '尼加拉瀑布',
  chicago: '芝加哥',
  '': '飛行途中'
};

// 城市時區對照表（以 UTC+8 為基準的時差，單位：小時）
export const cityTimezoneMap = {
  montreal: -12, // UTC-4
  quebec: -12,   // UTC-4
  niagara: -12,  // UTC-4
  chicago: -13   // UTC-5
}; 
