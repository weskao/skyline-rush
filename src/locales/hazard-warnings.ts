// ENV-05: the HUD warning names the kind of hazard ahead, so a gust or an icy patch never reads as a barrier.
export const HAZARD_WARNING_COPY = {
  en: {
    'mode.hazardBlock': '⚠ BARRIER · {n} m',
    'mode.hazardWind': '⚠ CROSSWIND · {n} m',
    'mode.hazardGrip': '⚠ LOW GRIP · {n} m',
    'mode.hazardRamp': '⚠ RAMP · {n} m',
    'mode.hazardAhead': '⚠ AHEAD · {n} m',
  },
  'zh-TW': {
    'mode.hazardBlock': '⚠ 前方路障 · {n} 公尺',
    'mode.hazardWind': '⚠ 前方側風 · {n} 公尺',
    'mode.hazardGrip': '⚠ 前方路滑 · {n} 公尺',
    'mode.hazardRamp': '⚠ 前方跳台 · {n} 公尺',
    'mode.hazardAhead': '⚠ 前方注意 · {n} 公尺',
  },
} as const;
