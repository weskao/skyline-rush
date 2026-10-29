import { t, formatDate } from './i18n.ts';
import { updateCloudView, updateCloudProfile } from './cloud-view-state.ts';
import { claimCloudOwner, saveLocalProgress, clearLocalProgress, cloudFailureStatus, switchCloudAccount, readCloudSyncStatus,
  writeCloudSyncStatus, readLocalModeBests, saveLocalModeBests, mergeProgress, mergeModeBests, parseProgressExport } from './cloud-progress.ts';
import { loadChallengeMedals, mergeChallengeMedals, type ChallengeMedalState } from './history-challenge-medals.ts';
import type { MergedProgress } from './cloud-progress-merge.ts';

export interface CloudUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}
/** Firebase Auth/Firestore calls, injected so this controller never initializes Firebase itself. */
export interface CloudServices {
  watchCloudUser(onUser: (user: CloudUser | null) => void, onError?: (error: Error) => void): unknown;
  signInToCloud(): Promise<unknown>;
  signOutOfCloud(): Promise<unknown>;
  syncCloudProgress(localProgress: () => object): Promise<MergedProgress | null>;
  deleteCloudProgress(uid: string): Promise<unknown>;
  syncGoogleAccountDetails(uid: string): Promise<unknown>;
}
type Progress = Parameters<typeof saveLocalProgress>[0];
interface CloudOptions {
  services: CloudServices;
  /** The session's current progress, which may be newer than storage when storage is blocked. */
  getProgress(): Progress;
  /** Adopt merged progress into the session and refresh the screens that show it. */
  getLocalChallengeMedals?(): ChallengeMedalState;
  applyProgress(merged: MergedProgress, localChallengeMedals?: ChallengeMedalState): void;
}

const CLOUD_STATE: Readonly<Record<string, string>> = Object.freeze({
  'cloud.local': 'signed-out',
  'cloud.signedOut': 'signed-out',
  'cloud.syncing': 'syncing',
  'cloud.saved': 'synced',
  'cloud.savedAt': 'synced',
  'cloud.pending': 'offline',
  'cloud.pendingAt': 'offline',
  'cloud.quota': 'error',
  'cloud.failed': 'error',
  'cloud.localFailed': 'local-error',
  'cloud.otherAccount': 'other-account',
  'cloud.deletePending': 'deleting',
  'cloud.imported': 'imported',
  'cloud.importFailed': 'error',
});
export const cloudStatusState = (key: string): string => CLOUD_STATE[key] ?? 'error';
export const safeAvatarUrl = (url: unknown): string => typeof url === 'string' && /^https:\/\//.test(url) ? url : '';

const CLOUD_OWNER_KEY = 'skyline-rush-cloud-owner';
const cloudSyncKey = (uid: string): string => `skyline-rush-cloud-synced-${uid}`;
const cloudDeletingKey = (uid: string): string => `skyline-rush-cloud-deleting:${uid}`;
const isCloudDeleting = (uid: string): boolean => {
  try { return localStorage.getItem(cloudDeletingKey(uid)) === '1'; } catch { return false; }
};

export function setupCloudUI({ services, getProgress, applyProgress, getLocalChallengeMedals = loadChallengeMedals }: CloudOptions) {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  let cloudUser: CloudUser | null = null;
  let cloudStatusKey = 'cloud.local';
  let cloudOwner: string | null = null;
  try { cloudOwner = localStorage.getItem(CLOUD_OWNER_KEY); } catch { /* Gracefully degrade in blocked storage. */ }
  let cloudPending = false;
  let cloudDeleting = false;
  let cloudSync: Promise<unknown> = Promise.resolve();
  let profileSync: Promise<unknown> = Promise.resolve();
  let lastCloudSync: Date | null = null;

  function announceCloud(key: string): void {
    cloudStatusKey = key;
    const state = cloudStatusState(key);
    updateCloudView({ statusText: t(key), statusState: state, statusBusy: state === 'syncing' });
  }
  function showCloudSession(): void {
    const user = cloudUser;
    updateCloudProfile({
      name: user?.displayName?.trim() || t('cloud.player'),
      identity: user ? t('cloud.signedInAs', { email: user.email || user.uid }) : t('cloud.signedOut'),
      avatarUrl: safeAvatarUrl(user?.photoURL),
    });
    updateCloudView({
      syncDisabled: !user || cloudDeleting || cloudOwner !== user.uid,
      lastSyncText: lastCloudSync
        ? t('cloud.lastSync', { time: formatDate(lastCloudSync, { dateStyle: 'medium', timeStyle: 'short' }) })
        : t('cloud.neverSynced'),
    });
  }
  function saveCloudProgress(): Promise<unknown> {
    if (!cloudUser || cloudDeleting) return Promise.resolve();
    const uid = cloudUser.uid;
    if (isCloudDeleting(uid)) {
      announceCloud('cloud.deletePending');
      return Promise.resolve();
    }
    if (cloudOwner !== uid) {
      announceCloud('cloud.otherAccount');
      return Promise.resolve();
    }
    cloudPending = true;
    writeCloudSyncStatus(uid, { pending: true });
    const deviceSaved = saveLocalProgress(getProgress());
    if (!navigator.onLine) {
      announceCloud(cloudFailureStatus({ code: 'unavailable' }, deviceSaved));
      return Promise.resolve();
    }
    announceCloud('cloud.syncing');
    updateCloudView({ syncDisabled: true });
    const synced = cloudSync.catch(() => {})
      .then(() => !cloudDeleting && cloudUser?.uid === uid ? services.syncCloudProgress(getProgress) : null);
    cloudSync = synced.then(merged => {
      if (!merged || cloudUser?.uid !== uid) return;
      if (!saveLocalProgress(merged)) throw new Error('Could not restore cloud progress locally');
      applyProgress(merged);
      cloudPending = false;
      lastCloudSync = new Date();
      writeCloudSyncStatus(uid, { pending: false, lastSuccess: lastCloudSync.toISOString() });
      try { localStorage.setItem(cloudSyncKey(uid), lastCloudSync.toISOString()); } catch { /* Legacy timestamp is optional. */ }
      showCloudSession();
      announceCloud('cloud.saved');
    }).catch(error => {
      if (cloudUser?.uid === uid && !cloudDeleting)
        announceCloud(cloudFailureStatus(error, deviceSaved));
    }).finally(() => {
      if (cloudUser?.uid === uid && cloudOwner === uid && !cloudDeleting)
        updateCloudView({ syncDisabled: false });
    });
    return cloudSync;
  }
  services.watchCloudUser(user => {
    cloudUser = user;
    const status = user ? readCloudSyncStatus(user.uid) : { pending: false, lastSuccess: null };
    cloudPending = status.pending;
    lastCloudSync = status.lastSuccess ? new Date(status.lastSuccess) : null;
    if (!lastCloudSync) try {
      const legacy = user && localStorage.getItem(cloudSyncKey(user.uid));
      if (legacy && Number.isFinite(Date.parse(legacy))) lastCloudSync = new Date(legacy);
    } catch { /* No legacy sync time. */ }
    showCloudSession();
    updateCloudView({
      loginHidden: !!user, logoutHidden: !user, logoutNoteHidden: !user,
      deleteHidden: !user || (cloudOwner !== null && cloudOwner !== user.uid),
      switchHidden: true,
    });
    announceCloud(user ? 'cloud.syncing' : 'cloud.local');
    if (user) {
      const owner = claimCloudOwner(cloudOwner, user.uid);
      if (!owner) {
        updateCloudView({ switchHidden: false, deleteHidden: true });
        announceCloud('cloud.otherAccount');
        return;
      }
      cloudOwner = owner;
      try { localStorage.setItem(CLOUD_OWNER_KEY, owner); } catch { /* Owner stays in memory. */ }
      if (isCloudDeleting(user.uid)) {
        announceCloud('cloud.deletePending');
        return;
      }
      showCloudSession();
      saveCloudProgress();
      profileSync = services.syncGoogleAccountDetails(user.uid).catch(error => console.warn('Cloud account details unavailable:', error));
    }
  }, () => announceCloud('cloud.failed'));
  window.addEventListener('online', () => { if (cloudPending) saveCloudProgress(); });
  $('#cloud-sync-now').addEventListener('click', () => { if (cloudUser && cloudOwner === cloudUser.uid) saveCloudProgress(); });
  $('#cloud-login').addEventListener('click', async () => {
    updateCloudView({ loginDisabled: true });
    try { await services.signInToCloud(); }
    catch (error) { console.error('Cloud sign-in failed:', error); announceCloud('cloud.failed'); }
    finally { updateCloudView({ loginDisabled: false }); }
  });
  $('#cloud-logout').addEventListener('click', () => {
    services.signOutOfCloud().catch(() => announceCloud('cloud.failed'));
  });
  $('#cloud-switch').addEventListener('click', async () => {
    if (!cloudUser || cloudOwner === cloudUser.uid || !confirm(t('cloud.switchConfirm'))) return;
    const uid = cloudUser.uid;
    await cloudSync.catch(() => {});
    if (cloudUser?.uid !== uid || cloudOwner === uid || !switchCloudAccount(cloudOwner, uid)) {
      announceCloud('cloud.failed');
      return;
    }
    cloudOwner = uid;
    location.reload();
  });
  $('#cloud-export').addEventListener('click', () => {
    const contents = { ...getProgress(), permanent: readLocalModeBests(), localChallengeMedals: getLocalChallengeMedals() };
    const blob = new Blob([JSON.stringify(contents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'skyline-rush-progress.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  $('#cloud-import').addEventListener('click', () => $('#cloud-import-file').click());
  $<HTMLInputElement>('#cloud-import-file').addEventListener('change', async ({ target }) => {
    const input = target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (cloudDeleting || (cloudUser && cloudOwner !== cloudUser.uid)) {
      announceCloud('cloud.otherAccount');
      return;
    }
    if (!confirm(t('cloud.importConfirm'))) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Backup file is too large');
      const imported = parseProgressExport(await file.text());
      const previousProgress = getProgress();
      const previousPermanent = readLocalModeBests();
      const previousMedals = getLocalChallengeMedals();
      const localChallengeMedals = mergeChallengeMedals(previousMedals, imported.localChallengeMedals);
      const merged = mergeProgress(previousProgress, imported.progress);
      const permanent = mergeModeBests(previousPermanent, imported.permanent);
      if (!saveLocalProgress({ ...merged, localChallengeMedals })) throw new Error('Could not import into device storage');
      if (!saveLocalModeBests(permanent)) {
        saveLocalProgress({ ...previousProgress, localChallengeMedals: previousMedals });
        throw new Error('Could not import permanent results');
      }
      applyProgress(merged, localChallengeMedals);
      announceCloud('cloud.imported');
      if (cloudUser) saveCloudProgress();
    } catch (error) {
      console.warn('Cloud import failed:', error);
      announceCloud('cloud.importFailed');
    }
  });
  $('#cloud-delete').addEventListener('click', async () => {
    if (!cloudUser || !confirm(t('cloud.deleteConfirm'))) return;
    const uid = cloudUser.uid;
    updateCloudView({ deleteDisabled: true });
    cloudDeleting = true;
    try {
      // Set the guard before deletion, so a failed local cleanup can never re-upload deleted data.
      localStorage.setItem(cloudDeletingKey(uid), '1');
      await cloudSync.catch(() => {});
      await profileSync.catch(() => {});
      if (cloudUser?.uid !== uid) return;
      await services.deleteCloudProgress(uid);
      if (!clearLocalProgress()) throw new Error('Could not clear local progress');
      localStorage.removeItem('skyline-rush-cloud-account:' + uid);
      localStorage.removeItem('skyline-rush-cloud-sync:' + uid);
      localStorage.removeItem(CLOUD_OWNER_KEY);
      localStorage.removeItem(cloudSyncKey(uid));
      localStorage.removeItem(cloudDeletingKey(uid));
      await services.signOutOfCloud();
      location.reload();
    } catch (error) {
      console.error('Cloud deletion failed:', error);
      announceCloud('cloud.deletePending');
    } finally {
      cloudDeleting = false;
      updateCloudView({ deleteDisabled: false });
    }
  });

  return {
    saveCloudProgress,
    /** Re-render the Vue-owned account name, identity and status after a language switch. */
    relabel(): void { showCloudSession(); announceCloud(cloudStatusKey); },
  };
}
