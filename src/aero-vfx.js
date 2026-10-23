import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const REAR_PORTS = [-0.62, -0.22, 0.22, 0.62].map(x => ({ position: [x, 0.64, 2.39], direction: [0, 0, 1], size: 0.065 }));
const MAX_PARTICLES = 512, MAX_GHOSTS = 8;
const clamp = THREE.MathUtils.clamp;

// Sample only the observed, collision-resolved path; cap both span and work after a long frame.
export function dashSamples(from, to, spacing, limit, visit) {
  const length = from.distanceTo(to);
  const count = Math.min(limit, Math.max(1, Math.ceil(length / spacing)));
  const start = Math.max(0, 1 - 60 / Math.max(length, 0.001));
  for (let i = 1; i <= count; i++) visit(start + (1 - start) * i / count);
}

function streamGeometry() {
  const paths = [];
  const add = (points, type) => paths.push({ points, type });
  for (const x of [-0.78, -0.39, 0, 0.39, 0.78]) {
    add([[x, 0.65, -4.2], [x, 0.85, -2.5], [x, 1.06, -1.25], [x * 0.88, 1.94, -0.1], [x, 1.92, 0.9], [x, 1.62, 2.35], [x * 1.25, 1.4, 5.8]], 0);
  }
  for (const side of [-1, 1]) {
    for (const y of [0.45, 0.85, 1.15]) add([[side * 0.8, y, -4], [side * 1.35, y, -2.2], [side * 1.46, y, -1.2], [side * 1.4, y, 0.3], [side * 1.47, y, 1.6], [side * 1.3, y, 3], [side * 1.8, y + 0.1, 6]], 0);
    for (const z of [-1.35, 1.42]) add([[side * 1.5, 0.5, z - 0.65], [side * 1.57, 0.98, z], [side * 1.6, 0.6, z + 0.7], [side * 1.75, 0.4, z + 1.6], [side * 1.9, 0.65, z + 2.5]], 2);
    for (const z of [-0.7, 0, 0.75]) add([[side * 2.3, 0.12, z - 1], [side * 1.3, 0.14, z - 0.5], [side * 0.7, 0.17, z], [side * 0.3, 0.2, z + 0.6], [side * 0.3, 0.18, 2.6], [side * 0.45, 0.25, 4]], 1);
    add([[side * 0.7, 1.6, 1.6], [side * 1.05, 1.7, 2.3], [side * 1.3, 1.6, 3.4], [side * 1.4, 1.9, 4.3], [side * 1.1, 1.8, 5.1], [side * 1.4, 1.5, 6.5]], 2);
  }
  const pieces = paths.map(({ points, type }, index) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, 64, type === 1 ? 0.014 : 0.011, 4, false);
    geo.setAttribute('flowType', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(type), 1));
    geo.setAttribute('lane', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(index / paths.length), 1));
    return geo;
  });
  const geometry = mergeGeometries(pieces);
  pieces.forEach(geo => geo.dispose());
  return geometry;
}

export function createAeroVFX(scene, vehicle) {
  const local = new THREE.Group();
  local.name = 'Airflow showcase';
  vehicle.add(local);
  const flow = new THREE.Mesh(streamGeometry(), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: Object.fromEntries(['time', 'power', 'speed', 'density', 'length', 'suction', 'turbulence', 'downforce'].map(key => [key, { value: 0 }])),
    vertexShader: `attribute float flowType; attribute float lane; varying vec2 vUv; varying float vType; varying float vLane;
      uniform float time; uniform float turbulence; uniform float downforce;
      void main(){vUv=uv;vType=flowType;vLane=lane;vec3 p=position;
        float wake=smoothstep(2.5,6.,p.z);p.x+=sin(time*2.+p.z*3.+lane*9.)*wake*turbulence*.13;
        p.y+=wake*downforce*.25;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec2 vUv; varying float vType; varying float vLane;
      uniform float time,power,speed,density,length,suction,downforce;
      void main(){if(vLane>density)discard;
        float t=fract(vUv.x*2.-time*speed+vLane*3.);
        float pulse=smoothstep(1.-length,1.-length+.06,t)*(1.-smoothstep(.91,1.,t));
        float point=pow(max(0.,1.-abs(t-.88)*22.),3.);
        float ends=smoothstep(0.,.09,vUv.x)*(1.-smoothstep(.85,1.,vUv.x));
        float strength=vType>.5&&vType<1.5?suction*(.55+downforce*.45):vType>1.5?.35+downforce*.55:1.;
        vec3 color=mix(vec3(.18,.65,1.),vec3(.7,.95,1.),pulse*.6+point*.4);
        gl_FragColor=vec4(color*(1.+point),ends*power*(.08+pulse*.7+point*.2)*strength);}`,
  }));
  local.add(flow);
  const pressure = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 4.5), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { power: { value: 0 }, time: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float power,time;void main(){vec2 p=vUv*2.-1.;
      float edge=pow(max(0.,1.-dot(p,p)*.65),3.);float wave=.7+.3*sin(length(p)*25.+time*6.);
      gl_FragColor=vec4(.08,.55,.8,edge*wave*power*.15);}`,
  }));
  pressure.rotation.x = -Math.PI / 2; pressure.position.y = 0.11;
  local.add(pressure);

  const jetGeometry = new THREE.CylinderGeometry(1, 4.8, 1, 20, 24, true);
  jetGeometry.rotateX(-Math.PI / 2); jetGeometry.translate(0, 0, 0.5);
  const jetMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, brightness: { value: 1 }, diamonds: { value: 0.5 }, extreme: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float time,power,brightness,diamonds,extreme;
      void main(){float t=clamp(1.-vUv.y,0.,1.); // MSAA slivers extrapolate vUv far past the rim; unclamped, the core overflows to Inf and a zero fade makes NaN
        float cells=pow(max(0.,.5+.5*cos(t*48.)),5.)*diamonds;
        float breakup=.75+.25*sin(vUv.x*52.+t*31.-time*16.);
        float core=exp(-t*7.);float fade=pow(max(0.,1.-t),1.7)*smoothstep(0.,.025,t);
        vec3 color=mix(vec3(.62,.84,1.),vec3(1.),core+cells*.5);
        color=mix(color,vec3(.6,.38,1.),extreme*t*.25);
        gl_FragColor=vec4(color*brightness*(1.+core+cells),fade*(.15+core*.55+cells*.35)*breakup*power);}`,
  });
  const jets = REAR_PORTS.map((port, i) => {
    const jet = new THREE.Mesh(jetGeometry, jetMaterial.clone());
    jet.name = `Cold gas nozzle ${i + 1}`;
    jet.position.fromArray(port.position);
    jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...port.direction));
    local.add(jet);
    return jet;
  });
  jetMaterial.dispose();

  const particles = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0, pos: new THREE.Vector3(), velocity: new THREE.Vector3() }));
  const positions = new Float32Array(MAX_PARTICLES * 3), alphas = new Float32Array(MAX_PARTICLES), sizes = new Float32Array(MAX_PARTICLES);
  const particleGeo = new THREE.BufferGeometry();
  for (const [name, array, size] of [['position', positions, 3], ['alpha', alphas, 1], ['size', sizes, 1]]) particleGeo.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage));
  const vapor = new THREE.Points(particleGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `attribute float alpha,size;varying float vAlpha;void main(){vAlpha=alpha;vec4 p=modelViewMatrix*vec4(position,1.);
      gl_PointSize=clamp(size*240./max(1.,-p.z),0.,80.);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying float vAlpha;void main(){float r=length(gl_PointCoord*2.-1.);if(r>1.)discard;
      gl_FragColor=vec4(.8,.9,.98,exp(-r*r*5.)*(1.-smoothstep(.6,1.,r))*vAlpha);}`,
  }));
  vapor.name = 'World space gas wake'; vapor.frustumCulled = false; scene.add(vapor);
  const segments = Array.from({ length: 64 }, () => ({ life: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), left: new THREE.Vector3(), right: new THREE.Vector3() }));
  const ribbonPositions = new Float32Array(64 * 18), ribbonAlpha = new Float32Array(64 * 6), ribbonUV = new Float32Array(64 * 12);
  const ribbonGeo = new THREE.BufferGeometry();
  for (let i = 0; i < 64; i++) ribbonUV.set([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1], i * 12);
  ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPositions, 3).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('alpha', new THREE.BufferAttribute(ribbonAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(ribbonUV, 2));
  const ribbon = new THREE.Mesh(ribbonGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float alpha;varying float vAlpha;varying vec2 vUv;void main(){vAlpha=alpha;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float vAlpha;varying vec2 vUv;void main(){float edge=pow(max(0.,sin(vUv.x*3.14159)),3.);gl_FragColor=vec4(.5,.8,1.,edge*vAlpha);}',
  }));
  ribbon.name = 'Continuous dash ribbon'; ribbon.frustumCulled = false; scene.add(ribbon);
  let segmentCursor = 0;
  const ribbonFrom = new THREE.Vector3(), ribbonSide = new THREE.Vector3(), corner = new THREE.Vector3();
  const ghostGeometry = new THREE.EdgesGeometry(vehicle.userData.body.geometry, 24);
  const ghosts = Array.from({ length: MAX_GHOSTS }, () => {
    const mesh = new THREE.LineSegments(ghostGeometry, new THREE.LineBasicMaterial({ color: '#85cfff', transparent: true, opacity: 0, depthWrite: false }));
    mesh.visible = false; scene.add(mesh);
    return { mesh, position: new THREE.Vector3(), life: 0 };
  });
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: '#bdeeff', transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 }));
  shock.name = 'Ignition shockwave'; shock.visible = false; scene.add(shock);
  const shockPosition = new THREE.Vector3();
  const previous = new THREE.Vector3(), current = new THREE.Vector3(), sample = new THREE.Vector3(), direction = new THREE.Vector3();
  const previousRotation = new THREE.Quaternion(), sampleRotation = new THREE.Quaternion();
  let hadPosition = false, wasBoosting = false, time = 0, reveal = 0, strength = 0, shockAge = 1, cursor = 0, ghostCursor = 0, emission = 0, ghostDistance = 0, lastImpact = null;
  let quality = 1, settings, delta, centerX, originDistance;
  function emitAt(t) {
    sample.lerpVectors(previous, current, t);
    sampleRotation.slerpQuaternions(previousRotation, vehicle.quaternion, t);
    for (const port of REAR_PORTS) {
      const p = particles[cursor]; cursor = (cursor + 1) % Math.round(MAX_PARTICLES * quality);
      p.pos.fromArray(port.position).applyQuaternion(sampleRotation).add(sample);
      p.velocity.fromArray(port.direction).applyQuaternion(sampleRotation).multiplyScalar(18 + strength * 20);
      p.velocity.x += Math.sin(cursor * 2.4) * 1.5; p.velocity.y += Math.cos(cursor * 1.7) * 0.7;
      p.life = p.maxLife = Math.min(1.1, settings.trailLength / Math.max(30, delta));
      p.size = 0.22; p.opacity = strength * settings.vaporDensity * 0.35;
    }
  }
  function reset() {
    particles.forEach(p => { p.life = 0; }); alphas.fill(0); particleGeo.attributes.alpha.needsUpdate = true;
    segments.forEach(s => { s.life = 0; }); ribbonAlpha.fill(0); ribbonGeo.attributes.alpha.needsUpdate = true;
    ghosts.forEach(g => { g.life = 0; g.mesh.visible = false; });
    jets.forEach(jet => { jet.visible = false; }); flow.visible = pressure.visible = shock.visible = false;
    hadPosition = wasBoosting = false; strength = reveal = emission = ghostDistance = 0; shockAge = 1; lastImpact = null;
  }
  return {
    reset,
    update(race, dt, center, distance, options, reducedMotion) {
      settings = options; centerX = center; originDistance = distance;
      dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
      const car = race.player, active = race.phase === 'racing', preview = race.phase === 'ready';
      const enabled = settings.enabled;
      const boost = active && (car.boosting || car.nitroTime > 0 || car.miniBoost > 0) && enabled;
      const calm = reducedMotion || settings.comfortable;
      quality = settings.quality === 'low' ? 0.25 : settings.quality === 'medium' ? 0.5 : 1;
      if (calm) quality = Math.min(quality, 0.5);
      time += dt;
      const show = settings.airflow && enabled;
      reveal = THREE.MathUtils.damp(reveal, show ? 1 : 0, show ? 3 : 6, dt);
      const demonstration = show && preview ? 0.32 * THREE.MathUtils.smoothstep(reveal, 0.85, 0.99) : 0;
      strength = THREE.MathUtils.damp(strength, boost ? 1 : demonstration, boost ? 55 : 7, dt);
      vehicle.updateWorldMatrix(true, false);
      current.copy(vehicle.position); current.x += center; current.z -= distance;
      if (!hadPosition || car.impact !== lastImpact || !enabled) {
        previous.copy(current); previousRotation.copy(vehicle.quaternion); hadPosition = true;
      }
      if (boost && !wasBoosting) {
        shockAge = 0; shockPosition.copy(current); shock.quaternion.copy(vehicle.quaternion);
      }
      wasBoosting = boost; lastImpact = car.impact;
      shockAge += dt;
      const fu = flow.material.uniforms;
      fu.time.value = time; fu.speed.value = settings.airflowSpeed * (0.45 + car.speed / 90 + strength * 0.6);
      fu.power.value = reveal * settings.airflowOpacity * (1 + strength * 0.35);
      fu.density.value = settings.airflowDensity * (0.5 + quality * 0.5);
      fu.length.value = Math.min(0.85, settings.streamlineLength + car.speed / 600);
      fu.suction.value = settings.suction / (1 + Math.max(0, vehicle.position.y) * 2);
      fu.turbulence.value = settings.turbulence * (calm ? 0.3 : 1);
      fu.downforce.value = settings.aeroMode === 'downforce' ? 1 : 0;
      flow.visible = reveal > 0.005;
      pressure.visible = flow.visible && vehicle.position.y < 0.6;
      pressure.material.uniforms.power.value = reveal * fu.suction.value * (settings.aeroMode === 'downforce' ? 1 : 0.35);
      pressure.material.uniforms.time.value = time;
      jets.forEach((jet, i) => {
        jet.visible = strength > 0.005;
        jet.scale.set(REAR_PORTS[i].size, REAR_PORTS[i].size, settings.exhaustLength * strength * (0.65 + car.speed / 200));
        const u = jet.material.uniforms;
        u.time.value = time + i * 0.13; u.power.value = strength;
        u.brightness.value = Math.min(settings.coreBrightness, calm ? 0.9 : 3);
        u.diamonds.value = settings.machDiamonds; u.extreme.value = settings.preset === 'extreme' ? 1 : 0;
      });
      delta = car.speed;
      if (strength > 0.01 && enabled && dt > 0) {
        emission += dt * 35 * quality * settings.vaporDensity;
        if (emission >= 1) {
          dashSamples(previous, current, 0.6 / quality, Math.min(32, Math.ceil(emission) + Math.ceil(previous.distanceTo(current) * quality)), emitAt);
          emission %= 1;
        }
      }
      if (boost && !calm && settings.afterimages > 0 && dt > 0) {
        ghostDistance += previous.distanceTo(current);
        if (ghostDistance > 2.4) {
          dashSamples(previous, current, 2.4, Math.min(settings.afterimages, Math.ceil(MAX_GHOSTS * quality)), t => {
            const ghost = ghosts[ghostCursor]; ghostCursor = (ghostCursor + 1) % settings.afterimages;
            ghost.position.lerpVectors(previous, current, t);
            ghost.mesh.quaternion.slerpQuaternions(previousRotation, vehicle.quaternion, t);
            ghost.life = 0.45;
          });
          ghostDistance %= 2.4;
        }
      }
      if (boost && dt > 0 && previous.distanceToSquared(current) > 0.0001) {
        const start = Math.max(0, 1 - 60 / previous.distanceTo(current));
        sample.lerpVectors(previous, current, start);
        sampleRotation.slerpQuaternions(previousRotation, vehicle.quaternion, start);
        ribbonFrom.set(0, 0.55, 2.5).applyQuaternion(sampleRotation).add(sample);
        ribbonSide.set(0.65, 0, 0).applyQuaternion(sampleRotation);
        dashSamples(previous, current, 0.8 / quality, 16, t => {
          const s = segments[segmentCursor]; segmentCursor = (segmentCursor + 1) % segments.length;
          s.a.copy(ribbonFrom); s.left.copy(ribbonSide);
          sampleRotation.slerpQuaternions(previousRotation, vehicle.quaternion, t);
          sample.lerpVectors(previous, current, t);
          s.b.set(0, 0.55, 2.5).applyQuaternion(sampleRotation).add(sample);
          s.right.set(0.65, 0, 0).applyQuaternion(sampleRotation);
          s.life = s.maxLife = Math.min(0.6, settings.trailLength / Math.max(30, car.speed));
          ribbonFrom.copy(s.b); ribbonSide.copy(s.right);
        });
      }
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i]; s.life = Math.max(0, s.life - dt);
        for (let j = 0; j < 6; j++) {
          const end = j === 2 || j === 4 || j === 5, side = j === 1 || j === 3 || j === 4 ? 1 : -1;
          corner.copy(end ? s.b : s.a).addScaledVector(end ? s.right : s.left, side);
          const offset = i * 18 + j * 3;
          ribbonPositions[offset] = corner.x - center; ribbonPositions[offset + 1] = corner.y; ribbonPositions[offset + 2] = corner.z + distance;
          ribbonAlpha[i * 6 + j] = enabled && s.life > 0 ? s.life / s.maxLife * (calm ? 0.04 : 0.12) : 0;
        }
      }
      ribbonGeo.attributes.position.needsUpdate = ribbonGeo.attributes.alpha.needsUpdate = true;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i]; p.life = Math.max(0, p.life - dt);
        alphas[i] = 0;
        if (p.life === 0) continue;
        p.pos.addScaledVector(p.velocity, dt); p.velocity.multiplyScalar(Math.exp(-dt * 2));
        if (p.pos.y < 0.09) { p.pos.y = 0.09; p.velocity.y = Math.abs(p.velocity.y) * 0.1; p.velocity.x *= 1 + dt; }
        const age = p.maxLife - p.life;
        positions[i * 3] = p.pos.x - centerX; positions[i * 3 + 1] = p.pos.y; positions[i * 3 + 2] = p.pos.z + originDistance;
        sizes[i] = p.size + age * 2;
        alphas[i] = p.opacity * Math.min(1, age * 25) * (p.life / p.maxLife) ** 1.5;
      }
      for (const attribute of Object.values(particleGeo.attributes)) attribute.needsUpdate = true;
      for (let i = 0; i < ghosts.length; i++) {
        const g = ghosts[i]; g.life = Math.max(0, g.life - dt);
        g.mesh.visible = enabled && !calm && g.life > 0 && i < settings.afterimages;
        g.mesh.position.copy(g.position); g.mesh.position.x -= center; g.mesh.position.z += distance;
        g.mesh.material.opacity = g.life / 0.45 * 0.14;
      }
      shock.visible = enabled && !calm && shockAge < 0.23;
      shock.position.copy(shockPosition); shock.position.x -= center; shock.position.z += distance;
      shock.scale.setScalar(0.5 + shockAge * 20);
      shock.material.opacity = Math.max(0, 1 - shockAge / 0.23) ** 2 * settings.shockwave * 0.45;
      previous.copy(current); previousRotation.copy(vehicle.quaternion);
      direction.set(0, 0.64, 3).applyMatrix4(vehicle.matrixWorld);
      return { strength, ignition: boost ? Math.max(0, 1 - shockAge / 0.25) : 0, nozzle: direction, reveal };
    },
  };
}
