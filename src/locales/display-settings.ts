// FPS and quality remain independent controls, sharing the same panel and localization.
export const DISPLAY_SETTINGS_COPY = {
  en: {
    'vfx.fps': 'Target FPS',
    'vfx.fps.auto': 'Auto',
    'vfx.fps.note': 'Auto holds a steady 60 FPS and drops to 30 only after sustained missed frames. 90/120 FPS are manual and need browser and display support; Quality stays independent.',
    'vfx.adaptiveResolution': 'Adaptive resolution',
    'vfx.adaptiveResolution.note': 'Off by default. When on, sustained frame drops lower render resolution slightly before FPS; your Quality choice is never changed.',
    'vfx.quality': 'Quality',
    'vfx.quality.low': 'Low',
    'vfx.quality.medium': 'Medium',
    'vfx.quality.high': 'High',
    'vfx.quality.ultra': 'Ultra',
  },
  'zh-TW': {
    'vfx.fps': '目標幀率',
    'vfx.fps.auto': '自動',
    'vfx.fps.note': '自動模式維持穩定 60 FPS，只在持續掉幀時才降到 30；90／120 FPS 為手動選項，需瀏覽器與螢幕支援，畫質仍可獨立選擇。',
    'vfx.adaptiveResolution': '自適應解析度',
    'vfx.adaptiveResolution.note': '預設關閉。開啟後，持續掉幀時會先略降繪圖解析度，再降低幀率；不會更改你的畫質設定。',
    'vfx.quality': '畫質',
    'vfx.quality.low': '低',
    'vfx.quality.medium': '中',
    'vfx.quality.high': '高',
    'vfx.quality.ultra': '極致',
  },
} as const;
