import { reactive } from 'vue';

// Vue owns cloud profile presentation, while main.js retains Auth and storage orchestration.
export interface CloudView {
  name: string;
  identity: string;
  avatarUrl: string;
  avatarFailed: boolean;
}

export const cloudView = reactive<CloudView>({
  name: 'Player',
  identity: 'Not signed in',
  avatarUrl: '',
  avatarFailed: false,
});

export function updateCloudView(changes: Partial<CloudView>): void {
  Object.assign(cloudView, changes);
}
