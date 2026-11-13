// The HUD NITRO status line: whether a charge can be fired now, is still filling, or is off for this race;
// and the flight-state line's chain level while a press during NITRO extends the burst.
export const NITRO_HUD_COPY = {
  en: {
    'hud.nitroReady': 'NITRO READY',
    'hud.nitroCharging': 'NITRO CHARGING',
    'hud.nitroUnavailable': 'NITRO UNAVAILABLE',
    'hud.nitroChain': 'NITRO ×{n}',
  },
  'zh-TW': {
    'hud.nitroReady': 'NITRO 就緒',
    'hud.nitroCharging': 'NITRO 充能中',
    'hud.nitroUnavailable': 'NITRO 暫不可用',
    'hud.nitroChain': 'NITRO ×{n}',
  },
} as const;
