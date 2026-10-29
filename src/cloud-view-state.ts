import { reactive } from 'vue';

// Vue owns cloud profile presentation, while main.js retains Auth and storage orchestration.
export interface CloudView {
  name: string;
  identity: string;
  avatarUrl: string;
  avatarFailed: boolean;
  statusText: string;
  statusState: string;
  statusBusy: boolean;
  lastSyncText: string;
  loginHidden: boolean;
  logoutHidden: boolean;
  logoutNoteHidden: boolean;
  deleteHidden: boolean;
  switchHidden: boolean;
  syncDisabled: boolean;
  loginDisabled: boolean;
  deleteDisabled: boolean;
}

export const cloudView = reactive<CloudView>({
  name: 'Player',
  identity: 'Not signed in',
  avatarUrl: '',
  avatarFailed: false,
  statusText: 'Cloud backup is off. Sign in to protect your race results.',
  statusState: 'signed-out',
  statusBusy: false,
  lastSyncText: 'Never synced',
  loginHidden: false,
  logoutHidden: true,
  logoutNoteHidden: true,
  deleteHidden: true,
  switchHidden: true,
  syncDisabled: true,
  loginDisabled: false,
  deleteDisabled: false,
});

export function updateCloudView(changes: Partial<CloudView>): void {
  Object.assign(cloudView, changes);
}

/** Preserve a failed avatar until the account presents a genuinely new photo URL. */
export function updateCloudProfile(profile: Pick<CloudView, 'name' | 'identity' | 'avatarUrl'>): void {
  const avatarFailed = cloudView.avatarUrl === profile.avatarUrl && cloudView.avatarFailed;
  Object.assign(cloudView, profile, { avatarFailed });
}
