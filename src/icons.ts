import type { SVGAttributes } from 'vue';

export const icons = {
  settings: '<circle cx="12" cy="12" r="4"/><path d="M9 3h6l1 3 3 1 2 4-2 2v4l-3 1-1 3H9l-1-3-3-1v-4l-2-2 2-4 3-1Z"/>',
  display: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4m-4 0h8m-9-8 3-3 3 2 4-4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c4 4 4 14 0 18m0-18c-4 4-4 14 0 18"/>',
  garage: '<path d="m2 9 10-6 10 6v12H2zm4 12v-9h12v9M6 16h12"/>',
  trophy: '<path d="M8 3h8v8a4 4 0 0 1-8 0ZM8 6H4v2a5 5 0 0 0 5 5m7-7h4v2a5 5 0 0 1-5 5m-3 2v5m-4 1h8"/>',
  practice: '<path d="m4 20 8-16 8 16M2 20h20M8 13h8m-10 4h12"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15"/>',
  flag: '<path d="M5 22V3m0 1 5-1 5 2 5-1v10l-5 1-5-2-5 1"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  cameraOrbit: '<ellipse cx="12" cy="12" rx="9" ry="5"/><path d="m17 6 3 1-1 3m-7-1v6"/>',
  zoomIn: '<circle cx="10" cy="10" r="6"/><path d="m14 14 6 6M7 10h6m-3-3v6"/>',
  zoomOut: '<circle cx="10" cy="10" r="6"/><path d="m14 14 6 6M7 10h6"/>',
  undo: '<path d="M4 10h10a5 5 0 0 1 0 10h-3M4 10l5-5m-5 5 5 5"/>',
  redo: '<path d="M20 10H10a5 5 0 0 0 0 10h3m7-10-5-5m5 5-5 5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  assist: '<path d="M4 17a9 9 0 1 1 16 0M12 13l5-5M7 18h10"/><circle cx="12" cy="13" r="2"/>',
  airflow: '<path d="M3 8h13a2 2 0 1 0-2-2M3 12h17a2 2 0 1 1-2 2M3 16h9a2 2 0 1 1-2 2"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  vehicleReset: '<path d="m8 3-4 4 4 4M4 7h12a4 4 0 0 1 4 4m-15 7 1.7-4h10.6l1.7 4v3h-2v-2H7v2H5zM7 17h2m6 0h2"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  fly: '<path d="m4 14 8-9 8 9M4 20l8-9 8 9"/>',
  road: '<path d="m6 3-4 18M18 3l4 18M12 3v3m0 4v4m0 4v3"/>',
  left: '<path d="m14 5-7 7 7 7"/>',
  right: '<path d="m10 5 7 7-7 7"/>',
  pedal: '<path d="m6 17 6-10 6 10M6 21h12"/>',
  shield: '<path d="M12 3 4 6v6c0 5 4 8 8 10 4-2 8-5 8-10V6l-8-3Z"/>',
  brake: '<path d="M5 7h14v11H5zM9 10v5m6-5v5"/>',
  nitro: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
  boost: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
};
// Shared by App.vue (v-bind) and icon() (innerHTML updates in main.js).

export const ICON_ATTRS: SVGAttributes = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
const attrs = Object.entries(ICON_ATTRS).map(([name, value]) => `${name}="${value}"`).join(' ');
export const icon = (name: keyof typeof icons): string => `<svg ${attrs}>${icons[name]}</svg>`;

export const itemAttackPaths = {
  emp: 'M26 7L14 26h9l-1 15 13-22h-9l1-12zM8 16l-4-3m36 22l4 3M8 33l-4 3m36-21l4-3',
  freeze: 'M24 8v32M10 16l28 16M10 32l28-16M19 12l5 5 5-5M19 36l5-5 5 5M11 22l7-2-2-7M37 26l-7 2 2 7',
} as const;
