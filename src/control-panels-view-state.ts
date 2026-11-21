import type { ControlPanelsView } from './ui-state-contracts.ts';
import { reactive } from 'vue';

// The settings presentation is Vue-owned; game and input state remain in main.js.
export const panelsView = reactive<ControlPanelsView>({ settingsOpen: false, section: 'audio', keyboardSettings: true });
export function updatePanelsView(fields: Partial<ControlPanelsView>) { Object.assign(panelsView, fields); }
