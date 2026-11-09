import type { ExperienceSnapshot } from './wave3-experience-contract.ts';
export const WAVE3_DEMO_ITEMS: readonly { id: string; category: string; name: { en: string; 'zh-TW': string }; demoPrice: number | null }[] = [];
export const WAVE3_DEMO_STORE_ART: readonly string[] = [];
export function findDemoItem(_id: unknown) { return null; }
export function demoItemStatus(_id: string, _snapshot: ExperienceSnapshot, _access?: unknown, _now?: number) { return 'locked'; }
export function demoRedemptionState(_id: string, _snapshot: ExperienceSnapshot) { return 'invalid'; }
export function canEquipDemoPreview(_id: string, _snapshot: ExperienceSnapshot) { return false; }
