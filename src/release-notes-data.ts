import type { ReleaseEntry } from './release-notes.ts';
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
export const RELEASE_NOTES: readonly ReleaseEntry[] = Object.freeze([
  {
    version: UPCOMING, date: '2026-11-20', image: null,
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
        title: { en: 'A varied motorsport field of rivals', 'zh-TW': '對手變成多樣賽車陣容' },
        description: {
          en: 'Rivals now race as sculpted motorsport cars, restyled and shuffled every race, so each starting grid looks different.',
          'zh-TW': '對手換上全新雕塑的賽車外型，每場比賽重新洗牌，每次起跑的陣容都不一樣。'
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
        title: { en: 'Five new drift trail styles', 'zh-TW': '五款全新甩尾痕跡' },
        description: {
          en: 'Preview and try Embercut, Prism Ribbon, Glacier Fracture, Voltage Arc and Nebula Dust for free in Garage Effects. Equip one to leave its trail on the road.',
          'zh-TW': '到車庫「特效」即時預覽並免費試用熾焰、虹光流帶、裂冰晶痕、霓電弧與星雲微塵。裝備後，甩尾時就會在路面留下你選的痕跡。'
        }
      },
      {
        id: 'rival-items', kind: 'new',
        image: { en: 'whats-new/rival-items/debuffs.en.webp', 'zh-TW': 'whats-new/rival-items/debuffs.zh-TW.webp' },
        responsiveImages: {
          desktop: { en: 'whats-new/rival-items/debuffs.desktop.en.svg', 'zh-TW': 'whats-new/rival-items/debuffs.desktop.zh-TW.svg' },
          tablet: { en: 'whats-new/rival-items/debuffs.tablet.en.svg', 'zh-TW': 'whats-new/rival-items/debuffs.tablet.zh-TW.svg' },
          landscape: { en: 'whats-new/rival-items/debuffs.landscape.en.svg', 'zh-TW': 'whats-new/rival-items/debuffs.landscape.zh-TW.svg' },
          portrait: { en: 'whats-new/rival-items/debuffs.portrait.en.svg', 'zh-TW': 'whats-new/rival-items/debuffs.portrait.zh-TW.svg' },
          tabletPortrait: { en: 'whats-new/rival-items/debuffs.tablet-portrait.en.svg', 'zh-TW': 'whats-new/rival-items/debuffs.tablet-portrait.zh-TW.svg' }
        },
        title: { en: 'Rivals fight back with Freeze and EMP', 'zh-TW': '對手也會用冰凍與 EMP' },
        description: {
          en: 'Rivals can hit you with Freeze or EMP. A center countdown shows how long it lasts, while your speedometer lights up icy blue or gold.',
          'zh-TW': '對手會用冰凍與 EMP 攻擊。中招時，畫面中央會顯示倒數，時速表也會亮起冰藍或金黃，直到效果解除。'
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
        title: { en: 'A brighter Sky Spiral, alive with birds', 'zh-TW': '天際螺旋更明亮、更有生氣' },
        description: {
          en: 'Sky Spiral now races under a day sky above a sea of clouds, with landmarks, circling seabirds and a drifting airship (Medium quality and above).',
          'zh-TW': '天際螺旋換上晴朗天空與雲海，沿途有地標、盤旋的海鳥和緩緩飄過的飛船（中等畫質以上）。'
        }
      },
      {
        id: 'lobby-refresh', kind: 'improvement', image: { en: 'whats-new/lobby/track-rail.en.webp', 'zh-TW': 'whats-new/lobby/track-rail.zh-TW.webp' },
        title: { en: 'A fresh look for lobby, Garage and podium', 'zh-TW': '大廳、車庫與頒獎台煥然一新' },
        description: {
          en: 'New artwork across the race lobby, Garage and podium, easier track browsing, and all race options in one Settings page.',
          'zh-TW': '賽事大廳、車庫與頒獎台換上新美術，選賽道更順手，賽事選項集中在同一個設定頁。'
        }
      },
      {
        id: 'garage-inspect', kind: 'improvement', image: { en: 'whats-new/garage-inspect/inspect.en.webp', 'zh-TW': 'whats-new/garage-inspect/inspect.zh-TW.webp' },
        title: { en: 'Inspect your car in the Garage', 'zh-TW': '在車庫近看愛車' },
        description: {
          en: 'Tap the eye icon to look your car over up close. The camera follows the section you open: the exhaust for Effects, the flank for Paints.',
          'zh-TW': '點眼睛圖示近距離檢視車子，鏡頭會跟著你開啟的分頁：特效看排氣口，車漆看車身側面。'
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
          en: 'Braking mid-drift now eases you out of the slide, and phone braking is more deliberate, so your steering thumbs no longer clash.',
          'zh-TW': '漂移中煞車會平順收尾；手機煞車更不易誤觸，也不再干擾轉向拇指。'
        }
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
  {
    version: '0.32.0', date: '2026-11-17', image: null,
    video: {
      desktop: {
        src: { en: 'whats-new/nitro-chain/nitro-chain.desktop.en.mp4', 'zh-TW': 'whats-new/nitro-chain/nitro-chain.desktop.zh-TW.mp4' },
        poster: { en: 'whats-new/nitro-chain/nitro-chain.desktop.en.jpg', 'zh-TW': 'whats-new/nitro-chain/nitro-chain.desktop.zh-TW.jpg' }
      },
      mobile: {
        src: { en: 'whats-new/nitro-chain/nitro-chain.mobile.en.mp4', 'zh-TW': 'whats-new/nitro-chain/nitro-chain.mobile.zh-TW.mp4' },
        poster: { en: 'whats-new/nitro-chain/nitro-chain.mobile.en.jpg', 'zh-TW': 'whats-new/nitro-chain/nitro-chain.mobile.zh-TW.jpg' }
      }
    },
    highlights: [
      {
        id: 'crimson-gt', kind: 'new', image: 'whats-new/crimson-gt/crimson-gt.webp',
        title: {
          en: `A second car: ${GARAGE_CARS_COPY.en['car.crimson-gt']}`,
          'zh-TW': `第二款車：${GARAGE_CARS_COPY['zh-TW']['car.crimson-gt']}`,
        },
        description: {
          en: 'Switch cars in the Garage. Every paint and effect fits both cars, and your paint comes along when you switch.',
          'zh-TW': '在車庫即可切換車款。所有車漆與特效兩款車都能用，換車時車漆也會跟著帶過去。'
        }
      },
      {
        id: 'drift-flip', kind: 'improvement', image: null,
        title: { en: 'Drifts flow through corners', 'zh-TW': '漂移過彎更順暢' },
        description: {
          en: 'Flip your steering mid-drift to swing the other way without breaking it. Corners no longer push a drifting car wide, and you keep more speed through the slide.',
          'zh-TW': '漂移中反打方向就能甩向另一側，漂移不會中斷；過彎不再被往外推，側滑時也保留更多車速。'
        }
      },
      {
        id: 'drift-tiers', kind: 'new', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/drift-tiers/drift-tiers.desktop.en.mp4', 'zh-TW': 'whats-new/drift-tiers/drift-tiers.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/drift-tiers/drift-tiers.desktop.en.jpg', 'zh-TW': 'whats-new/drift-tiers/drift-tiers.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/drift-tiers/drift-tiers.mobile.en.mp4', 'zh-TW': 'whats-new/drift-tiers/drift-tiers.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/drift-tiers/drift-tiers.mobile.en.jpg', 'zh-TW': 'whats-new/drift-tiers/drift-tiers.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'Drifts charge NITRO in three stages', 'zh-TW': '漂移分三段累積 NITRO' },
        description: {
          en: 'Hold a drift longer to earn NITRO at each of three stages. The car glows a new colour at every stage, and your tyres leave skid marks.',
          'zh-TW': '漂移撐得越久，三個階段都能各自累積 NITRO；每到一段車身就換色發光，輪胎也會在路面留下胎痕。'
        }
      },
      {
        id: 'nitro-chain', kind: 'new', image: null,
        title: { en: 'Chain NITRO for a stronger burst', 'zh-TW': '連發 NITRO 推力更強' },
        description: {
          en: 'Press NITRO again while it burns to add a full charge. Chain up to three for a stronger push, shown on the HUD. Watch out: rivals chain theirs too.',
          'zh-TW': 'NITRO 噴發中再按一次就多加一整格，最多連發三段、推力更強，畫面上也會顯示連發段數。小心，對手也會連發！'
        }
      },
      {
        id: 'pickups-3d', kind: 'new', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/pickups-3d/pickups-3d.desktop.en.mp4', 'zh-TW': 'whats-new/pickups-3d/pickups-3d.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/pickups-3d/pickups-3d.desktop.en.jpg', 'zh-TW': 'whats-new/pickups-3d/pickups-3d.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/pickups-3d/pickups-3d.mobile.en.mp4', 'zh-TW': 'whats-new/pickups-3d/pickups-3d.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/pickups-3d/pickups-3d.mobile.en.jpg', 'zh-TW': 'whats-new/pickups-3d/pickups-3d.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'Pickups you can see and feel', 'zh-TW': '補給品更立體、更有感' },
        description: {
          en: 'Pickups now spin on the road as 3D models, each with its own burst and sound. The fuel bar flashes what you gained, and supported phones buzz lightly.',
          'zh-TW': '補給品變成在路面旋轉的 3D 模型，各有專屬特效與音效；油量條會閃出補充量，支援的手機還會輕微震動。'
        }
      },
      {
        id: 'rival-cues', kind: 'new', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/rival-cues/rival-cues.desktop.en.mp4', 'zh-TW': 'whats-new/rival-cues/rival-cues.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/rival-cues/rival-cues.desktop.en.jpg', 'zh-TW': 'whats-new/rival-cues/rival-cues.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/rival-cues/rival-cues.mobile.en.mp4', 'zh-TW': 'whats-new/rival-cues/rival-cues.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/rival-cues/rival-cues.mobile.en.jpg', 'zh-TW': 'whats-new/rival-cues/rival-cues.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'See what your rivals are up to', 'zh-TW': '對手狀態一眼看穿' },
        description: {
          en: 'Rival tail lights flare when they fire NITRO or BOOST. Rivals slowed by FREEZE glow icy blue, and EMP lights them up yellow-green.',
          'zh-TW': '對手啟動 NITRO 或 BOOST 時尾燈會亮起；被凍結減速的對手泛著冰藍光，被電磁脈衝擊中則泛出黃綠色電光。'
        }
      },
      {
        id: 'race-onboarding', kind: 'new', image: { en: 'whats-new/race-onboarding/race-onboarding.en.webp', 'zh-TW': 'whats-new/race-onboarding/race-onboarding.zh-TW.webp' },
        title: { en: 'Practice first, or jump straight in', 'zh-TW': '先練習，或直接開跑' },
        description: {
          en: 'Your first Start asks whether to practise or race now. Controls are grouped into steering, touch layout and keyboard so they are easier to find.',
          'zh-TW': '第一次按開始時，可選擇先練習或直接比賽；操作設定分成轉向、觸控配置與鍵盤三組，更好找。'
        }
      },
      {
        id: 'halfway', kind: 'new', image: { en: 'whats-new/halfway/halfway.en.webp', 'zh-TW': 'whats-new/halfway/halfway.zh-TW.webp' },
        title: { en: 'A clearer halfway signal', 'zh-TW': '賽事過半，抬眼就看見' },
        description: {
          en: 'Pass the halfway mark and a banner lights up at the centre of the screen, showing the distance left, with a short chime.',
          'zh-TW': '跑過半程時，畫面中央會亮起提示，顯示距終點還有多遠，並響起短促的提示音。'
        }
      },
      {
        id: 'race-camera', kind: 'improvement', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/race-camera/race-camera.desktop.en.mp4', 'zh-TW': 'whats-new/race-camera/race-camera.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/race-camera/race-camera.desktop.en.jpg', 'zh-TW': 'whats-new/race-camera/race-camera.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/race-camera/race-camera.mobile.en.mp4', 'zh-TW': 'whats-new/race-camera/race-camera.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/race-camera/race-camera.mobile.en.jpg', 'zh-TW': 'whats-new/race-camera/race-camera.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'A closer, punchier race camera', 'zh-TW': '更貼近、更有衝擊感的鏡頭' },
        description: {
          en: 'The chase view sits closer and swings into drifts. NITRO and BOOST hit with a camera punch and a bigger flame, and every race starts from behind the car.',
          'zh-TW': '追車視角更貼近，漂移時會跟著擺動；NITRO 與 BOOST 啟動時鏡頭更有衝擊感、火焰更大，每場比賽都從車後視角開始。'
        }
      },
      {
        id: 'classic-corners', kind: 'improvement', image: null,
        title: { en: 'New corners and more rings on classic tracks', 'zh-TW': '經典賽道新彎道，圓環與補給更多' },
        description: {
          en: 'Coast, Canyon Skyway and Aurora Pass get their own corners, Sky Spiral gains wide sweeping bends, and the first five tracks carry 40% more rings and pickups.',
          'zh-TW': '海岸公路、峽谷天橋與極光山道有了各自的彎道，天際螺旋多了大弧度彎；前五條賽道的圓環與補給品也多了四成。'
        }
      },
      {
        id: 'neon-3d', kind: 'improvement', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/neon-3d/neon-3d.desktop.en.mp4', 'zh-TW': 'whats-new/neon-3d/neon-3d.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/neon-3d/neon-3d.desktop.en.jpg', 'zh-TW': 'whats-new/neon-3d/neon-3d.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/neon-3d/neon-3d.mobile.en.mp4', 'zh-TW': 'whats-new/neon-3d/neon-3d.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/neon-3d/neon-3d.mobile.en.jpg', 'zh-TW': 'whats-new/neon-3d/neon-3d.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'Neon Downtown: a 10 km rainy-night lap', 'zh-TW': '霓虹都會：10 公里雨夜長圈' },
        description: {
          en: 'The city course is now one 10 km lap through eight districts, with fresh best times. On Medium graphics and up, wet streets mirror the neon past a busy harbour.',
          'zh-TW': '城市賽道改為穿越八個街區的 10 公里大圈，最佳成績重新計算。畫質「中」以上，濕亮街道倒映霓虹，沿途經過熱鬧港口。'
        }
      },
      {
        id: 'coast-3d', kind: 'improvement', image: null,
        video: {
          desktop: {
            src: { en: 'whats-new/coast-3d/coast-3d.desktop.en.mp4', 'zh-TW': 'whats-new/coast-3d/coast-3d.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/coast-3d/coast-3d.desktop.en.jpg', 'zh-TW': 'whats-new/coast-3d/coast-3d.desktop.zh-TW.jpg' }
          },
          mobile: {
            src: { en: 'whats-new/coast-3d/coast-3d.mobile.en.mp4', 'zh-TW': 'whats-new/coast-3d/coast-3d.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/coast-3d/coast-3d.mobile.en.jpg', 'zh-TW': 'whats-new/coast-3d/coast-3d.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'Coast, rebuilt in 3D', 'zh-TW': '海岸公路換上 3D 新貌' },
        description: {
          en: 'On Medium graphics and up, race past sailboats and seagulls, grassy cliff tops and far headlands, beside a sea that mirrors a new sky.',
          'zh-TW': '畫質「中」以上時，沿途有帆船與海鷗、長滿草叢的崖頂與遠方岬角，海面還會倒映全新的天空。'
        }
      },
      {
        id: 'track-cards', kind: 'improvement', image: { en: 'whats-new/track-cards/track-cards.en.webp', 'zh-TW': 'whats-new/track-cards/track-cards.zh-TW.webp' },
        title: { en: 'Illustrated cards for the classic tracks', 'zh-TW': '經典賽道換上插畫卡片' },
        description: {
          en: 'Each of the ten classic tracks now has its own illustration on the home screen.',
          'zh-TW': '十條經典賽道在首頁都有了專屬插畫。'
        }
      },
      {
        id: 'smoother-traffic', kind: 'fix', image: null,
        title: { en: 'Smoother racing in heavy traffic', 'zh-TW': '車多時跑起來更順' },
        description: {
          en: 'Busy roads run more smoothly, the starting countdown no longer stalls on slower devices, and the music starts before the track finishes loading.',
          'zh-TW': '車流多的路段更流暢，較慢的裝置起跑倒數不再卡住，音樂也會在賽道載入完成前就開始播放。'
        }
      },
      {
        id: 'garage-art', kind: 'fix', image: null,
        title: { en: 'Garage pictures and preview camera fixed', 'zh-TW': '車庫圖片與預覽鏡頭修正' },
        description: {
          en: 'Garage car and paint pictures show again, full size on tablets. The Studio camera is easier to steer, keeps its angle and zoom, and switches views with ‹ ›.',
          'zh-TW': '車庫的車款與車漆圖片恢復正常顯示，平板上也維持完整大小；Studio 預覽鏡頭更好操作，會保留角度與縮放，按 ‹ › 即可切換視角。'
        }
      }
    ]
  },
  ...NEWER_ARCHIVED_RELEASE_NOTES,
  ...RECENT_ARCHIVED_RELEASE_NOTES,
  ...ARCHIVED_RELEASE_NOTES,
]);
