// Hero scene: parallax night skyline drawn to a canvas.
// Layers are pre-rendered once and only translated per frame, so it stays cheap.
(() => {
  const canvas = document.getElementById('sceneCanvas');
  if (!canvas) return;
  const hero = canvas.parentElement;
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduce = false;

  let W = 0, H = 0, dpr = 1, P = 2400, roadH = 80;
  let layers = [], stars = null;
  const offsets = { stars: 0, far: 0, mid: 0, near: 0 };
  let eqPhase = 0, eqGrad = null;
  let speedFactor = 0.6, running = false, inView = true, last = 0;

  // Small seeded RNG so the skyline is identical on every load
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    return { c, x, w, h };
  }

  function buildLayer(cfg) {
    const L = makeCanvas(P, cfg.h);
    const r = rng(cfg.seed);
    let x = 0;
    while (x < P) {
      let w = cfg.minW + r() * (cfg.maxW - cfg.minW);
      if (x + w > P || P - (x + w) < cfg.minW * 0.5) w = P - x;
      const h = cfg.h * (0.35 + r() * 0.65);
      const y = cfg.h - h;
      L.x.fillStyle = cfg.fill;
      L.x.fillRect(x, y, w, h);
      if (cfg.rim) {
        L.x.fillStyle = cfg.rim;
        L.x.fillRect(x, y, w, 1.5);
      }
      if (cfg.windows) {
        for (let wy = y + 8; wy < cfg.h - 6; wy += 11) {
          for (let wx = x + 6; wx < x + w - 8; wx += 9) {
            if (r() < cfg.windows) {
              L.x.fillStyle = r() < 0.8 ? 'rgba(255,42,109,0.55)' : 'rgba(150,80,255,0.5)';
              L.x.fillRect(wx, wy, 3, 5);
            }
          }
        }
      }
      x += w + (r() < 0.3 ? 4 + r() * 8 : 0);
    }
    return L;
  }

  function buildStars() {
    const sh = Math.max(200, H * 0.6);
    const S = makeCanvas(P, sh);
    const r = rng(7);
    for (let i = 0; i < 110; i++) {
      S.x.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.55})`;
      const s = r() < 0.15 ? 1.8 : 1;
      S.x.fillRect(r() * P, r() * sh, s, s);
    }
    return S;
  }

  function build() {
    const base = H - roadH;
    layers = [
      { key: 'far',  speed: 22,  baseY: base, ...mk({ h: Math.min(0.30 * H, 360), minW: 60, maxW: 150, fill: 'rgba(36,4,64,0.92)', windows: 0.05, seed: 11 }) },
      { key: 'mid',  speed: 55,  baseY: base, ...mk({ h: Math.min(0.22 * H, 280), minW: 50, maxW: 120, fill: '#12011c', windows: 0.1,  seed: 23 }) },
      { key: 'near', speed: 115, baseY: base, ...mk({ h: Math.min(0.15 * H, 190), minW: 70, maxW: 170, fill: '#07000d', windows: 0.14, rim: 'rgba(255,20,147,0.45)', seed: 37 }) }
    ];
    stars = buildStars();
    const eh = Math.round(H * 0.4 * dpr), bd = Math.round(base * dpr);
    eqGrad = ctx.createLinearGradient(0, bd - eh, 0, bd);
    eqGrad.addColorStop(0, 'rgba(255,42,109,0.9)');
    eqGrad.addColorStop(0.6, 'rgba(255,20,147,0.3)');
    eqGrad.addColorStop(1, 'rgba(106,0,255,0)');
  }
  function mk(cfg) { return { cfg, layer: buildLayer(cfg) }; }

  // Blit a wrapped, pixel-snapped slice of a pre-rendered tile (device pixels, no scaling).
  function blit(L, off, y) {
    const tw = L.c.width, th = L.c.height;
    const sx = Math.floor((tw - ((off * dpr) % tw)) % tw);
    const cw = canvas.width;
    const w1 = Math.min(cw, tw - sx);
    const dy = Math.round(y * dpr);
    ctx.drawImage(L.c, sx, 0, w1, th, 0, dy, w1, th);
    if (w1 < cw) ctx.drawImage(L.c, 0, 0, Math.min(cw - w1, tw), th, w1, dy, Math.min(cw - w1, tw), th);
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    blit(stars, offsets.stars, 0);
    // equalizer skyline (drawn on the canvas: one pass, no DOM nodes)
    const eh = Math.round(H * 0.4 * dpr), bd = Math.round((H - roadH) * dpr);
    const bw = Math.round(26 * dpr), step = bw + Math.round(10 * dpr);
    const amp = 0.7 + Math.min(1, window.__bass || 0) * 0.5;
    ctx.globalAlpha = 0.4; ctx.fillStyle = eqGrad;
    for (let i = 0, x = 0; x < canvas.width; i++, x += step) {
      const a = Math.abs(Math.sin(eqPhase * 1.6 + i * 0.55)) * (0.55 + 0.45 * Math.abs(Math.sin(eqPhase * 0.9 + i * 1.7)));
      const h = eh * (0.12 + 0.88 * a) * amp;
      ctx.fillRect(x, bd - h, bw, h);
    }
    ctx.globalAlpha = 1;
    for (const L of layers) blit(L.layer, offsets[L.key], L.baseY - L.cfg.h);
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const playing = window.audioPlayer && window.audioPlayer.isPlaying();
    const target = playing ? 1.15 : 0.6;
    speedFactor += (target - speedFactor) * Math.min(1, dt * 1.6);
    offsets.stars += 4 * speedFactor * dt;
    eqPhase += dt * (0.6 + speedFactor * 1.6);
    for (const L of layers) offsets[L.key] += L.speed * speedFactor * dt;
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    if (reduce || running || !inView || document.hidden) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  function resize() {
    const r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    P = Math.max(1200, W + 300);
    roadH = parseFloat(getComputedStyle(hero).getPropertyValue('--road')) || 80;
    // --road uses clamp(); resolve it to pixels via a probe
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--road)';
    hero.appendChild(probe);
    roadH = probe.getBoundingClientRect().height || 80;
    probe.remove();
    build();
    draw();
  }

  let rt;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(resize, 120); }).observe(hero);
  resize();

  new IntersectionObserver(es => { inView = es[0].isIntersecting; hero.classList.toggle('off', !inView); inView ? start() : stop(); }).observe(hero);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  start();
})();
