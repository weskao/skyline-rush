import type { GarageView } from './ui-state-contracts.ts';
import { reactive } from 'vue';
import type { GarageLighting } from './garage-stage.ts';

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

export const garageStudioView = reactive<{ page: 'home' | 'studio'; angle: string; autoRotate: boolean; mode: 'ground' | 'flight'; wing: boolean; lighting: GarageLighting; ownedPaints: string[]; equippedPaint: string }>({
  page: 'home', angle: '', autoRotate: true, mode: 'ground', wing: false, lighting: 'bright', ownedPaints: ['pearl'], equippedPaint: 'pearl',
});
export function updateGarageStudioView(fields: Partial<typeof garageStudioView>) {
  Object.assign(garageStudioView, fields);
}
