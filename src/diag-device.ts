// Device, browser, screen and GPU facts for the diag relay, so a remote log names the phone it came from.
// Diagnostic builds only (VITE_DIAG): loaded by src/diag-relay.ts, never by production.

// Order matters: Edge, Samsung and Opera UAs also carry a Chrome token; every iOS browser carries Safari.
const BROWSERS: [string, RegExp][] = [
  ['Edge', /Edg(?:iOS|A)?\/([\d.]+)/], ['Samsung Internet', /SamsungBrowser\/([\d.]+)/], ['Opera', /(?:OPR|OPiOS)\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/], ['Chrome', /(?:CriOS|Chrome)\/([\d.]+)/], ['Safari', /Version\/([\d.]+).*Safari/],
];

/** Device class, OS and browser with versions. iPadOS asks for desktop sites with a Mac UA, so touch points tell it apart. */
export function summarizeUserAgent(ua: string, touchPoints: number): { device: string; os: string; browser: string } {
  const ios = /\((iPhone|iPad|iPod);[^)]*? OS (\d+(?:_\d+)*)/.exec(ua);
  const android = /Android (\d+(?:\.\d+)*)/.exec(ua);
  const mac = /Macintosh/.test(ua);
  const [device, os] = ios ? [ios[1], `iOS ${ios[2].replace(/_/g, '.')}`]
    : android ? [`Android ${/Mobile/.test(ua) ? 'phone' : 'tablet'}`, `Android ${android[1]}`]
    : mac && touchPoints > 1 ? ['iPad', 'iPadOS (desktop UA)']
    : ['desktop', mac ? 'macOS' : /Windows NT [\d.]+/.exec(ua)?.[0] ?? (/Linux|CrOS/.test(ua) ? 'Linux' : 'unknown')];
  const match = BROWSERS.map(([name, pattern]) => [name, pattern.exec(ua)?.[1]] as const).find(([, version]) => version);
  // Safari 26+ freezes the UA's iOS at 18.x; its own version tracks the real iOS, so report that and keep the UA value.
  const frozen = ios && match?.[0] === 'Safari' && parseInt(match[1] ?? '', 10) > parseInt(ios[2], 10);
  return { device, os: frozen ? `iOS ${match[1]} (UA says ${os.slice(4)})` : os, browser:match ? `${match[0]} ${match[1]}` : ios ? 'WebKit in-app' : 'unknown' };
}

interface NavigatorHints { deviceMemory?: number; standalone?: boolean; connection?: { effectiveType?: string; saveData?: boolean };
  userAgentData?: { getHighEntropyValues?(hints: string[]): Promise<Record<string, unknown>> } }

export const viewportOf = (win: Window) => ({
  width: win.innerWidth, height: win.innerHeight, dpr: win.devicePixelRatio, orientation: win.screen.orientation?.type,
  visualWidth: win.visualViewport?.width, visualHeight: win.visualViewport?.height, scale: win.visualViewport?.scale,
  home: homeLayoutOf(win.document),
});

const box = (el: Element | null) => { const r = el?.getBoundingClientRect(); return r && [r.x, r.y, r.width, r.height].map(Math.round); };

/** Where the home's Start and rail really are versus the dynamic viewport and safe areas (a toolbar may cover the page). */
function homeLayoutOf(doc: Document): Record<string, unknown> {
  const probe = doc.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:100dvw;height:100dvh;visibility:hidden;pointer-events:none;'
    + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  doc.body.append(probe);
  const cs = getComputedStyle(probe), start = doc.querySelector('#start-button'), r = start?.getBoundingClientRect();
  const hit = r && doc.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  const facts = { dvw: probe.offsetWidth, dvh: probe.offsetHeight, client: [doc.documentElement.clientWidth, doc.documentElement.clientHeight],
    safe: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat),
    scale: getComputedStyle(doc.documentElement).getPropertyValue('--home-scale'), introZoom: doc.querySelector('#intro') && getComputedStyle(doc.querySelector('#intro')!).zoom,
    start: box(start), intro: box(doc.querySelector('#intro')), daily: box(doc.querySelector('#daily-card')),
    startHit: hit ? (start?.contains(hit) ? 'start' : `${hit.tagName}#${hit.id}.${hit.className}`) : null };
  probe.remove();
  return facts;
}

function webglInfo(doc: Document): Record<string, unknown> {
  try {
    const gl = doc.createElement('canvas').getContext('webgl');
    if (!gl) return { available: false };
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const info = {
      available: true, version: gl.getParameter(gl.VERSION), maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      vendor: gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
    };
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // frees the probe context; iOS caps live contexts
    return info;
  } catch { return { available: false }; }
}

/** One-off snapshot at page load. Hints that a browser withholds (deviceMemory on Safari) stay undefined. */
export function describeDevice(win: Window): Record<string, unknown> {
  const nav = win.navigator as Navigator & NavigatorHints, { screen } = win;
  return {
    ...summarizeUserAgent(nav.userAgent, nav.maxTouchPoints), userAgent: nav.userAgent,
    screen: { width: screen.width, height: screen.height, availWidth: screen.availWidth, availHeight: screen.availHeight, colorDepth: screen.colorDepth },
    viewport: viewportOf(win),
    standalone: win.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
    touchPoints: nav.maxTouchPoints, cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory,
    connection: nav.connection && { type: nav.connection.effectiveType, saveData: nav.connection.saveData },
    language: nav.language, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    darkMode: win.matchMedia('(prefers-color-scheme: dark)').matches, reducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)').matches,
    secureContext: win.isSecureContext, webgl: webglInfo(win.document),
  };
}

/** Chromium's exact model and OS version (e.g. "Pixel 8", Android 14). Secure contexts only, so plain-HTTP Tailscale URLs get none. */
export async function deviceHints(win: Window): Promise<Record<string, unknown> | undefined> {
  try {
    return await (win.navigator as Navigator & NavigatorHints).userAgentData?.getHighEntropyValues?.(['model', 'platform', 'platformVersion', 'architecture', 'fullVersionList']);
  } catch { return undefined; }
}
