import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectGarageReleaseBuild } from '../scripts/garage-release-build.mjs';

test('production defaults to coming-soon with a safe locked UI and runtime (not hidden trial code)', () => {
  const result = selectGarageReleaseBuild('production', undefined);
  assert.equal(result.mode, 'coming-soon');
  assert.match(result.aliases['#garage-skin-ui'], /GarageSkinComingSoon\.vue$/);
  assert.match(result.aliases['#garage-skin-runtime'], /garage-skin-runtime-locked\.ts$/);
  assert.match(result.aliases['#garage-skin-palette'], /garage-skin-palette-locked\.ts$/);
  assert.match(result.aliases['#garage-void-beams'], /garage-void-beams-locked\.js$/);
  assert.match(result.aliases['#garage-launch-flare'], /garage-launch-flare-locked\.js$/);
  assert.match(result.aliases['#garage-nitro-trail'], /garage-nitro-trail-locked\.js$/);
});

test('development and preview can select trial; release uses a separate strategy with no trial grants', () => {
  assert.equal(selectGarageReleaseBuild('development', undefined).mode, 'trial');
  for (const mode of ['trial', 'released']) {
    const config = selectGarageReleaseBuild('production', mode);
    assert.equal(config.mode, mode);
    assert.match(config.aliases['#garage-skin-runtime'], /garage-skin-runtime\.ts$/);
    assert.match(config.aliases['#garage-skin-ui'], /GarageSkinCatalog\.vue$/);
    assert.match(config.aliases['#garage-void-beams'], /garage-void-beams\.js$/);
    assert.match(config.aliases['#garage-launch-flare'], /garage-launch-flare\.js$/);
    assert.match(config.aliases['#garage-nitro-trail'], /garage-nitro-trail\.js$/);
  }
});

test('fail closed for typos and attempts to toggle unsupported modes at build time', () => {
  for (const value of ['enabled', 'all', 'debug', '__proto__', 'TRUE', '']) {
    assert.throws(() => selectGarageReleaseBuild('production', value), /Invalid GARAGE_VFX_RELEASE_MODE/);
  }
});

test('no runtime mode switching: production source entry is resolved through distinct Vite aliases', async () => {
  const { readFileSync } = await import('node:fs');
  const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/GaragePanel.vue', import.meta.url), 'utf8');
  const garage = readFileSync(new URL('../src/garage-ui.ts', import.meta.url), 'utf8');
  assert.match(vite, /selectGarageReleaseBuild/);
  assert.match(ui, /#garage-skin-ui/);
  assert.match(garage, /#garage-skin-runtime/);
  assert.doesNotMatch(ui, /import GarageSkinCatalog from '\.\/GarageSkinCatalog\.vue'/);
  assert.doesNotMatch(garage, /from '\.\/garage-skin-runtime\.ts'/);
});

test('the production build asserts that unpublished skin code and artwork are excluded', async () => {
  const { readFileSync } = await import('node:fs');
  const gate = readFileSync(new URL('../scripts/assert-production-locked.mjs', import.meta.url), 'utf8');
  assert.match(gate, /GARAGE_VFX_RELEASE_MODE/);
  assert.match(gate, /thruster-ion/);
  assert.match(gate, /feature-assets\/garage-vfx-skins/);
});

test('CI unit gate executes the locked production build and refuses unpublished bundle leaks', async () => {
  const { readFileSync } = await import('node:fs');
  const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const unit = ci.slice(ci.indexOf('  unit-tests:'), ci.indexOf('  browser-tests:'));
  assert.match(unit, /- run: npm run build/);
  const locked = readFileSync(new URL('../src/GarageSkinComingSoon.vue', import.meta.url), 'utf8');
  assert.doesNotMatch(locked, /GarageSkinCatalog|@click|equipGarageSkin|thruster-ion|nitro-trail-cyan/);
});

test('Pages deploy pins a reviewed garage release mode instead of inheriting mutable repo environment', async () => {
  const { readFileSync } = await import('node:fs');
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const deploy = workflow.slice(workflow.indexOf('  deploy:'), workflow.indexOf('  # Failure-only pager'));
  assert.match(deploy, /GARAGE_VFX_RELEASE_MODE: (?:coming-soon|trial|released)/);
  assert.match(deploy, /node scripts\/assert-production-locked\.mjs/);
});

test('unpublished skin IDs must be absent from shared race shader and covered by production leak markers', async () => {
  const { readFileSync } = await import('node:fs');
  const shader = readFileSync(new URL('../src/aero-vfx.js', import.meta.url), 'utf8');
  const gate = readFileSync(new URL('../scripts/assert-production-locked.mjs', import.meta.url), 'utf8');
  for (const id of ['thruster-ion', 'airflow-slipstream', 'nitro-trail-cyan', 'launch-flare-blue']) {
    assert.doesNotMatch(shader, new RegExp(id));
    assert.ok(gate.includes(id), `missing locked-bundle leak marker: ${id}`);
  }
});

// The locked strategy must match the shared shader ABI but reveal no new IDs.
test('locked release returns neutral color and shape patterns', async () => {
  const { skinVfxPattern, skinVfxPalette } = await import('../src/garage-skin-palette-locked.ts');
  const expected = { thruster: 0, airflow: 0, 'nitro-trail': 0, 'launch-flare': 0 };
  assert.deepEqual(skinVfxPattern({}), expected);
  assert.deepEqual(skinVfxPattern({ thruster: 'thruster-plasma' }), expected);
  assert.deepEqual(skinVfxPalette({}), Object.fromEntries(Object.keys(expected).map(k => [k, [1, 1, 1]])));
  const { readFileSync } = await import('node:fs');
  const gate = readFileSync(new URL('../scripts/assert-production-locked.mjs', import.meta.url), 'utf8');
  for (const id of ['thruster-plasma', 'airflow-vortex', 'nitro-trail-gold', 'launch-flare-pulse']) assert.ok(gate.includes(id));
});

test('public Pages deploy opts in to free trial, while local production builds remain fail closed', async () => {
  const { readFileSync } = await import('node:fs');
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url),'utf8');
  const deploy = workflow.slice(workflow.indexOf('  deploy:'), workflow.indexOf('  # Failure-only pager'));
  assert.match(deploy, /GARAGE_VFX_RELEASE_MODE:\s*trial(?:\s|$)/m);
  assert.match(deploy, /node scripts\/assert-production-locked\.mjs/);
  assert.equal(selectGarageReleaseBuild('production', undefined).mode, 'coming-soon');
  assert.equal(selectGarageReleaseBuild('production', 'trial').mode, 'trial');
});

test('free-trial deployment bundle is checked for real published artwork, not just absent debug markers', async () => {
  const { readFileSync } = await import('node:fs');
  const audit = readFileSync(new URL('../scripts/assert-production-locked.mjs', import.meta.url),'utf8');
  assert.match(audit, /mode === 'trial'/);
  assert.match(audit, /thruster-ion@3x\.webp/);
  assert.match(audit, /airflow-vortex@3x\.svg/);
  assert.match(audit, /GARAGE_VFX_RELEASE_MODE/);
});

test('release policy explains opt-in public session trial without permanent ownership', async () => {
  const { readFileSync } = await import('node:fs');
  const policy=readFileSync(new URL('../docs/garage-release-policy.md', import.meta.url),'utf8');
  assert.match(policy, /Public trial rollout/);
  assert.match(policy, /session-only/i);
  assert.match(policy, /reload|重新載入/i);
  assert.match(policy, /remembers the last pick, which is not ownership/i);
  assert.doesNotMatch(policy, /temporary equipment resets on reload/i);
  assert.match(policy, /no (?:purchase|checkout|payment)/i);
});

test('locked bundle audit refuses the skin pick storage key, other modes allow it', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const { SKIN_PICK_STORAGE_KEY } = await import('../src/garage-skin-preference.ts');
  const script = fileURLToPath(new URL('../scripts/assert-production-locked.mjs', import.meta.url));
  const root = mkdtempSync(join(tmpdir(), 'garage-pick-leak-'));
  mkdirSync(join(root, 'dist'));
  writeFileSync(join(root, 'dist', 'index.js'), `localStorage.getItem("${SKIN_PICK_STORAGE_KEY}:"+id)`);
  const run = mode => spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, GARAGE_VFX_RELEASE_MODE: mode }, encoding: 'utf8' });
  const locked = run('coming-soon');
  assert.equal(locked.status, 1, locked.stdout);
  assert.match(locked.stderr, /skin pick/i);
  assert.equal(run('released').status, 0, 'key is scoped to the locked build only');
});

test('Wave 3 demo and race modules are build-time locked out of coming-soon bundles', () => {
  const locked = selectGarageReleaseBuild('production', undefined);
  assert.match(locked.aliases['#wave3-demo-race'], /wave3-demo-race-locked\.ts$/);
  assert.match(locked.aliases['#wave3-demo-ui'], /Wave3DemoLocked\.vue$/);
  const trial = selectGarageReleaseBuild('production', 'trial');
  assert.match(trial.aliases['#wave3-demo-race'], /wave3-race-events\.ts$/);
  assert.match(trial.aliases['#wave3-demo-ui'], /Wave3DemoEntry\.vue$/);
});
