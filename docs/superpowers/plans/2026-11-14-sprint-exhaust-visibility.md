# Sprint Exhaust Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A held NITRO or BOOST shows a plume that reads at a glance on a phone in both orientations, while the car keeps its screen size.

**Architecture:** Two independent changes. (1) `RACE_CAMERA` gains `sprintLook`; `rigLook` lowers the look-at height by it times the eased sprint share, so the landscape nozzles rise off the bottom edge without moving the eye. (2) The rear exhaust leaves `src/aero-vfx.js` for a new `src/sprint-plume.ts` that owns the four jets plus three new draw calls: a daylight core, camera-facing nozzle flares and a road glow.

**Tech Stack:** Three.js r180 `ShaderMaterial` / `InstancedMesh`, strict TypeScript for the new module, `node --test` unit tests, Playwright for gated captures.

**Spec:** `docs/superpowers/specs/2026-11-14-sprint-exhaust-visibility-design.md`

## Global Constraints

- `src/world.js` stays at 998 lines; `src/aero-vfx.js` and every other source module stay at or below 400. No ceiling is raised.
- No rest/cruise camera change, no pull-back, no distance term, no dolly change. Portrait and first person re-aim by 0.
- Every camera number lives in `RACE_CAMERA` / `src/race-camera.ts`.
- Jets keep the names `Cold gas nozzle N` and the uniforms `time, power, brightness, diamonds, extreme, nitroMix, tail, skinTint, skinPattern, trailAccent`.
- At most 3 extra draw calls. Every new mesh exists hidden from creation (world warm-up compiles it). Per frame: uniforms only, no allocation.
- Shaders: every `pow()` base is `max(0.,…)` or `clamp(…)`; every `exp()` argument is a negated abs/dot/length/square or a `clamp()`ed scalar; every uv-derived scalar is clamped (`tests/shader-safety.test.js`).
- New flare and glow layers are depth-tested (`depthTest: true`, `depthWrite: false`).
- VFX Off shows nothing. Reduced Motion and Comfortable: no re-aim, static plume, every shader clock frozen.
- `?look=3d` gating of `plumeLook` and `thrusterGlow` is untouched.
- No user-specific absolute path in any committed file.

## Measured before planning (throwaway script through the live rig, default FOV setting)

| | Today | With `sprintLook` 3.5 |
| --- | --- | --- |
| Landscape nozzle row: standstill / cruise | 0.804 / 0.803 | unchanged |
| Landscape nozzle row: held BOOST (share 0.62 at 88 m/s; `cap` is 110 in `world.js`) | 0.802 | 0.759 |
| Landscape nozzle row: NITRO top speed (share 1) | 0.801 | 0.736 |
| Landscape horizon row, NITRO, default / strongest FOV setting | 0.478 | 0.423 / 0.429 |
| Jet radius 0.6 m behind the nozzle (default / Realistic, any state) | 0.095 to 0.136 m | at least 0.20 m (new profile 0.211 m) |
| Jet width 0.6 m behind the nozzle, both phones, NITRO | 14.7 to 15.7 px | 32.8 to 35 px |
| Jet width 1 m behind the nozzle, both phones, all states | 19.3 to 34.0 px | 37.9 to 53.6 px |

The spec's "about 8 px" is the width at the nozzle exit. At 1 m today's cone is already 19 to 34 px (a short Realistic cone widens faster), so "20 px at 1 m" alone is RED only for portrait NITRO. The guard therefore also asserts the spec's own flame rule (radius at least 0.20 m by 0.6 m, at least 28 px there), which is RED on every preset today.

## Review Focus

1. **Sloped and framed roads.** `look` is added to a sloped road frame on Sky Spiral and climbing courses: the car must stay inside the frame and the nozzle row within 0.05 of Coast's. Pinned in Task 1 (capture spec assertion), judged in Task 7.
2. **NITRO x3 chain.** `frame.fov` and `frame.power` reach 1.4: the re-aim clamps at 1 share and the plume clamps power at 1, so the flare never grows past 0.45 m or whites out. Pinned in Tasks 2 and 5.
3. **NITRO trail skin under Reduced Motion.** The skin's streaks are off in calm modes; the base plume must then stay in full, not fade against streaks nobody sees. Pinned in Task 5.
4. **Leaving the ground mid-sprint, pause, restart.** The road glow hides the frame the car is airborne and outside `racing`; `reset()` hides every part; a paused frame (dt 0) changes nothing. Pinned in Task 5.
5. **Flare against the bumper, per car.** A camera-facing quad centred on the nozzle leans into the bodywork and is cut in half by the depth test; each car places `Rear ports` differently (`src/garage-model.ts`). Pinned in Task 5 (unit: the flare is pulled towards the eye by its radius) and Task 6 (real frames, both cars).

---

### Task 1: Evidence tooling and the "before" baseline

**Files:**
- Modify: `tests/sprint-camera-capture-browser.spec.js`
- Create: `tests/sprint-plume-cost-browser.spec.js`

**Interfaces:**
- Produces: `window.plumeOnScreen()` in the capture page returning `{ nozzleRow, box: { x0, x1, y0, y1 }, carInside }` (rows and x in 0 to 1, top-left origin), computed from `Rear ports` world matrix and the port offsets `x ∈ {-0.62, -0.22, 0.22, 0.62}`, `y 0.64`, `z 2.39` out to 2 m behind them, so it runs on today's code. JSON rows gain `plume` and `contrast` per state.

- [ ] **Step 1:** In the capture spec, change the track list to `['coast', 'neon', 'spiral', 'canyon']` (keep the unlock list as is) and record `plume: await page.evaluate(() => window.plumeOnScreen())` beside each existing `carOnScreen()` row. Before the first run, read the `uphill` sections in `src/race-tracks.ts`; if `canyon` has none, use the unlocked track with the longest `uphill` section and seed `player.distance` to its start.
- [ ] **Step 2:** Add `contrast(png, box)` using the in-page PNG decode pattern of `changedShare` in `tests/frostbite-canyon-browser.spec.js`: mean RGB of the central third of `box` (the core) against the mean RGB of two road strips of the same height, one box-width left and right of it; return the Euclidean distance on a 0 to 255 scale. Record it for `boost` and `nitro-top`.
- [ ] **Step 3:** After the JSON is written add, for label names starting with `after`: `expect(rows.nitroTop.plume.carInside).toBe(true)`; for Coast and Neon `expect(rows.nitroTop.contrast).toBeGreaterThanOrEqual(40)`.
- [ ] **Step 4:** Create `tests/sprint-plume-cost-browser.spec.js`, gated by `PLUME_BENCH=1`, modelled on `tests/tier-cost-benchmark-browser.spec.js` (same launch args, `sampleFrameCost`, `gpuName`, output under `docs/designs/3d-pipeline/audits/sprint-plume/`), without `?look=3d`: for `VIEWPORT` 844x390 and 1440x900, for Low, Medium, High, hold `speed: 118, nitroTime: 30` on Coast for 2 s, then `sampleFrameCost(page, 6000)`; write `{ label, viewport, tier, gpu, p50, p95, calls, triangles }`.
- [ ] **Step 5:** Build, then run the baseline on the current code and keep the output (gitignored):

```bash
npm run build
for v in desktop portrait landscape; do SPRINT_CAMERA_CAPTURE=1 LABEL=before VIEWPORT=$v npx playwright test tests/sprint-camera-capture-browser.spec.js; done
SPRINT_CAMERA_CAPTURE=1 LABEL=before VIEWPORT=landscape HERO_CAR=crimson-gt npx playwright test tests/sprint-camera-capture-browser.spec.js
for v in 844x390 1440x900; do PLUME_BENCH=1 LABEL=before VIEWPORT=$v npx playwright test tests/sprint-plume-cost-browser.spec.js; done
```

Expected: all pass (no `after` assertions run); JSON and PNG files exist. Use `PLAYWRIGHT_PORT` if 5178 is held.
- [ ] **Step 6:** `node --test tests/browser-timeouts.test.js` passes. Commit: `test(vfx): capture the sprint plume box, contrast and frame cost`.

### Task 2: Camera sprint re-aim

**Files:**
- Modify: `src/race-camera.ts` (`RaceCameraView`, `RACE_CAMERA`, `rigLook`)
- Modify: `src/world.js:839` (same line, no growth)
- Test: `tests/race-camera.test.js`

**Interfaces:**
- Produces: `RaceCameraView.sprintLook: number`; `rigLook(view: RaceCameraView, fov: number, sprint = 0): number`.

- [ ] **Step 1: Write the failing tests.** Give `rigAt` a fourth parameter `share = 0` passed to `rig.rigLook(view, fov, share)`; give each `sprintStates` row a fourth element (0 for cruise, 1 for the others) and pass it wherever the rows are destructured (portrait HUD test, dolly test). Add:

```js
const NOZZLE_Y = 0.64, NOZZLE_Z = 2.39; // src/aero-vfx.js REAR_PORTS
const heldShare = (nitro, speed, reducedMotion = false) => {
  const sprint = createSprintVfx(); let frame;
  for (let i = 0; i < 80; i++) frame = sprint.update({ phase: 'racing', nitro, boost: !nitro, speed, cap: 110, dt: 0.05, enabled: true, quality: 'high', reducedMotion });
  return frame.fov;
};
const nozzleRow = (view, speed, share, setting = DEFAULT_FOV) => {
  const state = rigAt(view, speed, sprintFov(setting, share), share);
  return screenY(view, state, state.back - NOZZLE_Z, NOZZLE_Y);
};

test('sprint re-aim: a held NITRO/BOOST lifts the landscape nozzles off the bottom edge without moving the eye', () => {
  assert.deepEqual([chase.sprintLook, portrait.sprintLook, first.sprintLook], [3.5, 0, 0]);
  const nitro = nozzleRow(chase, TOP, 1), boostShare = heldShare(false, MAX_SPEED);
  assert.ok(nitro <= 0.75 && 1 - nitro >= 0.24, `NITRO nozzle row ${nitro.toFixed(3)}`);
  assert.ok(boostShare > 0.6 && boostShare < 0.7, `held BOOST share ${boostShare}`);
  assert.ok(nozzleRow(chase, MAX_SPEED, boostShare) <= 0.77, 'a held BOOST re-aims by its real share');
  assert.ok(Math.abs(nozzleRow(chase, 0, 0) - 0.804) < 0.005 && Math.abs(nozzleRow(chase, MAX_SPEED, 0) - 0.803) < 0.005, 'standstill and cruise keep their rows');
  assert.equal(rigBack.length, 2, 'the eye distance takes no sprint share');
  for (const setting of [DEFAULT_FOV, STRONGEST_FOV]) for (const [name, speed, extra, share] of sprintStates(setting)) {
    const state = rigAt(chase, speed, extra, share);
    assert.ok(screenY(chase, state, 1e6, 0) >= 0.4, `the road ahead stays in view: ${name}, FOV setting ${setting}`);
    assert.ok(screenY(chase, state, state.back - CAR_HALF_LENGTH, 0) <= 0.92, `the bumper never sinks: ${name}`);
  }
  const fov = rigFov(chase, TOP) + sprintFov(DEFAULT_FOV, 1);
  assert.equal(rig.rigLook(chase, fov, 0), rig.rigLook(chase, fov));
  assert.equal(rig.rigLook(chase, fov, NITRO_CHAIN_LIFT.at(-1)), rig.rigLook(chase, fov, 1), 'a x3 chain clamps at one share');
  for (const bad of [NaN, -1]) assert.equal(rig.rigLook(chase, fov, bad), rig.rigLook(chase, fov));
  for (const view of [portrait, first]) assert.equal(rig.rigLook(view, fov, 1), rig.rigLook(view, fov), 'portrait and first person do not re-aim');
  assert.equal(heldShare(true, TOP, true), 0, 'Reduced Motion feeds a share of 0');
});
```

Import `createSprintVfx` from `../src/vfx-settings.ts`. In the `world.js takes its race camera numbers` test add `assert.match(world, /rigLook\(view, chaseFov, sprintFrame\.fov\)/)`.
- [ ] **Step 2:** `node --test tests/race-camera.test.js`. Expected: the new test fails on `sprintLook` (`undefined`), the world test fails on the regex.
- [ ] **Step 3:** Add `sprintLook` (doc comment: metres the look-at height drops at a full NITRO/BOOST share; shows the exhaust under the car, the eye does not move) to the interface and rows (`chase` 3.5, `chasePortrait` 0, `first` 0); `rigLook` subtracts `view.sprintLook * unit(sprint)`. In `world.js` line 839 change `rigLook(view, chaseFov)` to `rigLook(view, chaseFov, sprintFrame.fov)`.
- [ ] **Step 4:** `node --test tests/race-camera.test.js tests/legacy-js-names.test.js tests/module-size.test.js && npm run typecheck`. Expected: all pass, `world.js` 998 lines.
- [ ] **Step 5:** Commit: `feat(camera): re-aim the landscape chase camera on NITRO/BOOST`.

### Task 3: Move the rear exhaust out of `aero-vfx.js` (move-only)

**Files:**
- Create: `src/sprint-plume.ts`
- Modify: `src/aero-vfx.js` (lines 89 to 118, 190, 208 to 211, 219, 237, 307 to 314)
- Test: `tests/sprint-plume.test.js` (new), `tests/garage-skin-warmup.test.js`, `tests/garage-release-build.test.js`

**Interfaces:**
- Produces:

```ts
interface Port { position: readonly number[]; direction: readonly number[]; size: number }
export interface PlumeFrame { time: number; power: number; nitroMix: number; reach: number; brightness: number; diamonds: number;
  extreme: number; tail: number; quality: number; enabled: boolean; calm: boolean; voidPulse: boolean; racing: boolean; grounded: boolean }
export function createSprintPlume(parent: THREE.Object3D, ports: readonly Port[], vehicle?: THREE.Object3D, ground?: THREE.Object3D): {
  jets: THREE.Mesh[];
  setSkin(tint: readonly number[], pattern: number, accent: THREE.Vector4, trailStyle: number): void;
  update(frame: PlumeFrame): void;
  reset(): void;
}
```

`reach` is the jet length in metres, computed by `aero-vfx.js` exactly as today's `scale.z` expression. `aero-vfx.js` keeps one reused `PlumeFrame` object and writes its fields each frame (no object literal per frame).

- [ ] **Step 1: Write the failing test** `tests/sprint-plume.test.js`: `the rear exhaust lives in its own module` asserts `createSprintPlume` is a function, that `src/aero-vfx.js` no longer contains `Cold gas nozzle` or `jetMaterial`, that a plume built on a `Group` with `REAR_PORTS` has four hidden `Cold gas nozzle N` children at the port x positions, each with its own material and every uniform listed in Global Constraints, and that one `update` with `power: 1, enabled: true, reach: 5` shows them with `scale.z === 5` and `uniforms.time.value` offset by `i * 0.13`.
- [ ] **Step 2:** `node --test tests/sprint-plume.test.js`. Expected: FAIL, module not found.
- [ ] **Step 3:** Move the jet geometry, material, creation loop, per-frame block, skin writes and reset into `createSprintPlume`, behaviour unchanged (`vehicle`, `ground`, `racing`, `grounded`, `quality` unused for now). `aero-vfx.js` calls `createSprintPlume(rear, REAR_PORTS, vehicle, ground)`, `plume.setSkin(palette.thruster, patterns.thruster, trailAccent, patterns['nitro-trail'])`, `plume.update(plumeFrame)`, `plume.reset()` and reads `plume.jets[0]` in `inspectCosmetics`.
- [ ] **Step 4:** Source-text tests follow the code: in `tests/garage-skin-warmup.test.js` add the same `doesNotMatch(/new THREE\.|\.geometry\s*=/)` on the body of `setSkin(` in `src/sprint-plume.ts`; in `tests/garage-release-build.test.js` check the unpublished skin ids against both files.
- [ ] **Step 5:** `npm test`. Expected: all pass (the existing aero, board-effects, garage-skin, thruster-glow and shader-safety tests are the move's regression suite); `aero-vfx.js` under 400.
- [ ] **Step 6:** Commit: `refactor(vfx): move the rear exhaust jets into sprint-plume`.

### Task 4: Fat flame and daylight core

**Files:**
- Modify: `src/sprint-plume.ts`
- Test: `tests/sprint-plume.test.js`

**Interfaces:**
- Produces:

```ts
export const PLUME = { nozzle: 0.065, fat: 0.26, half: 0.2, coreMax: 0.09, coreLength: 1.8, flare: 0.45, glowWidth: 2.4, glowLength: 7 } as const;
/** Outer glow radius (m) `metres` behind the nozzle at full thickness: nozzle + (fat - nozzle) * d / (d + half). */
export function plumeRadius(metres: number): number;
/** Core radius (m): nozzle-sized at the exit, `coreMax` at its widest, 0 from `coreLength` on. */
export function coreRadius(metres: number): number;
```

Jets gain uniforms `reach` (m, equals `scale.z`) and `thick` (0 to 1) and use a unit-radius tube with `scale.x = scale.y = 1`. The vertex shader takes `d = position.z * reach` and a radius of `mix(legacy, max(legacy, profile), thick)` where `legacy = nozzle * (1. + 3.8 * position.z)` (today's cone) and `profile` is `plumeRadius`, its constants interpolated from `PLUME` into the GLSL (one source, as `SKIN_MOTION` does). The fragment shader gets `d` as a varying and adds a body term that falls to 0 at 2 m, scaled by `thick`. A new `InstancedMesh` named `Sprint plume core` (four instances, one material, `NormalBlending`, `transparent`, `depthWrite: false`) draws `coreRadius` in a saturated colour: thruster tint on blue, mixed to the NITRO purple or the trail accent by `nitroMix`, alpha at most 0.85 times power.

- [ ] **Step 1: Write the failing tests:**

```js
test('flame shape: fat by 0.6 m whatever the length or brightness, four separate cores', () => {
  assert.equal(plumeRadius(0), REAR_PORTS[0].size);
  assert.ok(plumeRadius(0.6) >= 0.2 && plumeRadius(3) <= 0.3);
  for (let d = 0; d < 3; d += 0.1) {
    assert.ok(plumeRadius(d + 0.1) >= plumeRadius(d), 'never narrows');
    assert.ok(coreRadius(d) <= 0.1 && 2 * coreRadius(d) <= 0.4 - 0.1, 'cores stay 10 cm apart: ports are 0.40 m apart');
  }
  assert.ok(2 * plumeRadius(0.6) > 0.4, 'the outer glows overlap into one band');
  assert.equal(coreRadius(PLUME.coreLength), 0);
});
```

and `phone width: each jet's glow is at least 28 px wide 0.6 m and 20 px wide 1 m behind the nozzles`, projecting `2 * plumeRadius(d)` through `rigBack`, `rigLook(view, fov, share)`, `rigHeight`, `rigFov` for 844x390 (`RACE_CAMERA.chase`) and 390x844 (`chasePortrait`) at NITRO top speed (share 1) and a held BOOST (share 0.62, 88 m/s); the same projection gives a gap of at least 8 px between two cores at 1 m. Plus `the real jets carry the profile on every tier, preset and thruster skin`: for `quality` in low/medium/high, `preset` in cinematic/realistic/extreme and every thruster id in `src/garage-skin-catalog.ts`, hold NITRO through `createAeroVFX` and assert for non-void skins that each jet is visible with `scale.x === 1`, `uniforms.reach.value === scale.z`, `uniforms.thick.value === 1`, its `vertexShader` contains `String(PLUME.half)`, and `Sprint plume core` is visible; for the void skin jets and core are hidden.
- [ ] **Step 2:** `node --test tests/sprint-plume.test.js`. Expected: FAIL on `plumeRadius` not exported (today's cone measures 0.095 to 0.136 m and 14.7 to 19.1 px at 0.6 m, table above).
- [ ] **Step 3:** Implement the two functions, the jet vertex/fragment changes and the core mesh. `update` sets `thick` to 1 for now, clamps power to 1 for the core alpha and hides the core with the jets.
- [ ] **Step 4:** `node --test tests/sprint-plume.test.js tests/shader-safety.test.js tests/aero-vfx.test.js tests/board-effects.test.js tests/garage-skin-replacement.test.js tests/garage-skin-renderer.test.js tests/module-size.test.js && npm run typecheck`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat(vfx): fat sprint flame with a daylight core`.

### Task 5: Nozzle flare, road glow and modes

**Files:**
- Modify: `src/sprint-plume.ts`, `src/aero-vfx.js` (fills `racing`, `grounded`, `quality`, `calm`, `voidPulse` in the frame)
- Test: `tests/sprint-plume.test.js`, `tests/aero-vfx.test.js`

**Interfaces:**
- Produces: `InstancedMesh` `Sprint nozzle flare` (four camera-facing quads built in the vertex shader, additive, depth-tested, pulled towards the eye by its own radius in view space, size `PLUME.flare * (0.55 + 0.45 * min(1, power))`); `Mesh` `Sprint road glow` (one plane `PLUME.glowWidth` x `PLUME.glowLength`, additive, depth-tested, `renderOrder 1`, y corrected by `-parent.position.y` to sit 0.04 m above the road, oriented from `ground` exactly as `src/garage-launch-flare.js` line 129 does: road up = `(0,0,1)` through `ground.quaternion` then the inverse `vehicle.quaternion`; flat when `ground` is absent).

| Part | Visible when | Fade |
| --- | --- | --- |
| Jets | `enabled && power > 0.005 && !voidPulse` | `thick = 1 - skinFade` |
| Core | as the jets | alpha times `1 - skinFade` |
| Flare | `enabled && power > 0.005` (every tier, void too) | 0.6 times in calm modes |
| Road glow | `enabled && power > 0.005 && quality > 0.25 && racing && grounded` | times `1 - skinFade`; 0.6 times in calm modes |

`skinFade = trailStyle > 0 && !calm ? clamp(nitroMix, 0, 1) : 0`. `grounded` is `car.altitude <= 0`. Flare and glow take the thruster tint, mixed to the NITRO purple or the trail accent by `nitroMix`. Every `time` uniform is written from `frame.time`, which `aero-vfx.js` already freezes in calm modes.

- [ ] **Step 1: Write the failing tests** in `tests/sprint-plume.test.js`, one `update` per case on a plume built with a `ground` object:
  - `modes`: VFX Off hides all four parts; Low shows jets, core and flare and hides the glow; Medium and High show all four; `grounded: false` or `racing: false` hides only the glow; void shows flare and glow and hides jets and core; `reset()` hides everything.
  - `x3 chain`: `power: 1.4` gives the same flare size and core alpha uniforms as `power: 1`.
  - `trail skin`: `setSkin(tint, 0, accent, 2)` with `nitroMix: 1` gives `thick` 0 and a glow fade of 0; with `nitroMix: 0` (BOOST) or `calm: true` gives `thick` 1.
  - `lean`: with `vehicle` rolled 0.2 rad and a level `ground`, the glow's world normal is within 1e-6 of the ground's; without `ground` it stays flat in the car frame.
  - `layers`: flare and glow materials have `depthTest === true`, `depthWrite === false`; the flare vertex shader moves its centre towards the eye (source contains the view-space pull); three new meshes in total (`Sprint plume core`, `Sprint nozzle flare`, `Sprint road glow`), all present and hidden right after creation.
  - `setSkin allocates nothing`: source text of `setSkin(` has no `new THREE.`.

  The existing clock test in `tests/aero-vfx.test.js` (line 67) already covers every new `time` uniform; raise its floor to `first.length >= 6`.
- [ ] **Step 2:** `node --test tests/sprint-plume.test.js tests/aero-vfx.test.js`. Expected: FAIL, the flare and glow do not exist.
- [ ] **Step 3:** Implement the flare, the glow and the table; fill the frame fields in `aero-vfx.js`.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run build`. Expected: all pass; `aero-vfx.js` and `sprint-plume.ts` at or below 400.
- [ ] **Step 5:** Commit: `feat(vfx): nozzle flare and road glow on every sprint`.

### Task 6: Every car, Garage, Home and the browser guards

**Files:**
- Modify (only if a guard needs the new event): `tests/shader-warmup-browser.spec.js`, `tests/black-frame-browser.spec.js`

- [ ] **Step 1:** `npm run build`, then run `tests/shader-warmup-browser.spec.js`, `tests/black-frame-browser.spec.js`, `tests/high-speed-vfx-browser.spec.js`, `tests/frostbite-canyon-browser.spec.js`, `tests/crimson-gt-browser.spec.js`, `tests/hero-roadster-race-browser.spec.js`, `tests/wave3-economy-transactions-browser.spec.js` (Garage specs need `node scripts/build-garage-browser.mjs` first). Expected: all pass: no program compiles after the first racing frame, no non-finite texel, showroom stillness under 0.002 in Reduced Motion.
- [ ] **Step 2:** Real frames per selectable car (`roadster`, `crimson-gt`): race at a held NITRO and BOOST in landscape and portrait, the Garage preview and the Home showcase after switching cars. Check: the plume starts on the nozzles, the flare is not cut by the bumper, nothing floats when the car leans or flies. Save under `docs/designs/3d-pipeline/audits/sprint-plume/`.
- [ ] **Step 3:** Fix what the frames show (RED test first for each defect), commit.

### Task 7: After captures, contrast and frame cost

- [ ] **Step 1:** Re-run the Task 1 Step 5 commands with `LABEL=after`. Expected: the `after` assertions pass (car inside the frame, contrast at least 40 on Coast and Neon).
- [ ] **Step 2:** Compare JSON rows: landscape nozzle row at NITRO at most 0.75 on Coast; Sky Spiral and the climbing course within 0.05 of Coast; car width and height within 10% of `before`; portrait rows unchanged.
- [ ] **Step 3:** Compare frame cost: median up by at most 5% or 0.3 ms (the larger) on each tier and viewport. Over budget: cut overdraw first (glow size, core length), re-measure.
- [ ] **Step 4:** Tune radii, brightness and `sprintLook` only inside the unit guards; any table change repeats Task 2 Step 1 first. Send the before/after frames to the owner for review.

### Task 8: Prevention and records

**Files:**
- Modify: `.claude/rules/race-camera.md`, `TODO.md`, `docs/superpowers/specs/2026-11-14-sprint-exhaust-visibility-design.md` (criterion 2 evidence wording)
- Create: `.claude/rules/sprint-plume.md`

- [ ] **Step 1:** Add the trap "Exhaust under the frame" to `race-camera.md`: the landscape nozzles sat at row 0.80 with 19.5% of the frame under them; `sprintLook` re-aims, never a pull-back; the guard test name; portrait stays 0 and why.
- [ ] **Step 2:** Create `.claude/rules/sprint-plume.md` with `paths:` `src/sprint-plume.ts`, `tests/sprint-plume.test.js`: the "thin, additive-only, gated" trap with the measured numbers, the modes table, the three-draw-call budget, the trail-skin cross-fade, the lean rule, and the capture and cost commands.
- [ ] **Step 3:** `TODO.md`: a dated section at the top with one line per acceptance criterion; tick only items with evidence, name what was not run.
- [ ] **Step 4:** Check `README.md` for a VFX description that changed; add the What's New entry per `.claude/rules/release-notes.md` if the pending release lists player-visible VFX changes. Commit: `docs(vfx): record the sprint plume traps and evidence`.

### Task 9: Gates

- [ ] **Step 1:** `node --test tests/module-size.test.js && npm test && npm run typecheck && npm run build && npm run test:browser`.
- [ ] **Step 2:** `make verify` on a detached worktree pinned to HEAD (`.claude/rules/browser-test-stability.md`); record `git rev-parse HEAD` before and after.
- [ ] **Step 3:** Push the branch; after the approved merge into `develop`, read the exact-HEAD `quality-gate`.
