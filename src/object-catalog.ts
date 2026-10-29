// ENV-01: one table says which track objects are visual-only scenery and which
// ones the simulation resolves. Renderers may draw anything; only gameplay
// entries carry a hitbox, so scenery can never become solid by accident.

export const GAMEPLAY_TYPES = ['barrier', 'cone', 'gate', 'ring', 'pickup', 'checkpoint', 'energy-barrier',
  'debris', 'gust', 'terrain', 'rail-crossing', 'branch-marker'] as const;
export const SCENERY_TYPES = ['building', 'crowd', 'parked-train', 'sign', 'lamp', 'spaceship'] as const;

export type GameplayType = typeof GAMEPLAY_TYPES[number];
export type SceneryType = typeof SCENERY_TYPES[number];
export type ObjectType = GameplayType | SceneryType;

/** Drawn footprint in metres, for placement and overlap checks; contact reach stays in the simulation. */
export interface Hitbox { readonly halfWidth: number; readonly halfLength: number; readonly height: number }
/** block = knock on contact, collect = consumed reward, trigger = pass detection, push/slow = steering/speed effect. */
export type GameplayEffect = 'block' | 'collect' | 'trigger' | 'push' | 'slow';
/** ground: altitude is the base and height grows up; center: altitude is the middle (rings, as game.js measures them). */
export type HitboxAnchor = 'ground' | 'center';
export interface GameplayEntry { readonly role: 'gameplay'; readonly effect: GameplayEffect; readonly hitbox: Hitbox; readonly anchor: HitboxAnchor }
export interface SceneryEntry { readonly role: 'scenery' }

const gameplay = (effect: GameplayEffect, halfWidth: number, halfLength: number, height: number, anchor: HitboxAnchor = 'ground'): GameplayEntry =>
  Object.freeze({ role: 'gameplay', effect, hitbox: Object.freeze({ halfWidth, halfLength, height }), anchor });
const scenery: SceneryEntry = Object.freeze({ role: 'scenery' });

// barrier, ring, pickup and checkpoint match what is drawn (3.1 m barrier, RING_RADIUS, 1 m octahedron, 6.4 m frame).
export const OBJECT_CATALOG: Readonly<Record<GameplayType, GameplayEntry> & Record<SceneryType, SceneryEntry>> = Object.freeze({
  barrier: gameplay('block', 1.55, 1.1, 2.5),
  cone: gameplay('block', 0.35, 0.35, 0.8),
  gate: gameplay('block', 1.55, 0.3, 3),
  ring: gameplay('collect', 4.8, 0.5, 9.6, 'center'),
  pickup: gameplay('collect', 1, 1, 2.5),
  checkpoint: gameplay('trigger', 3.2, 0.5, 4.8),
  'energy-barrier': gameplay('block', 1.55, 0.3, 3),
  debris: gameplay('block', 1.2, 1.2, 1.4),
  gust: gameplay('push', 10, 10, 8),
  terrain: gameplay('slow', 2.5, 10, 0.3),
  'rail-crossing': gameplay('block', 10, 2, 4), // whole-road event: only closed during its warned trigger window
  'branch-marker': gameplay('trigger', 10, 0.5, 6),
  building: scenery, crowd: scenery, 'parked-train': scenery, sign: scenery, lamp: scenery, spaceship: scenery,
});

export const isGameplayType = (type: string): type is GameplayType => (GAMEPLAY_TYPES as readonly string[]).includes(type);
