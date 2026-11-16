import type { GarageView } from './ui-state-contracts.ts';
import { reactive } from 'vue';
import type { GarageLighting } from './garage-stage.ts';
import type { CarId } from './car-catalog.ts';

// Event-driven presentation only; live race and WebGL state never enter Vue.
export const garageView = reactive<GarageView>({
  selected: 'pearl',
  status: 'Pearl · standard finish.',
  canUndo: false,
  equipDisabled: true,
  equipLabel: 'Standard finish equipped',
});

export function updateGarageView(fields: Partial<GarageView>) {
  Object.assign(garageView, fields);
}

export const garageStudioView = reactive<{ page: 'home' | 'studio'; angle: string; autoRotate: boolean; mode: 'ground' | 'flight'; wing: boolean; lighting: GarageLighting; effectsVisible: boolean; effectsReminder: number; ownedPaints: string[]; equippedPaint: string; car: CarId }>({
  page: 'home', angle: '', autoRotate: true, mode: 'ground', wing: false, lighting: 'bright', effectsVisible: true, effectsReminder: 0, ownedPaints: ['pearl', 'crimson'], equippedPaint: 'pearl', car: 'roadster',
});
export function updateGarageStudioView(fields: Partial<typeof garageStudioView>) {
  Object.assign(garageStudioView, fields);
}
