import { getLocale } from './i18n.ts';
import { noticeMessage, DEVICE_NOTICE_KEY } from './device-quality.ts';

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** A reduced starting quality is explained once per device; blocked storage still shows it for this page. */
export function claimNoticeOnce(downgraded: boolean, storage?: StorageLike): boolean {
  if (!downgraded) return false;
  try {
    const store = storage ?? localStorage;
    if (store.getItem(DEVICE_NOTICE_KEY) === 'shown') return false;
    store.setItem(DEVICE_NOTICE_KEY, 'shown');
  } catch { /* Still show once for this page when persistent storage is disabled. */ }
  return true;
}

export function setupPerformanceNotice({ downgraded, quality }: { downgraded: boolean; quality: string }) {
  const notice = document.querySelector<HTMLElement>('#performance-notice')!;
  const text = document.querySelector<HTMLElement>('#performance-notice-text')!;
  const title = document.querySelector<HTMLElement>('#performance-notice-title')!;
  const dismiss = document.querySelector<HTMLElement>('#performance-notice-dismiss')!;
  let dismissed = false;
  let shown = false;
  function refresh(): void {
    if (!shown) return;
    const message = noticeMessage(getLocale(), quality);
    title.textContent = message.title;
    text.textContent = message.body;
    dismiss.textContent = message.dismiss;
  }
  const hide = (): void => { notice.hidden = true; };
  dismiss.addEventListener('click', () => { dismissed = true; hide(); });
  if (claimNoticeOnce(downgraded)) {
    shown = true;
    refresh();
    notice.hidden = false;
  }
  return {
    hide,
    refresh,
    /** Bring an undismissed notice back once a dialog that covered it closes on the ready screen. */
    restore(ready: boolean): void { if (shown && !dismissed && ready) notice.hidden = false; },
  };
}
