import packageMeta from '../package.json' with { type: 'json' };
const { version } = packageMeta;

// Announcements are written for players, never generated directly from developer commits.
// This release predates the announcement feature, so its notes are manually available;
// automatic announcements start with a later release that explicitly opts in.
export const RELEASE_NOTES = Object.freeze([
  {
    version: '0.21.0', date: '2026-10-24', autoShow: false,
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
  }
]);
export const NOTES_SEEN_KEY = 'skyline-rush-whats-new-seen-v1';
export const releaseForVersion = (v = version) => RELEASE_NOTES.find(release => release.version === v) ?? null;
export const CURRENT_RELEASE = releaseForVersion();

export function shouldAnnounce(release, storage) {
  if (!release?.autoShow || !release.highlights?.length) return false;
  try { return storage?.getItem(NOTES_SEEN_KEY) !== release.version; }
  catch { return true; }
}
export function markAnnouncementSeen(release, storage) {
  if (!release) return;
  try { storage?.setItem(NOTES_SEEN_KEY, release.version); } catch { /* remembered in memory by the app */ }
}
export const releaseText = (value, locale) =>
  typeof value === 'string' ? value : (value?.[locale] ?? value?.en ?? '');

export function releaseImage(value, locale) {
  const path = releaseText(value, locale);
  return typeof path === 'string' && /^(?!\/)(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9/_.-]*\.(?:png|jpe?g|webp|avif)$/.test(path) ? path : null;
}
