(() => {
  // Audio files live in _static/audios/. Names must match these paths exactly.
  const tracks = [
    { name: "Nostalgia (Don't stop)", file: "_static/audios/Nostalgia (Don't stop).mp3", icon: "_static/audios/icons/Nostalgia (Don't stop).png" },
    { name: 'Just Fxck',              file: '_static/audios/Just Fxck.mp3',              icon: '_static/audios/icons/Just Fxck.png' },
    { name: 'Gangster Gospel',        file: '_static/audios/Gangster Gospel.mp3',        icon: '_static/audios/icons/Gangster Gospel.png' },
    { name: 'Freak',                  file: '_static/audios/Freak.mp3',                  icon: '_static/audios/icons/freak.png' },
    { name: 'Shy',                    file: '_static/audios/Shy.mp3',                    icon: '_static/audios/icons/Shy.png' }
  ];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.loop = false;
  const savedVol = parseFloat(storage.get('rb868.volume'));
  audio.volume = isFinite(savedVol) ? Math.min(1, Math.max(0, savedVol)) : 0.75;

  // ---------- Web Audio analyser (bass-reactive visuals) ----------
  // Only on http(s): a media element loaded from file:// is treated as cross-origin
  // and would be silenced once routed through the Web Audio graph.
  const canAnalyse = /^https?:$/.test(location.protocol);
  let audioCtx = null, analyser = null, freqData = null, audioReady = false;

  function initAudioGraph() {
    if (audioCtx || !canAnalyse) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      const src = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(audioCtx.destination);
      audioReady = true;
    } catch (e) { console.warn('Web Audio unavailable:', e); }
  }

  const bassTargets = Array.from(document.querySelectorAll('[data-bass]'));
  const visible = new Map(bassTargets.map(el => [el, true]));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => visible.set(e.target, e.isIntersecting)));
    bassTargets.forEach(el => io.observe(el));
  }

  // Drives --bass / --beat. Uses the real analyser when available, otherwise a
  // steady synthetic ~118 BPM pulse while playing, and a gentle idle pulse when paused.
  let beatPulse = 0, lastBass = 0, lastBeatIdx = -1;
  function tickBass(t) {
    if (!document.hidden) {
      const playing = !audio.paused && !audio.error;
      let bass;
      if (audioReady && playing) {
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < 10; i++) sum += freqData[i];
        bass = Math.min(1, (sum / 10) / 200);
        if (bass > lastBass + 0.06) beatPulse = 1; else beatPulse *= 0.92;
      } else {
        const period = playing ? 508 : 1400;
        const beatIdx = Math.floor(t / period);
        if (beatIdx !== lastBeatIdx) { lastBeatIdx = beatIdx; beatPulse = playing ? 1 : 0.35; }
        beatPulse *= 0.93;
        bass = (playing ? 0.3 : 0.08) + beatPulse * (playing ? 0.55 : 0.2);
      }
      lastBass = bass; window.__bass = bass;
      const bs = bass.toFixed(3), bt = beatPulse.toFixed(3);
      bassTargets.forEach(el => {
        if (!visible.get(el)) return;
        el.style.setProperty('--bass', bs);
        el.style.setProperty('--beat', bt);
      });
    }
    requestAnimationFrame(tickBass);
  }
  requestAnimationFrame(tickBass);

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const player = $('player'), art = $('trackArt'), nameEl = $('trackName'), idxEl = $('trackIndex');
  const playBtn = $('playPauseBtn'), iconPlay = $('iconPlay'), iconPause = $('iconPause');
  const prevBtn = $('prevBtn'), nextBtn = $('nextBtn');
  const volSlider = $('volumeSlider'), muteBtn = $('muteBtn'), iconVol = $('iconVol'), iconMute = $('iconMute');
  const progressBar = $('progressBar'), progressFill = $('progressFill'), progressThumb = $('progressThumb');
  const curTimeEl = $('currentTime'), durEl = $('duration');
  const listEl = $('trackList'), noteEl = $('trackNote');

  const pad = n => String(n).padStart(2, '0');
  const fmt = s => {
    if (!isFinite(s) || s < 0) s = 0;
    return `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  };

  // ---------- Track list ----------
  const rows = !listEl ? [] : tracks.map((t, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'track';
    b.dataset.index = i;
    b.setAttribute('aria-label', `Play ${t.name}`);
    b.innerHTML =
      `<span class="track-num">${pad(i + 1)}</span>` +
      `<span class="track-art"><img alt="" loading="lazy" width="60" height="60"></span>` +
      `<span class="track-title"></span>` +
      `<span class="track-state"><svg class="icon" aria-hidden="true"><use href="#i-play"/></svg>` +
      `<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span>`;
    b.querySelector('img').src = t.icon;
    b.querySelector('.track-title').textContent = t.name;
    b.addEventListener('click', () => {
      if (i === index && loaded) toggle(); else { loadTrack(i); play(); }
    });
    li.appendChild(b);
    listEl.appendChild(li);
    return b;
  });

  function markActive() {
    rows.forEach((r, i) => {
      const on = i === index;
      r.classList.toggle('is-active', on);
      if (on) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current');
    });
  }

  // ---------- Player ----------
  let index = 0, loaded = false;
  // show the first track (Nostalgia) before anything is played
  art.src = tracks[0].icon; nameEl.textContent = tracks[0].name;

  function note(msg) { if (noteEl) noteEl.textContent = msg || ''; }

  function loadTrack(i) {
    index = (i + tracks.length) % tracks.length;
    const t = tracks[index];
    audio.src = t.file;
    audio.load();
    loaded = true;
    art.src = t.icon;
    nameEl.textContent = t.name;
    idxEl.textContent = `${pad(index + 1)} / ${pad(tracks.length)}`;
    setProgress(0);
    curTimeEl.textContent = '0:00';
    durEl.textContent = '0:00';
    rows.forEach(r => r.classList.remove('is-error'));
    note('');
    markActive();
    updateMediaSession();
  }

  function play() {
    if (!loaded) loadTrack(index);
    initAudioGraph();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    const p = audio.play();
    if (p && p.catch) p.catch(err => { if (err && err.name !== 'AbortError') handleError(); });
    updateIcons();
  }
  function pause() { audio.pause(); updateIcons(); }
  function toggle() { audio.paused ? play() : pause(); }

  function handleError() {
    const t = tracks[index];
    console.warn(`Could not load audio: ${t.file}`);
    if (rows[index]) rows[index].classList.add('is-error');
    note(`"${t.name}" could not be loaded right now.`);
    updateIcons();
  }

  function updateIcons() {
    const playing = !audio.paused && !audio.error;
    iconPlay.hidden = playing;
    iconPause.hidden = !playing;
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    player.classList.toggle('paused', !playing);
    document.documentElement.classList.toggle('is-playing', playing);
    window.dispatchEvent(new CustomEvent('rb:state', { detail: { playing } }));
  }

  function setProgress(p) {
    const pct = (p * 100).toFixed(2) + '%';
    progressFill.style.width = pct;
    progressThumb.style.left = pct;
  }

  function volumeUI() {
    const muted = audio.muted || audio.volume === 0;
    iconVol.hidden = muted; iconMute.hidden = !muted;
    muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    volSlider.style.setProperty('--v', (audio.muted ? 0 : audio.volume * 100) + '%');
  }
  volSlider.value = audio.volume;
  volumeUI();

  playBtn.addEventListener('click', toggle);
  nextBtn.addEventListener('click', () => { loadTrack(index + 1); play(); });
  prevBtn.addEventListener('click', () => {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    loadTrack(index - 1); play();
  });
  volSlider.addEventListener('input', e => {
    audio.muted = false;
    audio.volume = parseFloat(e.target.value);
    storage.set('rb868.volume', audio.volume);
    volumeUI();
  });
  muteBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (!audio.muted && audio.volume === 0) { audio.volume = 0.5; volSlider.value = 0.5; }
    volumeUI();
  });

  let lastAria = 0;
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const p = audio.currentTime / audio.duration;
    setProgress(p);
    curTimeEl.textContent = fmt(audio.currentTime);
    const now = performance.now();
    if (now - lastAria > 1000) {
      lastAria = now;
      progressBar.setAttribute('aria-valuenow', Math.round(p * 100));
      progressBar.setAttribute('aria-valuetext', `${fmt(audio.currentTime)} of ${fmt(audio.duration)}`);
    }
  });
  audio.addEventListener('loadedmetadata', () => { durEl.textContent = fmt(audio.duration); });
  audio.addEventListener('play', updateIcons);
  audio.addEventListener('pause', updateIcons);
  audio.addEventListener('error', handleError);
  audio.addEventListener('ended', () => { loadTrack(index + 1); play(); });

  // ---------- Seeking (pointer + keyboard) ----------
  let seeking = false;
  function seekFromEvent(e) {
    const r = progressBar.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    if (audio.duration) { audio.currentTime = x * audio.duration; setProgress(x); }
  }
  progressBar.addEventListener('pointerdown', e => {
    seeking = true; progressBar.classList.add('dragging');
    progressBar.setPointerCapture(e.pointerId); seekFromEvent(e);
  });
  progressBar.addEventListener('pointermove', e => { if (seeking) seekFromEvent(e); });
  const endSeek = () => { seeking = false; progressBar.classList.remove('dragging'); };
  progressBar.addEventListener('pointerup', endSeek);
  progressBar.addEventListener('pointercancel', endSeek);
  progressBar.addEventListener('keydown', e => {
    if (!audio.duration) return;
    const step = e.shiftKey ? 15 : 5;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { audio.currentTime = Math.min(audio.duration, audio.currentTime + step); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { audio.currentTime = Math.max(0, audio.currentTime - step); e.preventDefault(); }
    else if (e.key === 'Home') { audio.currentTime = 0; e.preventDefault(); }
    else if (e.key === 'End') { audio.currentTime = audio.duration - 0.1; e.preventDefault(); }
  });

  // ---------- Media keys / lock screen ----------
  function updateMediaSession() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const t = tracks[index];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.name, artist: 'Rebassed Central 868',
      artwork: [{ src: t.icon, sizes: '300x300', type: 'image/png' }]
    });
  }
  if ('mediaSession' in navigator) {
    const set = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) { /* unsupported */ } };
    set('play', play); set('pause', pause);
    set('previoustrack', () => { loadTrack(index - 1); play(); });
    set('nexttrack', () => { loadTrack(index + 1); play(); });
  }

  markActive();

  window.audioPlayer = {
    playIndex(i) { loadTrack(i); play(); },
    play, pause, toggle,
    start() { if (!loaded) loadTrack(0); play(); },
    isPlaying: () => !audio.paused && !audio.error,
    get loaded() { return loaded; }
  };
})();
