import * as THREE from 'three';
import { RACE_DRIVER_IDS } from './race-grid.ts';
import { MAGNET_RANGE, driftTier } from './game.js';
import { createMarkerPool } from './marker-pool.js';
import { createPickupMarkers } from './pickup-markers.js';
import { createPickupCollectVfx, pickupCueSource } from './pickup-collect-vfx.js';
import { createParticleBurst } from './effects-particle-burst.js';
import { createRivalCues } from './rival-cues.ts';
import { isRaining, racePreset, sprayRate } from './board-effects.ts';
import { createDriftCharge } from './drift-charge-vfx.js';
import { LIFT_PORTS, liftPort } from './lift-ports.js';

const COUNT = 480, flatShadow = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
export const RING_POOL_CAPACITY = 48; // densest 900 m view of one colour: 18 with trains and rows (tests/ring-rows.test.js)

// `renderer` + `pickupEnvironment` let the pickups load their authored models and reflections; `camera` faces their halos.
// `player`: the player's car, which glows and hops as each drift tier pays (drift-charge-vfx.js).
export function createEffects(scene, roadCenter, { camera, renderer, pickupEnvironment, player, roadShadow } = {}) {
  const particles = Array.from({ length: COUNT }, () => ({ life: 0 }));
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const alphas = new Float32Array(COUNT);
  const kinds = new Float32Array(COUNT);
  const velocities = new Float32Array(COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  for (const [name, array, size] of [['position', positions, 3], ['color', colors, 3], ['size', sizes, 1], ['alpha', alphas, 1], ['kind', kinds, 1], ['velocity', velocities, 3]]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage));
  }
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { pixelRatio: { value: Math.min(devicePixelRatio, 1.5) } },
    vertexShader: `attribute vec3 color; attribute float size; attribute float alpha;
      attribute float kind; attribute vec3 velocity;
      varying vec3 vColor; varying float vAlpha; varying float vKind; varying vec2 vDirection;
      uniform float pixelRatio;
      void main(){ vColor=color; vAlpha=alpha; vKind=kind;
        vec4 p=modelViewMatrix*vec4(position,1.);
        vec4 clip=projectionMatrix*p;
        vec4 tip=projectionMatrix*(p+modelViewMatrix*vec4(velocity*.03,0.));
        vec2 direction=tip.xy/max(.01,tip.w)-clip.xy/max(.01,clip.w);
        vDirection=length(direction)>.00001 ? normalize(direction) : vec2(0.,1.);
        gl_PointSize=clamp(size*220.*pixelRatio/max(1.,-p.z),0.,85.); gl_Position=clip; }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; varying float vKind; varying vec2 vDirection;
      void main(){ vec2 uv=(gl_PointCoord-.5)*2.; uv.y=-uv.y;
        float d=length(uv);
        if(vKind>.5 && vKind<1.5) {
          vec2 flow=vec2(dot(uv,vec2(vDirection.y,-vDirection.x)),dot(uv,vDirection));
          d=length(flow*vec2(4.5,1.));
        } else if(vKind>1.5) {
          vec2 flow=vec2(dot(uv,vec2(vDirection.y,-vDirection.x)),dot(uv,vDirection));
          d=length(flow*vec2(2.8,1.));
        }
        if(d>1.) discard;
        float soft=exp(-d*d*4.)*(1.-smoothstep(.65,1.,d));
        gl_FragColor=vec4(vColor,soft*vAlpha); }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const cores = new THREE.Group();
  cores.name = 'Lift gas cores';
  scene.add(cores);
  const coreGeometry = new THREE.CylinderGeometry(0.085, 0.24, 1, 16, 12, true);
  coreGeometry.translate(0, -0.5, 0);
  const coreMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, power: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying float height;
      void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);height=world.y;
        gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader: `varying vec2 vUv;varying float height;uniform float time,power;
      void main(){if(height<.09)discard;float downstream=clamp(1.-vUv.y,0.,1.); // see the nozzle shader in aero-vfx.js
        float breakup=.65+.35*sin(vUv.x*37.+downstream*31.-time*38.);
        float envelope=pow(max(0.,1.-downstream),1.6)*smoothstep(0.,.06,downstream);
        gl_FragColor=vec4(.86,.94,1.,power*envelope*breakup*.5);}`,
  });
  for (let i = 0; i < RACE_DRIVER_IDS.length * LIFT_PORTS.length; i++) {
    const jet = new THREE.Mesh(coreGeometry, coreMaterial.clone());
    jet.visible = false; cores.add(jet);
  }
  let flowTime = 0;
  let cursor = 0, lastImpact = null, lastLanding = null, lastShieldBlock = null;
  const emissions = new Float64Array(RACE_DRIVER_IDS.length), strengths = new Float64Array(RACE_DRIVER_IDS.length);
  const nozzles = new Uint8Array(RACE_DRIVER_IDS.length);
  const nozzlePosition = new THREE.Vector3(), nozzleVelocity = new THREE.Vector3();
  const orange = [2.5, 0.85, 0.15], mist = [0.58, 0.64, 0.68], gas = [0.8, 0.87, 0.92];
  const blue = [0.15, 0.8, 2.5], gold = [2.5, 1.8, 0.15], purple = [1.2, 0.3, 2.5], red = [2.5, 0.1, 0.15];
  const spectrum = [red, orange, gold, [0.15, 2, 0.65], blue, purple];
  const pickupColors = { cell: blue, can: orange, tank: gold, overcharge: spectrum };
  const bonusStyles = { 'speed-pad': 'slipstream', 'air-pad': 'charge', 'recovery-pad': 'nitro', 'score-pad': 'risk', emp: 'mystery' };
  const ringColors = { charge: [0.1, 1.8, 2.5], nitro: gold, slipstream: purple, risk: red, mystery: spectrum };
  const gateBasis = new THREE.Matrix4(), gateRight = new THREE.Vector3(), gateUp = new THREE.Vector3(), gateBack = new THREE.Vector3();
  const ringGeometry = new THREE.TorusGeometry(1, 0.012, 6, 64);
  const rainbow = new Float32Array(ringGeometry.attributes.position.count * 3), tint = new THREE.Color();
  for (let i = 0; i < ringGeometry.attributes.position.count; i++) {
    const angle = Math.atan2(ringGeometry.attributes.position.getY(i), ringGeometry.attributes.position.getX(i));
    tint.setHSL((angle / (Math.PI * 2) + 1) % 1, 1, 0.6).toArray(rainbow, i * 3);
  }
  ringGeometry.setAttribute('color', new THREE.BufferAttribute(rainbow, 3));
  const ringMaterials = Object.fromEntries(Object.entries(ringColors).map(([type, color]) => [type,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(...(type === 'mystery' ? [1, 1, 1] : color)), vertexColors: type === 'mystery', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })]));
  // One instanced pool per material, each warmed by its parked instance (marker-pool.js); capacity covers the densest 900 m view.
  const ringPool = createMarkerPool('Race rings', ringGeometry, ringMaterials, RING_POOL_CAPACITY);
  const pickupMarkers = createPickupMarkers(128, { renderer, envMap: pickupEnvironment }), pickupPool = pickupMarkers.pool;
  const gates = ringPool.group, marker = new THREE.Object3D(), gateFrames = new WeakMap(), rivalCues = createRivalCues();
  scene.add(gates, ...pickupMarkers.objects);
  const collectVfx = createPickupCollectVfx(scene, player, camera), roadNormal = new THREE.Vector3();
  // ITEM-12: a light column over each ring that grants a held item, one per ring slot; same program as the plain rings.
  const beamGeometry = new THREE.CylinderGeometry(0.08, 0.08, 14, 8, 1, true);
  const beamMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(...gold), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const beams = new THREE.Group();
  beams.name = 'Item beams';
  for (let i = 0; i < 7; i++) beams.add(new THREE.Mesh(beamGeometry, beamMaterial));
  scene.add(beams);
  const driftColors = [blue, orange, purple], driftCharge = player ? createDriftCharge(player, driftColors, scene) : null;
  let previousRace = null, seen = new WeakMap(), driftEmission = 0, sprayEmission = 0, spraySide = 1;
  function emit(x, y, distance, vx, vy, forward, size, life, color, gravity, kind = 0, opacity = 0.85, radialX = Math.sign(vx)) {
    Object.assign(particles[cursor], { x, y, distance, vx, vy, forward, size, life, maxLife: life, color, gravity, kind, opacity, radialX, grounded: false, phase: cursor * 2.39996 });
    cursor = (cursor + 1) % COUNT;
  }
  const wheel = { x: 0, d: 0 };
  // Rear-wheel contact in world x / race distance: drift smoke and rain spray start here.
  function rearWheel(side, car, center, originZ, vehicles) {
    nozzlePosition.set(side * 1.05, 0.12, 1.45);
    const pose = vehicles?.[0];
    if (pose) { pose.updateWorldMatrix(true, false); nozzlePosition.applyMatrix4(pose.matrixWorld); }
    else nozzlePosition.x += roadCenter(car.distance) + car.x - center;
    wheel.x = nozzlePosition.x + center; wheel.d = originZ - nozzlePosition.z;
    return wheel;
  }
  let classicRoute;
  const burst = createParticleBurst(emit, (d, x) => classicRoute?.point(d, x) ?? [roadCenter(d) + x, -d]);
  // rings[0] flashes a crash, rings[1] a hit the shield blocked (ITEM-12); one shader program for both.
  const rings = [orange, blue].map(color => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 72), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.event = null;
    scene.add(ring);
    return ring;
  });
  // ITEM-03: the magnet's pickup reach, drawn with the impact ring's geometry and shader program.
  const magnetRing = rings[0].clone();
  magnetRing.material = rings[0].material.clone();
  magnetRing.material.color.setRGB(...blue);
  magnetRing.name = 'magnet radius';
  magnetRing.visible = false;
  magnetRing.scale.setScalar(MAGNET_RANGE);
  scene.add(magnetRing);
  return {
    update(race, dt, center, preview, reducedMotion, vehicles, options = {}) {
      dt = Math.max(0, dt);
      flowTime += dt;
      // Loaded pickup models replace the stand-ins only between races: their shaders compile before GO, never mid-race.
      const rewarm = pickupMarkers.frame(flowTime, reducedMotion, race.phase !== 'racing');
      const car = race.player;
      const distance = options.roadDistance ?? (preview ? 340 : car.distance);
      classicRoute = options.classicRoute;
      const originZ = classicRoute ? -classicRoute.point(distance)[1] : distance;
      const enabled = options.enabled !== false;
      const active = enabled && !preview && race.phase === 'racing' && dt > 0;
      const lowQuality = options.quality === 'low';
      const pickupFrame = { distance, center, roadCenter, worldPoint: options.worldPoint, worldFrame: options.worldFrame, enabled, reducedMotion, car, pose: vehicles?.[0], roadNormal: roadNormal.set(0, 0, 1).applyQuaternion(roadShadow?.quaternion ?? flatShadow) };
      points.visible = enabled;
      let beam = 0;
      for (let source = 0; source < 2; source++) {
        const items = source === 0 ? race.pickups : race.rings;
        const pool = source === 0 ? pickupPool : ringPool;
        pool.begin();
        for (const item of items) {
          const collected = source === 0 ? item.taken : item.hit;
          const ringType = bonusStyles[item.type] ?? item.type;
          // A respawned item receives another effect; the take's deadline identifies its generation.
          const takeToken = item.downUntil ?? true;
          if (collected && seen.get(item) !== takeToken) {
            seen.set(item, takeToken);
            if (previousRace === race && active) {
              burst(item, reducedMotion ? 6 : lowQuality ? 12 : 32,
                source === 0 ? pickupColors[item.tier] : ringColors[ringType], car.speed);
              if (source === 0) collectVfx.spawn(item.tier, item, { quality: options.quality, reducedMotion, follow: true, markerTime: flowTime });
            }
          }
          if (collected || item.downUntil > race.elapsed || item.distance <= distance || item.distance > distance + 900) continue; // gone until it respawns
          const mesh = marker;
          if (options.worldPoint) mesh.position.fromArray(options.worldPoint(item.distance, item.x,
            item.altitude + (source === 0 ? 0.85 : 0), distance, item));
          else mesh.position.set(roadCenter(item.distance) + item.x - center,
            item.altitude + (source === 0 ? 0.85 : 0), -(item.distance - distance));
          if (source === 1 && options.worldFrame) {
            // (a new race brings new gate objects; the WeakMap lets old ones go).
            let facing = gateFrames.get(item);
            if (!facing || item.spin) { // a spinning hoop re-bases before its swivel
              const frame = options.worldFrame(item.distance, item);
              if (!facing) gateFrames.set(item, facing = new THREE.Quaternion());
              facing.setFromRotationMatrix(gateBasis.makeBasis(gateRight.fromArray(frame.right), gateUp.fromArray(frame.up), gateBack.fromArray(frame.forward).negate()));
            }
            mesh.quaternion.copy(facing);
          } else if (source === 0) pickupMarkers.place(mesh, item, flowTime, reducedMotion, camera?.quaternion);
          else mesh.rotation.set(0, -Math.atan((roadCenter(item.distance + 1) - roadCenter(item.distance - 1)) / 2), 0);
          if (source === 1 && item.spin && !reducedMotion) mesh.rotateY(0.6 * Math.sin(item.spin * race.elapsed + item.spinPhase));
          if (source === 1) mesh.scale.setScalar(item.radius);
          mesh.updateMatrix();
          pool.add(source === 0 ? item.tier : ringType, mesh.matrix);
          if (source === 1 && beam < beams.children.length && (item.type === 'emp' || (item.type === 'mystery' && !!race.config?.activeItems))) {
            const light = beams.children[beam++];
            light.visible = true; light.position.copy(mesh.position); light.position.y += 7;
          }
        }
        if (source === 0) { collectVfx.drawAbsorbing(marker, pool, pickupFrame, dt); pickupMarkers.end(); }
        pool.end();
      }
      for (; beam < beams.children.length; beam++) beams.children[beam].visible = false;
      // A rival taking an item or firing NITRO nearby: a smaller burst than the player's, in the item's colour (rival-cues.ts throttles it).
      for (const cue of rivalCues.update(race)) if (active) {
        burst(cue, reducedMotion ? 4 : lowQuality ? 8 : 18,
          cue.kind === 'nitro' ? gold : pickupColors[cue.item] ?? ringColors[cue.item] ?? gold, car.speed);
        if (cue.kind === 'take' && pickupColors[cue.item])
          collectVfx.spawn(cue.item, pickupCueSource(cue, race.pickups), { quality: options.quality, reducedMotion, rival: true });
      }
      collectVfx.update(dt, pickupFrame);
      beamMaterial.opacity = reducedMotion ? 0.3 : 0.3 + Math.sin(flowTime * 4) * 0.1;
      previousRace = race;
      if (active && !reducedMotion && car.drift && car.altitude < 0.2) {
        driftEmission = Math.min(8, driftEmission + dt * (lowQuality ? 16 : 60));
        while (driftEmission >= 1) {
          const side = Math.floor(driftEmission) % 2 ? -1 : 1;
          const { x, d } = rearWheel(side, car, center, originZ, vehicles);
          emit(x, 0.12, d, side * 1.5, 0.8, car.speed * 0.25, 0.55, 0.5, mist, 0, 2, 0.3);
          const tier = driftTier(car.drift.time);
          if (tier > 0) emit(x, 0.15, d, side * (2 + Math.random() * 3), 1.5, car.speed * 0.3, 0.12, 0.4, driftColors[tier - 1], 6);
          driftEmission--;
        }
      } else driftEmission = 0;
      // A tier just paid: a burst off both rear tyres in its colour. Kept under reduced motion as the payout cue.
      const fired = driftCharge?.update(car.drift, dt, active, reducedMotion) ?? 0;
      if (fired && car.altitude < 0.2) for (const side of [-1, 1]) for (let i = reducedMotion ? 3 : lowQuality ? 5 : 10; i > 0; i--) {
        const { x, d } = rearWheel(side, car, center, originZ, vehicles);
        emit(x, 0.2, d, side * (1 + Math.random() * 3), 2 + Math.random() * 2, car.speed * 0.9, 0.16, 0.45, driftColors[fired - 1], 6);
      }
      // Board panel 5: wet tyres throw a mist off both rear wheels (pooled particles, Medium+ only).
      const spraying = active && !reducedMotion && car.altitude < 0.2 && isRaining(racePreset(race), race.trackId);
      sprayEmission = spraying ? Math.min(4, sprayEmission + dt * sprayRate(options.quality ?? 'high', car.speed)) : 0;
      for (; sprayEmission >= 1; sprayEmission--) {
        const { x, d } = rearWheel(spraySide = -spraySide, car, center, originZ, vehicles);
        emit(x, 0.1, d, spraySide * (0.6 + Math.random()), 1.2 + Math.random(), car.speed * 0.88, 0.7, 0.5, mist, 3, 2, 0.35); // ~0.88: hangs a few metres behind the tyres
      }
      if (car.impact !== lastImpact) {
        lastImpact = car.impact;
        if (lastImpact && active) { burst(lastImpact, 95, orange, car.speed); rings[0].userData.event = lastImpact; }
      }
      if (car.shieldBlock !== lastShieldBlock) {
        lastShieldBlock = car.shieldBlock;
        if (lastShieldBlock && active) { burst(lastShieldBlock, reducedMotion ? 6 : lowQuality ? 12 : 40, blue, car.speed); rings[1].userData.event = lastShieldBlock; }
      }
      if (car.landing !== lastLanding) {
        lastLanding = car.landing;
        if (lastLanding && active) burst(lastLanding, 65, mist, car.speed, true);
        if (lastLanding?.chain && active) burst(lastLanding, reducedMotion ? 6 : lowQuality ? 12 : 40, blue, car.speed);
      }
      for (let source = 0; source <= race.rivals.length; source++) {
        const driver = source === 0 ? car : race.rivals[source - 1];
        const pose = vehicles?.[source];
        const active = enabled && (preview || race.phase === 'racing') && (preview ? source < 2 && (!pose || pose.userData.jets.visible) : driver.thrusting) && pose?.visible !== false;
        strengths[source] = THREE.MathUtils.damp(strengths[source], active ? 1 : 0, active ? 12 : 9, dt);
        for (let port = 0; port < LIFT_PORTS.length; port++) {
          const jet = cores.children[source * LIFT_PORTS.length + port];
          jet.visible = enabled && !!pose && strengths[source] >= 0.01 && pose.visible;
          if (!jet.visible) continue;
          pose.updateWorldMatrix(true, false);
          liftPort(pose, port, 0.19, jet.position).applyMatrix4(pose.matrixWorld);
          pose.getWorldQuaternion(jet.quaternion);
          jet.scale.set(1, 0.65 + strengths[source] * 0.75, 1);
          jet.material.uniforms.power.value = strengths[source] * (reducedMotion ? 0.65 : 1);
          jet.material.uniforms.time.value = flowTime + port * 0.31;
        }
        if (!enabled || strengths[source] < 0.01 || dt === 0) continue;
        const d = preview ? source === 0 ? 340 : 375 + (source - 1) * 28 : driver.distance;
        const altitude = pose ? pose.position.y : preview ? source === 0 ? 1.6 : 5 : driver.altitude;
        const heading = classicRoute?.heading(d) ?? Math.atan((roadCenter(d + 1) - roadCenter(d - 1)) / 2);
        const speed = preview ? 0 : driver.speed;
        if (pose) pose.updateWorldMatrix(true, false);
        emissions[source] = Math.min(12, emissions[source] + dt * strengths[source] * (reducedMotion ? 65 : source === 0 ? 240 : 90));
        while (emissions[source] >= 1) {
          const [x, z] = LIFT_PORTS[nozzles[source]];
          liftPort(pose, nozzles[source], 0.19, nozzlePosition);
          nozzles[source] = (nozzles[source] + 1) % LIFT_PORTS.length;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.sqrt(Math.random()) * 0.12;
          nozzlePosition.x += Math.cos(angle) * radius; nozzlePosition.z += Math.sin(angle) * radius;
          nozzleVelocity.set(Math.cos(angle) * 0.8, -18 - Math.random() * 4, Math.sin(angle) * 0.8);
          if (pose) {
            nozzlePosition.applyMatrix4(pose.matrixWorld);
            nozzlePosition.x += center;
            nozzlePosition.z = originZ - nozzlePosition.z;
            nozzleVelocity.applyQuaternion(pose.quaternion);
          } else {
            nozzlePosition.x += roadCenter(d) + driver.x;
            nozzlePosition.y += altitude;
            nozzlePosition.z = d - z;
          }
          emit(nozzlePosition.x, nozzlePosition.y, nozzlePosition.z,
            nozzleVelocity.x + Math.sin(heading) * speed * 0.88 + (driver.steering || 0) * 6,
            nozzleVelocity.y, -nozzleVelocity.z + Math.cos(heading) * speed * 0.88,
            reducedMotion ? 0.75 : 0.9 + Math.random() * 0.4,
            0.65 + Math.random() * 0.25, gas, 0, 1, strengths[source] * 0.48, Math.sign(x));
          emissions[source]--;
        }
      }
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        p.life = Math.max(0, p.life - dt);
        if (p.life === 0) { alphas[i] = 0; continue; }
        const age = p.maxLife - p.life;
        if (p.kind === 1 && !p.grounded) {
          // Entrain surrounding air: broaden and break up the stream as it ages.
          p.vx += Math.sin(p.phase + age * 19) * dt * 3;
          p.vy *= Math.exp(-dt * 0.7);
          p.forward *= Math.exp(-dt * 0.8);
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= p.gravity * dt;
        p.distance += p.forward * dt;
        if (p.y < 0.08 && Math.abs(p.x - (classicRoute?.centerAtZ(-p.distance) ?? roadCenter(p.distance))) < 12) {
          p.y = 0.08;
          if (p.kind === 1 && !p.grounded) {
            // The deck redirects the downwash into a broad, slowing wall jet.
            const spread = 4 + Math.random() * 3;
            p.vx = Math.cos(p.phase) * spread;
            p.forward = p.forward * 0.22 + Math.sin(p.phase) * spread;
            p.kind = 2; p.grounded = true; p.opacity *= 0.65;
            p.size = 0.7; p.life = Math.min(p.life, 0.5);
          }
          p.vy = 0;
        }
        if (p.grounded) {
          p.vx *= Math.exp(-dt * 2.4);
          p.forward *= Math.exp(-dt * 2.4);
        }
        const offset = i * 3;
        if (options.worldPoint && !classicRoute) {
          positions.set(options.worldPoint(p.distance,p.x-roadCenter(p.distance),p.y,distance),offset);
        } else {
          positions[offset] = p.x - center; positions[offset + 1] = p.y; positions[offset + 2] = originZ - p.distance;
        }
        colors[offset] = p.color[0]; colors[offset + 1] = p.color[1]; colors[offset + 2] = p.color[2];
        velocities[offset] = p.vx; velocities[offset + 1] = p.vy; velocities[offset + 2] = -p.forward;
        kinds[i] = p.kind;
        sizes[i] = p.size * (1 + age * (p.kind === 2 ? 3.5 : 0.9));
        const fadeIn = p.kind === 0 ? 1 : Math.min(1, age / 0.06);
        alphas[i] = Math.pow(p.life / p.maxLife, 1.4) * fadeIn * p.opacity;
      }
      for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
      rings.forEach(ring => {
        const event = ring.userData.event;
        const age = event ? race.elapsed - event.time : 10;
        ring.visible = age >= 0 && age < 0.7 && !preview;
        if (ring.visible) {
          if (options.worldPoint) ring.position.fromArray(options.worldPoint(event.distance,event.x,.05,distance));
          else ring.position.set(roadCenter(event.distance) + event.x - center, 0.05, -(event.distance - distance));
          ring.scale.setScalar(1 + age * (reducedMotion ? 3 : 14));
          ring.material.opacity = (1 - age / 0.7) * 0.55;
        }
        if (!event || race.elapsed < event.time) ring.visible = false;
      });
      const magnet = car.effects?.magnet ?? 0;
      magnetRing.visible = magnet > 0 && !preview;
      if (magnetRing.visible) {
        if (options.worldPoint) magnetRing.position.fromArray(options.worldPoint(car.distance, car.x, car.altitude + .05, distance));
        else magnetRing.position.set(roadCenter(car.distance) + car.x - center, car.altitude + .05, 0);
        // Fades over the final second; a gentle pulse unless motion is reduced.
        magnetRing.material.opacity = Math.min(1, magnet) * (reducedMotion ? .3 : .3 + Math.sin(flowTime * 5) * .08);
      }
      if (race.phase === 'countdown' || race.phase === 'ready') {
        lastImpact = null; lastLanding = null; lastShieldBlock = null;
      }
      return rewarm; // true: new pickup materials entered the scene, the caller warms their shaders
    },
    dispose() {
      gates.removeFromParent(); beams.removeFromParent(); ringPool.dispose(); pickupMarkers.dispose(); collectVfx.dispose(); driftCharge?.dispose();
      ringGeometry.dispose(); beamGeometry.dispose(); beamMaterial.dispose();
      for (const mat of Object.values(ringMaterials)) mat.dispose();
    },
    reset() {
      for (const p of particles) p.life = 0;
      alphas.fill(0);
      geometry.attributes.alpha.needsUpdate = true;
      rings.forEach(ring => { ring.userData.event = null; ring.visible = false; });
      magnetRing.visible = false;
      lastImpact = lastLanding = lastShieldBlock = null;
      seen = new WeakMap(); previousRace = null; driftEmission = sprayEmission = 0;
      collectVfx.reset(); driftCharge?.reset();
      cursor = 0;
      emissions.fill(0); strengths.fill(0); nozzles.fill(0);
      cores.children.forEach(jet => { jet.visible = false; });
    },
  };
}
