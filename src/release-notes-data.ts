import type { ReleaseEntry } from './release-notes.ts';
import { ARCHIVED_RELEASE_NOTES } from './release-notes-archive.ts';

// Announcements are written for players, never generated directly from developer commits.
// Every published version keeps its entry (and any image under public/) for good, older ones in
// release-notes-archive.ts; the dialog only shows the newest RECENT_RELEASE_LIMIT of them. scripts/check-release-notes.mjs
// stops a release whose version has no entry.
export const RELEASE_NOTES: readonly ReleaseEntry[] = Object.freeze([
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
