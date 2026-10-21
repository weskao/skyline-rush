// Draws a native <select> as a page listbox (no OS popup); the hidden select keeps value and input/change events for existing callers.
let count = 0;
const nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

export function customSelect(select) {
  const id = `select-${++count}`;
  const name = select.getAttribute('aria-label') ?? select.closest('label')?.firstChild.textContent.trim();
  const box = document.createElement('span');
  box.className = 'custom-select';
  const button = document.createElement('button');
  const list = document.createElement('ul');
  for (const [key, value] of Object.entries({ type: 'button', role: 'combobox', 'aria-label': name, 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': `${id}-list` })) button.setAttribute(key, value);
  Object.assign(list, { id: `${id}-list`, hidden: true });
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', name);
  const options = [...select.options].map((option, i) => {
    const item = document.createElement('li');
    Object.assign(item, { id: `${id}-${i}`, textContent: option.text });
    item.setAttribute('role', 'option');
    return item;
  });
  list.append(...options);
  box.append(button, list);
  select.after(box);
  select.hidden = true;

  let active = 0;
  const sync = () => {
    button.textContent = select.selectedOptions[0]?.text ?? '';
    options.forEach((item, i) => item.setAttribute('aria-selected', String(i === select.selectedIndex)));
  };
  const highlight = i => {
    active = Math.max(0, Math.min(options.length - 1, i));
    options.forEach(item => item.classList.toggle('is-active', item === options[active]));
    button.setAttribute('aria-activedescendant', options[active].id);
    options[active].scrollIntoView({ block: 'nearest' });
  };
  const toggle = open => {
    list.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) highlight(select.selectedIndex);
    else button.removeAttribute('aria-activedescendant');
  };
  const commit = i => {
    toggle(false);
    if (i === select.selectedIndex) return;
    select.selectedIndex = i;
    sync();
    for (const type of ['input', 'change']) select.dispatchEvent(new Event(type, { bubbles: true }));
  };
  // Programmatic `select.value = …` (saved settings, reopened History) must redraw the label too.
  Object.defineProperty(select, 'value', { get: () => nativeValue.get.call(select), set: value => { nativeValue.set.call(select, value); sync(); } });

  // Enter and Space click the button: open when closed, pick the highlighted option when open.
  button.addEventListener('click', () => (list.hidden ? toggle(true) : commit(active)));
  button.addEventListener('blur', () => toggle(false));
  button.addEventListener('keydown', event => {
    const move = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: options.length - 1 }[event.key];
    if (move !== undefined) { if (list.hidden) toggle(true); else highlight(move); }
    else if (event.key === 'Escape' && !list.hidden) toggle(false);
    else return;
    // Keeps arrows from steering and Escape from pausing or closing the surrounding dialog.
    event.preventDefault();
    event.stopPropagation();
  });
  // Focus stays on the button, so blur does not close the list before the option click lands.
  list.addEventListener('pointerdown', event => event.preventDefault());
  list.addEventListener('click', event => {
    event.preventDefault(); // cancels the wrapping <label>'s activation
    const i = options.indexOf(event.target.closest('[role="option"]'));
    if (i >= 0) commit(i);
  });
  sync();
}
