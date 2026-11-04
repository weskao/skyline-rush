// Coming Soon track strings, split out of ui.ts (module-size limit); merged through feature-copy.ts.
// Keys must exist in both locales (tests/i18n.test.js enforces parity).
export const UPCOMING_COPY = {
  en: {
    'track.comingSoon': 'COMING SOON',
    'track.previewFallback': '3D preview unavailable · concept image only',
    'track.comingSoonInfo': '{track} is coming soon. Preview only — racing is not yet available.',
    'track.previewLength': '{km} KM · PLANNED',
    'track.note.dune-tempest': 'Open desert hairpins, canyon crossings and a high-risk aerial shortcut through rolling sandstorms.',
    'track.note.monsoon-ruins': 'Rainforest mud bends and a waterfall flight branch above ancient stone ruins.',
    'track.note.skyfall-archipelago': 'Floating islands, layered stone bridges and cloud-high flight routes.',
    'track.note.volcanic-crown': 'Volcanic switchbacks, basalt roads and an elevated route above the lava ravine.',
    'track.note.stormline-megacity': 'Rain-soaked neon streets, multi-level interchanges and rooftop aerial alternatives.',
    'track.note.frostbite-canyon': 'Glacier hairpins, cyan crystal fields and a high ice bridge over the Rift Spine, under the aurora.',
  },
  'zh-TW': {
    'track.comingSoon': '即將推出',
    'track.previewFallback': '3D 場景尚未完成 · 僅顯示概念圖片',
    'track.comingSoonInfo': '{track} 即將推出，目前僅提供預覽，尚無法開始比賽。',
    'track.previewLength': '{km} 公里 · 規劃中',
    'track.note.dune-tempest': '開闊沙丘髮夾彎、峽谷橫越與穿越沙暴的高風險空中捷徑。',
    'track.note.monsoon-ruins': '雨林泥地彎道、失落神殿與瀑布上方的飛行分岔。',
    'track.note.skyfall-archipelago': '浮空島嶼、多層石橋與雲層之上的自由飛行路線。',
    'track.note.volcanic-crown': '火山迂迴彎、玄武岩道路及橫越熔岩峽谷的空中路線。',
    'track.note.stormline-megacity': '霓虹暴雨街道、立體交流道與樓宇高空的捷徑選擇。',
    'track.note.frostbite-canyon': '冰河髮夾彎、青藍冰晶群與極光下橫越裂谷脊的高空冰橋。',
  },
} as const;
