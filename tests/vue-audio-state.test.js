import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('Audio panel owns reactive volume, icon, switch and accessible label presentation', async () => {
  const statePath = new URL('../src/audio-view-state.ts', import.meta.url);
  assert.equal(existsSync(statePath), true, 'typed Vue audio presentation must exist');
  const { audioView, updateAudioView } = await import(statePath);
  updateAudioView({
    music: { enabled: false, level: 0, percent: '65%', displayText: 'Off', valueText: 'Muted' },
    settingsIcon: 'mute', muteAllText: 'Unmute all',
  });
  assert.equal(audioView.music.enabled, false);
  assert.equal(audioView.music.displayText, 'Off');
  assert.equal(audioView.music.valueText, 'Muted');
  assert.equal(audioView.settingsIcon, 'mute');
  const component = readFileSync(new URL('../src/SettingsPanel.vue', import.meta.url), 'utf8');
  for (const binding of ['audioView.settingsIcon', 'audioView[kind].enabled', 'audioView[kind].level', 'audioView[kind].displayText', 'audioView[kind].valueText', 'audioView.muteAllText'])
    assert.ok(component.includes(binding), 'missing Vue binding ' + binding);
  const controller = readFileSync(new URL('../src/audio-ui.ts', import.meta.url), 'utf8');
  assert.match(controller, /updateAudioView\(/);
  assert.doesNotMatch(controller, /\.innerHTML|\.outerHTML|\.textContent|\.setAttribute\(/, 'no duplicate audio DOM presentation');
});
