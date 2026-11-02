export interface GarageView {
  selected: string;
  status: string;
  equipDisabled: boolean;
  equipLabel: string;
}
export interface GuideView {
  selectedDevice: 'desktop' | 'mobile' | 'items';
  practiceKey: string;
  practiceText: string;
}
export interface ReleaseTab {
  id: string;
  version: string;
  label: string;
  selected: boolean;
  latest: boolean;
  note: string;
  unread: boolean;
  unreadLabel: string;
}
// `source` is the bundled clip; `src` stays empty until the cached copy is ready, and `poster` is the still shown meanwhile.
export interface ReleaseClipView { src: string; source: string; poster: string; variant: 'desktop' | 'mobile' }
export interface ReleaseEntry {
  kind: string;
  kindLabel: string;
  title: string;
  description: string;
  image: string;
  zoomLabel: string;
  // Replaces the picture slot with a poster and play button when set.
  video: ReleaseClipView | null;
  playLabel: string;
}
export interface ReleaseView {
  openHidden: boolean;
  openHasUpdate: boolean;
  tabs: ReleaseTab[];
  entries: ReleaseEntry[];
  panelLabel: string;
  version: string;
  date: string;
  heroSrc: string;
  // The hero's poster and play button; null falls back to heroSrc.
  heroVideo: ReleaseClipView | null;
  // Screen-reader names for the hero enlarge and play buttons and the enlarged view's close button.
  zoom: { image: string; video: string; close: string };
}
export interface TutorialCoachView {
  visible: boolean;
  step: string;
  title: string;
  instruction: string;
  pauseText: string;
  pauseHidden: boolean;
  completeActionsHidden: boolean;
  assistHidden: boolean;
  hintKeys: string;
  hintText: string;
}
export interface ControlPanelsView {
  settingsOpen: boolean;
  controlsOpen: boolean;
}
