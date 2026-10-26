export type LocalizedText = string | { en: string; 'zh-TW'?: string };
export type LocalizedImage = string | { en: string; 'zh-TW'?: string } | null;
export interface ReleaseHighlight {
  id: string;
  kind: string;
  image?: LocalizedImage;
  title: LocalizedText;
  description: LocalizedText;
}
export interface ReleaseEntry {
  version: string;
  date: string;
  image?: LocalizedImage;
  highlights: ReleaseHighlight[];
}
interface ReleaseStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

import packageMeta from '../package.json' with { type: 'json' };
const { version } = packageMeta;

// Announcements are written for players, never generated directly from developer commits.
// Every published version keeps its entry (and any image under public/) here for good; the
// dialog only shows the newest RECENT_RELEASE_LIMIT of them. scripts/check-release-notes.mjs
// stops a release whose version has no entry.
export const RELEASE_NOTES: readonly ReleaseEntry[] = Object.freeze([
  {
    version: '0.23.0', date: '2026-10-25', image: null,
    highlights: [
      {
        id: 'whole-car-preview', kind: 'fix', image: null,
        title: { en: 'Your whole car stays in view', 'zh-TW': '整台車都在畫面裡' },
        description: {
          en: 'On the home screen, the car preview now fits in the picture on every track and screen size.',
          'zh-TW': '首頁的車輛預覽現在在每條賽道、每種螢幕大小下，都能完整顯示。'
        }
      },
      {
        id: 'camera-start-spacing', kind: 'fix', image: null,
        title: { en: 'Camera buttons and Start have more room', 'zh-TW': '鏡頭按鈕與開始鍵更有空間' },
        description: {
          en: 'On the home screen, the camera buttons and the Start button now sit apart instead of crowding each other.',
          'zh-TW': '首頁的鏡頭按鈕和開始鍵現在會保持距離，不再擠在一起。'
        }
      },
      {
        id: 'cup-results-checked', kind: 'fix', image: null,
        title: { en: 'Cup results are checked more carefully', 'zh-TW': '盃賽成績檢查更完善' },
        description: {
          en: 'Cup results are checked more carefully, so incomplete Cup data no longer shows broken points or times.',
          'zh-TW': '盃賽成績檢查更完善，不完整的盃賽資料不會再顯示異常的積分或時間。'
        }
      }
    ]
  },
  {
    version: '0.22.1', date: '2026-10-25', image: null,
    highlights: [
      {
        id: 'showroom-views', kind: 'improvement', image: null,
        title: { en: 'See your car from every angle', 'zh-TW': '每個角度都看得到愛車' },
        description: {
          en: 'The home screen preview now keeps your car fully in view on every track, in all six camera angles, with AIRFLOW on or off.',
          'zh-TW': '首頁預覽在每條賽道、六種視角下，開或關 AIRFLOW 都能完整看到你的車。'
        }
      },
      {
        id: 'cloud-profile', kind: 'new', image: null,
        title: { en: 'Your Google profile and manual sync', 'zh-TW': 'Google 個人資料與手動同步' },
        description: {
          en: 'Signed in, you now see your Google name in the cloud panel and can sync your progress whenever you like.',
          'zh-TW': '登入後，雲端面板會顯示你的 Google 名稱，也能隨時手動同步進度。'
        }
      },
      {
        id: 'progress-import', kind: 'new', image: null,
        title: { en: 'Restore your progress from a file', 'zh-TW': '用檔案還原你的進度' },
        description: {
          en: 'Import a progress file you exported earlier. The game checks it and asks you to confirm before anything changes.',
          'zh-TW': '可匯入之前匯出的進度檔，遊戲會先檢查內容，並在你確認後才套用。'
        }
      },
      {
        id: 'permanent-bests', kind: 'improvement', image: null,
        title: { en: 'Your best times stay with you', 'zh-TW': '最佳成績一直陪著你' },
        description: {
          en: 'Personal bests for each challenge mode and Stunt now stay safe on your account, even after older history rolls off.',
          'zh-TW': '各挑戰模式與特技的個人最佳會存在你的帳號，舊紀錄被清除後依然保留。'
        }
      },
      {
        id: 'sign-out-clarity', kind: 'improvement', image: null,
        title: { en: 'Clearer sign-out and delete', 'zh-TW': '登出與刪除說明更清楚' },
        description: {
          en: 'Signing out or deleting your game data does not remove your Google account, and the screen now says so.',
          'zh-TW': '登出或刪除遊戲資料都不會刪除你的 Google 帳號，畫面上也會說明。'
        }
      },
      {
        id: 'swipe-hint', kind: 'fix', image: null,
        title: { en: 'Smoother track swiping', 'zh-TW': '滑動換賽道更順' },
        description: {
          en: 'Swiping between tracks no longer flashes the old track, and the AIRFLOW tip appears once each time you open the game.',
          'zh-TW': '滑動換賽道時不再閃現前一條賽道，AIRFLOW 提示每次開啟遊戲只出現一次。'
        }
      }
    ]
  },
  {
    version: '0.22.0', date: '2026-10-25', image: null,
    highlights: [
      {
        id: 'track-swipe', kind: 'new', image: null,
        title: { en: 'Swipe to pick your track', 'zh-TW': '滑一下就能換賽道' },
        description: {
          en: 'On the home screen, swipe or drag the 3D preview left or right to flip between tracks. Trackpad two-finger swipes work too.',
          'zh-TW': '在首頁左右滑動或拖曳 3D 預覽畫面就能切換賽道，觸控板雙指滑動也可以。'
        }
      },
      {
        id: 'one-thumb-drift', kind: 'new', image: null,
        title: { en: 'Drift with one thumb', 'zh-TW': '單手拇指就能甩尾' },
        description: {
          en: 'With touch buttons, slide your thumb from ← or → up onto BRAKE to drift while you keep steering. Slide back down to let go of the brake.',
          'zh-TW': '使用觸控按鈕時，拇指從 ← 或 → 往上滑到煞車鍵，就能一邊轉向一邊甩尾；往下滑回就放開煞車。'
        }
      },
      {
        id: 'challenge-history', kind: 'new', image: null,
        title: { en: 'Your best challenge runs, kept for good', 'zh-TW': '挑戰模式最佳成績完整保留' },
        description: {
          en: 'Filter History by challenge mode to see your personal best for each one, and which runs have a ghost ready to race.',
          'zh-TW': '在紀錄中依挑戰模式篩選，就能看到每個模式的個人最佳，以及哪些成績可以和幽靈車再比一次。'
        }
      },
      {
        id: 'whats-new', kind: 'new', image: null,
        title: { en: "Catch up on what's new", 'zh-TW': '隨時查看更新內容' },
        description: {
          en: 'Tap the version number on the home screen to read about recent updates. Ones you have not seen yet are marked New.',
          'zh-TW': '點首頁的版本號就能看最近幾次更新的內容，還沒看過的會標上「未讀」。'
        }
      },
      {
        id: 'road-grip', kind: 'improvement', image: null,
        title: { en: 'Cars hug curved roads', 'zh-TW': '彎道上車身更貼地' },
        description: {
          en: 'Your car now follows banked and twisting roads more closely, and grazing a wall no longer bumps you again and again.',
          'zh-TW': '車輛在傾斜和蜿蜒的路段更貼合路面，擦到護欄時也不會一直被反覆撞開。'
        }
      },
      {
        id: 'daily-no-flight', kind: 'fix', image: null,
        title: { en: 'Clearer no-flight daily challenges', 'zh-TW': '禁止飛行的每日挑戰更清楚' },
        description: {
          en: 'When a daily challenge turns off flying, the FLY button shows a lock and explains why, and your charge still powers BOOST.',
          'zh-TW': '每日挑戰禁止飛行時，FLY 按鈕會顯示鎖頭並說明原因，累積的能量仍可用來 BOOST 加速。'
        }
      }
    ]
  },
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

const versionParts = (value: unknown): number[] => (/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value ?? '')) ?? [0, -1, -1, -1]).slice(1).map(Number);
// Numeric "major.minor.patch" order; anything unreadable sorts below every real version.
export function compareVersions(a: unknown, b: unknown): number {
  const [x, y] = [versionParts(a), versionParts(b)];
  return (x[0]! - y[0]!) || (x[1]! - y[1]!) || (x[2]! - y[2]!);
}
// Newest first, never a version newer than the running build (notes are written before the release).
export const recentReleases = (current: string = version, notes: readonly ReleaseEntry[] = RELEASE_NOTES, limit: number = RECENT_RELEASE_LIMIT): ReleaseEntry[] =>
  notes.filter(release => compareVersions(release.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version)).slice(0, limit);
export const releaseForVersion = (v: string = version): ReleaseEntry | null => RELEASE_NOTES.find(release => release.version === v) ?? null;
export const CURRENT_RELEASE = recentReleases()[0] ?? null;

// Shows when the player last saw an older version; with no record only a returning player is told.
// Blocked storage cannot remember the visit, so it stays silent rather than reopening on every load.
export function shouldAnnounce(release: Pick<ReleaseEntry, 'version' | 'highlights'> | null, storage?: ReleaseStore, returningPlayer = false): boolean {
  if (!release?.highlights?.length) return false;
  let seen;
  try { seen = storage?.getItem(NOTES_SEEN_KEY); } catch { return false; }
  return seen == null ? returningPlayer : compareVersions(release.version, seen) > 0;
}
export function markAnnouncementSeen(release: Pick<ReleaseEntry, 'version'> | null, storage?: ReleaseStore): void {
  if (!release) return;
  try { storage?.setItem(NOTES_SEEN_KEY, release.version); } catch { /* remembered in memory by the app */ }
}
export const releaseText = (value: LocalizedText | LocalizedImage | null | undefined, locale: string): string =>
  typeof value === 'string' ? value : (value?.[locale as 'en' | 'zh-TW'] ?? value?.en ?? '');

export function releaseImage(value: LocalizedImage | undefined, locale: string): string | null {
  const path = releaseText(value, locale);
  return typeof path === 'string' && /^(?!\/)(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9/_.-]*\.(?:png|jpe?g|webp|avif)$/.test(path) ? path : null;
}
