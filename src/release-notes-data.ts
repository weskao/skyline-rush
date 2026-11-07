import type { ReleaseEntry } from './release-notes.ts';
import { ARCHIVED_RELEASE_NOTES } from './release-notes-archive.ts';

// Announcements are written for players, never generated directly from developer commits.
// Every published version keeps its entry (and any image under public/) for good, older ones in
// release-notes-archive.ts; the dialog only shows the newest RECENT_RELEASE_LIMIT of them. scripts/check-release-notes.mjs
// stops a release whose version has no entry. The coming release is written as `version: UPCOMING`, never a number:
// it shows as upcoming until the release commit bumps package.json, which names it (resolveUpcoming in release-notes.ts).
export const UPCOMING = 'upcoming';
export const RELEASE_NOTES: readonly ReleaseEntry[] = Object.freeze([
  {
    version: UPCOMING, date: '2026-11-07', image: null,
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
          en: 'Each lesson waits until you do the move, you can skip a single step, and an endless practice road lets you repeat it.',
          'zh-TW': '每堂課要做出動作才會過關，可以跳過單一步驟，還有無盡練習路可反覆練習。'
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
        id: 'results-cloud', kind: 'new', image: null,
        title: { en: 'Results tell you if your race reached the cloud', 'zh-TW': '成績畫面顯示雲端同步狀態' },
        description: {
          en: 'The results screen shows whether your race is saved to the cloud, or invites you to sign in to back it up.',
          'zh-TW': '成績畫面會顯示這場比賽是否已同步到雲端，未登入時可直接登入備份。'
        }
      },
      {
        id: 'ring-lanes', kind: 'improvement', image: null,
        title: { en: 'Rings change lanes on every track', 'zh-TW': '每條賽道的圈位置都不同' },
        description: {
          en: 'Rings now weave across lanes instead of repeating one pattern, so each track plays differently.',
          'zh-TW': '圈會在不同車道間穿梭，不再重複同一種排法。'
        }
      },
      {
        id: 'minimap-arrow', kind: 'improvement', image: null,
        title: { en: 'Your minimap marker shows where you are heading', 'zh-TW': '小地圖標記會指出行進方向' },
        description: {
          en: 'A glowing arrow on the route map points the way you are driving.',
          'zh-TW': '路線小地圖上有發光箭頭，指出你正往哪個方向開。'
        }
      },
      {
        id: 'race-screen', kind: 'improvement', image: null,
        title: { en: 'A tidier race screen', 'zh-TW': '更清爽的比賽畫面' },
        description: {
          en: 'The phone leaderboard and placement are more compact, and race progress and chips sit at the screen edges.',
          'zh-TW': '手機的排行榜與名次更精簡，賽程進度和提示條移到畫面邊緣。'
        }
      },
      {
        id: 'fair-rivals', kind: 'improvement', image: null,
        title: { en: 'Rivals now race by your rules', 'zh-TW': '對手改用和你相同的規則' },
        description: {
          en: 'Rivals no longer get hidden speed advantages: they build speed, BOOST and NITRO the way you do, so Classic is a fairer fight.',
          'zh-TW': '對手不再有隱藏的速度優勢，加速、BOOST 和 NITRO 都和你一樣，經典賽更公平。'
        }
      },
      {
        id: 'friendlier-rivals', kind: 'improvement', image: null,
        title: { en: 'Friendlier rivals on Normal and early tracks', 'zh-TW': '新手更容易跟上對手' },
        description: {
          en: 'Rivals on the first two tracks and on Normal are a little easier to keep up with, so newer racers can finish near the front.',
          'zh-TW': '前兩條賽道與普通難度的對手稍微放慢，新手也能衝到前段。'
        }
      },
      {
        id: 'fly-at-go', kind: 'fix', image: null,
        title: { en: 'FLY and BOOST answer the moment GO appears', 'zh-TW': 'GO 一出現就能起飛' },
        description: {
          en: 'Cars now leave the countdown already rolling, so FLY and BOOST respond right when GO shows.',
          'zh-TW': '車輛起跑時就已經在前進，GO 出現的瞬間按 FLY 和 BOOST 就有反應。'
        }
      },
      {
        id: 'air-callouts', kind: 'fix', image: null,
        title: { en: 'Air tricks always show their callout', 'zh-TW': '空中特技一定會顯示提示' },
        description: {
          en: 'Barrel rolls and other air tricks now announce themselves even while smaller messages are on screen.',
          'zh-TW': '桶滾等空中特技即使畫面上有其他小提示，也會顯示出來。'
        }
      },
      {
        id: 'landscape-panels', kind: 'fix', image: null,
        title: { en: 'Pause and results fit phones held sideways', 'zh-TW': '橫放手機也看得到完整面板' },
        description: {
          en: 'The pause and results panels now fit a landscape phone without scrolling, and the NEXT button stays inside its column.',
          'zh-TW': '暫停和成績面板在橫放手機上不用捲動就能看完，NEXT 按鈕也不再超出欄位。'
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
  {
    version: '0.28.0', date: '2026-10-31', image: null,
    highlights: [
      {
        id: 'endless-every-road', kind: 'new', image: null,
        title: { en: 'Endless Highway on every road', 'zh-TW': '無盡公路，每條賽道都能跑' },
        description: {
          en: 'Keep driving past the old finish line on all ten roads. New scenery keeps appearing ahead of you, and Sky Spiral\'s loops simply carry on.',
          'zh-TW': '十條賽道都能一路開過原本的終點線，前方的風景會不斷出現，天空螺旋的環道也會一圈接著一圈延伸下去。'
        }
      },
      {
        id: 'sky-spiral-landmarks', kind: 'improvement', image: null,
        title: { en: 'Smoother Sky Spiral scenery', 'zh-TW': '天空螺旋的風景更自然' },
        description: {
          en: 'Sky Spiral landmarks now fade in softly instead of popping into view, and look the same every time the spiral loops around.',
          'zh-TW': '天空螺旋的地標會柔和浮現，不再突然冒出來；螺旋繞到下一圈時，看起來也始終一致。'
        }
      },
      {
        id: 'barrel-roll-wake', kind: 'new', image: null,
        title: { en: 'Barrel rolls leave a swirling trail', 'zh-TW': '翻滾時拖出旋轉氣流' },
        description: {
          en: 'Pull off a barrel roll and a swirl of air trails behind your car, so every roll looks as dramatic as it feels.',
          'zh-TW': '做出翻滾時，車後會拖出一道旋轉的氣流，讓每一次翻滾都更有看頭。'
        }
      },
      {
        id: 'iphone-touch-release', kind: 'fix', image: null,
        title: { en: 'iPhone touch controls let go reliably', 'zh-TW': 'iPhone 觸控按鈕能確實放開' },
        description: {
          en: 'On iPhone, lifting your finger now reliably releases a touch control, so your car no longer keeps steering or accelerating by itself.',
          'zh-TW': '在 iPhone 上，手指一離開螢幕，觸控按鈕就會確實放開，車子不會再自己持續轉向或加速。'
        }
      }
    ]
  },
  {
    version: '0.27.0', date: '2026-10-30', image: null,
    highlights: [
      {
        id: 'free-drive-road-end', kind: 'fix', image: null,
        title: { en: 'Free Drive now ends at the road end', 'zh-TW': '自由駕駛開到路的盡頭就會結束' },
        description: {
          en: 'You no longer get stuck at the end of the road. Free Drive now finishes there and shows your time. It\'s just practice, so it won\'t count toward your records.',
          'zh-TW': '再也不會卡在路的盡頭。自由駕駛開到終點就會結束並顯示你的時間，這只是練習，不會計入你的紀錄。'
        }
      },
      {
        id: 'no-frozen-screen', kind: 'fix', image: null,
        title: { en: 'The game keeps going after a hiccup', 'zh-TW': '遇到小狀況，遊戲也不會當住' },
        description: {
          en: 'If something glitches, the screen keeps moving and the buttons keep working, so you can tap Race again without reloading the page.',
          'zh-TW': '就算偶爾出了點狀況，畫面還是會繼續動、按鈕也都能按，不用重新整理頁面，就能直接點「再跑一次」。'
        }
      },
      {
        id: 'whats-new-enlarge', kind: 'improvement', image: null,
        title: { en: 'See What\'s New pictures in full', 'zh-TW': '「新功能」的圖片可以完整放大看' },
        description: {
          en: 'Pictures and clips in What\'s New can now be opened bigger and shown in full, on any screen. Tap or click anywhere, or press Esc, to close.',
          'zh-TW': '「新功能」裡的圖片和影片可以點開放大，完整呈現不被裁切，在各種螢幕上都能用。點畫面任何地方或按 Esc 就能關閉。'
        }
      }
    ]
  },
  {
    version: '0.26.0', date: '2026-10-30', image: null,
    video: {
      desktop: {
        src: { en: 'whats-new/0.26.0/themed-hazards.desktop.en.mp4', 'zh-TW': 'whats-new/0.26.0/themed-hazards.desktop.zh-TW.mp4' },
        poster: { en: 'whats-new/0.26.0/themed-hazards.desktop.en.jpg', 'zh-TW': 'whats-new/0.26.0/themed-hazards.desktop.zh-TW.jpg' }
      },
      mobile: {
        src: { en: 'whats-new/0.26.0/themed-hazards.mobile.en.mp4', 'zh-TW': 'whats-new/0.26.0/themed-hazards.mobile.zh-TW.mp4' },
        poster: { en: 'whats-new/0.26.0/themed-hazards.mobile.en.jpg', 'zh-TW': 'whats-new/0.26.0/themed-hazards.mobile.zh-TW.jpg' }
      }
    },
    highlights: [
      {
        id: 'themed-hazards', kind: 'new', image: null,
        title: { en: 'Every road gets its own hazards', 'zh-TW': '每條賽道都有專屬障礙' },
        description: {
          en: 'Switch on Themed track hazards in Free Drive, Custom Race or Obstacle Run for Neon roadworks, Canyon rockfalls, Aurora ice and more. Ice also shows stripes.',
          'zh-TW': '在自由駕駛、自訂競速或障礙挑戰開啟「賽道主題障礙」：霓虹路障、峽谷落石、極光冰面等，接近前會提醒，冰面另有條紋標示。'
        }
      },
      {
        id: 'circuit-endless', kind: 'new',
        image: { en: 'whats-new/0.26.0/new-modes.en.webp', 'zh-TW': 'whats-new/0.26.0/new-modes.zh-TW.webp' },
        title: { en: 'Circuit Race and Endless Highway', 'zh-TW': '環道競速與無盡公路' },
        description: {
          en: 'Race real laps on a closed loop and set lap records, or drive Endless Highway along the Coast until your fifth crash.',
          'zh-TW': '在封閉環道跑出真正的一圈圈並刷新單圈紀錄，或在海岸的無盡公路一路開到第五次碰撞為止。'
        }
      },
      {
        id: 'event-lab', kind: 'new',
        image: { en: 'whats-new/0.26.0/event-lab.en.webp', 'zh-TW': 'whats-new/0.26.0/event-lab.zh-TW.webp' },
        title: { en: 'Build your own course in Event Lab', 'zh-TW': '賽道工坊：自己設計賽道' },
        description: {
          en: 'Place barriers, cones, pickups, checkpoints and jump ramps or start from a template, then race your course and keep a personal best for it.',
          'zh-TW': '擺放路障、三角錐、補給、檢查點和跳台，或從樣板開始，再親自上路，替這條賽道留下個人紀錄。'
        }
      },
      {
        id: 'challenge-medals', kind: 'new', image: null,
        title: { en: 'Five personal challenge medals', 'zh-TW': '五枚個人挑戰勳章' },
        description: {
          en: 'Earn medals for a clean time trial, a long flight, an aerial chain and more. They are kept apart from your Career medals.',
          'zh-TW': '完成零碰撞計時、長時間飛行、空中連鎖等挑戰就能獲得勳章，與生涯勳章分開收藏。'
        }
      },
      {
        id: 'high-refresh', kind: 'new', image: null,
        title: { en: 'Up to 120 FPS on fast screens', 'zh-TW': '高刷新螢幕最高 120 FPS' },
        description: {
          en: 'On 90 Hz and 120 Hz displays you can now pick 90 or 120 FPS in the VFX menu, and Auto steps up when your device keeps up.',
          'zh-TW': '在 90 或 120 Hz 螢幕上，可在「特效」選單選 90 或 120 FPS；裝置效能足夠時，「自動」也會調高。'
        }
      },
      {
        id: 'mode-first', kind: 'improvement', image: null,
        title: { en: 'Pick your mode first', 'zh-TW': '先選模式，再選賽道' },
        description: {
          en: 'Choose a mode, then a track, then tweak its rules. Restore defaults is one tap away, and each mode shows which rules it keeps fixed.',
          'zh-TW': '先選模式、再選賽道，最後調整規則；一鍵就能恢復預設，也會標示各模式固定不變的規則。'
        }
      },
      {
        id: 'power-ups', kind: 'improvement',
        image: 'whats-new/0.26.0/magnet-range.webp',
        title: { en: 'Power-ups you can see and hear', 'zh-TW': '道具效果看得見也聽得到' },
        description: {
          en: 'The magnet shows its pickup range, a blocked hit flashes your shield, a new EMP item joins the mix, and Stunt and Checkpoint races can add bonus gates.',
          'zh-TW': '磁鐵會顯示吸取範圍，護盾擋下撞擊時會閃爍，還新增電磁脈衝道具；極限特技與限時計時關卡也能開啟獎勵圓環。'
        }
      },
      {
        id: 'livelier-roadsides', kind: 'improvement',
        image: 'whats-new/0.26.0/world-tour-scenery.webp',
        title: { en: 'Livelier roadsides', 'zh-TW': '路邊風景更熱鬧' },
        description: {
          en: 'World Tour roads gain roadside details, moving backdrops, sea spray and blinking skyline beacons, and classic tracks add billboards and stands.',
          'zh-TW': '世界巡迴賽道多了路邊細節、會動的遠景、海浪水花和閃爍的高樓警示燈；經典賽道也新增看板與觀眾席。'
        }
      },
      {
        id: 'cup-resume', kind: 'improvement', image: null,
        title: { en: 'Resume an interrupted Cup', 'zh-TW': '錦標賽中斷也能接續' },
        description: {
          en: 'If a Championship Cup is cut short, you can carry on from the heat you were on and keep the heats you already finished.',
          'zh-TW': '錦標賽若中途中斷，可以從當時那一站接著比，已完成各站的成績都會保留。'
        }
      },
      {
        id: 'hud-every-screen', kind: 'fix', image: null,
        title: { en: 'Race screen fits every phone', 'zh-TW': '比賽畫面在各種手機都排得好' },
        description: {
          en: 'Race readouts, the route map and item buttons no longer overlap on small phones, landscape phones or tablets.',
          'zh-TW': '在小手機、橫向手機和平板上，比賽數據、路線小地圖與道具按鈕不再互相重疊。'
        }
      }
    ]
  },
  ...ARCHIVED_RELEASE_NOTES,
]);
