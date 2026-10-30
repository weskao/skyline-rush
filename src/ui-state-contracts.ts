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
export interface ReleaseEntry {
  kind: string;
  kindLabel: string;
  title: string;
  description: string;
  image: string;
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
  // Takes the hero's place while it loads and plays; null falls back to heroSrc.
  // `source` is the bundled clip; `src` stays empty (poster only) until the cached copy is ready.
  heroVideo: { src: string; source: string; poster: string; variant: 'desktop' | 'mobile'; controls: boolean } | null;
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
