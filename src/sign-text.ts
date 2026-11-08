// Canvas sign text: Latin keeps the generic sans-serif; zh-TW appends CJK families. The font shrinks until the text fits.
const signFont = (px: number, locale: string): string => `bold ${px}px ${locale === 'zh-TW' ? '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif' : 'sans-serif'}`;
export function fitText(context: CanvasRenderingContext2D, label: string, x: number, y: number, maxWidth: number, basePx: number, locale: string): void {
  let px = basePx;
  context.font = signFont(px, locale);
  while (px > 12 && context.measureText(label).width > maxWidth) context.font = signFont(--px, locale);
  context.fillText(label, x, y);
}
