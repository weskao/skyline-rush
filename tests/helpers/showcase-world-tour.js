// Probes of tests/fixtures/world-tour-mid-race.html shared by world-tour-showcase-browser.spec.js and the folded tests there:
// one booted page runs every map of a family (about 11 s saved per boot on the CPU-only CI runner).
export async function openWorldTour(page, viewport) {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto('/tests/fixtures/world-tour-mid-race.html');
  await page.waitForFunction(() => window.worldTourReady === true);
}

// The player is compared to the real original course preview rendered by the same world, geometry and camera.
export const homePreview = (page, id) => page.evaluate(async id => {
  const baseline = window.worldTourPreviewProbe('coast').actors[0];
  await new Promise(requestAnimationFrame);
  const first = window.worldTourPreviewProbe(id).actors;
  await new Promise(resolve => setTimeout(resolve, 200));
  const later = window.worldTourPreviewProbe(id).actors;
  return { baseline, first, later };
}, id);

export const previewLandmark = (page, id, kind) => page.evaluate(([id, kind]) => {
  let probe; for (let i = 0; i < 3; i++) probe = window.worldTourPreviewProbe(id);
  return probe.landmarks.find(entry => entry.kind === kind);
}, [id, kind]);

export const airflowAngles = (page, id) => page.evaluate(id => {
  const flying = window.worldTourPreviewProbe(id, { airflow: false, view: 'drive' }).actors[0];
  const grounded = window.worldTourPreviewProbe(id, { airflow: true, view: 'drive' }, 24).actors[0];
  const angles = {};
  for (const view of ['drive', 'front', 'rear', 'left', 'right', 'orbit']) {
    angles[view] = window.worldTourPreviewProbe(id, { airflow: true, view }, 18).actors[0];
  }
  return { flying, grounded, angles };
}, id);

export const landmarkAt = (page, id, kind, at) => page.evaluate(async ([id, kind, at]) => {
  for (let i = 0; i < 40; i++) { await new Promise(requestAnimationFrame); window.worldTourProbe(id, at); }
  return window.worldTourLandmarks().find(entry => entry.kind === kind);
}, [id, kind, at]);
