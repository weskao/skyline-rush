import type { ReleaseEntry } from './release-notes.ts';

// Published entries moved out of release-notes-data.ts to keep it under 400 lines; release-notes-data.ts lists them
// before release-notes-archive-recent.ts, and the dialog picks its newest five from the combined list.
export const NEWER_ARCHIVED_RELEASE_NOTES: readonly ReleaseEntry[] = [
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
];
