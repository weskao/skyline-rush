// FPS and quality remain independent controls, sharing the same panel and localization.
export const DISPLAY_SETTINGS_COPY = {
  en: {
    'vfx.fps': 'Target FPS',
    'vfx.fps.auto': 'Auto',
    'vfx.fps.note': 'Auto adjusts render FPS and resolution only. Quality is selected separately.',
    'vfx.quality': 'Quality',
    'vfx.quality.low': 'Low',
    'vfx.quality.medium': 'Medium',
    'vfx.quality.high': 'High',
  },
  'zh-TW': {
    'vfx.fps': '目標幀率',
    'vfx.fps.auto': '自動',
    'vfx.fps.note': '自動模式僅調整繪圖幀率與解析度；畫質可獨立選擇。',
    'vfx.quality': '畫質',
    'vfx.quality.low': '低',
    'vfx.quality.medium': '中',
    'vfx.quality.high': '高',
  },
} as const;
