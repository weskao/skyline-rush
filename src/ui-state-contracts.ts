export interface GarageView {
  selected: string;
  status: string;
  equipDisabled: boolean;
  equipLabel: string;
}
export interface GuideView {
  selectedDevice: 'desktop' | 'mobile';
  practiceKey: string;
  practiceText: string;
}
export interface ReleaseTab {
  id: string;
  version: string;
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
