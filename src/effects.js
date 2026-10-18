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
  let cursor = 0, lastImpact = null, lastLanding = null;
  const emissions = new Float64Array(4), strengths = new Float64Array(4);
  const nozzles = new Uint8Array(4);
  const nozzlePosition = new THREE.Vector3(), nozzleVelocity = new THREE.Vector3();
  const orange = [2.5, 0.85, 0.15], mist = [0.58, 0.64, 0.68];
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
        0.4 + Math.random() * 0.65, color, landing ? 2 : 12, landing ? 2 : 0, landing ? 0.2 : 0.85);
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
    update(race, dt, center, preview, reducedMotion, vehicles) {
      dt = Math.max(0, dt);
      const car = race.player;
      const distance = preview ? 340 : car.distance;
      if (car.impact !== lastImpact) {
        lastImpact = car.impact;
        if (lastImpact) { burst(lastImpact, 95, orange, car.speed); rings[0].userData.event = lastImpact; }
      }
      if (car.landing !== lastLanding) {
        lastLanding = car.landing;
        if (lastLanding) burst(lastLanding, 65, mist, car.speed, true);
      }
      for (let source = 0; source <= race.rivals.length; source++) {
        const driver = source === 0 ? car : race.rivals[source - 1];
        const pose = vehicles?.[source];
        const active = (preview || race.phase === 'racing') && (preview ? source < 2 && (!pose || pose.userData.jets.visible) : driver.thrusting) && pose?.visible !== false;
        strengths[source] = THREE.MathUtils.damp(strengths[source], active ? 1 : 0, active ? 12 : 9, dt);
        if (strengths[source] < 0.01 || dt === 0) continue;
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
          nozzleVelocity.set(Math.sign(x) * (0.5 + Math.random()), -12 - Math.random() * 5, 0);
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
            reducedMotion ? 0.85 : 1.15 + Math.random() * 0.5,
            0.55 + Math.random() * 0.3, mist, 0, 1, strengths[source] * 0.32, Math.sign(x));
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
            p.vx = p.radialX * spread;
            p.forward = p.forward * 0.22 + Math.sin(p.phase) * spread * 0.6;
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
        positions[offset] = p.x - center; positions[offset + 1] = p.y; positions[offset + 2] = -(p.distance - distance);
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
          ring.position.set(roadCenter(event.distance) + event.x - center, 0.05, -(event.distance - distance));
          ring.scale.setScalar(1 + age * (reducedMotion ? 3 : 14));
          ring.material.opacity = (1 - age / 0.7) * 0.55;
        }
        if (!event || race.elapsed < event.time) ring.visible = false;
      });
      if (race.phase === 'countdown' || race.phase === 'ready') {
        lastImpact = null; lastLanding = null;
      }
    },
    reset() {
      for (const p of particles) p.life = 0;
      alphas.fill(0);
      geometry.attributes.alpha.needsUpdate = true;
      rings.forEach(ring => { ring.userData.event = null; ring.visible = false; });
      lastImpact = lastLanding = null;
      cursor = 0;
      emissions.fill(0); strengths.fill(0); nozzles.fill(0);
    },
  };
}
