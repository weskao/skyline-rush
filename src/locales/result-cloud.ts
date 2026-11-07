// Race results panel: one short cloud-backup line and its sign-in outcome (src/result-cloud-status.ts).
export const RESULT_CLOUD_COPY = {
  en: {
    'cloud.result.signedOut': 'Sign in to back up your records to the cloud.',
    'cloud.result.signingIn': 'Signing in…',
    'cloud.result.syncing': 'Saving this race to the cloud…',
    'cloud.result.saved': 'Race saved to the cloud.',
    'cloud.result.signedInSaved': 'Signed in · race saved to the cloud.',
    'cloud.result.pending': 'Not synced yet — saved on this device, will retry.',
    'cloud.result.signedInPending': 'Signed in · not synced yet, saved on this device.',
    'cloud.result.cancelled': 'Sign-in cancelled.',
    'cloud.result.signInFailed': 'Sign-in failed. Your race is saved on this device.',
    'cloud.result.attention': 'Not synced — open Cloud save in History.',
  },
  'zh-TW': {
    'cloud.result.signedOut': '登入即可將紀錄備份到雲端。',
    'cloud.result.signingIn': '正在登入…',
    'cloud.result.syncing': '正在將本場紀錄同步到雲端…',
    'cloud.result.saved': '比賽紀錄已同步至雲端。',
    'cloud.result.signedInSaved': '已登入 · 比賽紀錄已同步至雲端。',
    'cloud.result.pending': '尚未同步：已存在本裝置，稍後會重試。',
    'cloud.result.signedInPending': '已登入 · 尚未同步，已存在本裝置。',
    'cloud.result.cancelled': '已取消登入。',
    'cloud.result.signInFailed': '登入失敗；本場紀錄已存在本裝置。',
    'cloud.result.attention': '尚未同步：請到「歷史紀錄」的雲端儲存處理。',
  },
} as const;
