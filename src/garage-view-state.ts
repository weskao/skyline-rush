import type { GarageView } from './ui-state-contracts.js';
import { reactive } from 'vue';

// Event-driven presentation only; live race and WebGL state never enter Vue.
export const garageView = reactive<GarageView>({
  selected: 'pearl',
  status: 'Pearl · standard finish.',
  equipDisabled: true,
  equipLabel: 'Standard finish equipped',
});

export function updateGarageView(fields: Partial<GarageView>) {
  Object.assign(garageView, fields);
}
