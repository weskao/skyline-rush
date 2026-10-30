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
    version: UPCOMING, date: '2026-10-30', image: null,
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
  {
    version: '0.25.0', date: '2026-10-28', image: null,
    highlights: [
      {
        id: 'iphone-haptics', kind: 'new', image: null,
        title: { en: 'Feel the race on iPhone', 'zh-TW': 'iPhone 也能感受震動回饋' },
        description: {
          en: 'On iPhones with iOS 18 or newer, bumps, boosts and trick payouts now give a small tap you can feel. Older iPhones stay silent, and Android keeps its usual buzz.',
          'zh-TW': 'iOS 18 以上的 iPhone，撞擊、加速和特技獎勵現在都會輕輕震動。較舊的 iPhone 不會震動，Android 維持原樣。'
        }
      },
      {
        id: 'showcase-camera-views', kind: 'fix', image: null,
        title: { en: 'Home camera views show the right side', 'zh-TW': '首頁視角現在看對方向了' },
        description: {
          en: 'On the home screen, Front, Rear, Left and Right now show your car from the side they name, and Orbit circles it steadily.',
          'zh-TW': '首頁的前、後、左、右視角現在會從對應的那一側看你的車，環繞視角也會穩穩地繞著車子轉。'
        }
      },
      {
        id: 'coast-lighting', kind: 'improvement', image: null,
        title: { en: 'Warmer lighting on Coast', 'zh-TW': '海岸公路光線更溫暖' },
        description: {
          en: 'Racing on Coast has its warmer lighting back.',
          'zh-TW': '在海岸公路比賽時，畫面的光線又恢復溫暖的色調了。'
        }
      },
      {
        id: 'phone-airflow-readout', kind: 'fix', image: null,
        title: { en: 'AIRFLOW readouts stay clear of your car', 'zh-TW': '手機上的氣流數據不再擋車' },
        description: {
          en: 'With AIRFLOW on, the readouts on phones now sit above your car on the home screen instead of covering it.',
          'zh-TW': '開啟氣流後，手機首頁的即時數據會移到車子上方，不再擋住車子。'
        }
      }
    ]
  },
  {
    version: '0.24.0', date: '2026-10-28', image: null,
    video: {
      desktop: {
        src: { en: 'whats-new/0.24.0/air-road-chain.desktop.en.mp4', 'zh-TW': 'whats-new/0.24.0/air-road-chain.desktop.zh-TW.mp4' },
        poster: { en: 'whats-new/0.24.0/air-road-chain.desktop.en.jpg', 'zh-TW': 'whats-new/0.24.0/air-road-chain.desktop.zh-TW.jpg' }
      },
      mobile: {
        src: { en: 'whats-new/0.24.0/air-road-chain.mobile.en.mp4', 'zh-TW': 'whats-new/0.24.0/air-road-chain.mobile.zh-TW.mp4' },
        poster: { en: 'whats-new/0.24.0/air-road-chain.mobile.en.jpg', 'zh-TW': 'whats-new/0.24.0/air-road-chain.mobile.zh-TW.jpg' }
      }
    },
    highlights: [
      {
        id: 'air-road-chain', kind: 'new', image: null,
        title: { en: 'AIR → ROAD CHAIN: land it for extra speed', 'zh-TW': '空地連擊：漂亮落地再加速' },
        description: {
          en: 'Fly with BOOST or NITRO, then land smoothly for an extra burst of speed, with blue sparks and its own sound. Flying also uses less charge.',
          'zh-TW': '飛行時開 BOOST 或 NITRO，再平穩落地，就能多衝一段加速，還有藍色火花和專屬音效。飛行也更省電量。'
        }
      },
      {
        id: 'rings-supplies-guide', kind: 'new', image: null,
        title: { en: 'A guide to rings and pickups', 'zh-TW': '光圈與補給圖鑑' },
        description: {
          en: 'How to play now has a Rings & Supplies tab that explains rings, road pickups and mystery items, so you know what each one does before you grab it.',
          'zh-TW': '操作教學新增「光圈與補給」分頁，介紹各種光圈、路面補給和神秘道具，吃到之前就知道它們的效果。'
        }
      },
      {
        id: 'target-fps', kind: 'new', image: null,
        title: { en: 'Pick your frame rate', 'zh-TW': '自選畫面幀率' },
        description: {
          en: 'Choose Auto, 30 or 60 FPS from the VFX menu. Auto adjusts itself when the screen gets busy, and the race itself plays the same at every setting.',
          'zh-TW': '在「特效」選單可選自動、30 或 60 FPS。自動會在畫面繁忙時自行調整；不論選哪個，比賽本身的表現都一樣。'
        }
      },
      {
        id: 'first-five-scenery', kind: 'improvement', image: null,
        title: { en: 'Richer scenery and a clearer Sky Spiral map', 'zh-TW': '賽道風景更豐富，天際螺旋地圖更清楚' },
        description: {
          en: 'Coast, Neon Downtown, Canyon Skyway and Aurora Pass get richer scenery and their own road surfaces, and the Sky Spiral map shows where the road climbs.',
          'zh-TW': '海岸公路、霓虹都會、峽谷天橋和極光山道的風景更豐富，各有專屬路面；天際螺旋的地圖也會標出道路爬升處。'
        }
      },
      {
        id: 'touch-taps', kind: 'fix', image: null,
        title: { en: 'Easier taps on phones', 'zh-TW': '手機更好點按' },
        description: {
          en: 'Small buttons on touch screens are easier to hit, tutorial tips no longer cover the buttons beside them, and volume sliders show the level as you drag.',
          'zh-TW': '觸控螢幕上的小按鈕更容易點中，教學提示不再擋住旁邊的按鈕，音量滑桿拖曳時也會即時顯示大小。'
        }
      }
    ]
  },
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
  ...ARCHIVED_RELEASE_NOTES,
]);
