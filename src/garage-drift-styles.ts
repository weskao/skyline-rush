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
  { hue: 23, width: .64, height: .47, tint: '#e44725', core: '#ffb04f' },
  { hue: 322, width: .68, height: .34, tint: '#a93de0', core: '#ff8dd5' },
  { hue: 193, width: .56, height: .45, tint: '#26a9da', core: '#bcecff' },
  { hue: 263, width: .62, height: .33, tint: '#7537e7', core: '#bdb1ff' },
  { hue: 294, width: .74, height: .58, tint: '#8338ad', core: '#f7bbdf' },
] as const;

export const driftTrailIndex = (id: unknown): number => Math.max(0, DRIFT_TRAIL_SKINS.findIndex(skin => skin.id === id));
