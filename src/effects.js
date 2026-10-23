import * as THREE from 'three';

// Shared by the model and its wake, so all four streams start at the actual ports.
export const LIFT_PORTS = [[-0.79, -1.3], [-0.79, 1.45], [0.79, -1.3], [0.79, 1.45]];

// One reusable GPU pool keeps airflow, sparks and landing dust bounded.
const COUNT = 480;

export function createEffects(scene, roadCenter) {
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
      void main(){if(height<.09)discard;float downstream=1.-vUv.y;
        float breakup=.65+.35*sin(vUv.x*37.+downstream*31.-time*38.);
        float envelope=pow(max(0.,1.-downstream),1.6)*smoothstep(0.,.06,downstream);
        gl_FragColor=vec4(.86,.94,1.,power*envelope*breakup*.5);}`,
  });
  for (let i = 0; i < 16; i++) {
    const jet = new THREE.Mesh(coreGeometry, coreMaterial.clone());
    jet.visible = false; cores.add(jet);
  }
  let flowTime = 0;
  let cursor = 0, lastImpact = null, lastLanding = null;
  const emissions = new Float64Array(4), strengths = new Float64Array(4);
  const nozzles = new Uint8Array(4);
  const nozzlePosition = new THREE.Vector3(), nozzleVelocity = new THREE.Vector3();
  const orange = [2.5, 0.85, 0.15], mist = [0.58, 0.64, 0.68], gas = [0.8, 0.87, 0.92];
  const blue = [0.15, 0.8, 2.5], gold = [2.5, 1.8, 0.15], purple = [1.2, 0.3, 2.5], red = [2.5, 0.1, 0.15];
  const spectrum = [red, orange, gold, [0.15, 2, 0.65], blue, purple];
  const pickupColors = { cell: blue, can: orange, tank: gold, overcharge: spectrum };
  const ringColors = { charge: [0.1, 1.8, 2.5], nitro: gold, slipstream: purple, risk: red, mystery: spectrum };
  const ringGeometry = new THREE.TorusGeometry(1, 0.012, 6, 64);
  const rainbow = new Float32Array(ringGeometry.attributes.position.count * 3), tint = new THREE.Color();
  for (let i = 0; i < ringGeometry.attributes.position.count; i++) {
    const angle = Math.atan2(ringGeometry.attributes.position.getY(i), ringGeometry.attributes.position.getX(i));
    tint.setHSL((angle / (Math.PI * 2) + 1) % 1, 1, 0.6).toArray(rainbow, i * 3);
  }
  ringGeometry.setAttribute('color', new THREE.BufferAttribute(rainbow, 3));
  const ringMaterials = Object.fromEntries(Object.entries(ringColors).map(([type, color]) => [type,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(...(type === 'mystery' ? [1, 1, 1] : color)), vertexColors: type === 'mystery', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })]));
  const pickupMaterials = Object.fromEntries(Object.entries(pickupColors).map(([tier, color]) => [tier,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(...(tier === 'overcharge' ? [1, 1, 1] : color)), vertexColors: tier === 'overcharge' })]));
  const gates = new THREE.Group(), pickups = new THREE.Group();
  gates.name = 'Race rings'; pickups.name = 'Nitro pickups';
  scene.add(gates, pickups);
  const pickupGeometry = new THREE.OctahedronGeometry(1);
  const pickupRainbow = new Float32Array(pickupGeometry.attributes.position.count * 3);
  for (let i = 0; i < pickupGeometry.attributes.position.count; i++) tint.setHSL(i / pickupGeometry.attributes.position.count, 1, 0.6).toArray(pickupRainbow, i * 3);
  pickupGeometry.setAttribute('color', new THREE.BufferAttribute(pickupRainbow, 3));
  // Every ring and pickup material variant sits on a pooled mesh at load so the first-frame shader warmup (world.js) draws it.
  const ringVariants = Object.values(ringMaterials), pickupVariants = Object.values(pickupMaterials);
  for (let i = 0; i < 7; i++) gates.add(new THREE.Mesh(ringGeometry, ringVariants[i % ringVariants.length]));
  for (let i = 0; i < 40; i++) pickups.add(new THREE.Mesh(pickupGeometry, pickupVariants[i % pickupVariants.length]));
  const pickupSizes = { cell: 0.28, can: 0.48, tank: 0.7, overcharge: 0.95 };
  let previousRace = null, seen = new WeakSet(), driftEmission = 0;
  function emit(x, y, distance, vx, vy, forward, size, life, color, gravity, kind = 0, opacity = 0.85, radialX = Math.sign(vx)) {
    Object.assign(particles[cursor], { x, y, distance, vx, vy, forward, size, life, maxLife: life, color, gravity, kind, opacity, radialX, grounded: false, phase: cursor * 2.39996 });
    cursor = (cursor + 1) % COUNT;
  }
  function burst(event, count, color, carSpeed, landing = false) {
    const x = roadCenter(event.distance) + event.x;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996;
      const spread = 2 + Math.random() * (landing ? 5 : 11);
      emit(x, landing ? 0.12 : event.altitude + 0.65, event.distance,
        Math.cos(angle) * spread, landing ? 0.4 + Math.random() * 1.5 : 2 + Math.random() * 6,
        carSpeed * (landing ? 0.3 : 0.8) + Math.sin(angle) * spread,
        landing ? 0.6 : 0.08 + Math.random() * 0.18,
        0.4 + Math.random() * 0.65, color.length > 3 ? color[i % color.length] : color, landing ? 2 : 12, landing ? 2 : 0, landing ? 0.2 : 0.85);
    }
  }
  const rings = [orange].map(color => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 72), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.event = null;
    scene.add(ring);
    return ring;
  });
  return {
    update(race, dt, center, preview, reducedMotion, vehicles, options = {}) {
      dt = Math.max(0, dt);
      flowTime += dt;
      const car = race.player;
      const distance = preview ? 340 : car.distance;
      const enabled = options.enabled !== false;
      const active = enabled && !preview && race.phase === 'racing' && dt > 0;
      const lowQuality = options.quality === 'low';
      points.visible = enabled;
      for (let source = 0; source < 2; source++) {
        const items = source === 0 ? race.pickups : race.rings;
        const group = source === 0 ? pickups : gates;
        let slot = 0;
        for (const item of items) {
          const collected = source === 0 ? item.taken : item.hit;
          if (collected && !seen.has(item)) {
            seen.add(item);
            if (previousRace === race && active) burst(item, reducedMotion ? 6 : lowQuality ? 12 : 32,
              source === 0 ? pickupColors[item.tier] : ringColors[item.type], car.speed);
          }
          if (collected || item.distance <= distance || item.distance > distance + 900 || slot >= group.children.length) continue;
          const mesh = group.children[slot++];
          mesh.visible = true;
          if (options.worldPoint) mesh.position.fromArray(options.worldPoint(item.distance, item.x,
            item.altitude + (source === 0 ? 0.85 : 0), distance));
          else mesh.position.set(roadCenter(item.distance) + item.x - center,
            item.altitude + (source === 0 ? 0.85 : 0), -(item.distance - distance));
          mesh.rotation.y = source === 0 ? reducedMotion ? 0 : flowTime : -Math.atan((roadCenter(item.distance + 1) - roadCenter(item.distance - 1)) / 2);
          mesh.scale.setScalar(source === 0 ? pickupSizes[item.tier] : item.radius);
          mesh.material = source === 0 ? pickupMaterials[item.tier] : ringMaterials[item.type];
        }
        for (; slot < group.children.length; slot++) group.children[slot].visible = false;
      }
      previousRace = race;
      if (active && !reducedMotion && car.drift && car.altitude < 0.2) {
        driftEmission = Math.min(8, driftEmission + dt * (lowQuality ? 16 : 60));
        while (driftEmission >= 1) {
          const side = Math.floor(driftEmission) % 2 ? -1 : 1;
          nozzlePosition.set(side * 1.05, 0.12, 1.45);
          const pose = vehicles?.[0];
          if (pose) { pose.updateWorldMatrix(true, false); nozzlePosition.applyMatrix4(pose.matrixWorld); }
          else nozzlePosition.x += roadCenter(car.distance) + car.x - center;
          const x = nozzlePosition.x + center, d = distance - nozzlePosition.z;
          emit(x, 0.12, d, side * 1.5, 0.8, car.speed * 0.25, 0.55, 0.5, mist, 0, 2, 0.3);
          if (car.drift.time >= 1) emit(x, 0.15, d, side * (2 + Math.random() * 3), 1.5, car.speed * 0.3,
            0.12, 0.4, car.drift.time >= 3 ? purple : car.drift.time >= 2 ? orange : blue, 6);
          driftEmission--;
        }
      } else driftEmission = 0;
      if (car.impact !== lastImpact) {
        lastImpact = car.impact;
        if (lastImpact && active) { burst(lastImpact, 95, orange, car.speed); rings[0].userData.event = lastImpact; }
      }
      if (car.landing !== lastLanding) {
        lastLanding = car.landing;
        if (lastLanding && active) burst(lastLanding, 65, mist, car.speed, true);
      }
      for (let source = 0; source <= race.rivals.length; source++) {
        const driver = source === 0 ? car : race.rivals[source - 1];
        const pose = vehicles?.[source];
        const active = enabled && (preview || race.phase === 'racing') && (preview ? source < 2 && (!pose || pose.userData.jets.visible) : driver.thrusting) && pose?.visible !== false;
        strengths[source] = THREE.MathUtils.damp(strengths[source], active ? 1 : 0, active ? 12 : 9, dt);
        for (let port = 0; port < LIFT_PORTS.length; port++) {
          const jet = cores.children[source * 4 + port];
          jet.visible = enabled && !!pose && strengths[source] >= 0.01 && pose.visible;
          if (!jet.visible) continue;
          const [x, z] = LIFT_PORTS[port];
          pose.updateWorldMatrix(true, false);
          jet.position.set(x, 0.19, z).applyMatrix4(pose.matrixWorld);
          pose.getWorldQuaternion(jet.quaternion);
          jet.scale.set(1, 0.65 + strengths[source] * 0.75, 1);
          jet.material.uniforms.power.value = strengths[source] * (reducedMotion ? 0.65 : 1);
          jet.material.uniforms.time.value = flowTime + port * 0.31;
        }
        if (!enabled || strengths[source] < 0.01 || dt === 0) continue;
        const d = preview ? source === 0 ? 340 : 375 + (source - 1) * 28 : driver.distance;
        const altitude = pose ? pose.position.y : preview ? source === 0 ? 1.6 : 5 : driver.altitude;
        const heading = Math.atan((roadCenter(d + 1) - roadCenter(d - 1)) / 2);
        const speed = preview ? 0 : driver.speed;
        if (pose) pose.updateWorldMatrix(true, false);
        emissions[source] = Math.min(12, emissions[source] + dt * strengths[source] * (reducedMotion ? 65 : source === 0 ? 240 : 90));
        while (emissions[source] >= 1) {
          const [x, z] = LIFT_PORTS[nozzles[source]];
          nozzles[source] = (nozzles[source] + 1) % LIFT_PORTS.length;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.sqrt(Math.random()) * 0.12;
          nozzlePosition.set(x + Math.cos(angle) * radius, 0.19, z + Math.sin(angle) * radius);
          nozzleVelocity.set(Math.cos(angle) * 0.8, -18 - Math.random() * 4, Math.sin(angle) * 0.8);
          if (pose) {
            nozzlePosition.applyMatrix4(pose.matrixWorld);
            nozzlePosition.x += center;
            nozzlePosition.z = distance - nozzlePosition.z;
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
        if (p.y < 0.08 && Math.abs(p.x - roadCenter(p.distance)) < 12) {
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
        if (options.worldPoint) {
          positions.set(options.worldPoint(p.distance,p.x-roadCenter(p.distance),p.y,distance),offset);
        } else {
          positions[offset] = p.x - center; positions[offset + 1] = p.y; positions[offset + 2] = -(p.distance - distance);
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
      if (race.phase === 'countdown' || race.phase === 'ready') {
        lastImpact = null; lastLanding = null;
      }
    },
    dispose() {
      gates.removeFromParent(); pickups.removeFromParent();
      ringGeometry.dispose(); pickupGeometry.dispose();
      for (const mat of Object.values(ringMaterials)) mat.dispose();
      for (const mat of Object.values(pickupMaterials)) mat.dispose();
    },
    reset() {
      for (const p of particles) p.life = 0;
      alphas.fill(0);
      geometry.attributes.alpha.needsUpdate = true;
      rings.forEach(ring => { ring.userData.event = null; ring.visible = false; });
      lastImpact = lastLanding = null;
      seen = new WeakSet(); previousRace = null; driftEmission = 0;
      cursor = 0;
      emissions.fill(0); strengths.fill(0); nozzles.fill(0);
      cores.children.forEach(jet => { jet.visible = false; });
    },
  };
}
