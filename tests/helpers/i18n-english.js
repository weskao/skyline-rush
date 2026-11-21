// Brand/game terms, units and key names the zh-TW UI keeps in English.
export const ALLOWED_ENGLISH = new Set(['SKYLINE', 'RUSH', 'NITRO', 'FLY', 'BOOST', 'NOVA', 'ORBIT', 'APEX', 'VEGA', 'PULSE', 'COMET', 'RIFT', 'HUD', 'HYBRID', 'KM', 'ESC', 'SPACE', 'SHIFT', 'ENTER', 'BACKSPACE', 'CFD', 'GOOGLE', 'GHOST', 'GT', 'AI', 'PNG', 'HTTPS', 'WEBGL', 'FPS', 'UTC', 'EMP']); // EMP: the item's name on the hit panel ("EMP 電擊！"); CFD: the technical acronym in "NOT CFD"; GOOGLE: the sign-in brand; the rest are technical names

export const strayEnglish = text => (text.match(/[A-Za-z][A-Za-z']*/g) ?? []).filter(word => word.length > 1 && !ALLOWED_ENGLISH.has(word.toUpperCase()));
