export const DRIFT_TRAIL_SKINS = [
  { id: 'drift-trail-basic', category: 'drift-trail', default: true, name: { en: 'Classic rubber', 'zh-TW': '經典胎紋' }, candidateRasterId: 'drift-trail-basic' },
  { id: 'drift-trail-flame', category: 'drift-trail', default: false, name: { en: 'Embercut', 'zh-TW': '熾焰' }, candidateRasterId: 'drift-trail-flame' },
  { id: 'drift-trail-rainbow', category: 'drift-trail', default: false, name: { en: 'Prism Ribbon', 'zh-TW': '虹光流帶' }, candidateRasterId: 'drift-trail-rainbow' },
  { id: 'drift-trail-ice', category: 'drift-trail', default: false, name: { en: 'Glacier Fracture', 'zh-TW': '裂冰晶痕' }, candidateRasterId: 'drift-trail-ice' },
  { id: 'drift-trail-arc', category: 'drift-trail', default: false, name: { en: 'Voltage Arc', 'zh-TW': '霓電弧' }, candidateRasterId: 'drift-trail-arc' },
  { id: 'drift-trail-stardust', category: 'drift-trail', default: false, name: { en: 'Nebula Dust', 'zh-TW': '星雲微塵' }, candidateRasterId: 'drift-trail-stardust' },
] as const;

// Palette in sRGB, then converted by THREE.Color for the shader's linear blend.
export const DRIFT_TRAIL_STYLES = [
  { hue: 207, width: 0, height: 0, tint: '#626875', core: '#a6b1bc' },
  { hue: 23, width: .94, height: .53, tint: '#f03b15', core: '#ffc261' },
  { hue: 322, width: .98, height: .45, tint: '#a93de0', core: '#ff8dd5' },
  { hue: 193, width: .85, height: .53, tint: '#24b4e6', core: '#d5f5ff' },
  { hue: 263, width: .87, height: .37, tint: '#8041e9', core: '#decaff' },
  { hue: 294, width: 1.04, height: .52, tint: '#a63bba', core: '#ffd7ef' },
] as const;

export const driftTrailIndex = (id: unknown): number => Math.max(0, DRIFT_TRAIL_SKINS.findIndex(skin => skin.id === id));
