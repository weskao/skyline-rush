import { CanvasTexture, DoubleSide, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { SECTION_SIGN_LABELS } from './section-signs.ts';
import { fitText } from './sign-text.ts';
import { t } from './i18n.ts';

/** One painted canvas texture + material per section sign type; `signPaints` repaint them when the locale changes. */
export function createSectionSignMaterials() {
  const signTextures: CanvasTexture[] = [];
  const signPaints: Array<(locale: string) => void> = [];
  const signs = Object.fromEntries(Object.keys(SECTION_SIGN_LABELS).map(type => {
    const sign = document.createElement('canvas'); sign.width = 512; sign.height = 96;
    const context = sign.getContext('2d')!;
    const texture = new CanvasTexture(sign); texture.colorSpace = SRGBColorSpace; signTextures.push(texture);
    signPaints.push(locale => {
      context.fillStyle = '#142334'; context.fillRect(0, 0, 512, 96);
      context.strokeStyle = '#ffc36f'; context.lineWidth = 8; context.strokeRect(4, 4, 504, 88);
      context.fillStyle = '#fff1d6'; context.textAlign = 'center';
      fitText(context, t(`sign.${type}`, undefined, locale), 256, 58, 472, 27, locale);
      texture.needsUpdate = true;
    });
    return [type, new MeshBasicMaterial({ map: texture, side: DoubleSide })];
  }));
  return { signs: signs as Record<string, MeshBasicMaterial>, signTextures, signPaints };
}
