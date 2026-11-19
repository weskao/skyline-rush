import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createModelCache, type ModelHandle } from './asset-model-loader.ts';
import { CARS, type CarId } from './car-catalog.ts';
import { createKtx2Provider } from './garage-model.ts';
import { CAR_REVEAL_FOV, CAR_REVEAL_MS, carRevealShot } from './acquisition-car-camera.ts';

type DrawState = 'playing' | 'still' | 'static';

export async function playCarReveal(
  canvas: HTMLCanvasElement, id: CarId, high: boolean, signal: AbortSignal,
  publish: (state: DrawState, shot: string) => void,
): Promise<void> {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: high, powerPreference: 'low-power' });
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.5 : 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .82;
  const scene = new THREE.Scene();
  scene.environmentIntensity = .72;
  const camera = new THREE.PerspectiveCamera(CAR_REVEAL_FOV, 1, .1, 90);
  const baseUrl = import.meta.env.BASE_URL;
  const decoder = createKtx2Provider(renderer, baseUrl);
  let ktx2: ReturnType<typeof decoder> | undefined;
  const cache = createModelCache({ baseUrl, loadKtx2: () => ktx2 ??= decoder(), timeoutMs: 6000, decodeTimeoutMs: 10000 });
  let model: ModelHandle | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let floor: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> | undefined;
  let shade: THREE.Texture | undefined;
  let resize: ResizeObserver | undefined;
  let frame = 0;
  let alive = true;
  function dispose(): void {
    if (!alive) return;
    alive = false;
    canvas.removeEventListener('webglcontextlost', lost);
    signal.removeEventListener('abort', dispose);
    cancelAnimationFrame(frame);
    resize?.disconnect();
    model?.release();
    cache.dispose();
    void ktx2?.then(loader => loader.dispose?.(), () => {});
    environment?.dispose();
    floor?.geometry.dispose();
    floor?.material.dispose();
    shade?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  function lost(): void { dispose(); publish('static', ''); }
  canvas.addEventListener('webglcontextlost', lost);
  signal.addEventListener('abort', dispose, { once: true });
  try {
    const reply = await cache.load(CARS[id].model, { signal, quality: high ? 'high' : 'low' });
    if (reply.kind === 'model') model = reply;
    if (!alive) { model?.release(); return; }
    if (!model) { lost(); return; }
    const car = model.instance();
    const bounds = new THREE.Box3().setFromObject(car, true);
    if (bounds.isEmpty()) { lost(); return; }
    const center = bounds.getCenter(new THREE.Vector3());
    const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
    car.position.sub(center);
    scene.add(car);

    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environment = pmrem.fromScene(room, .045, .1, 50, { size: high ? 128 : 64 });
      scene.environment = environment.texture;
    } finally {
      room.dispose();
      pmrem.dispose();
    }
    scene.add(new THREE.HemisphereLight('#d5ecff', '#263042', 1.05));
    for (const [color, intensity, position] of [
      ['#e0edff', 1.75, [-4, 5, -5]], ['#84baff', 1.1, [5, 2, -1]], ['#ff985a', 1.2, [-2, 3, 5]],
    ] as const) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(position[0], position[1], position[2]);
      scene.add(light);
    }
    // A soft contact patch keeps the car grounded without a shadow map or a post-processing pass.
    const texels = new Uint8Array(32 * 32 * 4);
    for (let i = 0; i < 32 * 32; i++) {
      const radius = Math.hypot((i % 32 - 15.5) / 15.5, (Math.floor(i / 32) - 15.5) / 15.5);
      texels[i * 4 + 3] = Math.round(Math.max(0, 1 - radius) ** 1.35 * 182);
    }
    shade = new THREE.DataTexture(texels, 32, 32);
    shade.magFilter = shade.minFilter = THREE.LinearFilter;
    shade.needsUpdate = true;
    floor = new THREE.Mesh(new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ map: shade, transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -half.y - .015;
    floor.scale.set(half.x * 1.9, half.z * 1.4, 1);
    scene.add(floor);

    const corners = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => new THREE.Vector3(x * half.x, y * half.y, z * half.z))));
    const eye = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    const vertical = Math.tan(THREE.MathUtils.degToRad(CAR_REVEAL_FOV / 2));
    let elapsed = 0, start: number | undefined;
    let lastShot = '';
    function draw(time: number): void {
      const angle = carRevealShot(time);
      const { yaw, pitch, fill } = angle;
      eye.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      up.crossVectors(eye, right);
      const horizontal = vertical * camera.aspect;
      const distance = Math.max(...corners.map(point => point.dot(eye) + Math.max(
        Math.abs(point.dot(right)) / (horizontal * fill),
        Math.abs(point.dot(up)) / (vertical * fill),
      )));
      camera.position.copy(eye).multiplyScalar(distance);
      camera.lookAt(0, 0, 0);
      try { renderer.render(scene, camera); }
      catch { lost(); return; }
      const state = time >= CAR_REVEAL_MS ? 'still' : 'playing';
      if (lastShot !== angle.name || state === 'still') publish(state, angle.name);
      lastShot = angle.name;
    }
    const fitCanvas = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!alive || !width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw(elapsed);
    };
    resize = new ResizeObserver(fitCanvas);
    resize.observe(canvas);
    fitCanvas();
    if (!alive) return;
    frame = requestAnimationFrame(function tick(now) {
      if (!alive) return;
      start ??= now;
      elapsed = Math.min(CAR_REVEAL_MS, now - start);
      draw(elapsed);
      if (alive && elapsed < CAR_REVEAL_MS) frame = requestAnimationFrame(tick);
    });
  } catch (error) {
    dispose();
    throw error;
  }
}
