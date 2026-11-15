// Page probes for the sprint exhaust (.claude/rules/sprint-plume.md), shared by the capture and the veil specs:
// carOnScreen (the 2 x 1.2 x 4.8 m box through the live camera), plumeProbe/plumeOnScreen (where the nozzles land),
// plumeContrast (one live frame drawn without and with `Rear ports`) and sampleCar (sizes and rAF times over game time).
export const installPlumeProbes = async page => {
  await page.evaluate(() => {
    window.carOnScreen = () => {
      const { player, camera } = window.gameScene, V = player.position.constructor;
      player.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, bumper = 0;
      for (const x of [-1, 1]) for (const y of [0, 1.2]) for (const z of [-2.4, 2.4]) {
        const p = new V(x, y, z).applyMatrix4(player.matrixWorld).project(camera);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
        if (z > 0 && y === 0) bumper = Math.max(bumper, (1 - p.y) / 2);
      }
      return { width: (x1 - x0) / 2, height: (y1 - y0) / 2, bumper, fov: camera.fov, eye: camera.position.distanceTo(player.position), inside: x0 >= -1 && x1 <= 1 && y0 >= -1 && y1 <= 1 };
    };
    // Screen position (0-1, top-left origin) of the point `d` m behind a rear port and `dx` m beside it.
    window.plumeProbe = () => {
      const { player, camera } = window.gameScene, V = player.position.constructor, rear = player.getObjectByName('Rear ports');
      player.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      const ports = rear.children.filter(part => part.name.startsWith('Cold gas nozzle')).map(part => part.position);
      const at = (port, dx, d, dy = 0) => { const s = new V(port.x + dx, port.y + dy, port.z + d).applyMatrix4(rear.matrixWorld).project(camera); return { x: (s.x + 1) / 2, y: (1 - s.y) / 2 }; };
      return { rear, ports, at };
    };
    window.plumeOnScreen = () => {
      const { ports, at } = window.plumeProbe(), spots = ports.flatMap(port => [0, 0.5, 1, 1.5, 2].map(d => at(port, 0, d)));
      const xs = spots.map(s => s.x), ys = spots.map(s => s.y);
      return { nozzleRow: ports.reduce((sum, port) => sum + at(port, 0, 0).y, 0) / ports.length, carInside: window.carOnScreen().inside,
        box: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
    };
    // One frame drawn twice, without and with the exhaust (`Rear ports`), so nothing else differs. `area`: % of the frame
    // the exhaust changes by more than 30 of 255. Mean RGB: `core` on the four jet axes (the first 1.8 m), `bare` the same
    // pixels without the exhaust, `road` the same rows beyond the car's width; distances on the 0-255 scale. `veil`: how far
    // the exhaust moves the car's rear face (0.15 to 0.45 m above the nozzles, across them) from its bare colour.
    window.plumeContrast = () => new Promise(resolve => {
      const { renderer, composer } = window.gameScene, gl = renderer.getContext(), render = composer.render;
      composer.render = function (...args) {
        composer.render = render;
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, { rear, ports, at } = window.plumeProbe();
        const draw = shown => {
          rear.visible = shown; render.apply(this, args); renderer.setRenderTarget(null);
          const pixels = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels;
        };
        const off = draw(false), on = draw(true), sums = { core: [0, 0, 0, 0], road: [0, 0, 0, 0], bare: [0, 0, 0, 0], rear: [0, 0, 0, 0], rearBare: [0, 0, 0, 0] };
        let changed = 0;
        for (let i = 0; i < on.length; i += 4) if (Math.hypot(on[i] - off[i], on[i + 1] - off[i + 1], on[i + 2] - off[i + 2]) > 30) changed++;
        const add = (key, pixels, s) => {
          if (!(s.x >= 0 && s.x < 1 && s.y >= 0 && s.y < 1)) return;
          const i = 4 * ((H - 1 - Math.floor(s.y * H)) * W + Math.floor(s.x * W));
          for (let c = 0; c < 3; c++) sums[key][c] += pixels[i + c];
          sums[key][3]++;
        };
        for (let d = 0.1; d < 1.85; d += 0.1) {
          for (const port of ports) { add('core', on, at(port, 0, d)); add('bare', off, at(port, 0, d)); }
          for (const dx of [1.2, 1.5, 1.8]) { add('road', on, at(ports[0], -dx, d)); add('road', on, at(ports.at(-1), dx, d)); }
        }
        const span = ports.at(-1).x - ports[0].x;
        for (let dy = 0.15; dy < 0.46; dy += 0.05) for (let dx = -0.15; dx <= span + 0.16; dx += 0.1) {
          add('rear', on, at(ports[0], dx, -0.05, dy)); add('rearBare', off, at(ports[0], dx, -0.05, dy));
        }
        const mean = key => sums[key].slice(0, 3).map(sum => Math.round(sum / Math.max(1, sums[key][3])));
        const core = mean('core'), road = mean('road'), bare = mean('bare'), apart = (a, b) => +Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]).toFixed(1);
        resolve({ area: +(100 * changed / (W * H)).toFixed(2), core, road, bare, vsRoad: apart(core, road), added: apart(core, bare), samples: sums.core[3],
          rear: mean('rear'), rearBare: mean('rearBare'), veil: apart(mean('rear'), mean('rearBare')) });
      };
    });
    window.sampleCar = async seconds => {
      const race = window.gameplay.race, until = race.elapsed + seconds, cars = [], frames = [];
      let last = performance.now();
      while (race.elapsed < until) {
        await new Promise(requestAnimationFrame);
        const now = performance.now(); frames.push(now - last); last = now; cars.push(window.carOnScreen());
      }
      frames.sort((a, b) => a - b);
      const pick = key => ({ min: Math.min(...cars.map(c => c[key])), max: Math.max(...cars.map(c => c[key])) });
      return { width: pick('width'), height: pick('height'), bumper: pick('bumper'), fov: pick('fov'),
        frameP50: frames[Math.floor(frames.length / 2)], frameP95: frames[Math.floor(frames.length * 0.95)] };
    };
  });
};
