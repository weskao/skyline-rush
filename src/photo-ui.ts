import { t } from './i18n.ts';
import { photoFilename } from './photo-export.ts';

interface PhotoWorld {
  setPhotoView(view: { angle: number; fov: number; sky: string } | null): void;
  capturePhoto(): Promise<Blob>;
}
interface PhotoOptions {
  getRace(): { mode: string; phase: string; trackId: string };
  getWorld(): PhotoWorld | null | undefined;
  cue(name: string): void;
}

/** Free Roam photo mode: opens from the pause screen, frames the car and saves a PNG. */
export function setupPhotoUI({ getRace, getWorld, cue }: PhotoOptions): void {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const photoDialog = $<HTMLDialogElement>('#photo-screen');
  const status = $('#photo-status');
  const updatePhotoView = (): void => getWorld()?.setPhotoView({
    angle: Number($<HTMLInputElement>('#photo-orbit').value), fov: Number($<HTMLInputElement>('#photo-fov').value),
    sky: $<HTMLSelectElement>('#photo-sky').value,
  });
  $('#photo-open').addEventListener('click', () => {
    const race = getRace();
    if (race.mode !== 'free' || race.phase !== 'paused' || !getWorld()) return;
    updatePhotoView();
    photoDialog.showModal();
    status.textContent = t('photo.status');
    cue('ui');
  });
  for (const id of ['photo-orbit', 'photo-fov', 'photo-sky']) $('#' + id).addEventListener('input', updatePhotoView);
  $('#photo-close').addEventListener('click', () => photoDialog.close());
  photoDialog.addEventListener('close', () => { getWorld()?.setPhotoView(null); cue('ui'); });
  $<HTMLButtonElement>('#photo-save').addEventListener('click', async ({ currentTarget }) => {
    const button = currentTarget as HTMLButtonElement; button.disabled = true;
    try {
      const blob = await getWorld()!.capturePhoto();
      const url = URL.createObjectURL(blob);
      const download = document.createElement('a');
      download.href = url; download.download = photoFilename(getRace().trackId);
      download.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      status.textContent = t('photo.ready');
      cue('photo');
    } catch { status.textContent = t('photo.error'); }
    finally { button.disabled = false; }
  });
}
