import * as THREE from 'three';
import type { VfxQuality } from './vfx-settings.ts';

const DETAILED = { width: 3, length: 5.8, opacity: 0.75, stops: [[0, 0.92], [0.55, 0.55], [1, 0]] };
const LIGHTWEIGHT = { width: 5, length: 8, opacity: 0.6, stops: [[0, 0.8], [1, 0]] };

function shadowMap(stops: number[][]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 5, 32, 32, 32);
  for (const [at, alpha] of stops) gradient.addColorStop(at!, `rgba(0,0,0,${alpha})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// The world places one contact shadow on the road. Quality changes swap its gradient and footprint.
export function createContactShadow(scene: THREE.Scene) {
  const detailedMap = shadowMap(DETAILED.stops), lightweightMap = shadowMap(LIGHTWEIGHT.stops);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(DETAILED.width, DETAILED.length), new THREE.MeshBasicMaterial({
    map: detailedMap, transparent: true, opacity: DETAILED.opacity, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  scene.add(shadow);
  return {
    shadow,
    update(lift: number, quality: VfxQuality): void {
      const low = quality === 'low', style = low ? LIGHTWEIGHT : DETAILED, scale = 1 + lift * 0.04;
      shadow.material.map = low ? lightweightMap : detailedMap;
      shadow.material.opacity = style.opacity / (1 + lift * 0.2);
      shadow.scale.set(scale * style.width / DETAILED.width, scale * style.length / DETAILED.length, scale);
    },
    dispose(): void { detailedMap.dispose(); lightweightMap.dispose(); },
  };
}
