import type { GuideView } from './ui-state-contracts.ts';
import { reactive } from 'vue';
export const guideView = reactive<GuideView>({ selectedDevice: 'desktop', practiceKey: 'tutorial.start', practiceText: 'Start interactive practice' });
export function updateGuideView(fields: Partial<GuideView>) { Object.assign(guideView, fields); }
