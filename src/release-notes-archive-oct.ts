import type { ReleaseEntry } from './release-notes.ts';

// Published 0.26.0–0.28.0 entries, kept for good; release-notes-data.ts lists them between the recent ones and
// release-notes-archive.ts.
export const OCTOBER_RELEASE_NOTES: readonly ReleaseEntry[] = [
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
];
