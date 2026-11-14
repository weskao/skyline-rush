// VFX panel: the race HUD layout choice, its optional widgets, NITRO and BOOST ready cues and reset.
// Audio panel: the 3x HUD source-artwork gallery (HudSourceArtwork.vue).
export const HUD_SETTINGS_COPY = {
  en: {
    'hudSettings.legend': 'Race HUD',
    'hudSettings.hybrid': 'Immersive',
    'hudSettings.competitive': 'Competitive',
    'hudSettings.leaderboard': 'Show leaderboard',
    'hudSettings.map': 'Show minimap',
    'hudSettings.telemetry': 'Show secondary stats',
    'hudSettings.readySound': 'NITRO / BOOST ready sound',
    'hudSettings.readyAnimation': 'NITRO / BOOST ready animation',
    'hudSettings.reset': 'Reset HUD to default',
    'hudArt.summary': 'UI 3× Artwork',
    'hudArt.note': 'Source preview only · does not change the HUD layout or button behavior.',
  },
  'zh-TW': {
    'hudSettings.legend': '遊戲介面',
    'hudSettings.hybrid': '沉浸式',
    'hudSettings.competitive': '競技資訊',
    'hudSettings.leaderboard': '顯示排行榜',
    'hudSettings.map': '顯示小地圖',
    'hudSettings.telemetry': '顯示額外統計',
    'hudSettings.readySound': 'NITRO／BOOST 就緒提示音',
    'hudSettings.readyAnimation': 'NITRO／BOOST 就緒動畫',
    'hudSettings.reset': '重設為預設介面',
    'hudArt.summary': '操作圖示素材',
    'hudArt.note': '素材展示不改變既有 HUD 配置或按鈕功能。',
  },
} as const;
