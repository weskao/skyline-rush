import { PAINTS } from './appearance.ts';
import { updateGarageView } from './garage-view-state.ts';
import { t } from './i18n.js';
// Keep progression checks locked to the same implementation used in production.
import { availablePaints } from './access/production.js';

type Paint = (typeof PAINTS)[keyof typeof PAINTS];
type PaintCatalog = Record<string, { stars: number }>;
type GarageState = 'equipped' | 'owned' | 'locked';

interface GarageWorld {
  previewAppearance(paint: Paint): void;
  resize(): void;
}
interface GarageDependencies {
  getWorld(): GarageWorld | null | undefined;
  canOpen(): boolean;
  clearControls(): void;
  getEquippedPaint(): string;
  setEquippedPaint(id: string): void;
  getStars(): number;
}

export function garagePresentation(
  id: string, equipped: string, _stars: number, paints: PaintCatalog, available: string[],
) {
  const owned = available.includes(id);
  const state: GarageState = id === equipped ? 'equipped' : owned ? 'owned' : 'locked';
  return { state, owned, canEquip: owned && id !== equipped, need: paints[id]?.stars ?? 0 };
}

// Vue owns presentation state; the JS rendering engine retains WebGL canvas control.
export function setupGarageUI({
  getWorld, canOpen, clearControls, getEquippedPaint, setEquippedPaint, getStars,
}: GarageDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  const garageScreen = document.querySelector<HTMLDialogElement>('#garage-screen')!;
  let previewing: string = getEquippedPaint();
  function showGarage(id: string = previewing): void {
    const stars = getStars();
    const { state, canEquip, need } = garagePresentation(
      id, getEquippedPaint(), stars, PAINTS, availablePaints(stars),
    );
    const name = t('paint.' + id);
    updateGarageView({
      status: t('garage.status.' + state, { name, stars: need, have: stars }),
      equipDisabled: !canEquip,
      equipLabel: t('garage.btn.' + (state === 'owned' ? 'equip' : state), { name, stars: need }),
    });
  }
  function previewPaint(id: string): void {
    if (!Object.hasOwn(PAINTS, id)) return;
    previewing = id;
    getWorld()?.previewAppearance(PAINTS[id as keyof typeof PAINTS]);
    updateGarageView({ selected: id });
    showGarage();
  }
  $('#garage-equip').addEventListener('click', () => {
    setEquippedPaint(previewing);
    previewPaint(getEquippedPaint());
  });
  showGarage();
  $('#garage-button').addEventListener('click', () => {
    const world = getWorld();
    if (!world || !canOpen()) return;
    clearControls();
    garageScreen.showModal();
    $('#garage-preview').append($('#world'));
    world.resize();
    previewPaint(getEquippedPaint());
  });
  document.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach(button =>
    button.addEventListener('click', () => {
      const id = button.dataset.paint;
      if (id) previewPaint(id);
    }));
  $('#garage-close').addEventListener('click', () => garageScreen.close());
  garageScreen.addEventListener('close', () => {
    $('#app').prepend($('#world'));
    getWorld()?.resize();
    previewPaint(getEquippedPaint());
    clearControls();
    $('#garage-button').focus({ preventScroll: true });
  });
  garageScreen.addEventListener('keydown', event => event.stopPropagation());
  return { showGarage };
}
