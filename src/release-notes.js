import packageMeta from '../package.json' with { type: 'json' };
const { version } = packageMeta;

// Announcements are written for players, never generated directly from developer commits.
// Every published version keeps its entry (and any image under public/) here for good; the
// dialog only shows the newest RECENT_RELEASE_LIMIT of them. scripts/check-release-notes.mjs
// stops a release whose version has no entry.
export const RELEASE_NOTES = Object.freeze([
  {
    version: '0.21.0', date: '2026-10-24',
    image: { en: 'og-image.en.jpeg', 'zh-TW': 'og-image.zh-TW.jpeg' },
    highlights: [
      {
        id: 'traffic', kind: 'improvement', image: null,
        title: { en: 'More natural racing traffic', 'zh-TW': '競速車流更自然' },
        description: {
          en: 'Other cars now react to bumps more like your own car, making every close pass feel fairer.',
          'zh-TW': '其他車輛碰撞後的反應更接近你的座車，近距離超車更有臨場感。'
        }
      },
      {
        id: 'cloud-buttons', kind: 'improvement', image: null,
        title: { en: 'A tidier cloud save screen', 'zh-TW': '雲端儲存畫面更整齊' },
        description: {
          en: 'Save options are easier to find and use in the cloud save panel.',
          'zh-TW': '雲端儲存的操作選項排列更清楚，查看和使用更方便。'
        }
      }
    ]
  },
  {
    version: '0.20.2', date: '2026-10-24', image: null,
    highlights: [
      {
        id: 'background-audio', kind: 'improvement', image: null,
        title: { en: 'Sound pauses when you step away', 'zh-TW': '離開遊戲時聲音自動暫停' },
        description: {
          en: 'Switch to another app or tab and the game goes quiet, then picks the music back up when you return.',
          'zh-TW': '切換到其他 App 或分頁時遊戲會安靜下來，回來後音樂再接著播放。'
        }
      }
    ]
  },
  {
    version: '0.20.1', date: '2026-10-24', image: null,
    highlights: [
      {
        id: 'cloud-home', kind: 'new', image: null,
        title: { en: 'Cloud save from the home screen', 'zh-TW': '首頁就能使用雲端儲存' },
        description: {
          en: 'Sign in with Google right from the home screen to back up your progress and bring it back on another device.',
          'zh-TW': '在首頁就能用 Google 登入，備份你的進度，換一台裝置也能接著玩。'
        }
      },
      {
        id: 'touch-edge-swipe', kind: 'fix', image: null,
        title: { en: 'Touch buttons stay responsive', 'zh-TW': '觸控按鈕不再卡住' },
        description: {
          en: 'On iPhone, swiping in from the screen edge no longer leaves a touch button stuck down.',
          'zh-TW': '在 iPhone 上從螢幕邊緣滑動後，觸控按鈕不會再一直維持按下的狀態。'
        }
      }
    ]
  },
  {
    version: '0.20.0', date: '2026-10-23', image: null,
    highlights: [
      {
        id: 'google-save', kind: 'new', image: null,
        title: { en: 'Keep your progress with Google', 'zh-TW': '用 Google 帳號保存進度' },
        description: {
          en: 'Unlocked tracks and race results can now be saved to your Google account.',
          'zh-TW': '已解鎖的賽道和比賽成績現在可以保存到你的 Google 帳號。'
        }
      },
      {
        id: 'auto-on', kind: 'improvement', image: null,
        title: { en: 'AUTO is ready from the first race', 'zh-TW': '第一場比賽就能使用 AUTO' },
        description: {
          en: 'AUTO now starts switched on, so you can focus on steering while the car keeps its speed.',
          'zh-TW': 'AUTO 現在預設開啟，車子會自動維持速度，你只要專心轉向。'
        }
      },
      {
        id: 'touch-preview', kind: 'improvement', image: null,
        title: { en: 'See touch buttons as you adjust them', 'zh-TW': '調整時即時預覽觸控按鈕' },
        description: {
          en: 'The Controls panel shows the touch buttons while you change their opacity.',
          'zh-TW': '在操作設定調整透明度時，可以直接看到觸控按鈕的樣子。'
        }
      },
      {
        id: 'ghost-off', kind: 'improvement', image: null,
        title: { en: 'Best-run ghost is now optional', 'zh-TW': '最佳紀錄幽靈車改為自選' },
        description: {
          en: 'The ghost of your best run starts hidden; switch it on whenever you want to chase your record.',
          'zh-TW': '最佳紀錄的幽靈車預設隱藏，想挑戰自己的紀錄時再開啟。'
        }
      }
    ]
  },
  {
    version: '0.19.1', date: '2026-10-23', image: null,
    highlights: [
      {
        id: 'ios-silent', kind: 'fix', image: null,
        title: { en: 'Music plays on iPhone in silent mode', 'zh-TW': 'iPhone 靜音模式也能聽到音樂' },
        description: {
          en: 'Game music and sound now play even when the ringer switch is set to silent.',
          'zh-TW': '即使 iPhone 切到靜音，遊戲音樂與音效也會正常播放。'
        }
      },
      {
        id: 'music-back', kind: 'fix', image: null,
        title: { en: 'Your music is back on', 'zh-TW': '音樂恢復播放' },
        description: {
          en: 'If an earlier version left your music switched off by mistake, it now plays again.',
          'zh-TW': '如果先前的版本不小心把音樂關掉了，現在會重新播放。'
        }
      }
    ]
  }
]);
export const NOTES_SEEN_KEY = 'skyline-rush-whats-new-seen-v1';
export const RECENT_RELEASE_LIMIT = 5;

const versionParts = value => (/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value ?? '')) ?? [0, -1, -1, -1]).slice(1).map(Number);
// Numeric "major.minor.patch" order; anything unreadable sorts below every real version.
export function compareVersions(a, b) {
  const [x, y] = [versionParts(a), versionParts(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}
// Newest first, never a version newer than the running build (notes are written before the release).
export const recentReleases = (current = version, notes = RELEASE_NOTES, limit = RECENT_RELEASE_LIMIT) =>
  notes.filter(release => compareVersions(release.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version)).slice(0, limit);
export const releaseForVersion = (v = version) => RELEASE_NOTES.find(release => release.version === v) ?? null;
export const CURRENT_RELEASE = recentReleases()[0] ?? null;

// Shows when the player last saw an older version; with no record only a returning player is told.
// Blocked storage cannot remember the visit, so it stays silent rather than reopening on every load.
export function shouldAnnounce(release, storage, returningPlayer = false) {
  if (!release?.highlights?.length) return false;
  let seen;
  try { seen = storage?.getItem(NOTES_SEEN_KEY); } catch { return false; }
  return seen == null ? returningPlayer : compareVersions(release.version, seen) > 0;
}
export function markAnnouncementSeen(release, storage) {
  if (!release) return;
  try { storage?.setItem(NOTES_SEEN_KEY, release.version); } catch { /* remembered in memory by the app */ }
}
export const releaseText = (value, locale) =>
  typeof value === 'string' ? value : (value?.[locale] ?? value?.en ?? '');

export function releaseImage(value, locale) {
  const path = releaseText(value, locale);
  return typeof path === 'string' && /^(?!\/)(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9/_.-]*\.(?:png|jpe?g|webp|avif)$/.test(path) ? path : null;
}
