/* common.js — small helpers + the page chrome (header, lesson nav, footer, theme).
   Everything is exposed on window.APIK. No dependencies, no build step. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motionQuery.matches;

  /* ---------- storage that never throws (private windows, blocked cookies) ---------- */
  const memory = {};
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('apik.' + key);
        if (raw !== null) return JSON.parse(raw);
      } catch (e) { /* fall through to memory */ }
      return key in memory ? memory[key] : fallback;
    },
    set(key, value) {
      memory[key] = value;
      try { localStorage.setItem('apik.' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  /* ---------- tiny DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  /* el('div', {class:'x', onclick: fn}, 'text', childNode) — text is always inserted as text (safe for API data) */
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'dataset') Object.assign(n.dataset, v);
        else if (k === 'html') n.innerHTML = v; // only ever called with strings written in this project
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return n;
  }

  function icon(id, cls = '') {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', ('ico ' + cls).trim());
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#' + id);
    s.append(u);
    return s;
  }

  /* ---------- toast + clipboard ---------- */
  function toast(msg) {
    let box = $('.toasts');
    if (!box) {
      box = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
      document.body.append(box);
    }
    const t = el('div', { class: 'toast' }, msg);
    box.append(t);
    setTimeout(() => t.remove(), 3300);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); return; } catch (e) { /* fallback below */ }
    const ta = el('textarea', { style: 'position:fixed;opacity:0' }, text);
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast('Copied to clipboard'); } catch (e) { toast('Press Ctrl+C to copy'); }
    ta.remove();
  }

  /* ---------- icon sprite (stroke icons, 24x24) ---------- */
  const ICONS = {
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
    'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    replay: '<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    flask: '<path d="M9 2h6"/><path d="M10 2v6.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 8.5V2"/><path d="M7 15h10"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'wifi-off': '<path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M5 12.86a10 10 0 0 1 5.17-2.69"/><path d="M13.83 10.17A10 10 0 0 1 19 12.86"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="m2 2 20 20"/>',
    castle: '<path d="M3 21V6h3v3h3V6h6v3h3V6h3v15z"/><path d="M10 21v-5a2 2 0 0 1 4 0v5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    scroll: '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
  };
  function injectSprite() {
    const symbols = Object.entries(ICONS).map(([id, d]) => `<symbol id="i-${id}" viewBox="0 0 24 24">${d}</symbol>`).join('');
    const holder = document.createElement('div');
    holder.innerHTML = `<svg xmlns="${NS}" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${symbols}</svg>`;
    document.body.prepend(holder.firstChild);
  }

  /* ---------- the six lessons ---------- */
  const PAGES = [
    { id: 'home', href: 'index.html', title: 'What is an API?', short: 'API basics' },
    { id: 'knights', href: 'knights.html', title: 'The Four Knights', short: 'Four Knights' },
    { id: 'examples', href: 'examples.html', title: 'Real examples', short: 'Examples' },
    { id: 'status', href: 'status.html', title: 'Status codes', short: 'Status codes' },
    { id: 'quiz', href: 'quiz.html', title: 'Quiz', short: 'Quiz' },
    { id: 'game', href: 'game.html', title: 'Castle game', short: 'Game' },
  ];

  /* ---------- theme ---------- */
  const effectiveTheme = () => document.documentElement.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function buildChrome() {
    injectSprite();
    const page = document.body.dataset.page;
    const idx = PAGES.findIndex((p) => p.id === page);
    const seen = new Set(store.get('visited', []));
    const header = el('header', { class: 'site-header' });

    const nav = el('nav', { class: 'nav', 'aria-label': 'Lessons' },
      el('ol', null, PAGES.map((p, i) => {
        const here = p.id === page;
        const done = seen.has(p.id) && !here;
        return el('li', null, el('a', { href: p.href, class: done ? 'done' : '', 'aria-current': here ? 'page' : null },
          el('span', { class: 'n' }, done ? icon('i-check') : String(i + 1)), p.short));
      })));

    const pill = el('button', { class: 'mode-pill', type: 'button', id: 'modePill' }, el('i'), el('span', { id: 'modeText' }));
    const themeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Switch light / dark theme' });
    const paintTheme = () => themeBtn.replaceChildren(icon(effectiveTheme() === 'dark' ? 'i-sun' : 'i-moon'));
    paintTheme();
    themeBtn.addEventListener('click', () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      store.set('theme', next);
      paintTheme();
    });

    header.append(el('div', { class: 'wrap bar' },
      el('a', { class: 'brand', href: 'index.html', 'aria-label': 'API Knights — home' },
        el('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'API'),
        el('span', null, 'API Knights')),
      nav,
      el('div', { class: 'tools' }, pill, themeBtn)));
    document.body.prepend(header);
    document.body.prepend(el('a', { class: 'skip', href: '#main' }, 'Skip to content'));

    /* server mode pill — shows whether we talk to the real Swagger Petstore or the built-in practice server */
    const paintPill = () => {
      const API = window.API;
      if (!API) return;
      const live = API.mode === 'live';
      const state = live ? (API.offline ? 'fallback' : 'live') : 'practice';
      pill.dataset.state = state;
      $('#modeText').textContent = { live: 'Live Swagger', fallback: 'Offline → practice', practice: 'Practice server' }[state];
      pill.title = live ? 'Real petstore.swagger.io. Click for the offline practice server.' : 'Practice server (works offline). Click for the real Swagger Petstore.';
    };
    pill.addEventListener('click', () => {
      const API = window.API;
      API.setMode(API.mode === 'live' ? 'practice' : 'live');
      toast(API.mode === 'live' ? 'Live Swagger Petstore' : 'Practice server');
    });
    window.addEventListener('apik:mode', paintPill);
    window.addEventListener('apik:net', paintPill);
    paintPill();

    /* previous / next lesson cards + footer */
    const main = $('#main');
    if (main && idx >= 0) {
      const prev = PAGES[idx - 1];
      const next = PAGES[idx + 1];
      const nav2 = el('nav', { class: 'lesson-nav', 'aria-label': 'Previous and next lesson' });
      if (prev) nav2.append(el('a', { href: prev.href, class: 'prev' }, el('small', null, icon('i-arrow-left'), 'Prev'), el('b', null, prev.title)));
      if (next) nav2.append(el('a', { href: next.href, class: 'next' + (prev ? '' : ' only-next') }, el('small', null, 'Next', icon('i-arrow-right')), el('b', null, next.title)));
      main.append(nav2);
    }
    document.body.append(el('footer', { class: 'site-footer' }, el('div', { class: 'wrap' },
      el('p', null, 'Data from the public ', el('a', { href: 'https://petstore.swagger.io/', target: '_blank', rel: 'noopener' }, 'Swagger Petstore'), '. Shared by everyone — use fake data only.'))));

    /* scroll-reveal for blocks marked .reveal */
    const targets = $$('.reveal');
    if ('IntersectionObserver' in window && !reduced()) {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
      targets.forEach((t) => io.observe(t));
    } else targets.forEach((t) => t.classList.add('in'));

    /* remember progress (after painting, so the current page shows as "here") */
    if (page) { seen.add(page); store.set('visited', [...seen]); }
  }

  window.APIK = { store, $, $$, el, esc, icon, sleep, rand, pick, shuffle, reduced, toast, copy, PAGES };
  document.addEventListener('DOMContentLoaded', buildChrome);
})();
