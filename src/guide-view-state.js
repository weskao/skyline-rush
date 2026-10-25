import { reactive } from 'vue';
export const guideView = reactive({ selectedDevice: 'desktop', practiceKey: 'tutorial.start', practiceText: 'Start interactive practice' });
export function updateGuideView(fields) { Object.assign(guideView, fields); }
