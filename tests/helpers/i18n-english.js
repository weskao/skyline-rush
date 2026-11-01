// Brand/game terms, units and key names the zh-TW UI keeps in English.
export const ALLOWED_ENGLISH = new Set(['SKYLINE', 'RUSH', 'NITRO', 'FLY', 'BOOST', 'NOVA', 'ORBIT', 'APEX', 'VEGA', 'PULSE', 'COMET', 'RIFT', 'HUD', 'HYBRID', 'KM', 'ESC', 'SPACE', 'SHIFT', 'ENTER', 'BACKSPACE', 'CFD', 'GOOGLE', 'GHOST', 'AI', 'PNG', 'HTTPS', 'WEBGL', 'FPS']); // CFD: the technical acronym in "NOT CFD"; GOOGLE: the sign-in brand; the rest are technical names

export const strayEnglish = text => (text.match(/[A-Za-z][A-Za-z']*/g) ?? []).filter(word => word.length > 1 && !ALLOWED_ENGLISH.has(word.toUpperCase()));
