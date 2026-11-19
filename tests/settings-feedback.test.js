import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { toastView, showToast, TOAST_MS } from '../src/toast-view-state.ts';
import { confirmOnce } from '../src/confirm-once.ts';
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

const memoryStorage = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
};

test('confirmOnce asks until the player confirms, then never again, and saves it', () => {
  const storage = memoryStorage();
  const once = confirmOnce('skyline-vfx-off-confirmed', () => storage);
  assert.equal(once.needed(), true);
  assert.equal(once.needed(), true, 'asking without confirming does not count');
  once.remember();
  assert.equal(once.needed(), false);
  assert.equal(confirmOnce('skyline-vfx-off-confirmed', () => storage).needed(), false, 'a later visit remembers it');
});

test('confirmOnce remembers in memory when storage is blocked', () => {
  const blocked = () => { throw new DOMException('blocked', 'SecurityError'); };
  const once = confirmOnce('skyline-vfx-off-confirmed', blocked);
  assert.equal(once.needed(), true);
  once.remember();
  assert.equal(once.needed(), false);
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const again = confirmOnce('skyline-vfx-off-confirmed', () => throwing);
  assert.equal(again.needed(), true);
  again.remember();
  assert.equal(again.needed(), false);
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
