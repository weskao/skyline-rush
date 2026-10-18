import * as THREE from 'three';

// One reusable GPU pool keeps flight vapor, sparks and landing dust bounded.
const COUNT = 480;

export function createEffects(scene, roadCenter) {
  const particles = Array.from({ length: COUNT }, () => ({ life: 0 }));
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const alphas = new Float32Array(COUNT);
  const geometry = new THREE.BufferGeometry();
  for (const [name, array, size] of [['position', positions, 3], ['color', colors, 3], ['size', sizes, 1], ['alpha', alphas, 1]]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage));
  }
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { pixelRatio: { value: Math.min(devicePixelRatio, 1.5) } },
    vertexShader: `attribute vec3 color; attribute float size; attribute float alpha;
      varying vec3 vColor; varying float vAlpha; uniform float pixelRatio;
      void main(){ vColor=color; vAlpha=alpha; vec4 p=modelViewMatrix*vec4(position,1.);
        gl_PointSize=clamp(size*220.*pixelRatio/max(1.,-p.z),0.,85.); gl_Position=projectionMatrix*p; }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha;
      void main(){ float d=length(gl_PointCoord-.5)*2.; if(d>1.) discard;
        float glow=pow(1.-d,2.); gl_FragColor=vec4(vColor,glow*vAlpha); }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0, emission = 0, lastImpact = null, lastLanding = null;
  const blue = [0.25, 0.7, 1.4], orange = [2.5, 0.85, 0.15], mist = [0.45, 0.66, 0.82];
  function emit(x, y, distance, vx, vy, forward, size, life, color, gravity) {
    Object.assign(particles[cursor], { x, y, distance, vx, vy, forward, size, life, maxLife: life, color, gravity });
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
        0.4 + Math.random() * 0.65, color, landing ? 2 : 12);
    }
  }
  const rings = [blue, orange].map(color => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 72), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.event = null;
    scene.add(ring);
    return ring;
  });
  return {
    update(race, dt, center, preview, reducedMotion) {
      dt = Math.max(0, dt);
      const car = race.player;
      const distance = preview ? 340 : car.distance;
      const altitude = preview ? 1.6 : car.altitude;
      const flying = preview || car.thrusting;
      if (car.impact !== lastImpact) {
        lastImpact = car.impact;
        if (lastImpact) { burst(lastImpact, 95, orange, car.speed); rings[1].userData.event = lastImpact; }
      }
      if (car.landing !== lastLanding) {
        lastLanding = car.landing;
        if (lastLanding) { burst(lastLanding, 65, mist, car.speed, true); rings[0].userData.event = lastLanding; }
      }
      if (preview || race.phase === 'racing') {
        emission = flying ? Math.min(emission + dt * (reducedMotion ? 65 : 150), 12) : 0;
        while (emission >= 1) {
          const nozzle = cursor % 4;
          emit(roadCenter(distance) + car.x + (nozzle % 2 ? 0.78 : -0.78), altitude + 0.2,
            distance + (nozzle < 2 ? -1.45 : 1.3), (Math.random() - 0.5) * 0.8,
            -3 - Math.random() * 5, car.speed * 0.15, 0.45 + Math.random() * 0.5,
            0.4 + Math.random() * 0.5, blue, 0);
          emission--;
        }
      }
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        p.life = Math.max(0, p.life - dt);
        if (p.life === 0) { alphas[i] = 0; continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= p.gravity * dt;
        p.distance += p.forward * dt;
        if (p.y < 0.08) { p.y = 0.08; p.vy = 0; p.vx *= 1 + dt; }
        positions.set([p.x - center, p.y, -(p.distance - distance)], i * 3);
        colors.set(p.color, i * 3);
        sizes[i] = p.size * (1.4 - p.life / p.maxLife * 0.4);
        alphas[i] = p.life / p.maxLife * 0.85;
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
      rings.forEach(ring => { ring.userData.event = null; ring.visible = false; });
      lastImpact = lastLanding = null;
      cursor = emission = 0;
    },
  };
}
