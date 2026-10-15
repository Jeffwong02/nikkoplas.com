/* Count-up for headline numbers. Animates only a leading integer text node (e.g. "35" in "35<span>+</span>"). */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var els = document.querySelectorAll('.stat-val, .stat-number, .hero-stat-val, [data-count]');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      var node = e.target.firstChild, end = +e.target.dataset.end, t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / 1400, 1);
        node.nodeValue = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  els.forEach(function (el) {
    var n = el.firstChild;
    if (n && n.nodeType === 3 && /^\s*\d+\s*$/.test(n.nodeValue)) { el.dataset.end = n.nodeValue.trim(); n.nodeValue = '0'; io.observe(el); }
  });
})();
