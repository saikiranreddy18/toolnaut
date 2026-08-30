// The ten cursor effects, selectable in ME -> Sky settings.
//
// GENERATED from docs/cursor-effect-candidates.json (the adversarially
// reviewed modules behind the Cursor Lab picker) — regenerate rather than
// hand-editing an effect here, so the demo page and the app cannot drift:
//   node scripts/gen-cursor-effects.cjs
//
// Every effect implements one contract:
//   make(env) -> { move(x,y,dx,dy), frame(dt), down?(x,y) }
// where env = { ctx, W(), H(), clear(), fade(a), palette }. The harness in
// CursorStars.jsx owns the canvas, DPR, pointer plumbing and the palette —
// effects only draw. This module is dynamic-imported so its ~53KB never
// lands in the entry chunk.

export const CURSOR_EFFECTS = [
  {
    id: "comet-trail",
    name: "COMET TRAIL",
    blurb: "A white-hot gold comet head rides the cursor, streaming a tapered lime-to-pink spark tail that stretches with speed and settles into a pulsing ember with orbiting glints when you stop.",
    make: (env) => {
  const ctx = env.ctx;
  const TAU = Math.PI * 2;
  const HN = 90;
  const hx = new Float32Array(HN);
  const hy = new Float32Array(HN);
  let hHead = -1, hCount = 0;
  let px = 0, py = 0, has = false;
  let speed = 0, accum = 0;
  let dirx = 1, diry = 0;
  let time = 0, emberT = 0;
  let flashA = 0, flashX = 0, flashY = 0;
  const STEPS = 16;
  const COLS = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    COLS.push(((163 + 92 * t) | 0) + ',' + ((255 - 209 * t) | 0) + ',' + ((46 + 117 * t) | 0));
  }
  const col = (t, a) => 'rgba(' + COLS[(Math.max(0, Math.min(1, t)) * STEPS) | 0] + ',' + a + ')';
  const PN = 260;
  const P = [];
  for (let i = 0; i < PN; i++) P.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, t: 0, gold: false });
  let pi = 0;
  const spawn = (x, y, vx, vy, life, size, t, gold) => {
    const p = P[pi];
    pi = (pi + 1) % PN;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.max = life; p.size = size; p.t = t; p.gold = gold;
  };
  return {
    move(x, y, dx, dy) {
      px = x; py = y; has = true;
      const d = Math.hypot(dx, dy);
      accum += d;
      if (d > 0.5) { dirx = dx / d; diry = dy / d; }
      const n = Math.min(3, (d * 0.2) | 0);
      for (let i = 0; i < n; i++) {
        const t = 0.15 + Math.random() * 0.75;
        let sx = x, sy = y;
        if (hCount > 2) {
          const k = Math.min(hCount - 1, (t * Math.min(hCount, 8 + speed * 1.4)) | 0);
          const idx = (hHead - k + HN * 2) % HN;
          sx = hx[idx]; sy = hy[idx];
        }
        const pv = (Math.random() - 0.5) * 1.8;
        spawn(sx, sy, -diry * pv - dirx * (0.4 + Math.random() * 0.9), dirx * pv - diry * (0.4 + Math.random() * 0.9), 380 + Math.random() * 420, 0.8 + Math.random() * 1.6, t, false);
      }
    },
    down(x, y) {
      flashA = 1; flashX = x; flashY = y;
      for (let i = 0; i < 36; i++) {
        const a = Math.random() * TAU;
        const v = 1 + Math.random() * 4;
        spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, 480 + Math.random() * 520, 1 + Math.random() * 2, Math.random(), Math.random() < 0.3);
      }
    },
    frame(dt) {
      env.fade(0.35);
      if (dt > 100) dt = 100;
      time += dt;
      const s = dt / 16.7;
      speed += (accum - speed) * Math.min(1, dt * 0.012);
      accum = 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const sp = Math.min(speed, 55);
      const wBase = 2.5 + sp * 0.16;
      if (has) {
        hHead = (hHead + 1) % HN;
        hx[hHead] = px;
        hy[hHead] = py;
        if (hCount < HN) hCount++;
        const len = Math.min(hCount, (6 + sp * 1.5) | 0);
        let ax = px, ay = py;
        for (let i = 1; i < len; i++) {
          const idx = (hHead - i + HN) % HN;
          const bx = hx[idx], by = hy[idx];
          const t = i / len;
          ctx.strokeStyle = col(t, (1 - t) * 0.85);
          ctx.lineWidth = (1 - t) * (1 - t) * wBase + 0.4;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ax = bx; ay = by;
        }
        if (sp > 3) {
          ctx.strokeStyle = 'rgba(255,222,46,0.7)';
          ctx.lineWidth = wBase + 1;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - dirx * (8 + sp * 0.25), py - diry * (8 + sp * 0.25));
          ctx.stroke();
        }
        const idle = 1 - Math.min(1, sp / 8);
        if (idle > 0.05) {
          for (let i = 0; i < 3; i++) {
            const a = time * 0.0016 + i * TAU / 3;
            const r = 13 + Math.sin(time * 0.003 + i * 2.1) * 3;
            ctx.fillStyle = 'rgba(255,222,46,' + (idle * (0.35 + 0.35 * Math.sin(time * 0.006 + i * 2.4))).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(px + Math.cos(a) * r, py + Math.sin(a) * r * 0.8, 1.4, 0, TAU);
            ctx.fill();
          }
          emberT += dt;
          if (emberT > 240) {
            emberT = 0;
            spawn(px + (Math.random() - 0.5) * 8, py + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 0.25, -0.3 - Math.random() * 0.35, 900, 0.9 + Math.random() * 1.4, 0, true);
          }
        }
      }
      const damp = Math.max(0, 1 - 0.045 * s);
      for (let i = 0; i < PN; i++) {
        const p = P[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vx *= damp;
        p.vy = p.vy * damp + 0.012 * s;
        p.x += p.vx * s;
        p.y += p.vy * s;
        const a = p.life / p.max;
        ctx.fillStyle = p.gold ? 'rgba(255,222,46,' + (a * 0.9).toFixed(3) + ')' : col(p.t, (a * 0.9).toFixed(3));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.35 + 0.65 * a), 0, TAU);
        ctx.fill();
      }
      if (flashA > 0.02) {
        flashA = Math.max(0, flashA - dt * 0.0035);
        ctx.strokeStyle = 'rgba(255,222,46,' + (flashA * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 1.5 + flashA * 3;
        ctx.beginPath();
        ctx.arc(flashX, flashY, (1 - flashA) * 80 + 8, 0, TAU);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (has) {
        const hr = 11 + sp * 0.35 + (sp < 4 ? Math.sin(time * 0.004) * 2.5 : 0);
        const g = ctx.createRadialGradient(px, py, 0, px, py, hr);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.2, 'rgba(255,222,46,0.85)');
        g.addColorStop(0.55, 'rgba(255,222,46,0.25)');
        g.addColorStop(1, 'rgba(255,222,46,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, hr, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 1.7 + sp * 0.04, 0, TAU);
        ctx.fill();
      }
    }
  };
},
  },
  {
    id: "constellation",
    name: "CONSTELLATION WAKE",
    blurb: "Twinkling stars drop along your path and wire themselves into a glowing constellation that draws itself in and fades; clicking stamps a ringed asterism.",
    make: (env) => {
  const ctx = env.ctx, P = env.palette;
  const WHITE = '#ffffff';
  const COLS = [P.cyan, WHITE, P.cyan, P.lime, P.cyan, WHITE, P.pink, P.cyan, P.gold, P.cyan];
  const MAXS = 96, LINK = 96, LINK2 = LINK * LINK, TAU = 6.28318530718;
  const stars = new Array(MAXS);
  for (var ii = 0; ii < MAXS; ii++) stars[ii] = { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, age: 0, a: 0, r: 1, ph: 0, tws: 2, col: P.cyan, big: false, link: -1, luid: -1, uid: -1 };
  const alive = new Int16Array(MAXS);
  let head = 0, uidc = 1, lastIdx = -1, lastUid = -1, acc = 0, px = -1, py = -1, t = 0, ci = 0;

  function spawn(x, y, lk, lu, big) {
    const i = head; head = (head + 1) % MAXS;
    const s = stars[i];
    s.x = x; s.y = y;
    s.vx = (Math.random() - 0.5) * 4;
    s.vy = -3 - Math.random() * 4;
    s.max = 2.6 + Math.random() * 1.2; s.life = s.max; s.age = 0;
    s.big = big || Math.random() < 0.16;
    s.r = s.big ? 2.3 + Math.random() * 1.2 : 1.1 + Math.random();
    s.ph = Math.random() * TAU; s.tws = 1.5 + Math.random() * 3;
    s.col = (s.big && Math.random() < 0.5) ? P.gold : COLS[(ci++) % COLS.length];
    s.link = lk; s.luid = lu; s.uid = uidc++;
    return i;
  }

  function drop(x, y, big) {
    let lk = -1, lu = -1;
    if (lastIdx >= 0) {
      const p = stars[lastIdx];
      if (p.uid === lastUid && p.life > 0) {
        const ddx = p.x - x, ddy = p.y - y;
        if (ddx * ddx + ddy * ddy < 26000) { lk = lastIdx; lu = p.uid; }
      }
    }
    lastIdx = spawn(x, y, lk, lu, big);
    lastUid = stars[lastIdx].uid;
  }

  return {
    move(x, y, dx, dy) {
      if (px < 0) { px = x; py = y; }
      const d = Math.hypot(dx, dy);
      acc += d;
      const SP = 26;
      if (acc >= SP) {
        const steps = Math.min(4, Math.floor(acc / SP));
        acc %= SP;
        const m = d || 1, nx = -dy / m, ny = dx / m;
        for (var k = 1; k <= steps; k++) {
          const f = k / steps;
          const j = (Math.random() - 0.5) * 30;
          drop(px + (x - px) * f + nx * j, py + (y - py) * f + ny * j, false);
        }
      }
      px = x; py = y;
    },

    down(x, y) {
      const K = 6, R = 30 + Math.random() * 18, a0 = Math.random() * TAU;
      for (var k = 0; k < K; k++) {
        const an = a0 + (k / K) * TAU;
        drop(x + Math.cos(an) * (R + (Math.random() - 0.5) * 14), y + Math.sin(an) * (R + (Math.random() - 0.5) * 14), false);
      }
      drop(x, y, true);
    },

    frame(dt) {
      env.clear();
      if (dt > 50) dt = 50;
      const dts = dt / 1000; t += dts;
      let n = 0;
      for (var i = 0; i < MAXS; i++) {
        const s = stars[i];
        if (s.life <= 0) continue;
        s.life -= dts; s.age += dts;
        if (s.life <= 0) { s.a = 0; continue; }
        s.x += s.vx * dts; s.y += s.vy * dts;
        s.vx *= 0.985; s.vy *= 0.985;
        const fin = s.age < 0.18 ? s.age / 0.18 : 1;
        const fout = s.life < 1 ? s.life : 1;
        s.a = fin * fout;
        alive[n++] = i;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      ctx.strokeStyle = P.cyan;
      ctx.lineWidth = 1;
      let drawn = 0;
      for (var a1 = 0; a1 < n && drawn < 150; a1++) {
        const s1 = stars[alive[a1]];
        for (var a2 = a1 + 1; a2 < n && drawn < 150; a2++) {
          const s2 = stars[alive[a2]];
          const ddx = s1.x - s2.x, ddy = s1.y - s2.y;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 >= LINK2) continue;
          const al = 0.45 * (1 - Math.sqrt(d2) / LINK) * (s1.a < s2.a ? s1.a : s2.a);
          if (al < 0.02) continue;
          ctx.globalAlpha = al;
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
          drawn++;
        }
      }

      for (var a3 = 0; a3 < n; a3++) {
        const s = stars[alive[a3]];
        if (s.link < 0) continue;
        const p = stars[s.link];
        if (p.uid !== s.luid || p.life <= 0) continue;
        const g = s.age < 0.22 ? s.age / 0.22 : 1;
        const ex = p.x + (s.x - p.x) * g, ey = p.y + (s.y - p.y) * g;
        const al = s.a < p.a ? s.a : p.a;
        ctx.strokeStyle = WHITE;
        ctx.globalAlpha = al * 0.16;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = al * 0.85;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();
        if (g < 1) {
          ctx.globalAlpha = al;
          ctx.fillStyle = WHITE;
          ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, TAU); ctx.fill();
        }
      }

      for (var a4 = 0; a4 < n; a4++) {
        const s = stars[alive[a4]];
        const tw = 0.72 + 0.28 * Math.sin(t * s.tws * 2 + s.ph);
        const aa = s.a * tw;
        const r = s.r;
        ctx.fillStyle = s.col;
        ctx.globalAlpha = aa * 0.14;
        ctx.beginPath(); ctx.arc(s.x, s.y, r * 4, 0, TAU); ctx.fill();
        ctx.globalAlpha = aa * 0.45;
        ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.9, 0, TAU); ctx.fill();
        ctx.fillStyle = WHITE;
        ctx.globalAlpha = aa;
        ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.85, 0, TAU); ctx.fill();
        if (s.big) {
          const L = r * (3.4 + 2.6 * tw);
          ctx.strokeStyle = s.col;
          ctx.globalAlpha = aa * 0.8;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y);
          ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  };
},
  },
  {
    id: "warp-streaks",
    name: "WARP FIELD",
    blurb: "Cyan-white star streaks smear backward from the cursor and accelerate away, stretching with your speed like punching into warp.",
    make: (env) => {
  const P = 400;
  const stars = [];
  for (let i = 0; i < P; i++) stars.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, w: 1, white: false });
  let head = 0;
  let px = -1, py = -1;
  let spd = 0;
  let dirx = 0, diry = -1;
  let idleT = 0;
  const CYAN = env.palette.cyan;
  const TAU = 6.28318;
  const spawn = (x, y, vx, vy, life, w, white) => {
    const s = stars[head]; head = (head + 1) % P;
    s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.life = life; s.max = life; s.w = w; s.white = white;
  };
  return {
    move(x, y, dx, dy) {
      px = x; py = y;
      const v = Math.hypot(dx, dy);
      spd += (v - spd) * 0.35;
      if (v > 0.01) {
        const inv = 1 / v;
        dirx += (-dx * inv - dirx) * 0.45;
        diry += (-dy * inv - diry) * 0.45;
      }
      let ux = dirx, uy = diry;
      const dl = Math.hypot(ux, uy);
      if (dl > 0.01) { ux /= dl; uy /= dl; } else { ux = 0; uy = -1; }
      const n = Math.min(7, 1 + ((v * 0.2) | 0));
      for (let i = 0; i < n; i++) {
        const perp = (Math.random() - 0.5) * (16 + v * 1.5);
        const along = (Math.random() - 0.5) * 10;
        const boost = (0.9 + Math.random() * 1.3) * (2 + v * 0.55);
        spawn(
          x - uy * perp + ux * along,
          y + ux * perp + uy * along,
          ux * boost + (Math.random() - 0.5) * 0.7,
          uy * boost + (Math.random() - 0.5) * 0.7,
          240 + Math.random() * 360,
          0.7 + Math.random() * 1.4,
          Math.random() < 0.4
        );
      }
    },
    down(x, y) {
      px = x; py = y;
      spd = Math.max(spd, 34);
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * TAU + Math.random() * 0.4;
        const v = 3.5 + Math.random() * 6;
        spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, 360 + Math.random() * 340, 0.8 + Math.random() * 1.6, Math.random() < 0.5);
      }
    },
    frame(dt) {
      env.fade(0.32);
      const ctx = env.ctx;
      if (px < 0) { px = env.W() * 0.5; py = env.H() * 0.5; }
      const t = dt / 16.7;
      spd *= Math.pow(0.93, t);
      idleT += dt;
      if (idleT > (spd > 2 ? 150 : 85)) {
        idleT = 0;
        const a = Math.random() * TAU;
        const r = 8 + Math.random() * 48;
        const v = 0.2 + Math.random() * 0.55;
        spawn(px + Math.cos(a) * r, py + Math.sin(a) * r, Math.cos(a) * v, Math.sin(a) * v, 480 + Math.random() * 520, 0.6 + Math.random() * 0.9, Math.random() < 0.5);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const accel = 1 + dt * 0.0011;
      for (let i = 0; i < P; i++) {
        const s = stars[i];
        if (s.life <= 0) continue;
        s.life -= dt;
        if (s.life <= 0) continue;
        s.vx *= accel; s.vy *= accel;
        s.x += s.vx * t; s.y += s.vy * t;
        const sp = Math.hypot(s.vx, s.vy);
        let L = sp * 4.2;
        if (L > 150) L = 150;
        if (L < 1.4) L = 1.4;
        const k = sp > 0.0001 ? L / sp : 0;
        const tx = s.x - s.vx * k, ty = s.y - s.vy * k;
        let a = s.life / s.max;
        const born = s.max - s.life;
        if (born < 50) a *= born / 50;
        ctx.globalAlpha = a * 0.5;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = s.w * 2.6;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.globalAlpha = a * 0.95;
        ctx.strokeStyle = s.white ? '#ffffff' : CYAN;
        ctx.lineWidth = s.w;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const g = 7 + Math.min(42, spd * 2.4);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, g);
      grad.addColorStop(0, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.3, 'rgba(34,211,238,0.45)');
      grad.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, g, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  };
},
  },
  {
    id: "orbit-swarm",
    name: "ORBIT SWARM",
    blurb: "Nine tiny moons on tilted Kepler ellipses lag elastically behind your cursor, tightening into a gyroscopic atom at rest — click to shock-reverse their orbits.",
    make: (env) => {
  const TAU = Math.PI * 2;
  const P = env.palette;
  const hexes = [P.cyan, P.lime, P.pink, P.gold];
  const rgb = (h) => parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16);
  let px = env.W() / 2, py = env.H() / 2;
  const N = 9;
  const moons = [];
  for (let i = 0; i < N; i++) {
    const a = 24 + i * 7.5;
    const c = hexes[i % 4];
    const r = rgb(c);
    moons.push({
      ang: (i / N) * TAU + Math.random(),
      spd: (2.6 / a) * (i % 2 ? 1 : -1),
      a: a,
      ecc: 0.5 + Math.random() * 0.38,
      tilt: (i / N) * Math.PI + (Math.random() - 0.5) * 0.4,
      prec: (Math.random() - 0.5) * 0.006,
      size: 2 + Math.random() * 1.7,
      mx: px, my: py, vx: 0, vy: 0,
      k: 0.018 + 0.05 * Math.random(),
      d: 0.8 + 0.07 * Math.random(),
      cRing: 'rgba(' + r + ',0.11)',
      cHalo: 'rgba(' + r + ',0.15)',
      cMid: 'rgba(' + r + ',0.6)',
      cCore: c,
      x: 0, y: 0, dz: 0
    });
  }
  const order = moons.slice();
  const cmp = (u, v) => u.dz - v.dz;
  const shocks = [];
  for (let i = 0; i < 4; i++) shocks.push({ x: 0, y: 0, r: 0, al: 0 });
  let acc = 0, energy = 0, kick = 0, t = 0;
  return {
    move(x, y, dx, dy) {
      px = x; py = y;
      acc += Math.hypot(dx, dy);
    },
    down(x, y) {
      kick = Math.min(1.6, kick + 0.9);
      for (let i = 0; i < N; i++) {
        const m = moons[i];
        m.spd = -m.spd;
        m.ang += (Math.random() - 0.5) * 1.3;
      }
      for (let i = 0; i < 4; i++) {
        const s = shocks[i];
        if (s.al <= 0.01) { s.x = x; s.y = y; s.r = 8; s.al = 0.7; break; }
      }
    },
    frame(dt) {
      env.fade(0.28);
      const ctx = env.ctx;
      const dtf = Math.min(dt, 50) / 16.67;
      t += dt;
      const tgt = Math.min(1, acc * 0.05);
      acc = 0;
      if (tgt > energy) energy += (tgt - energy) * Math.min(1, 0.4 * dtf);
      else energy += (tgt - energy) * Math.min(1, 0.055 * dtf);
      kick *= Math.pow(0.93, dtf);
      const spin = 1 + energy * 1.5;
      let sx = 0, sy = 0;
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        const m = moons[i];
        m.vx += (px - m.mx) * m.k * dtf;
        m.vy += (py - m.my) * m.k * dtf;
        const dp = Math.pow(m.d, dtf);
        m.vx *= dp; m.vy *= dp;
        m.mx += m.vx * dtf;
        m.my += m.vy * dtf;
        sx += m.mx; sy += m.my;
        m.ang += m.spd * spin * dtf;
        m.tilt += m.prec * dtf;
        const mul = 0.45 + 0.8 * energy + kick * 0.5 + Math.sin(t * 0.0016 + i * 1.7) * 0.04;
        const ra = m.a * mul;
        const rb = ra * m.ecc;
        const ca = Math.cos(m.ang), sa = Math.sin(m.ang);
        const ct = Math.cos(m.tilt), st = Math.sin(m.tilt);
        const ex = ca * ra, ey = sa * rb;
        m.x = m.mx + ex * ct - ey * st;
        m.y = m.my + ex * st + ey * ct;
        m.dz = sa;
        ctx.strokeStyle = m.cRing;
        ctx.beginPath();
        ctx.ellipse(m.mx, m.my, ra, rb, m.tilt, 0, TAU);
        ctx.stroke();
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = P.gold;
      for (let i = 0; i < 4; i++) {
        const s = shocks[i];
        if (s.al > 0.01) {
          s.r += (4 + s.r * 0.05) * dtf;
          s.al -= 0.045 * dtf;
          if (s.al > 0.01) {
            ctx.globalAlpha = s.al;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      order.sort(cmp);
      for (let i = 0; i < N; i++) {
        const m = order[i];
        const dn = (m.dz + 1) * 0.5;
        const ds = 0.75 + 0.3 * dn;
        const r0 = m.size * ds * (1 + energy * 0.25);
        ctx.globalAlpha = 0.55 + 0.45 * dn;
        ctx.fillStyle = m.cHalo;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r0 * 3.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = m.cMid;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r0 * 1.8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = m.cCore;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(m.x - r0 * 0.2, m.y - r0 * 0.2, r0 * 0.45, 0, TAU);
        ctx.fill();
      }
      const nx = sx / N, ny = sy / N;
      ctx.globalAlpha = 0.35 + 0.3 * energy;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(nx, ny, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(nx, ny, 1.8, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
},
  },
  {
    id: "pixel-dust",
    name: "PIXEL STARDUST",
    blurb: "Chunky 8-bit pixels burst off the cursor, tumble under gravity, and strobe out like tiny arcade fireworks.",
    make: (env) => {
  const ctx = env.ctx;
  const pal = env.palette;
  const COLORS = [pal.lime, pal.pink, pal.gold, pal.lime, pal.gold, pal.pink, "#ffffff"];
  const MAX = 320;
  const pool = new Array(MAX);
  for (let i = 0; i < MAX; i++) {
    pool[i] = { on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, col: "#ffffff", rot: 0, rs: 0, blink: 80, ax: true, gx: 0, gy: 0 };
  }
  let slot = 0;
  let mx = -200, my = -200, seen = false;
  let acc = 0, sparkT = 0, idleT = 9999, time = 0;
  const snap = (v) => ((v * 0.5) | 0) * 2;
  const spawn = (x, y, vx, vy, size, col, life) => {
    let p = null;
    for (let n = 0; n < MAX; n++) {
      slot = (slot + 1) % MAX;
      if (!pool[slot].on) { p = pool[slot]; break; }
    }
    if (!p) { slot = (slot + 1) % MAX; p = pool[slot]; }
    p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.max = life; p.size = size; p.col = col;
    p.rot = Math.random() * 6.283;
    p.rs = (Math.random() < 0.5 ? -1 : 1) * (0.004 + Math.random() * 0.009);
    p.blink = 55 + Math.random() * 75;
    p.ax = Math.random() < 0.5;
    p.gx = snap(x); p.gy = snap(y);
  };
  return {
    move(x, y, dx, dy) {
      seen = true; mx = x; my = y; idleT = 0;
      const sp = Math.sqrt(dx * dx + dy * dy);
      acc += sp;
      let n = 0;
      while (acc > 6 && n < 10) { acc -= 6; n++; }
      if (acc > 18) acc = 18;
      for (let i = 0; i < n; i++) {
        const f = (i + 1) / n;
        const px = x - dx * (1 - f) + (Math.random() * 6 - 3);
        const py = y - dy * (1 - f) + (Math.random() * 6 - 3);
        const a = Math.random() * 6.283;
        const v = 0.03 + Math.random() * 0.13;
        spawn(px, py, Math.cos(a) * v + dx * 0.01, Math.sin(a) * v + dy * 0.01 - 0.025, 2 + ((Math.random() * 4) | 0), COLORS[(Math.random() * COLORS.length) | 0], 420 + Math.random() * 620);
      }
    },
    down(x, y) {
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * 6.283 + Math.random() * 0.22;
        const v = 0.1 + Math.random() * 0.16;
        const col = i % 3 === 0 ? pal.gold : (i % 3 === 1 ? pal.pink : pal.lime);
        spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - 0.04, 3 + ((Math.random() * 3) | 0), col, 650 + Math.random() * 550);
      }
      for (let i = 0; i < 8; i++) {
        spawn(x, y, (Math.random() - 0.5) * 0.06, -0.08 - Math.random() * 0.08, 5, (i & 1) ? "#ffffff" : pal.gold, 900 + Math.random() * 400);
      }
    },
    frame(dt) {
      env.clear();
      if (!(dt > 0)) dt = 16;
      if (dt > 40) dt = 40;
      time += dt;
      idleT += dt;
      const hh = env.H();
      if (seen && idleT > 260) {
        sparkT += dt;
        if (sparkT > 340) {
          sparkT = 0;
          spawn(mx + Math.random() * 18 - 9, my + Math.random() * 18 - 9, (Math.random() - 0.5) * 0.02, -0.03 - Math.random() * 0.03, 2 + ((Math.random() * 2) | 0), COLORS[(Math.random() * COLORS.length) | 0], 650 + Math.random() * 450);
        }
      }
      for (let i = 0; i < MAX; i++) {
        const p = pool[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0 || p.y > hh + 24) { p.on = false; continue; }
        const osx = snap(p.x), osy = snap(p.y);
        p.vy += 0.00025 * dt;
        p.vx *= 1 - 0.0009 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.rs * dt;
        const sx = snap(p.x), sy = snap(p.y);
        if (sx !== osx || sy !== osy) { p.gx = osx; p.gy = osy; }
        if (p.life / p.max < 0.42 && (((time / p.blink) | 0) & 1)) continue;
        const w = Math.max(1, Math.round(p.size * Math.abs(Math.cos(p.rot))));
        ctx.fillStyle = p.col;
        ctx.globalAlpha = 0.22;
        ctx.fillRect(p.gx, p.gy, p.size, p.size);
        ctx.globalAlpha = 1;
        if (p.ax) ctx.fillRect(sx, sy, w, p.size);
        else ctx.fillRect(sx, sy, p.size, w);
      }
      if (seen) {
        const cx = snap(mx), cy = snap(my);
        const ph = ((time / 240) | 0) % 2;
        const armCol = (((time / 480) | 0) & 1) ? pal.pink : pal.gold;
        const r = 4 + 2 * (((time / 140) | 0) % 3);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
        ctx.fillStyle = armCol;
        if (ph === 0) {
          ctx.fillRect(cx + r, cy - 1, 2, 2);
          ctx.fillRect(cx - r - 2, cy - 1, 2, 2);
          ctx.fillRect(cx - 1, cy + r, 2, 2);
          ctx.fillRect(cx - 1, cy - r - 2, 2, 2);
        } else {
          const d = (r * 0.7) | 0;
          ctx.fillRect(cx + d, cy + d, 2, 2);
          ctx.fillRect(cx - d - 2, cy + d, 2, 2);
          ctx.fillRect(cx + d, cy - d - 2, 2, 2);
          ctx.fillRect(cx - d - 2, cy - d - 2, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  };
},
  },
  {
    id: "plasma-ribbon",
    name: "PLASMA RIBBON",
    blurb: "A silky spring-chased neon ribbon that shimmers cyan-to-pink along its tapered length, coils lazily when idle, and flares with a shockwave on click.",
    make: (env) => {
  const ctx = env.ctx;
  const N = 64, LUT = 64;
  const px = new Float32Array(N), py = new Float32Array(N);
  const ox = new Float32Array(N), oy = new Float32Array(N);
  const sArr = new Float32Array(N), taper = new Float32Array(N), segA = new Float32Array(N);
  const cols = new Array(LUT), core = new Array(LUT);
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1);
    sArr[i] = s;
    taper[i] = 2 + 15 * Math.pow(1 - s, 1.4);
    segA[i] = 1 - s * 0.85;
  }
  for (let i = 0; i < LUT; i++) {
    const m = i / (LUT - 1);
    const r = (34 + 221 * m) | 0, g = (211 - 165 * m) | 0, b = (238 - 75 * m) | 0;
    cols[i] = 'rgba(' + r + ',' + g + ',' + b + ',1)';
    core[i] = 'rgba(' + ((r + (255 - r) * 0.72) | 0) + ',' + ((g + (255 - g) * 0.72) | 0) + ',' + ((b + (255 - b) * 0.72) | 0) + ',1)';
  }
  let tx = 0, ty = 0, hx = 0, hy = 0, hvx = 0, hvy = 0;
  let inited = false, t = 0, energy = 0, surge = 0;
  const shocks = [{ x: 0, y: 0, r: 0, a: 0 }, { x: 0, y: 0, r: 0, a: 0 }, { x: 0, y: 0, r: 0, a: 0 }];
  const init = () => {
    const cx = env.W() * 0.5 || 320, cy = env.H() * 0.5 || 240;
    tx = hx = cx; ty = hy = cy;
    for (let i = 0; i < N; i++) { px[i] = cx; py[i] = cy; }
    inited = true;
  };
  return {
    move(x, y, dx, dy) {
      if (!inited) init();
      tx = x; ty = y;
      energy = Math.min(1, energy + Math.hypot(dx, dy) * 0.015);
    },
    down(x, y) {
      if (!inited) init();
      surge = 1;
      let s = shocks[0];
      for (let i = 1; i < 3; i++) if (shocks[i].a < s.a) s = shocks[i];
      s.x = x; s.y = y; s.r = 6; s.a = 1;
    },
    frame(dt) {
      env.fade(0.5);
      if (!inited) init();
      dt = dt > 0 && dt < 40 ? dt : 16.7;
      t += dt;
      const f = dt / 16.7;
      energy *= Math.exp(-dt * 0.002);
      surge *= Math.exp(-dt * 0.004);
      const idle = 1 - energy;
      const R = (18 + 26 * idle) * idle;
      const gx = tx + (Math.cos(t * 0.0011) + 0.6 * Math.cos(t * 0.00243 + 1.7)) * R;
      const gy = ty + (Math.sin(t * 0.0014) + 0.6 * Math.sin(t * 0.00197 + 0.4)) * R;
      hvx += (gx - hx) * 0.14 * f; hvy += (gy - hy) * 0.14 * f;
      const damp = Math.pow(0.82, f);
      hvx *= damp; hvy *= damp;
      hx += hvx * f; hy += hvy * f;
      px.copyWithin(1, 0, N - 1); py.copyWithin(1, 0, N - 1);
      px[0] = hx; py[0] = hy;
      for (let i = 1; i < N - 1; i++) {
        px[i] += (px[i - 1] + px[i + 1] - 2 * px[i]) * 0.18;
        py[i] += (py[i - 1] + py[i + 1] - 2 * py[i]) * 0.18;
      }
      const wob = 0.5 + 0.5 * energy + surge * 1.6;
      for (let i = 0; i < N; i++) {
        const a = i > 0 ? i - 1 : 0, b = i < N - 1 ? i + 1 : N - 1;
        const nx = py[a] - py[b], ny = px[b] - px[a];
        const L = Math.hypot(nx, ny) || 1;
        const w = Math.sin(sArr[i] * 9 - t * 0.006) * (1.5 + 7 * sArr[i]) * wob / L;
        ox[i] = px[i] + nx * w; oy[i] = py[i] + ny * w;
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const glow = 1 + surge * 0.9;
      for (let pass = 0; pass < 3; pass++) {
        const wm = pass === 0 ? 2.7 : pass === 1 ? 1 : 0.38;
        const am = pass === 0 ? 0.1 : pass === 1 ? 0.42 : 0.85;
        const table = pass === 2 ? core : cols;
        for (let i = 0; i < N - 1; i++) {
          const m = 0.5 + 0.5 * Math.sin(sArr[i] * 4.2 - t * 0.0022);
          ctx.strokeStyle = table[(m * (LUT - 1)) | 0];
          ctx.globalAlpha = am * segA[i];
          ctx.lineWidth = taper[i] * glow * wm;
          ctx.beginPath();
          ctx.moveTo(ox[i], oy[i]);
          ctx.lineTo(ox[i + 1], oy[i + 1]);
          ctx.stroke();
        }
      }
      for (let i = 0; i < 3; i++) {
        const s = shocks[i];
        if (s.a <= 0.02) continue;
        s.r += dt * (0.55 + s.a * 0.5);
        s.a *= Math.exp(-dt * 0.0045);
        ctx.globalAlpha = s.a * 0.7;
        ctx.strokeStyle = cols[(s.a * (LUT - 1)) | 0];
        ctx.lineWidth = 2 + s.a * 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  };
},
  },
  {
    id: "thruster",
    name: "ROCKET THRUSTER",
    blurb: "A cyan rocket nozzle rides your cursor, blasting a gold-core, pink-edged flame cone with mach diamonds opposite your motion, settling to a flickering pilot light when you stop.",
    make: (env) => {
  const ctx = env.ctx;
  const N = 400;
  const pool = [];
  for (let i = 0; i < N; i++) pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, edge: 0, seed: Math.random() * 6.283 });
  let pi = 0;
  const MIX = 13, ALP = 11, lut = [], whites = [];
  for (let m = 0; m < MIX; m++) {
    const f = m / (MIX - 1);
    const g = Math.round(222 + (46 - 222) * f), b = Math.round(46 + (163 - 46) * f);
    const row = [];
    for (let a = 0; a < ALP; a++) row.push('rgba(255,' + g + ',' + b + ',' + (0.9 * a / (ALP - 1)).toFixed(2) + ')');
    lut.push(row);
  }
  for (let a = 0; a < ALP; a++) whites.push('rgba(255,255,255,' + (0.9 * a / (ALP - 1)).toFixed(2) + ')');
  let px = 0, py = 0, has = false;
  let ex = 0, ey = 1, sp = 0, t = 0, emit = 0;
  function spawn(x, y, baseAng, spread, spd, size, life) {
    const p = pool[pi]; pi = (pi + 1) % N;
    const off = Math.random() * 2 - 1;
    const off2 = off * Math.abs(off);
    const a = baseAng + off2 * spread;
    const s = spd * (0.7 + Math.random() * 0.6);
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
    p.max = life * (0.7 + Math.random() * 0.6); p.life = p.max;
    p.size = size * (0.7 + Math.random() * 0.7);
    p.edge = Math.abs(off2);
    p.seed = Math.random() * 6.283;
  }
  return {
    move(x, y, dx, dy) {
      if (!has) { px = x; py = y; has = true; }
      const d = Math.hypot(dx, dy);
      if (d > 0.001) {
        const ix = -dx / d, iy = -dy / d;
        const k = Math.min(1, d * 0.08 + 0.15);
        ex += (ix - ex) * k; ey += (iy - ey) * k;
        const m = Math.hypot(ex, ey) || 1; ex /= m; ey /= m;
      }
      sp = Math.min(40, sp + d * 0.9);
      const ang = Math.atan2(ey, ex);
      const spd = 0.12 + Math.min(0.5, d * 0.02);
      const steps = Math.min(10, Math.max(1, (d / 4) | 0));
      for (let i = 0; i < steps; i++) {
        const f = (i + 1) / steps;
        spawn(px + (x - px) * f, py + (y - py) * f, ang, 0.38, spd, 2.6 + Math.min(3, d * 0.06), 320 + Math.random() * 260);
      }
      px = x; py = y;
    },
    frame(dt) {
      env.fade(0.3);
      if (dt > 40) dt = 40;
      t += dt;
      sp *= Math.exp(-dt / 160);
      if (!has) { px = env.W() * 0.5; py = env.H() * 0.5; has = true; }
      const ang = Math.atan2(ey, ex), ca = Math.cos(ang), sa = Math.sin(ang);
      const power = Math.min(1, sp / 14);
      emit += dt;
      if (sp < 6 && emit > 45) {
        emit = 0;
        const fl = 0.6 + 0.4 * Math.sin(t * 0.013 + Math.sin(t * 0.007) * 2);
        spawn(px, py, ang, 0.5, 0.02 + 0.035 * fl, 1.5 + fl, 420);
      }
      ctx.globalCompositeOperation = 'lighter';
      const fl2 = 0.7 + 0.3 * Math.sin(t * 0.017 + Math.sin(t * 0.005) * 3);
      const gx = px + ca * 3, gy = py + sa * 3;
      const gr = 5 + 11 * power + 3 * fl2;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      grad.addColorStop(0, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.35, 'rgba(255,222,46,0.45)');
      grad.addColorStop(1, 'rgba(255,46,163,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 6.283); ctx.fill();
      const drag = Math.exp(-dt / 380);
      for (let i = 0; i < N; i++) {
        const p = pool[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) continue;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= drag; p.vy *= drag;
        const f = p.life / p.max;
        p.x += Math.sin(p.seed + t * 0.009) * 0.02 * dt * (1 - f);
        p.y += Math.cos(p.seed * 1.7 + t * 0.011) * 0.02 * dt * (1 - f);
        const mi = Math.min(MIX - 1, (p.edge * 7 + (1 - f) * 8) | 0);
        const ai = (f * (ALP - 1)) | 0;
        ctx.fillStyle = lut[mi][ai];
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (1 - f) * 1.8), 0, 6.283); ctx.fill();
        if (f > 0.72 && p.edge < 0.35) {
          ctx.fillStyle = whites[ai];
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.45, 0, 6.283); ctx.fill();
        }
      }
      if (power > 0.22) {
        for (let k = 0; k < 3; k++) {
          const dd = 13 + k * 11 + Math.sin(t * 0.02 + k * 1.7) * 1.5;
          const r = (3.4 - k * 0.8) * power;
          const mx = px + ca * dd, my = py + sa * dd;
          const ai = Math.min(ALP - 1, ((power * (0.95 - k * 0.24)) * (ALP - 1)) | 0);
          ctx.fillStyle = k === 0 ? whites[ai] : lut[0][ai];
          ctx.beginPath();
          ctx.moveTo(mx + ca * r * 2.4, my + sa * r * 2.4);
          ctx.lineTo(mx - sa * r, my + ca * r);
          ctx.lineTo(mx - ca * r * 2.4, my - sa * r * 2.4);
          ctx.lineTo(mx + sa * r, my - ca * r);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      const nx = -ca, ny = -sa;
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + nx * 4 - sa * 2, py + ny * 4 + ca * 2);
      ctx.lineTo(px + ca * 5 - sa * 5.5, py + sa * 5 + ca * 5.5);
      ctx.moveTo(px + nx * 4 + sa * 2, py + ny * 4 - ca * 2);
      ctx.lineTo(px + ca * 5 + sa * 5.5, py + sa * 5 - ca * 5.5);
      ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = 'rgba(34,211,238,0.55)';
      ctx.beginPath();
      ctx.moveTo(px + nx * 6, py + ny * 6);
      ctx.lineTo(px + nx * 13, py + ny * 13);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(px + nx * 4, py + ny * 4, 1.7, 0, 6.283); ctx.fill();
    },
    down(x, y) {
      px = x; py = y; has = true;
      const ang = Math.atan2(ey, ex);
      for (let i = 0; i < 36; i++) spawn(x, y, ang, 0.95, 0.25 + Math.random() * 0.3, 3.4, 480);
      sp = Math.min(40, sp + 18);
    }
  };
},
  },
  {
    id: "gravity-stars",
    name: "GRAVITY LENS",
    blurb: "A dim starfield leans into your cursor's gravity well, brightening and swirling as space bends — click to collapse the lens.",
    make: (env) => {
  const COLS = [[255,255,255],[34,211,238],[163,255,46],[255,46,163],[255,222,46]];
  const LUT = COLS.map((c) => {
    const arr = [];
    for (let i = 0; i <= 24; i++) arr.push('rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (i / 24).toFixed(3) + ')');
    return arr;
  });
  const pick = () => { const r = Math.random(); return r < 0.45 ? 0 : r < 0.72 ? 1 : r < 0.84 ? 2 : r < 0.93 ? 3 : 4; };
  let stars = [], lw = 0, lh = 0;
  let mx = -99999, my = -99999, pvx = 0, pvy = 0, ringA = 0, pulse = 0, time = 0, lastR = 200;
  const rebuild = (w, h) => {
    const n = Math.max(80, Math.min(300, Math.round((w * h) / 6800)));
    stars = [];
    for (let i = 0; i < n; i++) {
      const hx = Math.random() * w, hy = Math.random() * h;
      stars.push({ hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0, r: 0.6 + Math.random() * 1.2, base: 0.1 + Math.random() * 0.16, b: 0.15, fl: 0, k: 0.005 + Math.random() * 0.004, ph: Math.random() * 6.283, tw: 0.0008 + Math.random() * 0.0014, c: pick() });
    }
    lw = w; lh = h;
  };
  return {
    move(x, y, dx, dy) {
      mx = x; my = y; pvx = dx; pvy = dy;
      ringA = Math.min(0.85, ringA + 0.06 + Math.sqrt(dx * dx + dy * dy) * 0.008);
    },
    down(x, y) {
      mx = x; my = y; pulse = 1; ringA = Math.min(1, ringA + 0.4);
      const R2 = lastR * 1.6;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const dx = x - s.x, dy = y - s.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d < R2) {
          const t = 1 - d / R2;
          s.vx += (dx / d) * t * t * 9;
          s.vy += (dy / d) * t * t * 9;
          s.fl = Math.min(1, s.fl + t * 0.9);
        }
      }
    },
    frame(dt) {
      env.clear();
      const ctx = env.ctx, w = env.W(), h = env.H();
      if (w !== lw || h !== lh) rebuild(w, h);
      const step = Math.min(dt || 16.7, 40) / 16.667;
      time += dt || 16.7;
      const damp = Math.max(0.62, 1 - 0.085 * step);
      const R = Math.max(140, Math.min(280, Math.min(w, h) * 0.33));
      lastR = R;
      if (ringA > 0.01) {
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mx, my, R, 0, 6.2832);
        ctx.strokeStyle = 'rgba(34,211,238,' + (ringA * 0.07).toFixed(3) + ')';
        ctx.stroke();
        ctx.beginPath(); ctx.arc(mx, my, R * 0.45, 0, 6.2832);
        ctx.strokeStyle = 'rgba(34,211,238,' + (ringA * 0.05).toFixed(3) + ')';
        ctx.stroke();
      }
      if (pulse > 0.01) {
        ctx.beginPath(); ctx.arc(mx, my, R * (0.25 + (1 - pulse) * 1.1), 0, 6.2832);
        ctx.strokeStyle = 'rgba(255,255,255,' + (pulse * 0.28).toFixed(3) + ')';
        ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1;
      }
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const ox = s.x, oy = s.y;
        const dx = mx - s.x, dy = my - s.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        let wgt = 0;
        if (d < R) {
          wgt = 1 - d / R;
          const g = wgt * wgt, ux = dx / d, uy = dy / d;
          s.vx += ux * g * 0.6 * step; s.vy += uy * g * 0.6 * step;
          s.vx += -uy * g * 0.22 * step; s.vy += ux * g * 0.22 * step;
          s.vx += pvx * g * 0.055 * step; s.vy += pvy * g * 0.055 * step;
          if (d < 20) { const p = (20 - d) * 0.06 * step; s.vx -= ux * p; s.vy -= uy * p; }
        }
        s.vx += (s.hx - s.x) * s.k * step;
        s.vy += (s.hy - s.y) * s.k * step;
        s.vx *= damp; s.vy *= damp;
        s.x += s.vx * step; s.y += s.vy * step;
        const tgt = s.base + wgt * 0.95;
        s.b += (tgt - s.b) * Math.min(1, 0.11 * step);
        s.fl = Math.max(0, s.fl - 0.045 * step);
        let a = s.b + s.fl + Math.sin(time * s.tw + s.ph) * 0.05;
        if (a < 0.05) a = 0.05; if (a > 1) a = 1;
        const lut = LUT[s.c];
        const sp = s.vx * s.vx + s.vy * s.vy;
        if (sp > 2.6) {
          ctx.strokeStyle = lut[(a * 0.55 * 24) | 0];
          ctx.lineWidth = s.r;
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(s.x, s.y); ctx.stroke();
        }
        const rr = s.r * (1 + wgt * 1.4 + s.fl * 0.8);
        if (a > 0.5) {
          ctx.fillStyle = lut[(a * 0.16 * 24) | 0];
          ctx.beginPath(); ctx.arc(s.x, s.y, rr * 3.4, 0, 6.2832); ctx.fill();
        }
        ctx.fillStyle = lut[(a * 24) | 0];
        ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, 6.2832); ctx.fill();
      }
      ringA = Math.max(0, ringA - 0.035 * step);
      pulse = Math.max(0, pulse - 0.05 * step);
      const pd = Math.max(0, 1 - 0.25 * step);
      pvx *= pd; pvy *= pd;
    }
  };
},
  },
  {
    id: "lightning",
    name: "STATIC CRACKLE",
    blurb: "Fast flicks throw jagged cyan-white static arcs off the cursor; slow moves settle into a calm charged glow.",
    make: (env) => {
  const ctx = env.ctx;
  const MAXA = 100, MAXS = 200;
  const arcs = new Array(MAXA);
  for (let i = 0; i < MAXA; i++) arcs[i] = { on: false, px: new Float32Array(5), py: new Float32Array(5), n: 0, life: 0, max: 1, w: 1 };
  const sparks = new Array(MAXS);
  for (let i = 0; i < MAXS; i++) sparks[i] = { on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 1 };
  let mx = -200, my = -200, trav = 0, speed = 0, spawnDebt = 0, idleTick = 400, t = 0, seen = false;

  const spark = (x, y, ang, big) => {
    for (let i = 0; i < MAXS; i++) {
      const s = sparks[i];
      if (s.on) continue;
      s.on = true;
      s.x = x; s.y = y;
      const v = (0.02 + Math.random() * 0.08) * (big ? 2.5 : 1);
      s.vx = Math.cos(ang) * v; s.vy = Math.sin(ang) * v;
      s.max = s.life = 90 + Math.random() * 130;
      s.r = big ? 1.6 + Math.random() * 1.4 : 0.8 + Math.random() * 1.1;
      return;
    }
  };

  const arc = (x, y, power) => {
    for (let i = 0; i < MAXA; i++) {
      const a = arcs[i];
      if (a.on) continue;
      a.on = true;
      const segs = 2 + ((Math.random() * 3) | 0);
      a.n = segs + 1;
      a.px[0] = x; a.py[0] = y;
      let ang = Math.random() * 6.2832;
      let cx = x, cy = y;
      const base = 6 + power * 14;
      for (let j = 1; j <= segs; j++) {
        ang += (Math.random() - 0.5) * 1.7;
        const L = base * (0.55 + Math.random() * 0.9);
        cx += Math.cos(ang) * L;
        cy += Math.sin(ang) * L;
        a.px[j] = cx; a.py[j] = cy;
      }
      a.max = a.life = 100 + Math.random() * 50;
      a.w = 0.9 + power * 1.3 + Math.random() * 0.6;
      spark(cx, cy, ang, false);
      if (Math.random() < 0.5) spark(x, y, Math.random() * 6.2832, false);
      return;
    }
  };

  return {
    move(x, y, dx, dy) {
      mx = x; my = y; seen = true;
      trav += Math.sqrt(dx * dx + dy * dy);
    },
    down(x, y) {
      mx = x; my = y; seen = true;
      for (let i = 0; i < 10; i++) arc(x, y, 1.15);
      for (let i = 0; i < 14; i++) spark(x, y, Math.random() * 6.2832, true);
    },
    frame(dt) {
      env.fade(0.5);
      if (dt > 50) dt = 50;
      if (dt < 1) dt = 1;
      t += dt;
      const v = trav / dt; trav = 0;
      speed += (v - speed) * Math.min(1, dt * 0.012);
      const hot = Math.max(0, speed - 0.35);
      if (hot > 0) {
        spawnDebt += Math.min(3.5, hot * 1.6) * dt / 16.7;
        let burst = 0;
        while (spawnDebt >= 1 && burst < 4) { spawnDebt -= 1; burst++; arc(mx, my, Math.min(1.3, 0.45 + hot)); }
      } else spawnDebt = 0;
      idleTick -= dt;
      if (idleTick <= 0 && seen) {
        idleTick = 500 + Math.random() * 900;
        if (speed < 0.15) arc(mx, my, 0.22);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < MAXA; i++) {
        const a = arcs[i];
        if (!a.on) continue;
        a.life -= dt;
        if (a.life <= 0) { a.on = false; continue; }
        const k = a.life / a.max;
        const fl = 0.65 + Math.random() * 0.35;
        ctx.beginPath();
        ctx.moveTo(a.px[0], a.py[0]);
        for (let p = 1; p < a.n; p++) ctx.lineTo(a.px[p], a.py[p]);
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.35 * k * fl).toFixed(3) + ')';
        ctx.lineWidth = a.w * 3.2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.8 * k * fl).toFixed(3) + ')';
        ctx.lineWidth = a.w * 1.6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * k * fl).toFixed(3) + ')';
        ctx.lineWidth = a.w * 0.7;
        ctx.stroke();
      }
      for (let i = 0; i < MAXS; i++) {
        const s = sparks[i];
        if (!s.on) continue;
        s.life -= dt;
        if (s.life <= 0) { s.on = false; continue; }
        s.x += s.vx * dt; s.y += s.vy * dt;
        const k = s.life / s.max;
        ctx.fillStyle = k > 0.55 ? 'rgba(255,255,255,' + k.toFixed(3) + ')' : 'rgba(34,211,238,' + (k * 0.9).toFixed(3) + ')';
        const r = s.r * (0.4 + 0.6 * k);
        ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      }
      if (seen) {
        const e = Math.min(1, speed * 1.4);
        const pulse = 0.9 + 0.1 * Math.sin(t * 0.004);
        const R = (10 + e * 12) * pulse;
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, R);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.55 + e * 0.4).toFixed(3) + ')');
        g.addColorStop(0.25, 'rgba(34,211,238,' + (0.4 + e * 0.35).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mx, my, R, 0, 6.2832);
        ctx.fill();
      }
    }
  };
},
  },
  {
    id: "black-hole",
    name: "EVENT HORIZON",
    blurb: "A miniature black hole rides your cursor — debris spirals down decaying orbits and flares out on a pink-gold accretion ring.",
    make: (env) => {
  const MAXP = 380, MAXF = 28, MAXW = 5;
  const parts = [], flashes = [], waves = [];
  for (let i = 0; i < MAXP; i++) parts.push({ alive: false, a: 0, r: 0, sr: 1, dir: 1, px: 0, py: 0, hp: false, tw: 1 });
  for (let i = 0; i < MAXF; i++) flashes.push({ alive: false, x: 0, y: 0, life: 0 });
  for (let i = 0; i < MAXW; i++) waves.push({ alive: false, r: 0 });
  let cx = 0, cy = 0, tx = 0, ty = 0, seen = false;
  let time = 0, hot = 0, idleAcc = 0, lastDir = 1, ringFlash = 0;
  const TAU = 6.28318;
  function spawn(r, ang, dir) {
    for (let i = 0; i < MAXP; i++) {
      const p = parts[i];
      if (!p.alive) {
        p.alive = true; p.r = r; p.sr = r; p.a = ang; p.dir = dir;
        p.hp = false; p.tw = 0.6 + Math.random() * 0.4;
        return p;
      }
    }
    return null;
  }
  function addFlash(x, y) {
    for (let i = 0; i < MAXF; i++) {
      const f = flashes[i];
      if (!f.alive) { f.alive = true; f.x = x; f.y = y; f.life = 1; return; }
    }
  }
  return {
    move(x, y, dx, dy) {
      tx = x; ty = y;
      if (!seen) { cx = x; cy = y; seen = true; }
      const sp = Math.hypot(dx, dy);
      if (sp < 0.5) return;
      const n = Math.min(4, 1 + Math.floor(sp / 8));
      const back = Math.atan2(-dy, -dx);
      for (let j = 0; j < n; j++) {
        const ang = back + (Math.random() - 0.5) * 2.4;
        const rad = Math.min(165, 70 + Math.random() * 75 + sp * 0.6);
        const cross = Math.cos(ang) * dy - Math.sin(ang) * dx;
        const dir = cross >= 0 ? 1 : -1;
        lastDir = dir;
        spawn(rad, ang, dir);
      }
    },
    down(x, y) {
      tx = x; ty = y;
      if (!seen) { cx = x; cy = y; seen = true; }
      for (let i = 0; i < MAXW; i++) {
        if (!waves[i].alive) { waves[i].alive = true; waves[i].r = 155; break; }
      }
      const dir = Math.random() < 0.5 ? -1 : 1;
      lastDir = dir;
      for (let j = 0; j < 26; j++) spawn(105 + Math.random() * 70, Math.random() * TAU, dir);
    },
    frame(dt) {
      env.fade(0.28);
      dt = Math.max(0.1, Math.min(dt || 16.7, 34));
      time += dt;
      const ctx = env.ctx;
      if (!seen) { cx = tx = env.W() * 0.5; cy = ty = env.H() * 0.5; seen = true; }
      const k = 1 - Math.exp(-dt * 0.012);
      cx += (tx - cx) * k; cy += (ty - cy) * k;
      const R = 30 + Math.sin(time * 0.0035) * 1.6;
      hot += dt * 0.004;
      idleAcc += dt;
      if (idleAcc > 260) { idleAcc = 0; spawn(95 + Math.random() * 60, Math.random() * TAU, lastDir); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 10);
      g.addColorStop(0, 'rgba(0,0,0,0.96)');
      g.addColorStop(Math.max(0.01, (R - 1) / (R + 10)), 'rgba(0,0,0,0.92)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R + 10, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      g = ctx.createRadialGradient(cx, cy, Math.max(0, R - 12), cx, cy, R + 20);
      g.addColorStop(0, 'rgba(255,46,163,0)');
      g.addColorStop(0.3, 'rgba(255,46,163,0.14)');
      g.addColorStop(0.375, 'rgba(255,222,46,0.42)');
      g.addColorStop(0.46, 'rgba(255,46,163,0.12)');
      g.addColorStop(1, 'rgba(255,46,163,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R + 20, 0, TAU); ctx.fill();
      const gx = Math.cos(hot * 0.6), gy = Math.sin(hot * 0.6);
      g = ctx.createLinearGradient(cx - gx * R, cy - gy * R, cx + gx * R, cy + gy * R);
      g.addColorStop(0, env.palette.pink);
      g.addColorStop(1, env.palette.gold);
      ctx.strokeStyle = g; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,222,46,0.32)';
      ctx.beginPath(); ctx.arc(cx, cy, R, hot - 0.25, hot + 1.15); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(cx, cy, R, hot, hot + 0.9); ctx.stroke();
      if (ringFlash > 0) {
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,222,46,' + (0.5 * ringFlash).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, TAU); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * ringFlash).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        ringFlash -= dt / 170;
      }
      for (let i = 0; i < MAXW; i++) {
        const w = waves[i];
        if (!w.alive) continue;
        const gap = w.r - R;
        w.r -= (gap * 0.006 + 0.05) * dt;
        if (w.r <= R + 2) { w.alive = false; ringFlash = 1; continue; }
        const t = Math.max(0, Math.min(1, 1 - gap / 130));
        ctx.lineWidth = 1.5 + t * 2.2;
        ctx.strokeStyle = 'rgba(255,222,46,' + (0.15 + 0.55 * t).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx, cy, w.r, 0, TAU); ctx.stroke();
      }
      for (let i = 0; i < MAXP; i++) {
        const p = parts[i];
        if (!p.alive) continue;
        const gap = p.r - R;
        p.a += (2.2 / Math.pow(p.r, 1.45)) * p.dir * dt;
        p.r -= (0.02 + 2.4 / (gap + 6)) * dt;
        if (p.r <= R + 1.2) {
          p.alive = false;
          addFlash(cx + Math.cos(p.a) * (R + 1), cy + Math.sin(p.a) * (R + 1));
          continue;
        }
        const x = cx + Math.cos(p.a) * p.r;
        const y = cy + Math.sin(p.a) * p.r;
        if (p.hp) {
          const sx = x - p.px, sy = y - p.py;
          if (sx * sx + sy * sy < 1600) {
            let t = 1 - (p.r - R) / (p.sr - R + 0.001);
            if (t < 0) t = 0; else if (t > 1) t = 1;
            let gg = 46 + 176 * t, bb = 163 - 117 * t;
            const wt = t > 0.8 ? (t - 0.8) * 5 : 0;
            gg += (255 - gg) * wt; bb += (255 - bb) * wt;
            ctx.strokeStyle = 'rgba(255,' + (gg | 0) + ',' + (bb | 0) + ',' + ((0.22 + 0.68 * t) * p.tw).toFixed(3) + ')';
            ctx.lineWidth = 0.9 + t * 1.7;
            ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(x, y); ctx.stroke();
          }
        }
        p.px = x; p.py = y; p.hp = true;
      }
      for (let i = 0; i < MAXF; i++) {
        const f = flashes[i];
        if (!f.alive) continue;
        f.life -= dt / 220;
        if (f.life <= 0) { f.alive = false; continue; }
        const rad = 3 + (1 - f.life) * 8;
        g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rad);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * f.life).toFixed(3) + ')');
        g.addColorStop(0.4, 'rgba(255,222,46,' + (0.5 * f.life).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,46,163,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, rad, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  };
},
  },
]
