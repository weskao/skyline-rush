// One close rule for every floating dropdown (drawn selects, VFX, audio and Controls panels): a press or click
// outside it — another button included — closes it, so two never show at once.
const open = new Map();
export const trackDropdown = (region, isOpen, close) => (isOpen ? open.set(region, close) : open.delete(region));

// pointerdown: iOS skips click on non-interactive taps; click: keyboard activation of another button.
// Capture phase, so a handler that stops propagation cannot keep a dropdown open.
for (const type of ['pointerdown', 'click']) document.addEventListener(type, ({ target }) => {
  for (const [region, close] of open) if (!region.contains(target)) close();
}, { capture: true });
