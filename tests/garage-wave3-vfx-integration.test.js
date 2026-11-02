import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// Regression for the non-destructive Wave 3 integration of the approved Garage VFX trial.
// Actual runtime/ownership behavior is separately covered by garage-skin-session,
// garage-skin-runtime and browser trials.
const read = path => readFileSync(path, 'utf8');

test('Garage Wave 3 retains source-art previews while integrating the paint preview and free trial', () => {
  const panel = read('src/GaragePanel.vue');
  const workflow = read('.github/workflows/ci.yml');
  const policy = read('docs/garage-release-policy.md');

  assert.match(panel, /<GaragePaintPreview\b/, 'new 3D paint-card imagery must be kept');
  assert.match(panel, /<GarageSkinCatalog\b/, 'trial catalog must remain accessible');
  assert.match(panel, /Reload resets temporary equipment/, 'English trial copy must disclose session-only equipment');
  assert.match(panel, /重新載入後還原/, 'Chinese trial copy must disclose session-only equipment');
  assert.match(workflow, /GARAGE_VFX_RELEASE_MODE:\s*trial\b/, 'reviewed future public deploy should opt into free trial');
  assert.match(policy, /Approved for a public free-trial milestone/, 'release documentation must match approved mode');
  assert.match(policy, /no.*purchase|no purchase/i, 'release policy must describe nontransactional use');

  if (existsSync('src/garage-wave3-preview-catalog.ts')) {
    assert.match(panel, /<GarageSourceArtGallery\b/, 'read-only Wave 3 gallery must not disappear');
    const expectedCategory = existsSync('public/feature-assets/garage-rewards-and-missions/raster/mission-race@3x.webp')
      ? 'garage-rewards-and-missions' : 'garage-store-readiness';
    assert.ok(panel.includes('category="' + expectedCategory + '"'), 'branch-specific original 3x gallery must remain');
  }
});
