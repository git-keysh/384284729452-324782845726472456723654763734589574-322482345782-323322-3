(() => {
  const btn = document.getElementById('whatsappBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const phone = '18687100175';
    const text = encodeURIComponent(
      "Hi REBASSED CENTRAL 868! I'd like to get a song rebassed for my car setup. Can you help?"
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener');
  });
})();