(() => {
  const supportsHover = window.matchMedia('(hover: hover)').matches;
  if (!supportsHover) return;

  // subtle cursor glow
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: fixed; width: 400px; height: 400px; border-radius: 50%;
    pointer-events: none; z-index: 1;
    background: radial-gradient(circle, rgba(255,20,147,0.14), transparent 65%);
    transform: translate(-50%, -50%);
    transition: opacity 0.5s ease; opacity: 0;
    filter: blur(22px); mix-blend-mode: screen;
  `;
  document.body.appendChild(glow);
  window.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
    glow.style.opacity = '1';
  });
  window.addEventListener('mouseleave', () => glow.style.opacity = '0');
})();