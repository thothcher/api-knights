/* knights.js — GET / POST / PUT / DELETE: pick a method, send it, watch the pet shop change */
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

  const newPet = () => ({ id: rand(1000000, 9000000), name: pick(NAMES), category: { id: 1, name: 'Dogs' }, photoUrls: [], tags: [], status: 'available' });

  const KNIGHTS = {
    GET: {
      cls: 'm-get', ico: 'i-eye', title: 'Read',
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
      cls: 'm-post', ico: 'i-plus', title: 'Create',
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
      cls: 'm-put', ico: 'i-pencil', title: 'Replace',
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
      cls: 'm-delete', ico: 'i-trash', title: 'Remove',
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
    server: { title: 'Swagger Petstore', dbTitle: 'Database' },
    screen: { url: 'pet-shop.app' },
  });
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
    tabs.append(el('button', { type: 'button', role: 'tab', id: 'tab-' + m, class: 'tab ' + k.cls, 'aria-selected': 'false', tabindex: '-1', dataset: { m } },
      el('span', { class: 'nm' }, icon(k.ico), m), el('span', { class: 'rl' }, k.title)));
  });

  function refreshSpec() {
    spec = KNIGHTS[current].spec();
    $('#hint').textContent = KNIGHTS[current].hint();
  }

  function select(m, focus) {
    current = m;
    const k = KNIGHTS[m];
    $$('.tab', tabs).forEach((t) => {
      const on = t.dataset.m === m;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    const send = $('#send');
    send.className = 'btn btn--method btn--lg ' + k.cls;
    send.replaceChildren(icon(k.ico), k.button);
    refreshSpec();
    try { history.replaceState(null, '', '#' + m); } catch (e) { /* ignore */ }
  }

  tabs.addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) select(t.dataset.m); });
  tabs.addEventListener('keydown', (e) => {
    const i = ORDER.indexOf(current);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); select(ORDER[(i + step + ORDER.length) % ORDER.length], true); }
    if (e.key === 'Home') { e.preventDefault(); select('GET', true); }
    if (e.key === 'End') { e.preventDefault(); select('DELETE', true); }
  });

  /* ---------- send ---------- */
  const sendBtn = $('#send');
  sendBtn.addEventListener('click', async () => {
    if (scheme.busy) return;
    const k = KNIGHTS[current];
    const mine = spec;
    const m = current;
    sendBtn.disabled = true;
    const label = `${mine.method} ${mine.path.replace(/\/\d{4,}$/, '/{id}')}`;
    await scheme.run({
      method: mine.method, label, request: mine,
      action: () => API.request(mine),
      dbEffect: (res, db) => k.db(res, db, mine),
      render: async (res) => {
        const out = k.render(res, mine);
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
    // prepare the next request for the selected method (new random pet, the current lesson pet, ...)
    if (current === m) refreshSpec(); else $('#hint').textContent = KNIGHTS[current].hint();
  });

  /* ---------- go ---------- */
  paint();
  const fromHash = (location.hash || '').replace('#', '').toUpperCase();
  select(KNIGHTS[fromHash] ? fromHash : 'GET');
  window.addEventListener('hashchange', () => { const h = location.hash.replace('#', '').toUpperCase(); if (KNIGHTS[h]) select(h); });
})();
