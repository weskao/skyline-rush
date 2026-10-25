import type { TutorialCoachView } from './ui-state-contracts.js';
import { reactive } from 'vue';

// Only changes between tutorial steps are reactive. The progress.value stays
// imperative because it is updated on every racing frame.
export const coachView = reactive<TutorialCoachView>({
  visible: false, step: '', title: '', instruction: '', pauseText: '',
  pauseHidden: false, completeActionsHidden: true, assistHidden: false,
  hintKeys: '', hintText: '',
});
export function updateCoachView(fields: Partial<TutorialCoachView>) { Object.assign(coachView, fields); }
