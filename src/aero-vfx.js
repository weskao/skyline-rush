import * as THREE from 'three';
import { skinVfxPalette, skinVfxPattern } from '#garage-skin-palette';
import { createVoidPulseBeams } from '#garage-void-beams';
import { createLaunchFlare } from '#garage-launch-flare';
import { createNitroTrail } from '#garage-nitro-trail';
import { TRICK_ROLL_TIME } from './game.js';
import { plumeLook, thrusterGlow } from './board-effects.ts';
import { createThrusterGlow } from './thruster-glow.ts';
import { SKIN_MOTION, airflowFrame, measureAirflowProfile, streamGeometry } from './airflow-geometry.ts';

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

export function createAeroVFX(scene, vehicle, ground) { // ground: the car's contact-shadow plane, when the scene has one
  const proceduralProfile = measureAirflowProfile(vehicle);
  const local = new THREE.Group();
  local.name = 'Airflow showcase';
  vehicle.add(local);
  const flow = new THREE.Mesh(streamGeometry(proceduralProfile), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...Object.fromEntries(['time', 'power', 'speed', 'density', 'length', 'suction', 'turbulence', 'downforce', 'nitroMix'].map(key => [key, { value: 0 }])), wakeRange: { value: new THREE.Vector2() }, rippleScale: { value: new THREE.Vector2() }, skinTint: { value: new THREE.Vector3(1, 1, 1) }, skinPattern: { value: 0 }, trailAccent: { value: new THREE.Vector4(1, 1, 1, 0) } },
    vertexShader: `attribute float flowType; attribute float lane; attribute vec2 flowOutward; varying vec2 vUv; varying float vType; varying float vLane;
      uniform float time; uniform float turbulence; uniform float downforce;uniform float skinPattern; uniform vec2 wakeRange, rippleScale;
      void main(){vUv=uv;vType=flowType;vLane=lane;vec3 p=position;
        float wake=smoothstep(wakeRange.x,wakeRange.y,p.z);p.x+=sin(time*2.+p.z*3.+lane*9.)*wake*turbulence*.13*rippleScale.x;
        p.y+=wake*downforce*.25*rippleScale.y;
        float along=(position.z-wakeRange.x)/(wakeRange.y-wakeRange.x);
        float phase=along*(7.+skinPattern*3.)+time*(1.+skinPattern*.7)+lane*6.28;
        if(skinPattern>.5){
          float ripple=(.5+.5*sin(phase))*(${SKIN_MOTION.ripple[0]}+skinPattern*${SKIN_MOTION.ripple[1]})*(1.+wake);
          p.xy+=flowOutward*rippleScale*ripple;
          if(skinPattern>1.5&&flowType!=1.){
            vec2 tangent=vec2(flowOutward.y,-flowOutward.x);
            p.xy+=tangent*rippleScale*cos(phase)*(${SKIN_MOTION.sway[0]}+skinPattern*${SKIN_MOTION.sway[1]});
          }
        }
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec2 vUv; varying float vType; varying float vLane;
      uniform float time,power,speed,density,length,suction,downforce,nitroMix,skinPattern;uniform vec3 skinTint;uniform vec4 trailAccent;
      void main(){if(vLane>density)discard;
        float t=fract(vUv.x*2.-time*speed+vLane*3.);
        float pulse=smoothstep(1.-length,1.-length+.06,t)*(1.-smoothstep(.91,1.,t));
        float point=pow(max(0.,1.-abs(t-.88)*22.),3.);
        float ends=smoothstep(0.,.09,vUv.x)*(1.-smoothstep(.85,1.,vUv.x));
        float strength=vType>.5&&vType<1.5?suction*(.55+downforce*.45):vType>1.5?.35+downforce*.55:1.;
        vec3 color=mix(vec3(.18,.65,1.),vec3(.7,.95,1.),pulse*.6+point*.4)*skinTint;
        color=mix(color,mix(vec3(.72,.4,1.),trailAccent.rgb,trailAccent.a),clamp(nitroMix,0.,1.)*.85); // an equipped trail skin replaces the NITRO purple
        float pattern=1.;
        if(skinPattern>.5) pattern=.6+.4*sin(vUv.y*11.+time*(2.+skinPattern));
        if(skinPattern>1.5) pattern=.35+.65*abs(sin(vUv.y*(12.+skinPattern*4.)+time*4.+vLane*8.));
        if(skinPattern>2.5) pattern=step(.4,fract(vUv.y*9.+vLane*4.+time));
        gl_FragColor=vec4(color*(1.+point),ends*power*(.08+pulse*.7+point*.2)*strength*pattern);}`,
  }));
  local.add(flow);
  const pressure = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { power: { value: 0 }, time: { value: 0 }, skinTint: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float power,time;uniform vec3 skinTint;void main(){vec2 p=vUv*2.-1.;
      float edge=pow(max(0.,1.-dot(p,p)*.65),3.);float wave=.7+.3*sin(length(p)*25.+time*6.);
      gl_FragColor=vec4(vec3(.08,.55,.8)*skinTint,edge*wave*power*.15);}`,
  }));
  pressure.rotation.x = -Math.PI / 2; pressure.position.y = 0.11;
  local.add(pressure);
  function placeAirflow(profile) {
    Object.assign(vehicle.userData, { visualBounds: profile.bounds, pickupProfile: profile }); // also fits the pickup VFX
    const frame = airflowFrame(profile), { wakeRange, rippleScale } = flow.material.uniforms;
    pressure.position.x = frame.pressure.x;
    pressure.position.z = frame.pressure.z;
    pressure.scale.set(frame.pressure.width, frame.pressure.length, 1);
    wakeRange.value.fromArray(frame.wakeRange);
    rippleScale.value.fromArray(frame.motionScale);
    trailAnchor.set(frame.trail.x, frame.trail.y, frame.trail.z);
    return frame.trail.halfWidth;
  }
  const trailAnchor = new THREE.Vector3();
  let trailHalfWidth = placeAirflow(proceduralProfile);
  const rear = new THREE.Group(); rear.name = 'Rear ports'; local.add(rear); // garage-model.ts moves it onto a dressed GLB's nozzles

  const jetGeometry = new THREE.CylinderGeometry(1, 4.8, 1, 20, 24, true);
  jetGeometry.rotateX(-Math.PI / 2); jetGeometry.translate(0, 0, 0.5);
  const jetMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, brightness: { value: 1 }, diamonds: { value: 0.5 }, extreme: { value: 0 }, nitroMix: { value: 0 }, tail: { value: 0 }, skinTint: { value: new THREE.Vector3(1, 1, 1) }, skinPattern: { value: 0 }, trailAccent: { value: new THREE.Vector4(1, 1, 1, 0) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float time,power,brightness,diamonds,extreme,nitroMix,skinPattern,tail;uniform vec3 skinTint;uniform vec4 trailAccent;
      void main(){float t=clamp(1.-vUv.y,0.,1.); // MSAA slivers extrapolate vUv far past the rim; unclamped, the core overflows to Inf and a zero fade makes NaN
        float cells=pow(max(0.,.5+.5*cos(t*48.)),5.)*diamonds;
        float breakup=.75+.25*sin(vUv.x*52.+t*31.-time*16.);
        float core=exp(-t*7.);float fade=pow(max(0.,1.-t),1.7)*smoothstep(0.,.025,t);
        vec3 color=mix(vec3(.62,.84,1.),vec3(1.),core+cells*.5);
        color=mix(color,vec3(.6,.38,1.),extreme*t*.25);
        color=mix(color,vec3(1.,.38,.78),tail*smoothstep(.2,1.,t)); // board plume (Medium+): the blue-white core fades to magenta
        color=mix(color*skinTint,mix(vec3(.68,.42,1.),trailAccent.rgb,trailAccent.a),clamp(nitroMix,0.,1.)*(.65+.27*trailAccent.a)); // skin tints the base; NITRO is purple or the trail skin's colour
        float shape=1.;
        if(skinPattern>.5) shape=.6+.4*abs(sin(vUv.x*10.+t*18.-time*6.));
        if(skinPattern>1.5) shape=.25+.75*abs(sin(vUv.x*6.28*3.+t*28.-time*11.));
        if(skinPattern>2.5) shape=step(.45,fract(t*7.+time*3.+vUv.x*3.));
        gl_FragColor=vec4(color*brightness*(1.+core+cells),fade*(.15+core*.55+cells*.35)*breakup*power*shape);}`,
  });
  const jets = REAR_PORTS.map((port, i) => {
    const jet = new THREE.Mesh(jetGeometry, jetMaterial.clone());
    jet.name = `Cold gas nozzle ${i + 1}`;
    jet.position.fromArray(port.position);
    jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...port.direction));
    rear.add(jet);
    return jet;
  });
  jetMaterial.dispose();
  const voidBeams = createVoidPulseBeams(rear, REAR_PORTS);
  const nitroTrail = createNitroTrail(rear, REAR_PORTS);
  const glow = createThrusterGlow(rear, REAR_PORTS);

  const particles = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0, roll: false, pos: new THREE.Vector3(), velocity: new THREE.Vector3() }));
  const positions = new Float32Array(MAX_PARTICLES * 3), alphas = new Float32Array(MAX_PARTICLES), sizes = new Float32Array(MAX_PARTICLES);
  const particleGeo = new THREE.BufferGeometry();
  for (const [name, array, size] of [['position', positions, 3], ['alpha', alphas, 1], ['size', sizes, 1]]) particleGeo.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage));
  const vapor = new THREE.Points(particleGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { skinTint: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: `attribute float alpha,size;varying float vAlpha;void main(){vAlpha=alpha;vec4 p=modelViewMatrix*vec4(position,1.);
      gl_PointSize=clamp(size*240./max(1.,-p.z),0.,80.);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying float vAlpha;uniform vec3 skinTint;void main(){float r=length(gl_PointCoord*2.-1.);if(r>1.)discard;
      gl_FragColor=vec4(vec3(.8,.9,.98)*skinTint,exp(-r*r*5.)*(1.-smoothstep(.6,1.,r))*vAlpha);}`,
  }));
  vapor.name = 'World space gas wake'; vapor.frustumCulled = false; scene.add(vapor);
  const segments = Array.from({ length: 64 }, () => ({ life: 0, roll: false, a: new THREE.Vector3(), b: new THREE.Vector3(), left: new THREE.Vector3(), right: new THREE.Vector3() }));
  const ribbonPositions = new Float32Array(64 * 18), ribbonAlpha = new Float32Array(64 * 6), ribbonUV = new Float32Array(64 * 12), ribbonKinds = new Float32Array(64 * 6);
  const ribbonGeo = new THREE.BufferGeometry();
  for (let i = 0; i < 64; i++) ribbonUV.set([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1], i * 12);
  ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPositions, 3).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('alpha', new THREE.BufferAttribute(ribbonAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('rollWake', new THREE.BufferAttribute(ribbonKinds, 1).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(ribbonUV, 2));
  const ribbon = new THREE.Mesh(ribbonGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { skinTint: { value: new THREE.Vector3(1, 1, 1) }, skinPattern: { value: 0 }, time: { value: 0 } },
    vertexShader: 'attribute float alpha,rollWake;varying float vAlpha,vRoll;varying vec2 vUv;void main(){vAlpha=alpha;vRoll=rollWake;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float vAlpha,vRoll;varying vec2 vUv;uniform vec3 skinTint;uniform float skinPattern,time;void main(){float u=clamp(vUv.x,0.,1.);float edge=vRoll>.5?pow(max(0.,1.-min(u,1.-u)*12.),2.):pow(max(0.,sin(u*3.14159)),3.);float shape=1.;if(vRoll<.5){if(skinPattern>.5)shape=.65+.35*cos(vUv.x*14.+vUv.y*6.);if(skinPattern>1.5)shape=.3+.7*abs(sin(vUv.x*28.+vUv.y*12.));if(skinPattern>2.5)shape=step(.44,fract(vUv.y*7.+vUv.x*2.));if(skinPattern>3.5)shape=.3+.7*pow(max(0.,abs(sin(vUv.y*25.+vUv.x*16.-time*9.))),6.);}gl_FragColor=vec4(vec3(.5,.8,1.)*skinTint,edge*vAlpha*shape);}',
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
  const flare = createLaunchFlare(local, vehicle, ground); // premium launch flares: badge-matched burst + body glow
  const shockPosition = new THREE.Vector3();
  const previous = new THREE.Vector3(), current = new THREE.Vector3(), sample = new THREE.Vector3(), direction = new THREE.Vector3();
  const previousRotation = new THREE.Quaternion(), sampleRotation = new THREE.Quaternion();
  const shockColor = new THREE.Color('#bdeeff'), nitroShockColor = new THREE.Color('#b98aff');
  let hadPosition = false, wasBoosting = false, wasNitro = false, time = 0, reveal = 0, strength = 0, rollStrength = 0, wakeStrength = 0, shockAge = 1, cursor = 0, ghostCursor = 0, emission = 0, ghostDistance = 0, lastImpact = null;
  let quality = 1, settings, delta, launchSkinActive = false, launchPattern = 0, voidPulse = false, lastPhase = 'ready', demoPulseClock = 2.2;
  function emitAt(t) {
    sample.lerpVectors(previous, current, t);
    sampleRotation.slerpQuaternions(previousRotation, vehicle.quaternion, t);
    for (const port of REAR_PORTS) {
      const p = particles[cursor]; cursor = (cursor + 1) % Math.round(MAX_PARTICLES * quality);
      p.pos.fromArray(port.position).add(rear.position).applyQuaternion(sampleRotation).add(sample);
      p.roll = rollStrength * .7 > strength;
      // shortcut: still-air frozen-convection markers; use a validated flow solver for pressure or swirl predictions.
      if (p.roll) p.velocity.set(0, 0, 0);
      else {
        p.velocity.fromArray(port.direction).applyQuaternion(sampleRotation).multiplyScalar(18 + strength * 20);
        p.velocity.x += Math.sin(cursor * 2.4) * 1.5; p.velocity.y += Math.cos(cursor * 1.7) * 0.7;
      }
      p.life = p.maxLife = Math.min(1.1, settings.trailLength / Math.max(30, delta));
      p.size = 0.22; p.opacity = (p.roll ? rollStrength * settings.airflowDensity * settings.airflowOpacity * .6 : strength * .35) * settings.vaporDensity;
    }
  }
  function reset() {
    particles.forEach(p => { p.life = 0; }); alphas.fill(0); particleGeo.attributes.alpha.needsUpdate = true;
    segments.forEach(s => { s.life = 0; }); ribbonAlpha.fill(0); ribbonGeo.attributes.alpha.needsUpdate = true;
    ghosts.forEach(g => { g.life = 0; g.mesh.visible = false; });
    glow.update(0);
    jets.forEach(jet => { jet.visible = false; }); flow.visible = pressure.visible = shock.visible = false;
    voidBeams.update(time, 0, 0, false); nitroTrail.update(time, 0, 0, false); flare.reset(); demoPulseClock = 2.2;
    hadPosition = wasBoosting = wasNitro = false; strength = rollStrength = wakeStrength = reveal = emission = ghostDistance = 0; shockAge = 1; lastImpact = null; lastPhase = 'ready';
  }
  return {
    reset,
    setSkins(ids) {
      // Event-driven cosmetic updates reuse existing materials, geometries and GPU buffers.
      const palette = skinVfxPalette(ids ?? {}), patterns = skinVfxPattern(ids ?? {});
      if (launchPattern !== patterns['launch-flare']) demoPulseClock = 2.2;
      launchPattern = patterns['launch-flare'];
      launchSkinActive = launchPattern > 0;
      voidPulse = patterns.thruster === 3; // its beams replace the nozzle flames
      voidBeams.setSelected(voidPulse);
      flow.material.uniforms.skinTint.value.fromArray(palette.airflow);
      pressure.material.uniforms.skinTint.value.fromArray(palette.airflow);
      flow.material.uniforms.skinPattern.value = patterns.airflow;
      glow.tint.fromArray(palette.thruster);
      for (const jet of jets) {
        jet.material.uniforms.skinTint.value.fromArray(palette.thruster);
        jet.material.uniforms.skinPattern.value = patterns.thruster;
      }
      vapor.material.uniforms.skinTint.value.fromArray(palette['nitro-trail']);
      ribbon.material.uniforms.skinTint.value.fromArray(palette['nitro-trail']);
      ribbon.material.uniforms.skinPattern.value = patterns['nitro-trail'];
      shock.userData.skinPattern = launchPattern;
      flare.setSkin(ids?.['launch-flare']);
      const trail = palette['nitro-trail'], skinned = trail.some(v => v !== 1);
      flow.material.uniforms.trailAccent.value.set(.5 * trail[0], .8 * trail[1], trail[2], skinned ? 1 : 0); // the ribbon's colour
      for (const jet of jets) jet.material.uniforms.trailAccent.value.copy(flow.material.uniforms.trailAccent.value);
      nitroTrail.setStyle(patterns['nitro-trail'], [.5 * trail[0], .8 * trail[1], trail[2]]);
      if (skinned) nitroShockColor.setRGB(.5 * trail[0], .8 * trail[1], trail[2]);
      else nitroShockColor.set('#b98aff');
      if (launchSkinActive) shockColor.setRGB(...palette['launch-flare']);
      else shockColor.set('#bdeeff');
      shock.material.color.copy(shockColor);
    },
    group: local, // effects riding on the vehicle; not part of its silhouette
    fitAirflow(model) {
      const profile = model ? measureAirflowProfile(model, vehicle) : proceduralProfile;
      flow.geometry.dispose();
      flow.geometry = streamGeometry(profile);
      trailHalfWidth = placeAirflow(profile);
    },
    inspectCosmetics() {
      return { voidBeams: voidBeams.mesh.visible, launchPattern,
        launchPreviewActive: flare.active || (shock.visible && shock.material.opacity > 0),
        thrusterPattern: jets[0].material.uniforms.skinPattern.value,
        airflowPattern: flow.material.uniforms.skinPattern.value,
        trailPattern: ribbon.material.uniforms.skinPattern.value };
    },
    update(race, dt, origin, options, reducedMotion, sprintFrame = null, studioDemo = false) {
      settings = options;
      dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
      const car = race.player, active = race.phase === 'racing', preview = race.phase === 'ready';
      const enabled = settings.enabled;
      const boost = active && (car.boosting || car.nitroTime > 0 || car.miniBoost > 0) && enabled;
      const nitroActive = boost && car.nitroTime > 0;
      const sprintPower = sprintFrame ? sprintFrame.power : boost ? 1 : 0;
      const nitroMix = sprintFrame ? sprintFrame.nitroMix : nitroActive ? 1 : 0;
      const calm = reducedMotion || settings.comfortable;
      quality = settings.quality === 'low' ? 0.25 : settings.quality === 'medium' ? 0.5 : 1;
      if (calm) quality = Math.min(quality, 0.5);
      if (!calm) time += dt; // Reduced Motion/Comfortable: shader clocks and the showroom emission sweep hold still
      const rollEnabled = enabled && !calm && settings.quality !== 'low' && settings.airflowDensity > 0 && settings.airflowOpacity > 0;
      const rolling = active && car.altitude > 0 && car.trick && !car.trick.done && car.trick.time < TRICK_ROLL_TIME;
      rollStrength = rollEnabled ? THREE.MathUtils.damp(rollStrength, rolling ? 1 : 0, rolling ? 35 : 8, dt) : 0;
      let ribbonKindDirty = false;
      const show = settings.airflow && enabled; // V/AIRFLOW alone owns the streamlines; sprint keeps jets, ribbon and screen streaks
      reveal = enabled ? THREE.MathUtils.damp(reveal, show ? 1 : 0, show ? 3 : 6, dt) : 0;
      const demonstration = show && preview ? 0.32 * THREE.MathUtils.smoothstep(reveal, 0.85, 0.99) : 0;
      strength = enabled ? THREE.MathUtils.damp(strength, boost ? sprintPower : demonstration, boost ? 55 : 7, dt) : 0;
      // A selected showroom skin must be visible without requiring racing or NITRO input.
      // This presentation-only floor never changes race physics or Reduced Motion.
      if (studioDemo && preview && enabled && !calm) strength = Math.max(strength, 0.32);
      wakeStrength = Math.max(strength, rollStrength * .7);
      vehicle.updateWorldMatrix(true, false);
      current.copy(vehicle.position).add(origin);
      // Home showroom remains stationary: animate an emission sample, not the car or race state.
      if (studioDemo && preview) current.z += Math.sin(time * 2) * 0.65;
      // Studio (including Garage Home) loops ignition events; live racing never repeats them.
      if (studioDemo && enabled && !calm && (demoPulseClock += dt) >= 2.2) {
        demoPulseClock = 0;
        flare.trigger(current, vehicle.quaternion, 1.6); // Studio previews premium flares only: no standard ring loop
      }
      if (!hadPosition || car.impact !== lastImpact || !enabled) {
        previous.copy(current); previousRotation.copy(vehicle.quaternion); hadPosition = true;
      }
      const countingDown = launchSkinActive && race.phase === 'countdown'; // the flare plays through 3-2-1, then bursts at GO
      flare.hold(countingDown);
      if (countingDown && !flare.active) flare.trigger(current, vehicle.quaternion, 1.4);
      const launching = launchSkinActive && active && (lastPhase === 'ready' || lastPhase === 'countdown');
      const flared = launching && flare.trigger(current, vehicle.quaternion, 1.1);
      if (!flared && ((boost && !wasBoosting) || (nitroActive && !wasNitro) || launching)) {
        shockAge = 0; shockPosition.copy(current); shock.quaternion.copy(vehicle.quaternion);
      }
      wasBoosting = boost; wasNitro = nitroActive; lastPhase = race.phase; lastImpact = car.impact;
      shock.material.color.copy(nitroActive && !studioDemo ? nitroShockColor : shockColor);
      shockAge += dt;
      const fu = flow.material.uniforms;
      fu.time.value = time; fu.speed.value = settings.airflowSpeed * (0.45 + car.speed / 90 + strength * 0.6);
      fu.nitroMix.value = nitroMix;
      fu.power.value = calm ? reveal * settings.airflowOpacity * 0.15 : Math.max(reveal * settings.airflowOpacity * (1 + strength * 0.35), sprintPower * settings.speedLines * 0.65);
      fu.density.value = Math.max(settings.airflowDensity * (0.5 + quality * 0.5), sprintPower * settings.speedLines * (0.5 + quality * 0.5));
      fu.length.value = Math.min(0.85, settings.streamlineLength + car.speed / 600);
      fu.suction.value = settings.suction / (1 + Math.max(0, vehicle.position.y) * 2);
      fu.turbulence.value = settings.turbulence * (calm ? 0.3 : 1);
      fu.downforce.value = settings.aeroMode === 'downforce' ? 1 : 0;
      flow.visible = reveal > 0.005;
      pressure.visible = flow.visible && vehicle.position.y < 0.6;
      pressure.material.uniforms.power.value = reveal * fu.suction.value * (settings.aeroMode === 'downforce' ? 1 : 0.35);
      pressure.material.uniforms.time.value = time;
      voidBeams.update(time, strength, quality, enabled && !calm);
      nitroTrail.update(time, studioDemo && preview ? 0.85 : strength * nitroMix, quality, enabled && !calm); // Studio previews the trail without NITRO
      ribbon.material.uniforms.time.value = time;
      const plume = plumeLook(settings.quality);
      glow.update(enabled && !voidPulse ? thrusterGlow(settings.quality, active, car.altitude > 0, strength) : 0);
      jets.forEach((jet, i) => {
        jet.visible = enabled && strength > 0.005 && !voidPulse;
        jet.scale.set(REAR_PORTS[i].size, REAR_PORTS[i].size, settings.exhaustLength * strength * (0.65 + car.speed / 200) * plume.stretch);
        const u = jet.material.uniforms;
        u.time.value = time + i * 0.13; u.power.value = strength; u.tail.value = plume.tail;
        u.brightness.value = Math.min(settings.coreBrightness, calm ? 0.9 : 3);
        u.diamonds.value = settings.machDiamonds; u.extreme.value = settings.preset === 'extreme' ? 1 : 0; u.nitroMix.value = nitroMix;
      });
      delta = car.speed;
      if (wakeStrength > 0.01 && enabled && dt > 0) {
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
      const showcaseRibbon = studioDemo && preview && enabled && !calm;
      if ((boost || rollStrength > .1 || showcaseRibbon) && dt > 0 && previous.distanceToSquared(current) > 0.0001) {
        const start = Math.max(0, 1 - 60 / previous.distanceTo(current));
        sample.lerpVectors(previous, current, start);
        sampleRotation.slerpQuaternions(previousRotation, vehicle.quaternion, start);
        ribbonFrom.copy(trailAnchor).applyQuaternion(sampleRotation).add(sample);
        ribbonSide.set(trailHalfWidth, 0, 0).applyQuaternion(sampleRotation);
        dashSamples(previous, current, 0.8 / quality, 16, t => {
          const slot = segmentCursor, s = segments[slot]; segmentCursor = (slot + 1) % segments.length;
          s.roll = !boost && !showcaseRibbon;
          const kind = s.roll ? 1 : 0;
          if (ribbonKinds[slot * 6] !== kind) { ribbonKinds.fill(kind, slot * 6, slot * 6 + 6); ribbonKindDirty = true; }
          s.a.copy(ribbonFrom); s.left.copy(ribbonSide);
          sampleRotation.slerpQuaternions(previousRotation, vehicle.quaternion, t);
          sample.lerpVectors(previous, current, t);
          s.b.copy(trailAnchor).applyQuaternion(sampleRotation).add(sample);
          s.right.set(trailHalfWidth, 0, 0).applyQuaternion(sampleRotation);
          s.life = s.maxLife = Math.min(0.6, settings.trailLength / Math.max(30, car.speed));
          ribbonFrom.copy(s.b); ribbonSide.copy(s.right);
        });
      }
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i]; s.life = s.roll && !rollEnabled ? 0 : Math.max(0, s.life - dt);
        for (let j = 0; j < 6; j++) {
          const end = j === 2 || j === 4 || j === 5, side = j === 1 || j === 3 || j === 4 ? 1 : -1;
          corner.copy(end ? s.b : s.a).addScaledVector(end ? s.right : s.left, side);
          const offset = i * 18 + j * 3;
          ribbonPositions[offset] = corner.x - origin.x; ribbonPositions[offset + 1] = corner.y - origin.y; ribbonPositions[offset + 2] = corner.z - origin.z;
          ribbonAlpha[i * 6 + j] = enabled && s.life > 0 ? s.life / s.maxLife * (s.roll ? settings.airflowDensity * settings.airflowOpacity * .3 : calm ? 0.04 : 0.12) : 0;
        }
      }
      ribbonGeo.attributes.position.needsUpdate = ribbonGeo.attributes.alpha.needsUpdate = true;
      if (ribbonKindDirty) ribbonGeo.attributes.rollWake.needsUpdate = true;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i]; p.life = p.roll && !rollEnabled ? 0 : Math.max(0, p.life - dt);
        alphas[i] = 0;
        if (p.life === 0) continue;
        if (!p.roll) {
          p.pos.addScaledVector(p.velocity, dt); p.velocity.multiplyScalar(Math.exp(-dt * 2));
          if (p.pos.y < 0.09) { p.pos.y = 0.09; p.velocity.y = Math.abs(p.velocity.y) * 0.1; p.velocity.x *= 1 + dt; }
        }
        const age = p.maxLife - p.life;
        positions[i * 3] = p.pos.x - origin.x; positions[i * 3 + 1] = p.pos.y - origin.y; positions[i * 3 + 2] = p.pos.z - origin.z;
        sizes[i] = p.roll ? p.size : p.size + age * 2;
        alphas[i] = p.opacity * Math.min(1, age * 25) * (p.life / p.maxLife) ** 1.5;
      }
      for (const attribute of Object.values(particleGeo.attributes)) attribute.needsUpdate = true;
      for (let i = 0; i < ghosts.length; i++) {
        const g = ghosts[i]; g.life = Math.max(0, g.life - dt);
        g.mesh.visible = enabled && !calm && g.life > 0 && i < settings.afterimages;
        g.mesh.position.copy(g.position).sub(origin);
        g.mesh.material.opacity = g.life / 0.45 * 0.14;
      }
      const shockDuration = studioDemo ? 0.82 : 0.23;
      shock.visible = enabled && !calm && shockAge < shockDuration;
      shock.position.copy(shockPosition).sub(origin);
      shock.scale.setScalar(studioDemo ? 0.7 + shockAge * 4.5 : 0.5 + shockAge * 20);
      shock.material.opacity = Math.max(0, 1 - shockAge / shockDuration) ** 2
        * settings.shockwave * (studioDemo ? 0.95 : 0.45);
      flare.update(dt, time, origin, enabled && !calm, quality, Math.min(1, settings.shockwave * (studioDemo ? 2 : 1.4))); // default 0.5 → full in Studio, 0.7 racing
      previous.copy(current); previousRotation.copy(vehicle.quaternion);
      direction.set(0, 0.64, 3).applyMatrix4(vehicle.matrixWorld);
      return { strength, ignition: boost ? Math.max(0, 1 - shockAge / 0.25) : 0, nozzle: direction, reveal };
    },
  };
}
