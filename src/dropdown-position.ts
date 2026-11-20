import { viewportFoldableLayout } from './foldable-layout.ts';

const EDGE = 8;
const GAP = 6;
const TWO_COLUMN_WIDTH = 320;

export function placeDropdown(button: HTMLButtonElement, list: HTMLElement): void {
  const anchor = button.getBoundingClientRect();
  const viewport = window.visualViewport;
  const vx = viewport?.offsetLeft ?? 0;
  const vy = viewport?.offsetTop ?? 0;
  const viewportRight = vx + (viewport?.width ?? innerWidth);
  const viewportBottom = vy + (viewport?.height ?? innerHeight);
  const x = anchor.left + anchor.width / 2;
  const y = anchor.top + anchor.height / 2;
  const pane = viewportFoldableLayout(window)?.segments.find(({ left, top, width, height }) =>
    x >= left && x <= left + width && y >= top && y <= top + height);
  const root = getComputedStyle(document.documentElement);
  const safe = (side: string) => Math.max(EDGE, Number.parseFloat(root.getPropertyValue('--safe-' + side)) || 0);
  const left = Math.max(vx, pane?.left ?? vx) + safe('left');
  const top = Math.max(vy, pane?.top ?? vy) + safe('top');
  const right = Math.min(viewportRight, pane ? pane.left + pane.width : viewportRight) - safe('right');
  const bottom = Math.min(viewportBottom, pane ? pane.top + pane.height : viewportBottom) - safe('bottom');
  const width = Math.max(0, right - left);
  const height = Math.max(0, Math.floor(bottom - top));

  // The popup is in the top layer but still inherits Home's short-landscape CSS zoom.
  const zoom = button.currentCSSZoom || anchor.width / button.offsetWidth || 1;
  list.style.zoom = String(1 / zoom);
  list.style.setProperty('--select-width', `${Math.min(350, width)}px`);
  list.style.setProperty('--select-min-width', `${Math.min(width, Math.max(152, anchor.width))}px`);
  list.style.maxHeight = `${height}px`;
  list.classList.remove('is-two-column');
  const twoColumns = list.scrollHeight > list.clientHeight && width >= TWO_COLUMN_WIDTH;
  list.classList.toggle('is-two-column', twoColumns);
  if (twoColumns) {
    list.style.setProperty('--select-rows', String(Math.ceil(list.childElementCount / 2)));
  }

  const popup = list.getBoundingClientRect();
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - popup.height;
  // When neither side is tall enough, use the whole pane so short lists still fit at once.
  const popupTop = below + popup.height <= bottom ? below : above >= top ? above : y - popup.height / 2;
  list.style.left = `${Math.max(left, Math.min(anchor.right - popup.width, right - popup.width))}px`;
  list.style.top = `${Math.max(top, Math.min(popupTop, bottom - popup.height))}px`;
}
