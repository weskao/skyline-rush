import type { ExperienceResult } from './wave3-experience-contract.ts';
import { projectWave3DemoResults, type DemoResultView } from './wave3-demo-results-view.ts';

export type DemoResultsMount = Readonly<{
  container: HTMLElement;
  settlement: ExperienceResult | null | undefined;
  locale?: string;
  raceMode?: string;
  artworkUrl?: string | null;
  bannerUrl?: string | null;
}>;

const make = (doc: Document, tag: string, className: string, content = ''): HTMLElement => {
  const node = doc.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
};
const put = (element: HTMLElement, value: string): void => {
  if (element.textContent !== value) element.textContent = value;
};

const credited = new WeakMap<HTMLElement, ExperienceResult>();
const rollDuration = 900;

function renderCredit(credit: HTMLElement, view: DemoResultView, receipt: ExperienceResult | null | undefined): void {
  const points = credit.querySelector<HTMLElement>('.wave3-demo-results__points')!;
  const balance = credit.querySelector<HTMLElement>('.wave3-demo-results__balance')!;
  const label = balance.querySelector<HTMLElement>('.wave3-demo-results__balance-label')!;
  const value = balance.querySelector<HTMLElement>('.wave3-demo-results__balance-value')!;
  credit.hidden = points.hidden = !view.points;
  put(points, view.points ?? '');
  balance.hidden = !view.balance;
  if (!view.balance || !receipt) {
    credited.delete(credit);
    delete credit.dataset.rewardReveal;
    return;
  }

  const { label: title, from, total } = view.balance;
  put(label, title);
  balance.setAttribute('aria-label', `${title} ${total}`);
  if (credited.get(credit) === receipt) return;
  credited.set(credit, receipt);
  delete credit.dataset.rewardReveal;
  const doc = credit.ownerDocument;
  const win = doc.defaultView;
  const canAnimate = () => win && doc.body.dataset.phase === 'finished' &&
    !win.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    doc.body.dataset.vfxEnabled !== 'false' && !doc.body.classList.contains('vfx-comfort');
  if (!win || !canAnimate()) {
    put(value, String(total));
    return;
  }

  put(value, String(from));
  let started: number | undefined;
  win.requestAnimationFrame(function tick(now) {
    if (credited.get(credit) !== receipt || !credit.isConnected) return;
    const animate = canAnimate();
    // The finish sequence reveals the results overlay after the receipt is mounted.
    if (animate && started === undefined && credit.closest('[hidden]')) {
      win.requestAnimationFrame(tick);
      return;
    }
    started ??= now;
    const progress = animate ? Math.min(1, (now - started) / rollDuration) : 1;
    if (progress < 1 && credit.dataset.rewardReveal === undefined) credit.dataset.rewardReveal = '';
    const eased = 1 - (1 - progress) ** 2;
    put(value, String(from + Math.floor((total - from) * eased)));
    if (progress < 1) win.requestAnimationFrame(tick);
    else delete credit.dataset.rewardReveal;
  });
}

/** Mount inside #race-overlay .overlay-summary, after #result-style. Does not modify original result rows or buttons. */
export function mountWave3DemoResults({ container, settlement, locale, raceMode, artworkUrl, bannerUrl }: DemoResultsMount): HTMLElement {
  const view = projectWave3DemoResults(settlement, { locale, raceMode });
  let region = container.querySelector<HTMLElement>('[data-wave3-demo-results]');
  if (!region) {
    const doc = container.ownerDocument;
    region = make(doc, 'section', 'wave3-demo-results');
    region.dataset.wave3DemoResults = '';
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    const banner = make(doc, 'div', 'wave3-demo-results__banner');
    banner.hidden = true;
    const header = make(doc, 'div', 'wave3-demo-results__header');
    header.append(make(doc, 'span', 'wave3-demo-results__mark', '✦'), make(doc, 'h3', 'wave3-demo-results__heading'));
    const status = make(doc, 'p', 'wave3-demo-results__status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const credit = make(doc, 'div', 'wave3-demo-results__credit');
    const balance = make(doc, 'div', 'wave3-demo-results__balance');
    balance.setAttribute('role', 'group');
    const label = make(doc, 'span', 'wave3-demo-results__balance-label');
    const value = make(doc, 'strong', 'wave3-demo-results__balance-value');
    label.setAttribute('aria-hidden', 'true');
    value.setAttribute('aria-hidden', 'true');
    balance.append(label, value);
    credit.append(make(doc, 'p', 'wave3-demo-results__points'), balance);
    const progress = make(doc, 'div', 'wave3-demo-results__missions');
    const distinction = make(doc, 'p', 'wave3-demo-results__distinction');
    const disclaimer = make(doc, 'p', 'wave3-demo-results__disclaimer');
    region.append(banner, header, status, credit, progress, distinction, disclaimer);
    container.append(region);
  }
  region.className = `wave3-demo-results wave3-demo-results--${view.state}`;
  region.setAttribute('aria-label', view.heading);
  put(region.querySelector<HTMLElement>('.wave3-demo-results__heading')!, view.heading);
  put(region.querySelector<HTMLElement>('.wave3-demo-results__status')!, view.status);
  renderCredit(region.querySelector<HTMLElement>('.wave3-demo-results__credit')!, view, settlement);
  put(region.querySelector<HTMLElement>('.wave3-demo-results__distinction')!, view.distinction);
  put(region.querySelector<HTMLElement>('.wave3-demo-results__disclaimer')!, view.disclaimer);
  const missions = region.querySelector<HTMLElement>('.wave3-demo-results__missions')!;
  const signature = JSON.stringify([view.progressHeading, view.missions]);
  if (missions.dataset.summary !== signature) {
    missions.dataset.summary = signature;
    const doc = container.ownerDocument;
    const nodes: HTMLElement[] = [];
    if (view.missions.length) nodes.push(make(doc, 'h4', 'wave3-demo-results__progress-title', view.progressHeading));
    for (const mission of view.missions) {
      const row = make(doc, 'div', 'wave3-demo-results__mission');
      const label = make(doc, 'span', 'wave3-demo-results__mission-label', mission.description);
      const progress = doc.createElement('progress');
      progress.value = mission.progress;
      progress.max = mission.goal;
      progress.setAttribute('aria-label', mission.description);
      row.append(label, progress);
      nodes.push(row);
    }
    missions.replaceChildren(...nodes);
  }
  // A-06 is purely decorative and never shown for duplicate, ineligible or unverified receipts.
  const banner = region.querySelector<HTMLElement>('.wave3-demo-results__banner')!;
  const showBanner = view.state === 'earned' && !!bannerUrl;
  banner.hidden = !showBanner;
  const previousBanner = banner.querySelector<HTMLImageElement>('img');
  if (!showBanner) previousBanner?.remove();
  else if (!previousBanner || previousBanner.getAttribute('src') !== bannerUrl) {
    previousBanner?.remove();
    const image = container.ownerDocument.createElement('img');
    image.src = bannerUrl!;
    image.alt = '';
    image.decoding = 'async';
    image.addEventListener('error', () => { image.remove(); banner.hidden = true; });
    banner.append(image);
  }
  // Image is decorative and optional. A visible CSS/text glyph remains if it fails to load.
  const mark = region.querySelector<HTMLElement>('.wave3-demo-results__mark')!;
  const current = mark.querySelector<HTMLImageElement>('img');
  if (!artworkUrl || current?.getAttribute('src') !== artworkUrl) {
    current?.remove();
    if (artworkUrl) {
      const img = container.ownerDocument.createElement('img');
      img.src = artworkUrl;
      img.alt = '';
      img.decoding = 'async';
      img.addEventListener('error', () => img.remove());
      mark.append(img);
    }
  }
  return region;
}
