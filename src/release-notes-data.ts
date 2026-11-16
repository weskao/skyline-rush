import type { ReleaseEntry } from './release-notes.ts';
import { GARAGE_CARS_COPY } from './locales/garage-cars.ts';
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
    version: UPCOMING, date: '2026-11-16', image: null,
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
  {
    version: '0.31.0', date: '2026-11-10', image: null,
    video: {
      desktop: {
        src: { en: 'whats-new/catch-up-rings/catch-up-rings.desktop.en.mp4', 'zh-TW': 'whats-new/catch-up-rings/catch-up-rings.desktop.zh-TW.mp4' },
        poster: { en: 'whats-new/catch-up-rings/catch-up-rings.desktop.en.jpg', 'zh-TW': 'whats-new/catch-up-rings/catch-up-rings.desktop.zh-TW.jpg' }
      },
      mobile: {
        src: { en: 'whats-new/catch-up-rings/catch-up-rings.mobile.en.mp4', 'zh-TW': 'whats-new/catch-up-rings/catch-up-rings.mobile.zh-TW.mp4' },
        poster: { en: 'whats-new/catch-up-rings/catch-up-rings.mobile.en.jpg', 'zh-TW': 'whats-new/catch-up-rings/catch-up-rings.mobile.zh-TW.jpg' }
      }
    },
    highlights: [
      {
        id: 'catch-up-rings', kind: 'new', image: null,
        title: { en: 'Rings help you catch up when you fall behind', 'zh-TW': '落後時有補給圈幫你追上' },
        description: {
          en: 'Trailing the pack? Extra rings with NITRO charge now appear ahead of you, and how many depends on the length of the race.',
          'zh-TW': '落後時前方會多出帶有 NITRO 的圈，數量依賽程長短調整。'
        }
      },
      {
        id: 'practice-steps', kind: 'new', image: { en: 'whats-new/practice-steps/practice.en.jpg', 'zh-TW': 'whats-new/practice-steps/practice.zh-TW.jpg' },
        title: { en: 'Practice teaches one move at a time', 'zh-TW': '練習一次教一個動作' },
        description: {
          en: 'Each lesson waits until you do the move. You can skip a step, and stay on the practice road to try it again.',
          'zh-TW': '每堂課要做出動作才會過關，可以跳過單一步驟，也能在練習路上再練一次。'
        }
      },
      {
        id: 'garage-lighting', kind: 'new', image: { en: 'whats-new/garage-lighting/garage-night.en.jpg', 'zh-TW': 'whats-new/garage-lighting/garage-night.zh-TW.jpg' },
        title: { en: 'Day and night lighting in the Garage', 'zh-TW': '車庫新增日夜燈光' },
        description: {
          en: 'A new button next to the pose buttons switches the showroom between day and night light.',
          'zh-TW': '姿勢按鈕旁的新按鈕可切換車庫的白天與夜晚燈光。'
        }
      },
      {
        id: 'ring-chime', kind: 'new', image: null,
        title: { en: 'Every ring you collect now chimes', 'zh-TW': '收集每個圈都有提示音' },
        description: {
          en: 'Any ring you pick up plays a short chime, so you can hear it even when your eyes are elsewhere.',
          'zh-TW': '撿到任何圈都會響起短短的提示音，眼睛沒盯著也聽得到。'
        }
      },
      {
        id: 'results-cloud', kind: 'new', image: { en: 'whats-new/results-cloud/results-cloud.en.jpg', 'zh-TW': 'whats-new/results-cloud/results-cloud.zh-TW.jpg' },
        title: { en: 'Results tell you if your race reached the cloud', 'zh-TW': '成績畫面顯示雲端同步狀態' },
        description: {
          en: 'The results screen shows whether your race is saved to the cloud, or invites you to sign in to back it up.',
          'zh-TW': '成績畫面會顯示這場比賽是否已同步到雲端，未登入時可直接登入備份。'
        }
      },
      {
        id: 'minimap-arrow', kind: 'improvement', image: { en: 'whats-new/minimap-arrow/minimap-arrow.en.jpg', 'zh-TW': 'whats-new/minimap-arrow/minimap-arrow.zh-TW.jpg' },
        title: { en: 'Your minimap marker shows where you are heading', 'zh-TW': '小地圖標記會指出行進方向' },
        description: {
          en: 'A glowing arrow on the route map points the way you are driving.',
          'zh-TW': '路線小地圖上有發光箭頭，指出你正往哪個方向開。'
        }
      },
      {
        id: 'race-screen', kind: 'improvement', image: { en: 'whats-new/race-screen/race-screen.en.jpg', 'zh-TW': 'whats-new/race-screen/race-screen.zh-TW.jpg' },
        title: { en: 'A tidier race screen', 'zh-TW': '更清爽的比賽畫面' },
        description: {
          en: 'On phones, your place is more compact, and the progress bar and boosts sit at the edges so the road stays open.',
          'zh-TW': '手機上的名次更精簡，賽程進度和加速鈕都靠畫面邊緣，路面比較開闊。'
        }
      },
      {
        id: 'fair-rivals', kind: 'improvement', image: null,
        title: { en: 'Fairer, friendlier rivals', 'zh-TW': '對手更公平，新手更好跟上' },
        description: {
          en: 'Rivals now race by your rules, and on the first two tracks and Normal they are a little easier to keep up with.',
          'zh-TW': '對手不再有隱藏的速度優勢，加速、BOOST 和 NITRO 都和你一樣。前兩條賽道與普通難度再稍微放慢，新手比較跟得上。'
        }
      }
    ]
  },
  {
    version: '0.30.0', date: '2026-11-05', image: null,
    video: {
      desktop: {
        src: { en: 'whats-new/roadster-2/roadster-2.desktop.en.mp4', 'zh-TW': 'whats-new/roadster-2/roadster-2.desktop.zh-TW.mp4' },
        poster: { en: 'whats-new/roadster-2/roadster-2.desktop.en.jpg', 'zh-TW': 'whats-new/roadster-2/roadster-2.desktop.zh-TW.jpg' }
      },
      mobile: {
        src: { en: 'whats-new/roadster-2/roadster-2.mobile.en.mp4', 'zh-TW': 'whats-new/roadster-2/roadster-2.mobile.zh-TW.mp4' },
        poster: { en: 'whats-new/roadster-2/roadster-2.mobile.en.jpg', 'zh-TW': 'whats-new/roadster-2/roadster-2.mobile.zh-TW.jpg' }
      }
    },
    highlights: [
      {
        id: 'roadster-redesign', kind: 'new',
        image: { en: 'whats-new/roadster-2/roadster-2-angles.jpg', 'zh-TW': 'whats-new/roadster-2/roadster-2-angles.jpg' },
        title: { en: 'A sharper, more detailed Roadster', 'zh-TW': '全新造型的 Roadster' },
        description: {
          en: 'Your Roadster has a low wedge nose, star wheels, a four-port rear diffuser and a fold-out airbrake wing. Spin it in the Garage to see every angle.',
          'zh-TW': '低趴楔形車頭、星形輪框、四孔尾部擴散器和可展開的尾翼。到車庫轉一圈，各個角度都看得到。'
        }
      },
      {
        id: 'unique-rivals', kind: 'new',
        image: { en: 'whats-new/roadster-2/roadster-2-racers.en.jpg', 'zh-TW': 'whats-new/roadster-2/roadster-2-racers.zh-TW.jpg' },
        title: { en: 'Every rival drives a different car', 'zh-TW': '每位對手都開不同的車' },
        description: {
          en: 'The seven rivals now each have their own look, and everyday traffic comes in more shapes, so you can tell who is beside you at a glance.',
          'zh-TW': '七位對手各有自己的造型，路上的一般車輛也更多樣，一眼就能分辨身旁是誰。'
        }
      },
      {
        id: 'coming-soon-tracks', kind: 'new',
        image: { en: 'whats-new/coming-soon/coming-soon.en.jpg', 'zh-TW': 'whats-new/coming-soon/coming-soon.zh-TW.jpg' },
        title: { en: 'Six new tracks are coming soon', 'zh-TW': '六條新賽道即將推出' },
        description: {
          en: 'Preview Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown, Stormline Megacity and Frostbite Canyon on Home. You cannot race them yet.',
          'zh-TW': '在首頁預覽沙暴裂谷、雨林失落神殿、浮空群島、熔火天脊、霓虹暴雨都市和極地冰原峽谷，目前還不能比賽。'
        }
      },
      {
        id: 'garage-poses', kind: 'improvement',
        image: { en: 'whats-new/roadster-2/garage-home.en.jpg', 'zh-TW': 'whats-new/roadster-2/garage-home.zh-TW.jpg' },
        title: { en: 'A bigger car and quick poses in the Garage', 'zh-TW': '車庫的車更大，姿勢更好切換' },
        description: {
          en: 'The Garage page now shows your car larger, with Ground, Flight and wing buttons and camera views right underneath.',
          'zh-TW': '車庫首頁的車變大了，下方直接有平地、起飛、尾翼按鈕和鏡頭視角，隨手就能切換。'
        }
      },
      {
        id: 'smoother-motion', kind: 'improvement', image: null,
        title: { en: 'Smoother car movement', 'zh-TW': '車輛移動更流暢' },
        description: {
          en: 'Cars glide more smoothly on screen, and drifting turns ease in instead of snapping.',
          'zh-TW': '車子在畫面上滑行更順暢，甩尾轉向也不再突然一彈。'
        }
      },
      {
        id: 'home-swipe', kind: 'improvement', image: null,
        title: { en: 'Swiping tracks on Home feels natural', 'zh-TW': '首頁滑動換賽道更自然' },
        description: {
          en: 'Dragging the Home preview with a mouse now follows your pointer, and a long enough drag switches track right away.',
          'zh-TW': '用滑鼠拖曳首頁預覽時，畫面會跟著游標走；拖得夠遠就會立刻換賽道。'
        }
      },
      {
        id: 'tidy-home', kind: 'improvement', image: null,
        title: { en: 'A tidier Home screen', 'zh-TW': '更整齊的首頁' },
        description: {
          en: 'Start, Garage, History and Practice sit on one row on desktop, and phones hide keyboard settings until you use a keyboard.',
          'zh-TW': '桌機的開始、車庫、歷史紀錄和練習排在同一列；手機在用到鍵盤前不再顯示鍵盤設定。'
        }
      },
      {
        id: 'practice-finish', kind: 'fix', image: null,
        title: { en: 'Practice no longer freezes at the end', 'zh-TW': '練習結束後畫面不再凍結' },
        description: {
          en: 'After the last lesson the road and your car keep moving, with a completion message and a clear Back to game button.',
          'zh-TW': '完成最後一堂課後，道路和車子會繼續動，並出現完成訊息和醒目的「回到遊戲」按鈕。'
        }
      },
      {
        id: 'low-places-results', kind: 'fix', image: null,
        title: { en: 'Results show for 5th to 8th place', 'zh-TW': '第 5 到第 8 名也看得到成績' },
        description: {
          en: 'Finishing 5th to 8th in a mode race now shows your results screen and saves the run to History.',
          'zh-TW': '在各模式競速拿到第 5 到第 8 名時，現在會正常顯示成績畫面，並把這次成績存進歷史紀錄。'
        }
      }
    ]
  },
  ...RECENT_ARCHIVED_RELEASE_NOTES,
  ...ARCHIVED_RELEASE_NOTES,
]);
