import type { GarageView } from './ui-state-contracts.ts';
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

export const garageStudioView = reactive<{ page: 'home' | 'studio'; angle: string; autoRotate: boolean; ownedPaints: string[]; equippedPaint: string }>({
  page: 'home', angle: '', autoRotate: true, ownedPaints: ['pearl'], equippedPaint: 'pearl',
});
export function updateGarageStudioView(fields: Partial<typeof garageStudioView>) {
  Object.assign(garageStudioView, fields);
}
