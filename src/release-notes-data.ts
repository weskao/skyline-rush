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
        id: 'crimson-gt', kind: 'new', image: { en: 'whats-new/crimson-gt/crimson-gt.en.webp', 'zh-TW': 'whats-new/crimson-gt/crimson-gt.zh-TW.webp' },
        title: {
          en: `A second car: ${GARAGE_CARS_COPY.en['car.crimson-gt']}`,
          'zh-TW': `第二款車：${GARAGE_CARS_COPY['zh-TW']['car.crimson-gt']}`,
        },
        description: {
          en: 'Switch cars in the Garage. Both cars share every paint and effect, and each remembers its own paint.',
          'zh-TW': '在車庫即可切換車款。兩款車共用所有車漆與特效，並各自記住上次使用的車漆。'
        }
      },
      {
        id: 'drift-flip', kind: 'improvement', image: null,
        title: { en: 'Drifts flow through corners', 'zh-TW': '漂移過彎更順暢' },
        description: {
          en: 'Flip steering mid-drift to swing the other way without losing it, corners no longer push a drifting car wide, and the slide is quicker.',
          'zh-TW': '漂移中可直接反打方向切換邊，漂移不會中斷；彎道不再把漂移中的車推向外側，側滑也更快。'
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
          en: 'Press NITRO again while it burns to add a full charge. Each chained charge pushes harder, up to ×3, and rivals chain theirs too.',
          'zh-TW': 'NITRO 噴發中再按一次就多加一整格，連發越多推力越強，最高 ×3；對手也會連發。'
        }
      },
      {
        id: 'pickups-3d', kind: 'new', image: null,
        title: { en: 'Pickups you can see and feel', 'zh-TW': '補給品更立體、更有感' },
        description: {
          en: 'Pickups now spin on the road as 3D models, each with its own burst and sound. The fuel bar flashes what you gained, and supported phones buzz lightly.',
          'zh-TW': '補給品變成在路面旋轉的 3D 模型，各有專屬特效與音效；油量條會閃出補充量，支援的手機還會輕震。'
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
          en: 'In a race with a finish line, a banner lights up at center screen when you pass halfway. A short chime plays and the banner shows the distance left.',
          'zh-TW': '跑過半程時，畫面中央會亮起提示，顯示距終點還有多遠，並響起短促的提示音。'
        }
      },
      {
        id: 'race-camera', kind: 'improvement', image: null,
        title: { en: 'A closer, punchier race camera', 'zh-TW': '更貼近、更有衝擊感的鏡頭' },
        description: {
          en: 'The chase view sits closer and swings into drifts. NITRO and BOOST hit with a camera punch and a bigger flame, and every race starts from behind the car.',
          'zh-TW': '追車視角更貼近，漂移時會跟著擺動；NITRO 與 BOOST 啟動時鏡頭更有衝擊感、火焰更大，每場比賽都從車後視角開始。'
        }
      },
      {
        id: 'classic-corners', kind: 'improvement', image: null,
        title: { en: 'New corners and more rings on classic tracks', 'zh-TW': '經典賽道新彎道、更多圈' },
        description: {
          en: 'Coast, Canyon Skyway and Aurora Pass get their own corners, Sky Spiral gains wide sweeping bends, and the first five tracks carry 40% more rings and pickups.',
          'zh-TW': '海岸、峽谷天道與極光山道有了各自的彎道，天空螺旋多了大弧度彎，前五條賽道的圈與補給品也多了四成。'
        }
      },
      {
        id: 'neon-lap', kind: 'improvement', image: null,
        title: { en: 'Neon Downtown is one long 10 km lap', 'zh-TW': '霓虹市區變成 10 公里長圈' },
        description: {
          en: 'The city course now runs one big lap through eight districts. Tracks with a new layout keep a fresh set of best times.',
          'zh-TW': '城市賽道改為穿過八個街區的一大圈。換了新路線的賽道會重新記錄最佳成績。'
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
          en: 'Busy roads run more smoothly, and the music now starts before the track finishes loading.',
          'zh-TW': '車流多的路段更流暢，音樂也會在賽道載入完成前就開始播放。'
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
  {
    version: '0.29.0', date: '2026-11-03', image: null,
    video: {
      desktop: {
        src: { en: 'whats-new/garage/garage.desktop.en.mp4', 'zh-TW': 'whats-new/garage/garage.desktop.zh-TW.mp4' },
        poster: { en: 'whats-new/garage/garage.desktop.en.jpg', 'zh-TW': 'whats-new/garage/garage.desktop.zh-TW.jpg' }
      },
      mobile: {
        src: { en: 'whats-new/garage/garage.mobile.en.mp4', 'zh-TW': 'whats-new/garage/garage.mobile.zh-TW.mp4' },
        poster: { en: 'whats-new/garage/garage.mobile.en.jpg', 'zh-TW': 'whats-new/garage/garage.mobile.zh-TW.jpg' }
      }
    },
    highlights: [
      {
        id: 'garage', kind: 'new', image: null,
        title: { en: 'Try car effects free in the Garage', 'zh-TW': '車庫新增免費試用特效' },
        description: { en: 'Preview launch flares, NITRO trails and airflow, then tap Try free to use one this visit. Spin your car in Ground or Flight view and see glossier paints.', 'zh-TW': '在車庫預覽起跑閃焰、NITRO 尾跡和氣流，按「免費試用」本次就能用；可切換平地、起飛視角，車漆也更亮澤。' }
      },
      {
        id: 'eight-car-races', kind: 'new',
        image: { en: 'whats-new/eight-car-races/eight-car-races.en.webp', 'zh-TW': 'whats-new/eight-car-races/eight-car-races.zh-TW.webp' },
        title: { en: 'Eight-car races', 'zh-TW': '八車同場競速' },
        description: {
          en: 'Classic, Cup, Elimination and Circuit races now field eight cars. In the Cup, points run 10 down to 1 and later heats start in reverse finish order.',
          'zh-TW': '經典競速、錦標賽、最後倖存競速和環道競速現在都是八輛車同場。錦標賽依名次給 10 到 1 分，下一站會倒著排起跑。'
        }
      },
      {
        id: 'rivals-grab-nitro', kind: 'new',
        image: { en: 'whats-new/rival-nitro/rival-grab.en.webp', 'zh-TW': 'whats-new/rival-nitro/rival-grab.zh-TW.webp' },
        video: {
          desktop: {
            src: { en: 'whats-new/rival-nitro/rival-nitro.desktop.en.mp4', 'zh-TW': 'whats-new/rival-nitro/rival-nitro.desktop.zh-TW.mp4' },
            poster: { en: 'whats-new/rival-nitro/rival-grab.en.webp', 'zh-TW': 'whats-new/rival-nitro/rival-grab.zh-TW.webp' }
          },
          mobile: {
            src: { en: 'whats-new/rival-nitro/rival-nitro.mobile.en.mp4', 'zh-TW': 'whats-new/rival-nitro/rival-nitro.mobile.zh-TW.mp4' },
            poster: { en: 'whats-new/rival-nitro/rival-nitro.mobile.en.jpg', 'zh-TW': 'whats-new/rival-nitro/rival-nitro.mobile.zh-TW.jpg' }
          }
        },
        title: { en: 'Rivals grab NITRO too', 'zh-TW': '對手也會搶 NITRO' },
        description: {
          en: 'Rivals now grab NITRO rings and pickups and fire NITRO more often; on Hard they swerve for them. You\'ll see and hear it when one near you grabs one.',
          'zh-TW': '對手現在也會吃 NITRO 光圈和道具，也更常放 NITRO；困難難度還會換車道去搶。附近的對手吃到時，看得到也聽得到。'
        }
      },
      {
        id: 'tutorial-lessons', kind: 'new', image: null,
        title: { en: 'Three new practice lessons', 'zh-TW': '練習新增三堂課' },
        description: {
          en: 'Practice now teaches DRIFT + MINI BOOST, AIR → ROAD CHAIN and BARREL ROLL, and coaches you through a miss. Find it under Practice on Home.',
          'zh-TW': '「練習」新增甩尾與短暫加速、空地連擊、桶滾三堂課，沒成功還會教你怎麼重試。從首頁的「練習」進入。'
        }
      },
      {
        id: 'hud-styles', kind: 'new',
        image: { en: 'whats-new/hud-styles/hud-styles.en.webp', 'zh-TW': 'whats-new/hud-styles/hud-styles.zh-TW.webp' },
        title: { en: 'Pick your race HUD style', 'zh-TW': '選擇你的賽車介面' },
        description: {
          en: 'Switch between Immersive and Competitive in the VFX panel, choose which info to show, and turn NITRO READY sound or animation off.',
          'zh-TW': '在「特效」面板選擇沉浸式或競技資訊介面，自由開關排行榜、小地圖等資訊，還能關掉 NITRO 就緒提示音和動畫。'
        }
      },
      {
        id: 'more-rings-everywhere', kind: 'improvement', image: null,
        title: { en: 'Fresh rings and pickups every race', 'zh-TW': '每場比賽的光圈和道具都不同' },
        description: {
          en: 'Rings and NITRO pickups land in new spots every race and grow with the grid, with ring trains down the middle, full-width rows and pickup runs.',
          'zh-TW': '光圈和 NITRO 道具每場換位置，車數越多，數量也越多；中間車道有連串光圈，還有整排光圈和成串道具。'
        }
      },
      {
        id: 'old-layout-records', kind: 'improvement', image: null,
        title: { en: 'Your earlier times are kept', 'zh-TW': '之前的成績都會保留' },
        description: {
          en: 'Rings and pickups moved on every track, so best times and ghosts start fresh. Your earlier runs stay in History, marked OLD LAYOUT.',
          'zh-TW': '每條賽道的光圈和道具位置都變了，所以最佳成績和幽靈車會重新計算。之前的成績仍保留在歷史紀錄，並標示「舊版配置」。'
        }
      },
      {
        id: 'touch-and-layout', kind: 'improvement', image: null,
        title: { en: 'Touch layouts that fit your phone', 'zh-TW': '觸控配置更貼合手機' },
        description: { en: 'Portrait and landscape remember their own touch layouts, and each thumb cluster moves as one. Pop-ups stay off the road, and folding phones avoid the hinge.', 'zh-TW': '直式、橫式各自記住觸控配置，拇指按鈕成組移動；提示不擋路面，摺疊手機的按鈕也會避開轉軸。' }
      },
      {
        id: 'iphone-magnifier', kind: 'fix', image: null,
        title: { en: 'No more magnifier on iPhone long-presses', 'zh-TW': 'iPhone 長按不再跳出放大鏡' },
        description: { en: 'Holding the screen or a touch button on iPhone no longer pops up the magnifier, so steering, boosting and braking are never interrupted.', 'zh-TW': '在 iPhone 上按住畫面或觸控按鈕時，不會再跳出放大鏡，轉向、加速和煞車都不會被打斷。' }
      }
    ]
  },
  ...RECENT_ARCHIVED_RELEASE_NOTES,
  ...ARCHIVED_RELEASE_NOTES,
]);
