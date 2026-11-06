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
// `controls` (reduced motion) keeps the hero on its poster with native controls instead of autoplaying.
export interface ReleaseClipView { src: string; source: string; poster: string; variant: 'desktop' | 'mobile'; controls: boolean }
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
  // The hero clip, played inline while the notes are open; null falls back to heroSrc.
  heroVideo: ReleaseClipView | null;
  // Screen-reader names for the hero enlarge buttons and the enlarged view's close button and pause toggle.
  zoom: { image: string; video: string; close: string; pause: string; resume: string };
}
export interface TutorialCoachView {
  visible: boolean;
  step: string;
  title: string;
  instruction: string;
  completeActionsHidden: boolean;
  assistHidden: boolean;
  hintKeys: string;
  hintText: string;
  /** Non-empty only after the last lesson: the free-cruise celebration subtitle. */
  celebration: string;
  /** Direction of the practice target gate ('left' | 'right' | 'ahead'), '' when none is out. */
  guide: string;
  skipHidden: boolean;
}
export interface ControlPanelsView {
  settingsOpen: boolean;
  controlsOpen: boolean;
  /** Keyboard remapping: desktop, or a touch device once a physical keyboard was used. */
  keyboardSettings: boolean;
}
