(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  const intro = $('intro'), enterBtn = $('enterBtn'), titleEl = $('introTitle');
  const header = $('siteHeader'), main = $('main'), dock = $('player');
  const behind = [header, main, dock, $('mobileMenu'), document.querySelector('.site-footer')].filter(Boolean);

  // ---------- Intro ----------
  behind.forEach(el => { el.inert = true; });

  const TITLE = 'REBASSED CENTRAL 868';
  titleEl.textContent = '';
  let n = 0;
  TITLE.split(' ').forEach(word => {
    const w = document.createElement('span');
    w.className = 'word' + (/^\d+$/.test(word) ? ' num' : '');
    w.setAttribute('aria-hidden', 'true');
    [...word].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.style.animationDelay = `${0.35 + n++ * 0.055}s`;
      w.appendChild(s);
    });
    titleEl.appendChild(w);
  });

  // Intro equalizer bars (silent, decorative)
  const c = $('introCanvas');
  const ctx = c.getContext('2d');
  let W = 0, H = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bars = 64;
  const heights = new Array(bars).fill(0.3);
  const speeds = Array.from({ length: bars }, () => 0.02 + Math.random() * 0.05);
  function resizeIntro() {
    W = c.clientWidth; H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeIntro();
  window.addEventListener('resize', resizeIntro);

  let introOpen = true;
  function drawIntro(t) {
    if (!introOpen) return;
    ctx.clearRect(0, 0, W, H);
    const gap = 4, bw = (W - gap * (bars - 1)) / bars;
    for (let i = 0; i < bars; i++) {
      const target = 0.15 + Math.abs(Math.sin(t * 0.002 + i * 0.35)) * 0.85;
      heights[i] += (target - heights[i]) * speeds[i];
      const h = heights[i] * H * 0.55;
      const y = H - h;
      const g = ctx.createLinearGradient(0, y, 0, H);
      g.addColorStop(0, 'rgba(255,42,109,0.95)');
      g.addColorStop(0.5, 'rgba(255,20,147,0.55)');
      g.addColorStop(1, 'rgba(106,0,255,0.05)');
      ctx.fillStyle = g;
      ctx.fillRect(i * (bw + gap), y, bw, h);
    }
    requestAnimationFrame(drawIntro);
  }
  requestAnimationFrame(drawIntro);

  function enter() {
    if (!introOpen) return;
    introOpen = false;
    intro.classList.add('hidden');
    root.classList.remove('intro-lock');
    behind.forEach(el => { el.inert = false; });
    window.scrollTo(0, 0);
    document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('in'));
    if (window.audioPlayer) window.audioPlayer.start();
    setTimeout(() => { intro.hidden = true; }, 900);
    const top = $('top');
    top.tabIndex = -1; top.focus({ preventScroll: true });
  }
  enterBtn.addEventListener('click', enter);
  enterBtn.focus({ preventScroll: true });
  document.addEventListener('keydown', e => {
    if (introOpen && (e.key === 'Enter' || e.key === ' ') && document.activeElement !== enterBtn) {
      e.preventDefault(); enter();
    }
  });

  // ---------- Header ----------
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Mobile menu ----------
  const menuBtn = $('menuBtn'), menu = $('mobileMenu');
  const menuIcon = menuBtn.querySelector('use');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuIcon.setAttribute('href', open ? '#i-x' : '#i-menu');
    header.classList.toggle('scrolled', open || window.scrollY > 24);
  }
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  window.matchMedia('(min-width: 821px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  // ---------- Scroll reveal ----------
  const reveals = document.querySelectorAll('.reveal:not(.hero .reveal)');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
    document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('in'));
  }

  // ---------- Scroll spy ----------
  const links = [...document.querySelectorAll('.nav a[data-spy]')];
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.setAttribute('aria-current', String(a.dataset.spy === e.target.id)));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const s = $(a.dataset.spy); if (s) spy.observe(s); });
    const top = $('top');
    new IntersectionObserver(es => { if (es[0].isIntersecting) links.forEach(a => a.removeAttribute('aria-current')); }, { rootMargin: '-45% 0px -50% 0px' }).observe(top);
  }

  // ---------- Sky equalizer ----------
  const eq = $('skyEq');
  if (eq) {
    const count = 48;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('i');
      b.style.setProperty('--d', (0.9 + Math.random() * 1.2).toFixed(2) + 's');
      b.style.setProperty('--dl', (-Math.random() * 2).toFixed(2) + 's');
      b.style.setProperty('--h', (0.3 + Math.random() * 0.7).toFixed(2));
      eq.appendChild(b);
    }
  }

  // ---------- Lightning ----------
  const lightning = $('lightning');
  function scheduleFlash() {
    setTimeout(() => {
      if (!root.classList.contains('low-perf')) {
        lightning.classList.remove('flash'); void lightning.offsetWidth; lightning.classList.add('flash');
        if (Math.random() < 0.35) setTimeout(() => { lightning.classList.remove('flash'); void lightning.offsetWidth; lightning.classList.add('flash'); }, 260);
      }
      scheduleFlash();
    }, 4000 + Math.random() * 7000);
  }
  if (lightning) scheduleFlash();

  // ---------- Cursor glow (hover devices) ----------
  if (window.matchMedia('(hover: hover)').matches) {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    window.addEventListener('mousemove', e => { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; glow.style.opacity = '1'; });
    document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
  }

  // ---------- Pause off-screen videos (keeps the page smooth) ----------
  const frames = [...document.querySelectorAll('.video-tile iframe')];
  const yt = (f, fn) => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: '' }), '*'); } catch (e) { /* ignore */ } };
  if ('IntersectionObserver' in window && frames.length) {
    const vis = new Map();
    const vio = new IntersectionObserver(es => es.forEach(e => {
      vis.set(e.target, e.isIntersecting);
      yt(e.target, e.isIntersecting ? 'playVideo' : 'pauseVideo');
    }), { threshold: 0.15 });
    frames.forEach(f => {
      vio.observe(f);
      f.addEventListener('load', () => setTimeout(() => { if (vis.get(f) === false) yt(f, 'pauseVideo'); }, 1200));
    });
  }
})();
