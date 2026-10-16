/* knights.js — Lesson 2: GET / POST / PUT / DELETE with a live pet-shop mission for each knight */
(function () {
  'use strict';
  const { $, $$, el, icon, rand, pick } = APIK;

  const NAMES = ['Sir Barksalot', 'Lady Whiskers', 'Captain Fluff', 'Duke Bubbles', 'Dame Purrlington', 'Baron Hoppers', 'Queen Nibbles', 'Lord Wagsworth'];
  const SEED_ROWS = [
    { key: 's1', tile: 'R', text: 'Rex', sub: '#1 · available' }, { key: 's2', tile: 'M', text: 'Misty', sub: '#2 · available' }, { key: 's3', tile: 'G', text: 'Goldie', sub: '#3 · pending' },
  ];

  /* what the screen currently knows */
  let gallery = [];
  let lesson = null;      // the pet we created with POST (PUT and DELETE work on it)
  const done = new Set();

  const newPet = () => ({ id: rand(1000000, 9000000), name: pick(NAMES), category: { id: 1, name: 'Dogs' }, photoUrls: [], tags: [], status: 'available' });

  const KNIGHTS = {
    GET: {
      cls: 'm-get', ico: 'i-eye', role: 'Reader', title: 'Read',
      motto: 'Read. Change nothing.',
      facts: [['Changes data', 'No'], ['Body', 'No'], ['Success', '200 OK'], ['Use', 'Load, search']],
      button: 'Send GET',
      hint: () => 'Ask for the available pets.',
      spec: () => ({ method: 'GET', path: '/pet/findByStatus', query: { status: 'available' } }),
      db(res, db) { if (res.ok && Array.isArray(res.data)) { db.set(UI.pickPets(res.data, 3).map(UI.dbRowOf)); db.markAll('read'); } },
      render(res) {
        if (!res.ok) return { banner: res };
        gallery = UI.pickPets(res.data, 6);
        const n = Array.isArray(res.data) ? res.data.length : 0;
        return { banner: res, text: `${n} pets received.`, fresh: true };
      },
    },
    POST: {
      cls: 'm-post', ico: 'i-plus', role: 'Builder', title: 'Create',
      motto: 'Create something new.',
      facts: [['Changes data', 'Adds'], ['Body', 'JSON'], ['Success', '201 Created'], ['Use', 'Sign up, send']],
      button: 'Send POST',
      hint: () => 'Send a new pet as JSON.',
      spec: () => ({ method: 'POST', path: '/pet', body: newPet() }),
      db(res, db, spec) { if (res.ok) db.add(UI.dbRowOf(res.data && res.data.id ? res.data : spec.body)); },
      render(res, spec) {
        if (!res.ok) return { banner: res };
        const pet = res.data && res.data.id ? res.data : spec.body;
        lesson = pet; gallery = [pet, ...gallery.filter((p) => p.id !== pet.id)];
        return { banner: res, text: `“${pet.name}” created.`, marks: { [pet.id]: { cls: 'is-new', tag: 'NEW' } } };
      },
    },
    PUT: {
      cls: 'm-put', ico: 'i-pencil', role: 'Fixer', title: 'Replace',
      motto: 'Replace the old version.',
      facts: [['Changes data', 'Replaces'], ['Body', 'Whole JSON'], ['Success', '200 OK'], ['Use', 'Edit profile']],
      button: 'Send PUT',
      hint: () => (lesson ? `Replace “${lesson.name}”.` : 'No pet yet — run POST first.'),
      spec() {
        const base = lesson || { ...newPet(), name: 'Mystery Pet' };
        const name = pick(NAMES.filter((n) => n !== base.name));
        return { method: 'PUT', path: '/pet', body: { ...base, name, status: 'sold' } };
      },
      db(res, db, spec) { if (res.ok) db.update(String(spec.body.id), UI.dbRowOf(spec.body)); },
      render(res, spec) {
        if (!res.ok) return { banner: res };
        const before = gallery.find((p) => p.id === spec.body.id) || lesson || spec.body;
        const after = spec.body;
        gallery = gallery.some((p) => p.id === after.id) ? gallery.map((p) => (p.id === after.id ? after : p)) : [after, ...gallery];
        lesson = after;
        return { banner: res, text: `“${before.name}” replaced by “${after.name}”.`, marks: { [after.id]: { cls: 'is-update', tag: 'EDITED', tagCls: 'm-put', oldName: before.name !== after.name ? before.name : null, oldStatus: before.status !== after.status ? before.status : null } } };
      },
    },
    DELETE: {
      cls: 'm-delete', ico: 'i-trash', role: 'Remover', title: 'Remove',
      motto: 'Make it disappear.',
      facts: [['Changes data', 'Removes'], ['Body', 'No'], ['Success', '200 / 204'], ['Use', 'Delete account']],
      button: 'Send DELETE',
      hint: () => (lesson ? `Remove “${lesson.name}”.` : 'No pet yet — expect a 404.'),
      spec: () => ({ method: 'DELETE', path: '/pet/' + (lesson ? lesson.id : 0) }),
      db(res, db, spec) { if (res.ok) db.remove(spec.path.split('/').pop()); },
      render(res, spec) {
        if (!res.ok) return { banner: res, text: res.status === 404 ? 'Nothing to delete.' : null };
        const id = Number(spec.path.split('/').pop());
        const gone = gallery.find((p) => p.id === id);
        lesson = null;
        return { banner: res, text: gone ? `“${gone.name}” removed.` : 'Removed.', marks: { [id]: { cls: 'is-gone' } }, remove: id };
      },
    },
  };
  const ORDER = ['GET', 'POST', 'PUT', 'DELETE'];

  /* ---------- scheme ---------- */
  const scheme = Scheme.create($('#scheme'), {
    title: 'Pet shop app',
    server: { title: 'Swagger Petstore', sub: 'API + database', dbTitle: 'Database' },
    screen: { url: 'pet-shop.app' },
  });
  const inspector = UI.inspector($('#insp'));
  const codeBox = UI.codeBox();
  $('#code').append(codeBox);
  scheme.db.set(SEED_ROWS);

  /* ---------- the screen (a little app) ---------- */
  function paint({ bannerRes, text, marks = {}, fresh = false } = {}) {
    const head = el('div', { class: 'app-head' }, 'Pet Shop', el('small', null, gallery.length ? `${gallery.length} shown` : ''));
    const parts = [head];
    if (bannerRes) parts.push(UI.banner(bannerRes, text || undefined));
    if (gallery.length) {
      parts.push(el('div', { class: 'pets' }, gallery.map((p, i) => {
        const m = marks[p.id];
        return UI.petCard(p, { delay: fresh ? i * 80 : 0, cls: (m ? m.cls : '') + (fresh || m ? '' : ' still'), tag: m && m.tag, tagCls: m && m.tagCls, oldName: m && m.oldName, oldStatus: m && m.oldStatus });
      })));
    } else parts.push(el('div', { class: 'empty' }, 'The shop is empty.'));
    scheme.screen.replaceChildren(...parts);
  }

  /* ---------- tabs ---------- */
  let current = 'GET';
  let spec = null;
  const tabs = $('#tabs');
  ORDER.forEach((m) => {
    const k = KNIGHTS[m];
    tabs.append(el('button', { type: 'button', role: 'tab', id: 'tab-' + m, class: 'knight ' + k.cls, 'aria-selected': 'false', 'aria-controls': 'kpanel', tabindex: '-1', dataset: { m } },
      el('span', { class: 'shield' }, icon(k.ico)),
      el('span', null, el('span', { class: 'nm' }, m), el('span', { class: 'rl' }, k.title))));
  });

  function refreshSpec(keepInspector) {
    const k = KNIGHTS[current];
    spec = k.spec();
    $('#hint').textContent = k.hint();
    codeBox.set(UI.fetchSnippet(spec));
    if (!keepInspector) { inspector.reset(); inspector.showRequest(API.describe(spec)); }
  }
  function renderOrder() {
    const wrap = $('#order');
    wrap.replaceChildren(...ORDER.map((m) => el('b', { class: KNIGHTS[m].cls, style: done.has(m) ? '' : 'opacity:.4' }, done.has(m) ? '✓ ' + m : m)));
  }

  function select(m, focus) {
    current = m;
    const k = KNIGHTS[m];
    $$('.knight', tabs).forEach((t) => {
      const on = t.dataset.m === m;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    const panel = $('#kpanel');
    panel.className = 'kpanel ' + k.cls;
    panel.setAttribute('aria-labelledby', 'tab-' + m);
    panel.replaceChildren(
      el('div', { class: 'shield shield--lg', 'aria-hidden': 'true' }, icon(k.ico)),
      el('div', null,
        el('h2', null, `${m} — ${k.role}`),
        el('p', { class: 'motto' }, k.motto),
        el('div', { class: 'facts' }, k.facts.map(([a, b]) => el('div', { class: 'fact' }, el('small', null, a), el('span', null, b))))));
    const send = $('#send');
    send.className = 'btn btn--method btn--lg ' + k.cls;
    send.replaceChildren(icon(k.ico), k.button);
    refreshSpec();
    renderOrder();
    try { history.replaceState(null, '', '#' + m); } catch (e) { /* ignore */ }
  }

  tabs.addEventListener('click', (e) => { const t = e.target.closest('.knight'); if (t) select(t.dataset.m); });
  tabs.addEventListener('keydown', (e) => {
    const i = ORDER.indexOf(current);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); select(ORDER[(i + step + ORDER.length) % ORDER.length], true); }
    if (e.key === 'Home') { e.preventDefault(); select('GET', true); }
    if (e.key === 'End') { e.preventDefault(); select('DELETE', true); }
  });

  /* ---------- the mission ---------- */
  const sendBtn = $('#send');
  sendBtn.addEventListener('click', async () => {
    if (scheme.busy) return;
    const k = KNIGHTS[current];
    const mine = spec;
    const m = current;
    sendBtn.disabled = true;
    inspector.showRequest(API.describe(mine));
    inspector.clearResponse();
    const label = `${mine.method} ${mine.path.replace(/\/\d{4,}$/, '/{id}')}`;
    await scheme.run({
      method: mine.method, label,
      action: () => API.request(mine),
      onResult: (res) => { if (res.url) inspector.showRequest(res); inspector.showResponse(res); },
      dbEffect: (res, db) => k.db(res, db, mine),
      render: async (res) => {
        const out = k.render(res, mine);
        if (res.ok) done.add(m);
        paint({ bannerRes: out.banner, text: out.text, marks: out.marks, fresh: out.fresh });
        if (out.remove != null) {
          await APIK.sleep(900);
          gallery = gallery.filter((p) => p.id !== out.remove);
          const card = scheme.screen.querySelector('.pet[data-id="' + out.remove + '"]');
          if (card) card.remove();
          const count = scheme.screen.querySelector('.app-head small');
          if (count) count.textContent = gallery.length ? gallery.length + ' shown' : '';
          if (!gallery.length) paint({ bannerRes: out.banner, text: out.text });
        }
      },
    });
    sendBtn.disabled = false;
    // prepare the next request for this knight (new random pet, the current lesson pet, ...) but keep the inspector as it is
    if (current === m) refreshSpec(true); else $('#hint').textContent = KNIGHTS[current].hint();
    renderOrder();
  });

  /* ---------- go ---------- */
  paint();
  const fromHash = (location.hash || '').replace('#', '').toUpperCase();
  select(KNIGHTS[fromHash] ? fromHash : 'GET');
  window.addEventListener('hashchange', () => { const h = location.hash.replace('#', '').toUpperCase(); if (KNIGHTS[h]) select(h); });
})();
