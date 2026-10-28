// FPS and quality remain independent controls, sharing the same panel and localization.
export const DISPLAY_SETTINGS_COPY = {
  en: {
    'vfx.fps': 'Target FPS',
    'vfx.fps.auto': 'Auto',
    'vfx.fps.note': 'Auto raises render FPS only after sustained low load. 90/120 FPS require browser and display support; Quality stays independent.',
    'vfx.quality': 'Quality',
    'vfx.quality.low': 'Low',
    'vfx.quality.medium': 'Medium',
    'vfx.quality.high': 'High',
  },
  'zh-TW': {
    'vfx.fps': '目標幀率',
    'vfx.fps.auto': '自動',
    'vfx.fps.note': '自動模式在持續低負載時才提高繪圖幀率；90／120 FPS 需瀏覽器與螢幕支援，畫質仍可獨立選擇。',
    'vfx.quality': '畫質',
    'vfx.quality.low': '低',
    'vfx.quality.medium': '中',
    'vfx.quality.high': '高',
  },
} as const;
