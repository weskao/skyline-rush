import { PAINTS } from './appearance.js';
import { updateGarageView } from './garage-view-state.js';
import { t } from './i18n.js';
// Same locked production source as Vite's @progression-access alias; also importable by node:test.
import { availablePaints } from './access/production.js';

/**
 * @param {string} id
 * @param {string} equipped
 * @param {number} stars
 * @param {Record<string, { stars: number }>} paints
 * @param {string[]} available
 */
export function garagePresentation(id, equipped, stars, paints, available) {
  const owned = available.includes(id);
  return { state: id === equipped ? 'equipped' : owned ? 'owned' : 'locked',
    owned, canEquip: owned && id !== equipped, need: paints[id].stars };
}

// Event-driven dialog only. Game ownership, world rendering and progression
// stay in main.js, so switching to the UI does not add frame-loop reactivity.
export function setupGarageUI({ getWorld, canOpen, clearControls, getEquippedPaint, setEquippedPaint, getStars }) {
  const $ = selector => document.querySelector(selector);
  const garageScreen = $('#garage-screen');
  let previewing = getEquippedPaint();
  function showGarage(id = previewing) {
    const stars = getStars();
    const { state, canEquip, need } = garagePresentation(id, getEquippedPaint(), stars, PAINTS, availablePaints(stars));
    const name = t(`paint.${id}`);
    updateGarageView({
      status: t(`garage.status.${state}`, { name, stars: need, have: stars }),
      equipDisabled: !canEquip,
      equipLabel: t(`garage.btn.${state === 'owned' ? 'equip' : state}`, { name, stars: need }),
    });
  }
  function previewPaint(id) {
    previewing = id;
    getWorld()?.previewAppearance(PAINTS[id]);
    updateGarageView({ selected: id });
    showGarage();
  }
  $('#garage-equip').addEventListener('click', () => { setEquippedPaint(previewing); previewPaint(getEquippedPaint()); });
  showGarage();
  $('#garage-button').addEventListener('click', () => {
    const world = getWorld();
    if (!world || !canOpen()) return;
    clearControls(); garageScreen.showModal();
    $('#garage-preview').append($('#world'));
    world.resize(); previewPaint(getEquippedPaint());
  });
  document.querySelectorAll('[data-paint]').forEach(button => button.addEventListener('click', () => previewPaint(button.dataset.paint)));
  $('#garage-close').addEventListener('click', () => garageScreen.close());
  garageScreen.addEventListener('close', () => {
    $('#app').prepend($('#world')); getWorld()?.resize(); previewPaint(getEquippedPaint());
    clearControls(); $('#garage-button').focus({ preventScroll: true });
  });
  garageScreen.addEventListener('keydown', event => event.stopPropagation());
  return { showGarage };
}
