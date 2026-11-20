import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createModelCache, type ModelHandle } from './asset-model-loader.ts';
import { CARS, type CarId } from './car-catalog.ts';
import { createKtx2Provider } from './garage-model.ts';
import { CAR_REVEAL_MS, carRevealShot, type CarRevealShot } from './acquisition-car-camera.ts';

type DrawState = 'playing' | 'still' | 'static';

export async function playCarReveal(
  canvas: HTMLCanvasElement, id: CarId, high: boolean, signal: AbortSignal,
  publish: (state: DrawState, shot: CarRevealShot | '') => void,
): Promise<void> {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: high, powerPreference: 'low-power' });
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.5 : 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .82;
  const scene = new THREE.Scene();
  scene.environmentIntensity = .72;
  const camera = new THREE.PerspectiveCamera(carRevealShot(0).fov, 1, .1, 90);
  const baseUrl = import.meta.env.BASE_URL;
  const decoder = createKtx2Provider(renderer, baseUrl);
  let ktx2: ReturnType<typeof decoder> | undefined;
  const cache = createModelCache({ baseUrl, loadKtx2: () => ktx2 ??= decoder(), timeoutMs: 6000, decodeTimeoutMs: 10000 });
  let model: ModelHandle | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let floor: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> | undefined;
  let shade: THREE.Texture | undefined;
  let studio: (() => void) | undefined;
  let paint: THREE.MeshStandardMaterial | undefined;
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
    studio?.();
    paint?.dispose();
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
    // The study uses a satin clear coat to keep the body lines intact under the cold strips.
    car.traverse(node => {
      if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial && node.material.name === 'gt_paint') {
        paint ??= node.material.clone();
        paint.roughness = .50;
        node.material = paint;
      }
    });
    studio = buildStudio(scene, half);

    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environment = pmrem.fromScene(room, .045, .1, 50, { size: high ? 128 : 64 });
      scene.environment = environment.texture;
    } finally {
      room.dispose();
      pmrem.dispose();
    }
    scene.add(new THREE.HemisphereLight('#d5ecff', '#263042', .85));
    const key = new THREE.DirectionalLight('#ecf2ff', 2.0);
    key.position.set(-3, 5, -5);
    const edge = new THREE.DirectionalLight('#609bff', 1.55);
    edge.position.set(5, 2, -1);
    const warm = new THREE.DirectionalLight('#ff804f', 1.85);
    warm.position.set(2, 3, 5);
    scene.add(key, edge, warm);
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
    const eye = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), target = new THREE.Vector3();
    const relative = new THREE.Vector3();
    let elapsed = 0, start: number | undefined;
    let lastShot = '';
    function draw(time: number): void {
      const angle = carRevealShot(time);
      const { yaw, pitch, fill, focus, fov } = angle;
      target.set(0, -.24 * half.y, focus * half.z);
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      // Open the exposure slightly for the full-car title frame.
      renderer.toneMappingExposure = angle.name === 'hero' ? .89 : .82;
      eye.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      up.crossVectors(eye, right);
      const vertical = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * fill;
      const horizontal = vertical * camera.aspect;
      let distance = 0;
      for (const corner of corners) {
        relative.subVectors(corner, target);
        distance = Math.max(distance, relative.dot(eye) + Math.max(
          Math.abs(relative.dot(right)) / horizontal,
          Math.abs(relative.dot(up)) / vertical,
        ));
      }
      camera.position.copy(eye).multiplyScalar(distance).add(target);
      camera.lookAt(target);
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


// Instanced studio surfaces and neon strips give each tracking shot visible parallax.
function buildStudio(scene: THREE.Scene, half: THREE.Vector3): () => void {
  const span = Math.max(half.x, half.z);
  const floorY = -half.y;
  const geometry = new THREE.BoxGeometry();
  const concrete = new THREE.MeshStandardMaterial({ color: '#202a36', metalness: .22, roughness: .6 });
  const panels = new THREE.MeshStandardMaterial({ color: '#111d30', metalness: .22, roughness: .68 });
  const silver = new THREE.MeshBasicMaterial({ color: '#4b637c' });
  const cold = new THREE.MeshBasicMaterial({ color: '#60adff' });
  const hot = new THREE.MeshBasicMaterial({ color: '#ff793e' });
  const floor = new THREE.Mesh(geometry, concrete);
  floor.position.y = floorY - .10;
  floor.scale.set(span * 19, .12, span * 19);
  scene.add(floor);
  scene.fog = new THREE.FogExp2('#081120', .035 / span);
  scene.background = new THREE.Color('#081120');

  type Strip = [number, number, number, number, number, number];
  const walls: Strip[] = [], rails: Strip[] = [], blue: Strip[] = [], amber: Strip[] = [];
  for (const side of [-1, 1]) {
    walls.push([0, 1.3, side * 5.4, 10.4, 3, .13], [side * 5.1, 1.3, 0, .13, 3, 10.4]);
    rails.push([side * 1.02, 0, 0, .025, .006, 9.8]);
    const lane = side === -1 ? blue : amber;
    lane.push([side * 1.31, 0, 0, .018, .008, 10.5]);
    for (let slot = -3; slot <= 3; slot++) {
      const shift = slot * 1.33;
      walls.push([side * 5, .76, shift, .20, 1.55, 1.12], [shift, .76, side * 5.24, 1.12, 1.55, .2]);
      rails.push([side * 1.14, 0, shift, .09, .01, .37]);
      const strips = slot === 1 ? amber : blue;
      strips.push([side * 4.88, .91, shift - .39, .025, 1.45, .024],
        [shift - .39, .91, side * 5.1, .025, 1.45, .024]);
    }
  }
  const instances = [[panels, walls], [silver, rails], [cold, blue], [hot, amber]] as const;
  const matrix = new THREE.Object3D();
  const batches = instances.map(([material, strips]) => {
    const mesh = new THREE.InstancedMesh(geometry, material, strips.length);
    strips.forEach(([x, y, z, width, height, depth], i) => {
      matrix.position.set(x * span, floorY + y * span - .015, z * span);
      matrix.scale.set(width * span, height * span, depth * span);
      matrix.updateMatrix();
      mesh.setMatrixAt(i, matrix.matrix);
    });
    scene.add(mesh);
    return mesh;
  });
  return () => {
    batches.forEach(batch => batch.dispose());
    geometry.dispose();
    [concrete, panels, silver, cold, hot].forEach(material => material.dispose());
  };
}
