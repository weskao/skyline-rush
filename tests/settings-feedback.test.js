import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { toastView, showToast, TOAST_MS } from '../src/toast-view-state.ts';
import { SETTINGS_FEEDBACK_COPY } from '../src/locales/settings-feedback.ts';
import { confirmView, confirmDialog, answerConfirm } from '../src/confirm-dialog.ts';

test('a new toast replaces the shown one and hides itself after its full time', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    showToast({ text: 'Sound off', icon: '<path/>' });
    assert.equal(toastView.text, 'Sound off');
    assert.equal(toastView.icon, '<path/>');
    const first = toastView.id;
    mock.timers.tick(TOAST_MS - 100);
    showToast({ text: 'Airflow on' });
    assert.equal(toastView.text, 'Airflow on');
    assert.equal(toastView.icon, '', 'a replacement without an icon drops the old icon');
    assert.notEqual(toastView.id, first, 'a replacement restarts the entry animation');
    mock.timers.tick(TOAST_MS - 1);
    assert.equal(toastView.text, 'Airflow on', 'the replacement keeps its own full time');
    mock.timers.tick(1);
    assert.equal(toastView.text, '');
  } finally { mock.timers.reset(); }
});

test('a setting toast carries its new state for the ON/OFF badge; a plain toast drops it', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    showToast({ text: 'Sound', state: { on: false, text: 'OFF' } });
    assert.equal(toastView.text, 'Sound');
    assert.equal(toastView.state, 'off');
    assert.equal(toastView.stateText, 'OFF');
    showToast({ text: 'Airflow', state: { on: true, text: 'ON' } });
    assert.equal(toastView.state, 'on');
    showToast({ text: 'Saved' });
    assert.equal(toastView.state, '');
    assert.equal(toastView.stateText, '');
  } finally { mock.timers.reset(); }
});

test('every toggle toast names its setting and its state words in en and zh-TW, never a full sentence', () => {
  for (const lang of ['en', 'zh-TW']) {
    const copy = SETTINGS_FEEDBACK_COPY[lang];
    for (const key of ['toast.sound', 'toast.airflow', 'toast.assist', 'toast.vfx', 'toast.on', 'toast.off']) assert.ok(copy[key], `${lang} ${key}`);
    assert.notEqual(copy['toast.on'], copy['toast.off']);
    for (const old of ['toast.soundOn', 'toast.soundOff', 'toast.vfxOn']) assert.equal(copy[old], undefined, `${lang} ${old} is replaced by label + badge`);
  }
});

test('TOAST_MS is about 1.8 s',() => assert.ok(TOAST_MS >= 1500 && TOAST_MS <= 2200));

test('the effects switch-off dialog names the action on its button, so 關閉 never reads as "close this box"', () => {
  for (const [lang, word] of [['en', /effects/i], ['zh-TW', /特效/]]) {
    const copy = SETTINGS_FEEDBACK_COPY[lang];
    assert.match(copy['vfxOff.confirm'], word, `${lang} confirm button`);
    assert.notEqual(copy['vfxOff.confirm'], copy['vfxOff.keep']);
    for (const key of ['vfxOff.title', 'vfxOff.hidden', 'vfxOff.same', 'vfxOff.later']) assert.ok(copy[key], `${lang} ${key}`);
    assert.equal(copy['vfxOff.body'], undefined, `${lang}: one point per line replaces the paragraph`);
  }
});

test('confirmDialog shows its points as a list and clears them for a dialog without any', async () => {
  const first = confirmDialog({ title: 'T', body: '', points: ['a', 'b'], confirm: 'Yes', cancel: 'No' });
  assert.deepEqual(confirmView.points, ['a', 'b']);
  const second = confirmDialog({ title: 'T2', body: 'B', confirm: 'Yes', cancel: 'No' });
  assert.equal(await first, false);
  assert.deepEqual(confirmView.points, []);
  answerConfirm(false);
  await second;
});

test('confirmDialog resolves with the answer and closes', async () => {
  const asked = confirmDialog({ title: 'T', body: 'B', confirm: 'Turn off', cancel: 'Keep effects' });
  assert.equal(confirmView.open, true);
  assert.equal(confirmView.confirm, 'Turn off');
  answerConfirm(true);
  assert.equal(await asked, true);
  assert.equal(confirmView.open, false);
});

test('a second confirmDialog cancels the first, and a stray answer is ignored', async () => {
  const first = confirmDialog({ title: '1', body: '', confirm: 'Yes', cancel: 'No' });
  const second = confirmDialog({ title: '2', body: '', confirm: 'Yes', cancel: 'No' });
  assert.equal(await first, false);
  assert.equal(confirmView.title, '2');
  answerConfirm(true);
  assert.equal(await second, true);
  answerConfirm(true); // the close event after an answer must not throw or reopen
  assert.equal(confirmView.open, false);
});
