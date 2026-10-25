import { reactive } from 'vue';

// The two menus are Vue-owned; game and input state remain in main.js.
export const panelsView = reactive({ settingsOpen: false, controlsOpen: false });
export function updatePanelsView(fields) { Object.assign(panelsView, fields); }
