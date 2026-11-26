import type { ReleaseClip, ReleaseEntry } from './release-notes.ts';
import { GARAGE_CARS_COPY } from './locales/garage-cars.ts';
import { NEWER_ARCHIVED_RELEASE_NOTES } from './release-notes-archive-newer.ts';
import { ARCHIVED_RELEASE_NOTES } from './release-notes-archive.ts';
import { RECENT_ARCHIVED_RELEASE_NOTES } from './release-notes-archive-recent.ts';

// Announcements are written for players, never generated directly from developer commits.
// Every published version keeps its entry (and any image under public/) for good, older ones in
// release-notes-archive-recent.ts then release-notes-archive.ts; the dialog only shows the newest RECENT_RELEASE_LIMIT of them. scripts/check-release-notes.mjs
// stops a release whose version has no entry. The coming release is written as `version: UPCOMING`, never a number:
// it shows as upcoming until the release commit bumps package.json, which names it (resolveUpcoming in release-notes.ts).
export const UPCOMING = 'upcoming';

const localizedMedia = (slug: string, extension: string, variant?: string) => {
  const stem = `whats-new/${slug}/${slug}${variant ? `.${variant}` : ''}`;
  return { en: `${stem}.en.${extension}`, 'zh-TW': `${stem}.zh-TW.${extension}` };
};
const clip = (slug: string, variant: 'desktop' | 'mobile'): ReleaseClip => ({
  src: localizedMedia(slug, 'mp4', variant), poster: localizedMedia(slug, 'jpg', variant),
});
const video = (slug: string) => ({ desktop: clip(slug, 'desktop'), mobile: clip(slug, 'mobile') });

export const RELEASE_NOTES: readonly ReleaseEntry[] = Object.freeze([
  {
    version: UPCOMING, date: '2026-11-26', image: null,
    video: video('tokyo-hyperdrive'),
    highlights: [
      {
        id: 'tokyo-hyperdrive', kind: 'new', image: null,
        title: { en: 'Two powered roads in Tokyo Afterdark', 'zh-TW': '東京夜行雙充能路段' },
        description: { en: 'Drive through two glowing energy corridors to recharge while racing. Watch the charge indicator and time your next BOOST or FLY.', 'zh-TW': '駛過兩段發光的充能道路即可在行駛中補充電量，留意充能提示，掌握下一次 BOOST 或 FLY 的時機。' }
      },
      {
        id: 'track-downloads', kind: 'new', video: video('track-downloads'),
        title: { en: 'Download and update tracks at your pace', 'zh-TW': '賽道下載與更新更自由' },
        description: { en: 'Get individual tracks or choose Download All to install up to ten at once. Follow the combined progress and cancel the batch when needed.', 'zh-TW': '可逐一下載或更新賽道，也可一次下載全部，最多同時處理十條；隨時查看整體進度，並可取消整批下載。' }
      },
      {
        id: 'home-mode-preview', kind: 'new', video: video('home-mode-preview'),
        title: { en: 'Preview each race mode before you start', 'zh-TW': '開跑前預覽各種賽事模式' },
        description: { en: 'See a distinct preview and quick rules for each mode. Browse tracks by swiping, and see whether a course is ready to race or still a preview.', 'zh-TW': '每種賽事模式都有專屬預覽與簡明玩法；滑動即可瀏覽賽道，並分辨可開跑與僅供預覽的賽道。' }
      },
      {
        id: 'tutorial-coach', kind: 'improvement', video: video('tutorial-coach'),
        title: { en: 'A clearer driving coach', 'zh-TW': '駕駛教學全面改版' },
        description: { en: 'The compact coach sits above the road, leaving your controls clear. Lessons follow your AUTO setting and pause until you are ready to resume.', 'zh-TW': '精簡教學提示位於車道上方，不遮擋操作；課程配合 AUTO 狀態引導，暫停後可依提示繼續。' }
      },
      {
        id: 'touch-auto-nitro', kind: 'improvement', image: localizedMedia('touch-auto-nitro', 'webp'),
        responsiveImages: { landscape: localizedMedia('touch-auto-nitro', 'webp', 'landscape') },
        title: { en: 'More room for NITRO with AUTO', 'zh-TW': 'AUTO 開啟時 NITRO 更好按' },
        description: { en: 'On touch screens, AUTO hides the accelerator and expands NITRO into the freed space. Turn AUTO off to get your accelerator back.', 'zh-TW': '觸控裝置開啟 AUTO 時會收起油門，讓 NITRO 按鈕加寬；關閉 AUTO 即可恢復油門。' }
      },
      {
        id: 'corner-driving', kind: 'improvement', video: video('corner-driving'),
        title: { en: 'Feel the pull of every corner', 'zh-TW': '每個彎道都更有駕駛感' },
        description: { en: 'Your car carries its heading into bends, so steer into the turn to hold your line. If you reach the rail, AUTO helps bring you back toward the middle.', 'zh-TW': '車頭會帶著原本的方向入彎，朝彎內轉向就能守住路線。碰到護欄時，AUTO 會協助把車帶回路中央。' }
      },
      {
        id: 'launch-flare', kind: 'improvement', video: video('launch-flare'),
        title: { en: 'Launch flares light up the countdown', 'zh-TW': '起跑閃焰點亮倒數' },
        description: { en: 'Equip a launch flare to see two waves of light around your car during the countdown. Both fade before GO.', 'zh-TW': '裝備起跑閃焰後，倒數時車身周圍會亮起兩波特效，並在起跑前淡出。' }
      },
      {
        id: 'race-notice-lane', kind: 'improvement', image: localizedMedia('race-notice-lane', 'webp'),
        responsiveImages: { portrait: localizedMedia('race-notice-lane', 'webp', 'portrait') },
        title: { en: 'Race alerts stay out of your way', 'zh-TW': '賽中提示更清楚不擋操作' },
        description: { en: 'Halfway, Freeze and EMP alerts sit higher to keep the road and controls clear. Speed and flight gauges stay visible through the countdown and GO.', 'zh-TW': '半程、冰凍與 EMP 提示移到較上方，留出道路和操作空間。倒數到起跑時，速度和飛行儀表都看得見。' }
      },
      {
        id: 'showcase-camera', kind: 'improvement', image: localizedMedia('showcase-camera', 'webp'),
        title: { en: 'Consistent camera controls in the Garage', 'zh-TW': '首頁與車庫鏡頭操作更一致' },
        description: { en: 'Use the same compact camera arrows on Home and in the Garage. Switch views easily and keep more room for the car.', 'zh-TW': '首頁與車庫使用一致的精簡鏡頭切換按鈕，輕鬆切換視角，也保留更多空間欣賞愛車。' }
      },
      {
        id: 'whats-new-entry', kind: 'improvement', image: localizedMedia('whats-new-entry', 'webp'),
        title: { en: 'Find What\'s New more easily', 'zh-TW': '新版公告更容易找到' },
        description: { en: 'Open What\'s New from the welcome screen or Home. Each unread version keeps its dot until you open that version.', 'zh-TW': '從歡迎畫面或首頁即可開啟新版本公告。每個版本各有未讀圓點，點開該版本後才會消失。' }
      },
      {
        id: 'race-restart', kind: 'fix', image: null,
        title: { en: 'Smoother race starts and restarts', 'zh-TW': '開始與重新比賽更順暢' },
        description: { en: 'The selected track stays visible while loading, and the route updates for your next race. After finishing, reopen Driving Controls or return to Home.', 'zh-TW': '載入時會保留所選賽道的畫面，開始下一場時會更新路線。完賽後可再次開啟駕駛操作設定，也可直接回首頁。' }
      }
    ]
  },
  {
    version: '0.33.0', date: '2026-11-22', image: null,
    video: {
      desktop: {
        src: { en: 'whats-new/gt-premiere/gt-premiere.desktop.en.mp4', 'zh-TW': 'whats-new/gt-premiere/gt-premiere.desktop.zh-TW.mp4' },
        poster: { en: 'whats-new/gt-premiere/gt-premiere.desktop.en.jpg', 'zh-TW': 'whats-new/gt-premiere/gt-premiere.desktop.zh-TW.jpg' }
      },
      mobile: {
        src: { en: 'whats-new/gt-premiere/gt-premiere.mobile.en.mp4', 'zh-TW': 'whats-new/gt-premiere/gt-premiere.mobile.zh-TW.mp4' },
        poster: { en: 'whats-new/gt-premiere/gt-premiere.mobile.en.jpg', 'zh-TW': 'whats-new/gt-premiere/gt-premiere.mobile.zh-TW.jpg' }
      }
    },
    highlights: [
      {
        id: 'gt-unlock', kind: 'new', image: null,
        title: { en: `Earn the ${GARAGE_CARS_COPY.en['car.crimson-gt']} at 18 stars`, 'zh-TW': `18 顆星解鎖${GARAGE_CARS_COPY['zh-TW']['car.crimson-gt']}` },
        description: {
          en: 'Collect 18 Career stars to keep it for good, or start a one-time 24-hour test drive in the Garage. A new unlock scene shows off every car you win.',
          'zh-TW': '集滿 18 顆生涯星星就能永久擁有，或先在車庫試駕 24 小時；新的解鎖畫面會帶你欣賞每台贏得的車。'
        }
      },
      {
        id: 'rival-fleet', kind: 'new', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/rival-fleet/rival-fleet.desktop.en.mp4', 'zh-TW': 'whats-new/rival-fleet/rival-fleet.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/rival-fleet/rival-fleet.desktop.en.jpg', 'zh-TW': 'whats-new/rival-fleet/rival-fleet.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/rival-fleet/rival-fleet.mobile.en.mp4', 'zh-TW': 'whats-new/rival-fleet/rival-fleet.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/rival-fleet/rival-fleet.mobile.en.jpg', 'zh-TW': 'whats-new/rival-fleet/rival-fleet.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'A varied motorsport field of rivals', 'zh-TW': '對手賽車陣容更多樣' },
        description: {
          en: 'Rivals now race as sculpted motorsport cars, restyled and shuffled every race, so each starting grid looks different.',
          'zh-TW': '對手換上全新賽車造型，每場重新配色洗牌，每次起跑的陣容都不一樣。'
        }
      },
      {
        id: 'startup-screen', kind: 'new', image: { en: 'whats-new/startup-screen/startup.en.webp', 'zh-TW': 'whats-new/startup-screen/startup.zh-TW.webp' },
        title: { en: 'A new Skyline Rush startup screen', 'zh-TW': '全新啟動畫面' },
        description: {
          en: 'A full-screen welcome with fresh artwork greets you on every launch, fitted to phones, tablets and desktops.',
          'zh-TW': '每次開啟都會看到全新美術的歡迎畫面，手機、平板與電腦都完整呈現。'
        }
      },
      {
        id: 'drift-trail-styles', kind: 'new', image: 'whats-new/drift-trail-styles/garage-drift-trails.webp',
        title: { en: 'Five new drift trail styles', 'zh-TW': '五款全新漂移痕跡' },
        description: {
          en: 'Preview and try Embercut, Prism Ribbon, Glacier Fracture, Voltage Arc and Nebula Dust for free in Garage Effects. Equip one to leave its trail on the road.',
          'zh-TW': '到車庫「特效」即時預覽並免費試用熾焰、虹光流帶、裂冰晶痕、霓電弧與星雲微塵。裝備後，漂移時就會在路面留下你選的痕跡。'
        }
      },
      {
        id: 'rival-items', kind: 'new', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/rival-items/rival-items.desktop.en.mp4', 'zh-TW': 'whats-new/rival-items/rival-items.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/rival-items/rival-items.desktop.en.jpg', 'zh-TW': 'whats-new/rival-items/rival-items.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/rival-items/rival-items.mobile.en.mp4', 'zh-TW': 'whats-new/rival-items/rival-items.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/rival-items/rival-items.mobile.en.jpg', 'zh-TW': 'whats-new/rival-items/rival-items.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'Rivals fight back with Freeze and EMP', 'zh-TW': '對手也會用冰凍與 EMP' },
        description: {
          en: 'Rivals can hit you with Freeze or EMP. Your car frosts over or crackles with gold lightning, and a center countdown shows how long it lasts.',
          'zh-TW': '對手會用冰凍或 EMP 攻擊你：車身結霜或竄出金色電弧，畫面中央也會倒數效果剩餘時間。'
        }
      },
      {
        id: 'sky-spiral-life', kind: 'improvement', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/sky-spiral/sky-spiral.desktop.en.mp4', 'zh-TW': 'whats-new/sky-spiral/sky-spiral.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/sky-spiral/sky-spiral.desktop.en.jpg', 'zh-TW': 'whats-new/sky-spiral/sky-spiral.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/sky-spiral/sky-spiral.mobile.en.mp4', 'zh-TW': 'whats-new/sky-spiral/sky-spiral.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/sky-spiral/sky-spiral.mobile.en.jpg', 'zh-TW': 'whats-new/sky-spiral/sky-spiral.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'A brighter Sky Spiral', 'zh-TW': '天際螺旋更明亮' },
        description: {
          en: 'Sky Spiral now races under a bright day sky. Higher graphics settings add cloud-sea landmarks, circling seabirds and a drifting airship.',
          'zh-TW': '天際螺旋換上明亮白天；較高畫質還有雲海地標、盤旋海鳥與飄浮飛船。'
        }
      },
      {
        id: 'lobby-refresh', kind: 'improvement', image: { en: 'whats-new/lobby/track-rail.en.webp', 'zh-TW': 'whats-new/lobby/track-rail.zh-TW.webp' },
        title: { en: 'A fresh look for lobby, Garage and podium', 'zh-TW': '大廳、車庫與頒獎台煥然一新' },
        description: {
          en: 'New artwork across the race lobby, Garage and podium, easier track browsing, and all race options in one Settings page with clearer tabs.',
          'zh-TW': '賽事大廳、車庫與頒獎台換上新美術，選賽道更順手，賽事選項集中在同一個設定頁，分頁也更清楚。'
        }
      },
      {
        id: 'garage-inspect', kind: 'improvement', image: { en: 'whats-new/garage-inspect/inspect.en.webp', 'zh-TW': 'whats-new/garage-inspect/inspect.zh-TW.webp' },
        title: { en: 'Inspect your car in the Garage', 'zh-TW': '在車庫近看愛車' },
        description: {
          en: 'Open Inspect to look your car over up close. The camera follows the section you open: the exhaust for Effects, the flank for Paints.',
          'zh-TW': '開啟檢視模式近看愛車，鏡頭會跟著你開啟的分頁：特效看排氣口，車漆看車身側面。'
        }
      },
      {
        id: 'setting-toasts', kind: 'improvement', image: { en: 'whats-new/setting-toasts/toast.en.webp', 'zh-TW': 'whats-new/setting-toasts/toast.zh-TW.webp' },
        title: { en: 'Clear feedback when you toggle a setting', 'zh-TW': '切換設定有清楚提示' },
        description: {
          en: 'Sound, Airflow and Auto accelerate show a quick ON or OFF badge. Turning Visual effects off now always asks first.',
          'zh-TW': '音效、氣流與自動加速切換時會跳出開／關標示；關閉視覺特效前每次都會先確認。'
        }
      },
      {
        id: 'road-runs-on', kind: 'improvement', image: { en: 'whats-new/minimap-gaps/minimap-gaps.en.webp', 'zh-TW': 'whats-new/minimap-gaps/minimap-gaps.zh-TW.webp' },
        title: { en: 'Roads keep going past the finish', 'zh-TW': '終點之後道路繼續延伸' },
        description: {
          en: 'Every course now runs on beyond the finish line instead of ending in mid-air, and the route map marks each gap in the road.',
          'zh-TW': '各賽道的路在終點後不再斷在半空，路線小地圖也會標出每一處路面缺口。'
        }
      },
      {
        id: 'drift-brake', kind: 'improvement', image: null,
        title: { en: 'Smoother drift braking', 'zh-TW': '漂移煞車更順' },
        description: {
          en: 'Braking mid-drift now eases you smoothly out of the slide. On phones, the brake is harder to hit by accident and stays clear of your steering thumbs.',
          'zh-TW': '漂移中煞車會平順收尾；手機煞車更不易誤觸，也不再干擾轉向拇指。'
        }
      },
      { id: 'race-stopwatch', kind: 'new', image: { en: 'whats-new/race-stopwatch/stopwatch.en.webp', 'zh-TW': 'whats-new/race-stopwatch/stopwatch.zh-TW.webp' },
        title: { en: 'Keep time with the new race clock', 'zh-TW': '全新賽事計時器' },
        description: { en: 'A stopwatch beside your position tracks every run, with clear cues for the start, pause and finish.', 'zh-TW': '名次旁新增碼錶，跑了多久一眼就能看見；起跑、暫停與完賽也有清楚提示。' }
      },
      { id: 'sprint-flames', kind: 'new', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/sprint-flames/sprint-flames.desktop.en.mp4', 'zh-TW': 'whats-new/sprint-flames/sprint-flames.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/sprint-flames/sprint-flames.desktop.en.jpg', 'zh-TW': 'whats-new/sprint-flames/sprint-flames.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/sprint-flames/sprint-flames.mobile.en.mp4', 'zh-TW': 'whats-new/sprint-flames/sprint-flames.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/sprint-flames/sprint-flames.mobile.en.jpg', 'zh-TW': 'whats-new/sprint-flames/sprint-flames.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'Three ways to light up your thrusters', 'zh-TW': '三種加速尾焰，各有特色' },
        description: { en: 'BOOST, NITRO and both together now have distinct flames and race cues. Preview all three looks on your car in the Garage.', 'zh-TW': 'BOOST、NITRO 與兩者齊開都有專屬尾焰及提示；到車庫就能預覽三種效果。' }
      },
      { id: 'chasm-rescue', kind: 'improvement', image: null,
        title: { en: 'Bigger jumps, better recoveries', 'zh-TW': '斷崖更刺激，重返賽道更輕鬆' },
        description: { en: 'Sky Spiral\'s wider gaps need a fast BOOST launch or flight. Fall in and you return to safe ground; keep missing one gap and you get a lift past it.', 'zh-TW': '天際螺旋的寬闊斷崖需要高速 BOOST 或飛行才能通過；掉下去會回到安全路面，同一處連續失足還會助你越過。' }
      },
      { id: 'reward-quick-equip', kind: 'improvement', image: null,
        title: { en: 'Equip your rewards right away', 'zh-TW': '新獎勵，一鍵裝備' },
        description: { en: 'When you earn a new car or item, equip it straight from the reveal instead of hunting for it in the Garage.', 'zh-TW': '獲得新車或新裝備時，就能直接在獎勵畫面套用，不必再回車庫尋找。' }
      },
      { id: 'first-frame-quality', kind: 'fix', image: null,
        title: { en: 'Your chosen graphics, right from the start', 'zh-TW': '一開跑就是選好的畫質' },
        description: { en: 'Tracks, cars and effects now appear in your selected quality from the first race view, without flashing a lower-quality scene.', 'zh-TW': '賽道、車子與特效從第一個比賽畫面就使用你選的畫質，不再先閃出低畫質場景。' }
      },
      { id: 'phone-audio-return', kind: 'fix', image: null,
        title: { en: 'Sound returns after interruptions', 'zh-TW': '手機中斷後，聲音回來了' },
        description: { en: 'Alarms, calls and notifications no longer leave your race silent. Tap back into the game to bring music and sound effects back.', 'zh-TW': '鬧鐘、來電或通知打斷遊戲後，返回並點一下畫面，就能繼續聽見音樂與音效。' }
      },
      {
        id: 'finished-rivals', kind: 'fix', image: null,
        title: { en: 'Finished rivals stay on the road', 'zh-TW': '已完賽對手不會消失' },
        description: {
          en: 'Rivals that cross the line stay visible and can still be bumped while you finish.',
          'zh-TW': '對手過線後仍留在賽道上，你完賽時依然看得到、也能碰撞。'
        }
      },
      {
        id: 'account-confirm', kind: 'fix', image: null,
        title: { en: 'Account actions confirm in the game', 'zh-TW': '帳號操作改由遊戲內確認' },
        description: {
          en: 'Switching accounts, importing and deleting Cloud Save now ask in a game dialog instead of a browser pop-up.',
          'zh-TW': '切換帳號、匯入與刪除雲端存檔，現在都在遊戲內視窗確認，不再跳出瀏覽器視窗。'
        }
      }
    ]
  },
  ...NEWER_ARCHIVED_RELEASE_NOTES,
  ...RECENT_ARCHIVED_RELEASE_NOTES,
  ...ARCHIVED_RELEASE_NOTES,
]);
