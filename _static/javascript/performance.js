// Samples frame rate for a few seconds after load. If the device is struggling,
// the page gets a .low-perf class that slows the decorative animations.
(() => {
  let frames = 0, last = performance.now(), samples = 0, slow = 0;
  function tick(now) {
    frames++;
    if (now - last >= 1200) {
      const fps = (frames * 1000) / (now - last);
      frames = 0; last = now; samples++;
      if (fps < 28) slow++;
      if (samples >= 5) {
        document.documentElement.classList.toggle('low-perf', slow >= 3);
        return;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
