// What the race results panel says about cloud backup. Pure: cloud-ui.ts feeds it and writes cloudView.
//
// Provider-neutral on purpose: `connected` means "signed in to any cloud provider" (cloud-ui.ts derives it from
// the shared auth observer's user, not from a Google field), and `signIn` is the outcome of whatever
// `CloudServices.signInToCloud` does. Google is the only provider today; a future one (e.g. Apple) that reports
// its user through the same observer counts as connected here with no change to the results UI.

/** The results panel's own sign-in attempt; 'idle' until the player presses its button. */
export type SignInOutcome = 'idle' | 'pending' | 'done' | 'cancelled' | 'failed';
export interface ResultCloudInput {
  connected: boolean;
  /** Current Cloud Save status message key and its visual state (cloudStatusState). */
  statusKey: string;
  statusState: string;
  signIn: SignInOutcome;
}
export interface ResultCloudStatus {
  /** Translation key of the one-line status. */
  key: string;
  state: 'signed-out' | 'syncing' | 'synced' | 'failed';
  /** Show the sign-in button. */
  signIn: boolean;
  busy: boolean;
}

const view = (key: string, state: ResultCloudStatus['state'], signIn = false): ResultCloudStatus =>
  ({ key, state, signIn, busy: state === 'syncing' });

export function resultCloudStatus({ connected, statusKey, statusState, signIn }: ResultCloudInput): ResultCloudStatus {
  if (!connected) {
    if (signIn === 'pending') return view('cloud.result.signingIn', 'syncing', true);
    if (signIn === 'done') return view('cloud.result.syncing', 'syncing'); // waiting for the auth observer
    if (signIn === 'cancelled') return view('cloud.result.cancelled', 'signed-out', true);
    if (signIn === 'failed') return view('cloud.result.signInFailed', 'failed', true);
    return view('cloud.result.signedOut', 'signed-out', true);
  }
  const signedInHere = signIn === 'done';
  if (statusState === 'syncing') return view('cloud.result.syncing', 'syncing');
  if (statusState === 'synced') return view(signedInHere ? 'cloud.result.signedInSaved' : 'cloud.result.saved', 'synced');
  // Nothing was saved anywhere: keep the existing export warning, it prevents data loss.
  if (statusKey === 'cloud.localFailed') return view(statusKey, 'failed');
  // Another account owns this device, or a deletion is unfinished: no automatic retry, the Cloud save panel resolves it.
  if (statusState === 'other-account' || statusState === 'deleting') return view('cloud.result.attention', 'failed');
  return view(signedInHere ? 'cloud.result.signedInPending' : 'cloud.result.pending', 'failed');
}

const CANCEL_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);
/** A closed provider popup is the player's choice, not an error. */
export const signInOutcome = (error: unknown): 'cancelled' | 'failed' =>
  CANCEL_CODES.has((error as { code?: unknown } | null)?.code as string) ? 'cancelled' : 'failed';
