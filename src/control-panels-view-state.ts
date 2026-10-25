import type { ControlPanelsView } from './ui-state-contracts.js';
import { reactive } from 'vue';

// The two menus are Vue-owned; game and input state remain in main.js.
export const panelsView = reactive<ControlPanelsView>({ settingsOpen: false, controlsOpen: false });
export function updatePanelsView(fields: Partial<ControlPanelsView>) { Object.assign(panelsView, fields); }
