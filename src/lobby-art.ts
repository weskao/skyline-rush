// Recognition comes from the silhouette as well as the label.
export const MODE_ART = {
  classic: '<path d="M4 21V4l4-1 4 2 4-1 4 2v10l-4-2-4 1-4-2-4 1m4-8v4m4-4v4m4-5v4"/>',
  custom: '<path d="M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-6 2v4"/>',
  free: '<path d="m3 21 7-17m4 0 7 17M12 4v4m0 3v3m0 3v4"/>',
  time: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 7v4l3 2m3-8 2-2"/>',
  gauntlet: '<path d="M3 20h18M6 17l4-12h4l4 12m-10-5h8m-9 3h10"/>',
  checkpoint: '<path d="M4 20V8h16v12M8 8V4h8v4m-7 5h6m-3-2 3 2-3 2"/>',
  cup: '<path d="M7 4h10v5a5 5 0 0 1-10 0Zm0 1H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4m-5 3v5m-5 1h10"/>',
  stunt: '<path d="M4 19 20 5m-8 0h8v8m-15 0v4m-2-2h4"/>',
  endless: '<path d="M12 12c-3-4-4-5-6-5a5 5 0 0 0 0 10c4 0 8-10 12-10a5 5 0 1 1 0 10c-2 0-3-1-6-5Z"/>',
  circuit: '<path d="M5 20h11a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v3a3 3 0 0 0 3 3h4a2 2 0 0 1 0 4H5"/>',
  elimination: '<path d="M4 8h9l3 3h4v6H4Zm0 12h16M16 3l5 5m0-5-5 5"/>',
  eventlab: '<path d="M4 20V4h16v16ZM4 9h16M9 9v11m4-5h4m-2-2v4"/>',
};

export const GARAGE_POSE_ART = {
  car: 'M2 15v-3l4-2 4-5h10l5 4 5 1 2 2v3h-4m-6 0H11m-6 0H2m5 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0m16 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0M10 9h12',
  ground: 'M2 20h30',
  flight: 'm11 18-2 3m8-3-2 3m8-3-2 3',
};
