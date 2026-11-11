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

/* Mobile menu + skip link. Progressive: without JS the nav stays a scrollable strip. */
(function () {
  var header = document.querySelector('header'), nav = header && header.querySelector('nav');
  if (!nav) return;
  document.documentElement.classList.add('np-js');
  var lang = (document.documentElement.lang || 'en').slice(0, 2);
  var t = { en: ['Menu', 'Skip to content'], zh: ['選單', '跳至主要內容'], ja: ['メニュー', '本文へスキップ'], ko: ['메뉴', '본문으로 건너뛰기'] }[lang] || ['Menu', 'Skip to content'];

  var main = document.querySelector('main') || header.nextElementSibling;
  if (main) {
    if (!main.id) main.id = 'main-content';
    var skip = document.createElement('a');
    skip.className = 'np-skip'; skip.href = '#' + main.id; skip.textContent = t[1];
    document.body.insertBefore(skip, document.body.firstChild);
  }

  if (!nav.id) nav.id = 'site-nav';
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'np-nav-toggle';
  btn.setAttribute('aria-label', t[0]); btn.setAttribute('aria-controls', nav.id); btn.setAttribute('aria-expanded', 'false');
  btn.appendChild(document.createElement('span'));
  header.insertBefore(btn, nav);
  function set(open) { header.classList.toggle('np-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  btn.addEventListener('click', function () { set(!header.classList.contains('np-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  /* Language links as a plain row in the mobile panel (the desktop dropdown closes itself on outside clicks). */
  var langLinks = nav.querySelectorAll('.lang-menu details ul a');
  if (langLinks.length) {
    var row = document.createElement('li');
    row.className = 'np-lang-row';
    langLinks.forEach(function (a) { row.appendChild(a.cloneNode(true)); });
    nav.querySelector('ul').appendChild(row);
  }
  var mq = window.matchMedia('(max-width: 1100px)');
  function sync() { if (!mq.matches) set(false); }
  mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
})();
