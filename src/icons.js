export const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  assist: '<path d="M4 17a9 9 0 1 1 16 0M12 13l5-5M7 18h10"/><circle cx="12" cy="13" r="2"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
  fly: '<path d="m4 14 8-9 8 9M4 20l8-9 8 9"/>',
  road: '<path d="m6 3-4 18M18 3l4 18M12 3v3m0 4v4m0 4v3"/>',
  left: '<path d="m14 5-7 7 7 7"/>',
  right: '<path d="m10 5 7 7-7 7"/>',
  pedal: '<path d="m6 17 6-10 6 10M6 21h12"/>',
  brake: '<path d="M5 7h14v11H5zM9 10v5m6-5v5"/>',
  nitro: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
  boost: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
};
// Shared by App.vue (v-bind) and icon() (innerHTML updates in main.js).
export const ICON_ATTRS = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
const attrs = Object.entries(ICON_ATTRS).map(([name, value]) => `${name}="${value}"`).join(' ');
export const icon = name => `<svg ${attrs}>${icons[name]}</svg>`;
