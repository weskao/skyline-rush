import { reactive } from 'vue';
export const releaseView = reactive({
  tabs: [], entries: [], panelLabel: 'release-tab-0', version: '', date: '', heroSrc: '',
});
export function updateReleaseView(fields) { Object.assign(releaseView, fields); }
