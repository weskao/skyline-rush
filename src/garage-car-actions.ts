import { carAccess, equippedCar, equipCar, gtTrialEndsAt, isCar, savedGtTrial, setGaragePreviewCar, startGtTrial, type CarId } from './car-catalog.ts';
import { garageCars } from './garage-view-state.ts';

interface CarActions {
  getStars(): number;
  syncProgress(): Promise<unknown>;
  preview(id: CarId): void;
  selected(changed: boolean, wasPreview: boolean, playSound: boolean): void;
  onTrialExpired(): void;
}

export function setupGarageCarActions(panel: HTMLDialogElement, actions: CarActions) {
  let expiry: ReturnType<typeof setTimeout> | undefined;

  function refresh(): void {
    clearTimeout(expiry);
    const stars = actions.getStars(), startedAt = savedGtTrial();
    const now = Date.now(), access = carAccess('crimson-gt', stars, startedAt, now);
    Object.assign(garageCars, { stars, trialStartedAt: startedAt, access });
    if (access === 'trial' && startedAt !== undefined)
      expiry = setTimeout(actions.onTrialExpired, gtTrialEndsAt(startedAt) - now);
  }

  function clearPreview(): boolean {
    const wasPreview = garageCars.previewCar !== null;
    garageCars.previewCar = null;
    setGaragePreviewCar(null);
    return wasPreview;
  }

  function equip(id: CarId, playSound = true): boolean {
    const changing = id !== equippedCar();
    if (changing && !equipCar(id, undefined, actions.getStars())) return false;
    garageCars.trialError = false;
    const wasPreview = clearPreview();
    if (changing || wasPreview) actions.selected(changing, wasPreview, playSound);
    return true;
  }

  function select(id: CarId): void {
    if (equip(id)) return;
    garageCars.trialError = false;
    garageCars.previewCar = id;
    setGaragePreviewCar(id);
    actions.preview(id);
    refresh();
  }

  panel.addEventListener('click', event => {
    const target = event.target as Element;
    if (target.closest('[data-gt-trial]')) {
      if (!startGtTrial(actions.getStars())) { refresh(); garageCars.trialError = garageCars.trialStartedAt === undefined; return; }
      select('crimson-gt');
      panel.querySelector<HTMLButtonElement>('[data-car="crimson-gt"]')?.focus({ preventScroll: true });
      void actions.syncProgress();
      return;
    }
    const id = target.closest<HTMLElement>('[data-car]')?.dataset.car;
    if (isCar(id)) select(id);
  });
  return { refresh, clearPreview, equip };
}
