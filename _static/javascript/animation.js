(() => {
  const intro    = document.getElementById('intro');
  const mainEl   = document.getElementById('main');
  const titleEl  = document.getElementById('introTitle');
  const enterBtn = document.getElementById('enterBtn');

  // Spell the title
  const TITLE = 'REBASSED CENTRAL 868';
  titleEl.innerHTML = '';
  [...TITLE].forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch === ' ' ? '\u00A0' : ch;
    s.style.animationDelay = `${0.35 + i * 0.055}s`;
    titleEl.appendChild(s);
  });

  // Intro canvas bars (silent)
  const c = document.getElementById('introCanvas');
  const ctx = c.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bars = 64;
  const heights = new Array(bars).fill(0.3);
  const speeds  = new Array(bars).fill(0).map(() => 0.02 + Math.random() * 0.05);

  function resizeIntro() {
    W = c.clientWidth; H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeIntro();
  window.addEventListener('resize', resizeIntro);

  function drawIntro(t) {
    ctx.clearRect(0, 0, W, H);
    const gap = 4;
    const bw = (W - gap * (bars - 1)) / bars;
    for (let i = 0; i < bars; i++) {
      const target = 0.15 + Math.abs(Math.sin(t * 0.002 + i * 0.35)) * 0.85;
      heights[i] += (target - heights[i]) * speeds[i];
      const h = heights[i] * H * 0.55;
      const x = i * (bw + gap);
      const y = H - h;
      const g = ctx.createLinearGradient(0, y, 0, H);
      g.addColorStop(0, 'rgba(255,42,109,0.95)');
      g.addColorStop(0.5, 'rgba(255,20,147,0.55)');
      g.addColorStop(1, 'rgba(106,0,255,0.05)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, bw, h);
    }
    if (!intro.classList.contains('hidden')) requestAnimationFrame(drawIntro);
  }
  requestAnimationFrame(drawIntro);

  // Enter
  function enter() {
    if (intro.classList.contains('hidden')) return;
    intro.classList.add('hidden');
    mainEl.classList.add('visible');
    if (window.audioPlayer && typeof window.audioPlayer.playIndex === 'function') {
      window.audioPlayer.playIndex(0);
    }
  }
  enterBtn.addEventListener('click', enter);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !intro.classList.contains('hidden')) {
      e.preventDefault(); enter();
    }
  });

  // -------- Lightning flashes --------
  const lightning = document.getElementById('lightning');
  function scheduleFlash() {
    const delay = 5000 + Math.random() * 9000;
    setTimeout(() => {
      lightning.classList.add('flash');
      setTimeout(() => lightning.classList.remove('flash'), 500);
      if (Math.random() < 0.3) {
        setTimeout(() => {
          lightning.classList.add('flash');
          setTimeout(() => lightning.classList.remove('flash'), 400);
        }, 220);
      }
      scheduleFlash();
    }, delay);
  }
  scheduleFlash();
})();