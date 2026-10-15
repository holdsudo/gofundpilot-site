// FundPilot — "Altitude". Every scroll effect here moves things vertically or in place; nothing slides sideways.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  $('#yr').textContent = new Date().getFullYear();

  // ---- nav: tuck away while scrolling down, return on the way up; mobile menu ----
  const nav = $('#nav'), burger = $('.nav__burger'), menu = $('#menu');
  let lastY = scrollY;
  const setMenu = (o) => { document.body.classList.toggle('menu-open', o); burger.setAttribute('aria-expanded', o); menu.setAttribute('aria-hidden', !o); };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // ---- one-shot reveals ----
  const once = (els, cls, opts) => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add(cls); io.unobserve(e.target); } }), opts);
    els.forEach(el => io.observe(el));
  };
  $$('.head,.livery__copy,.app,.tune,.fleet,.vault,.seals,.pass,.cabin__grid>div:last-child').forEach(el => el.classList.add('rv'));
  once($$('.rv'), 'in', { threshold: .15, rootMargin: '0px 0px -60px 0px' });
  once($$('.b'), 'lit', { threshold: .5 });

  // ---- count-up on the hero instruments ----
  const fmt = (n, money) => (money ? '$' : '') + Math.round(n).toLocaleString('en-US');
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, money = el.hasAttribute('data-money');
    if (reduce) return;
    el.textContent = fmt(0, money);
    setTimeout(() => {
      const t0 = performance.now(), dur = 2200;
      const tick = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(end * e, money); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, 1100);
  });

  // ---- flight plan: a route drawn through each waypoint, inked as you scroll ----
  const route = $('#route'), base = $('#route-path'), ink = $('#route-ink'), wps = $$('.wp');
  const buildRoute = () => {
    const r = route.getBoundingClientRect();
    const pts = wps.map(w => { const b = $('.wp__code b', w).getBoundingClientRect(); return [b.left + b.width / 2 - r.left, b.top + b.height / 2 - r.top]; });
    let d = `M${pts[0][0]} ${pts[0][1] - 140}L${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], sway = (i % 2 ? 1 : -1) * Math.min(46, r.width * .06), my = (y0 + y1) / 2;
      d += `C${x0 + sway} ${my - (y1 - y0) * .2} ${x1 + sway} ${my + (y1 - y0) * .2} ${x1} ${y1}`;
    }
    base.setAttribute('d', d); ink.setAttribute('d', d);
    ink.setAttribute('pathLength', '1'); ink.style.strokeDasharray = '1'; drawRoute();
  };
  const drawRoute = () => {
    const r = route.getBoundingClientRect(), p = clamp((innerHeight * .62 - r.top) / r.height, 0, 1);
    ink.style.strokeDashoffset = String(1 - (reduce ? 1 : p));
    wps.forEach(w => { const b = $('.wp__code b', w).getBoundingClientRect(); if (b.top < innerHeight * .7) w.classList.add('lit'); });
  };

  // ---- livery: same platform, repainted per brand ----
  const BRANDS = { apex: ['Apex Capital', 'apexcapital', 'A'], harbor: ['Harbor Lane Funding', 'harborlane', 'H'], northwind: ['Northwind Business Credit', 'northwind', 'N'], vale: ['Summit & Vale', 'summitvale', 'S'] };
  const app = $('#app'), sw = $$('.swatches button');
  const paint = (k) => {
    const [name, dom, logo] = BRANDS[k];
    app.dataset.brand = k;
    $('[data-b="name"]', app).textContent = name; $('[data-b="domain"]', app).textContent = dom; $('[data-b="logo"]', app).textContent = logo;
    sw.forEach(b => b.setAttribute('aria-checked', b.dataset.brand === k));
    app.classList.remove('paint'); void app.offsetWidth; app.classList.add('paint');
  };
  sw.forEach((b, i) => {
    b.addEventListener('click', () => { auto = false; paint(b.dataset.brand); });
    b.addEventListener('keydown', e => { const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); const n = sw[(i + d + sw.length) % sw.length]; n.focus(); n.click(); } });
  });
  let auto = !reduce, ai = 0, appVisible = false;
  new IntersectionObserver(([e]) => { appVisible = e.isIntersecting; }, { threshold: .4 }).observe(app);
  setInterval(() => { if (auto && appVisible && !document.hidden) { ai = (ai + 1) % sw.length; paint(sw[ai].dataset.brand); } }, 3600);

  // ---- pre-flight checklist ticks as each item crosses the middle of the screen ----
  const cl = $$('#cl li');
  const tickList = () => cl.forEach(li => li.classList.toggle('done', reduce || li.getBoundingClientRect().top < innerHeight * .62));

  // ---- instrument panel: light that follows the pointer ----
  $$('.b').forEach(b => b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px'); }));

  // ---- altimeter + vertical parallax ----
  const alt = $('.alt'), altV = $('#alt'), altSec = $('#alt-sec'), tape = $('.alt__tape'), secs = $$('[data-sec]');
  const sun = $('.hero__sun'), emb = $('.hero__emblem'), fleet = $$('.fleet>div'), links = $$('.nav__links a');
  const MAX_FT = 41000;
  const onScroll = () => {
    const y = scrollY, H = document.documentElement.scrollHeight - innerHeight, p = H > 0 ? y / H : 0;
    nav.classList.toggle('is-up', y > 400 && y > lastY + 6 && !document.body.classList.contains('menu-open'));
    if (y < lastY - 6) nav.classList.remove('is-up');
    lastY = y;
    alt.classList.toggle('on', y > innerHeight * .5);
    altV.textContent = (Math.round(p * MAX_FT / 100) * 100).toLocaleString('en-US');
    tape.style.setProperty('--a', p.toFixed(4));
    let cur = secs[0];
    for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * .5) cur = s;
    altSec.textContent = cur.dataset.sec;
    links.forEach(a => a.classList.toggle('on', cur.id && a.getAttribute('href') === '#' + cur.id));
    if (!reduce) {
      if (sun) sun.style.setProperty('--sun', (y * .35).toFixed(1) + 'px');
      if (emb) emb.style.setProperty('--emb', (y * .18).toFixed(1) + 'px');
      fleet.forEach((f, i) => { const r = f.getBoundingClientRect(), c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; f.style.setProperty('--fy', (c * (i === 1 ? 60 : i === 2 ? 110 : 30)).toFixed(1) + 'px'); });
    }
    drawRoute(); tickList();
  };
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });
  addEventListener('resize', () => { buildRoute(); onScroll(); });
  (document.fonts?.ready || Promise.resolve()).then(() => { buildRoute(); onScroll(); });
  buildRoute(); onScroll();
})();
