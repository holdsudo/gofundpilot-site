// The Flight Log — nav, departures-board filtering, route table of contents. Vertical motion only.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav + mobile menu
  const nav = $('#nav'), burger = $('.nav__burger'), menu = $('#menu');
  const setMenu = (o) => { document.body.classList.toggle('menu-open', o); burger.setAttribute('aria-expanded', o); menu.setAttribute('aria-hidden', !o); };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-up', y > 400 && y > lastY + 6 && !document.body.classList.contains('menu-open'));
    if (y < lastY - 6) nav.classList.remove('is-up');
    lastY = y;
  }, { passive: true });

  // share
  $$('[data-share]').forEach(b => b.addEventListener('click', async () => {
    try { if (navigator.share) await navigator.share({ title: document.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; setTimeout(() => (b.textContent = 'Share'), 2000); } } catch {}
  }));

  // ---- departures board ----
  const rows = $$('[data-rows] .row');
  if (rows.length) {
    const chips = $$('.dep__chips button'), q = $('[data-search]'), empty = $('[data-empty]');
    let route = new URLSearchParams(location.search).get('route') || 'all';
    const run = (animate) => {
      const term = (q.value || '').toLowerCase().trim(); let n = 0;
      rows.forEach((r, i) => {
        const ok = (route === 'all' || r.dataset.route === route) && (!term || r.dataset.text.includes(term) || r.textContent.toLowerCase().includes(term));
        r.hidden = !ok;
        if (ok) { n++; if (animate && !reduce) { r.classList.remove('flip'); r.style.animationDelay = ''; void r.offsetWidth; $('.row__t b', r).style.animationDelay = Math.min(n, 14) * 35 + 'ms'; r.classList.add('flip'); } }
      });
      empty.hidden = n > 0;
      chips.forEach(c => c.setAttribute('aria-pressed', c.dataset.route === route));
    };
    chips.forEach(c => c.addEventListener('click', () => {
      route = c.dataset.route; run(true);
      const u = new URL(location.href); route === 'all' ? u.searchParams.delete('route') : u.searchParams.set('route', route); history.replaceState(null, '', u);
    }));
    q.addEventListener('input', () => run(false));
    run(false);
    const clock = $('#dep-clock');
    const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); };
    tick(); setInterval(tick, 30000);
  }

  // ---- article: route TOC lights the current leg ----
  const links = $$('.route-toc a');
  if (links.length) {
    const targets = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const upd = () => {
      let cur = -1;
      targets.forEach((t, i) => { if (t.getBoundingClientRect().top < innerHeight * .35) cur = i; });
      links.forEach((a, i) => { a.classList.toggle('on', i === cur); a.classList.toggle('done', i < cur); });
    };
    let tk = false;
    addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(() => { tk = false; upd(); }); } }, { passive: true });
    upd();
  }

  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
