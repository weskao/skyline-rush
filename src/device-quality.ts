import { vfxSettings } from './vfx-settings.ts';
import type { VfxSettings, VfxQuality } from './vfx-settings.ts';

export const DEVICE_NOTICE_KEY = 'skyline-rush-performance-notice-v1';
export const QUALITY_STORAGE_KEY = 'skyline-rush-vfx';
export const DEVICE_MESSAGES = Object.freeze({
  en: {
    title:'Optimized for your device',
    message:'To keep races smooth, we selected {quality} graphics instead of High. You can change this any time in VFX settings.',
    dismiss:'Got it',
    level:{low:'Low',medium:'Medium'},
  },
  'zh-TW': {
    title:'已針對此裝置調整效能',
    message:'為了維持流暢的賽車體驗，已將畫質從「高」調整為「{quality}」。你隨時可以在特效設定中自行修改。',
    dismiss:'了解',
    level:{low:'低',medium:'中'},
  },
});
/**
 * Conservative initial selection; does not probe detailed GPU identifiers,
 * benchmark on the UI thread, or infer GPU speed from touchscreen alone.
 * Unavailable capability hints default to High instead of lowering fidelity.
 */
export interface DeviceHints {
  cores?: number; memoryGiB?: number; width?: number; height?: number; pixelRatio?: number;
}
export interface InitialDeviceVisuals {
  settings: VfxSettings; downgraded: boolean; automatic: boolean;
}
export function selectDeviceQuality({ cores, memoryGiB, width, height, pixelRatio = 1 }: DeviceHints = {}): VfxQuality {
  const pixelLoad = Math.max(0,Number(width)||0)*Math.max(0,Number(height)||0)
    * Math.min(Math.max(Number(pixelRatio)||1,1),2)**2;
  const weakCPU = typeof cores === 'number' && Number.isFinite(cores) && cores<=2;
  const weakMemory = typeof memoryGiB === 'number' && Number.isFinite(memoryGiB) && memoryGiB<=2;
  const moderateCPU = typeof cores === 'number' && Number.isFinite(cores) && cores<=4;
  const moderateMemory = typeof memoryGiB === 'number' && Number.isFinite(memoryGiB) && memoryGiB<=4;
  if(weakCPU||weakMemory)return 'low';
  if((moderateCPU||moderateMemory)&&pixelLoad>=1100000)return 'medium';
  if(pixelLoad>=3500000&&(moderateCPU||moderateMemory))return 'medium';
  return 'high';
}
export function initialDeviceVisuals(
  {storedSettings,device}: {storedSettings?: unknown; device?: DeviceHints} = {}
): InitialDeviceVisuals {
  if(storedSettings && typeof storedSettings==='object' && !Array.isArray(storedSettings))
    return {settings:vfxSettings(storedSettings),downgraded:false,automatic:false};
  const quality=selectDeviceQuality(device);
  const settings=vfxSettings(quality==='high'
    ? {quality:'high'}
    : {quality,preset:quality==='low'?'realistic':'cinematic',
      // Prefer no loss of geometry/material detail on a moderate device.
      bloom:quality==='medium'?.3:.12,afterimages:quality==='low'?0:2,
      motionBlur:quality==='low'?0:.12});
  return {settings,downgraded:quality!=='high',automatic:true};
}
export function noticeMessage(locale: string,quality: string): {title: string; body: string; dismiss: string} {
  const messages = locale === 'zh-TW' ? DEVICE_MESSAGES['zh-TW'] : DEVICE_MESSAGES.en;
  const level = messages.level as Record<string, string>;
  return {title:messages.title,body:messages.message.replace('{quality}',level[quality]??quality),dismiss:messages.dismiss};
}
