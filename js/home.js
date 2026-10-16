/* home.js — Lesson 1: the animated scheme (real app ⇄ restaurant), anatomy explorer, JSON hover map */
(function () {
  'use strict';
  const { $, $$, el, icon, sleep } = APIK;

  const root = $('#scheme');
  const playBtn = $('#play');

  /* ---------- two vocabularies for the same diagram ---------- */
  const VIEWS = {
    real: {
      title: 'Request → Response',
      server: { title: 'Swagger Petstore', sub: 'API + database', icon: 'i-server', dbTitle: 'Database' },
      front: { title: 'Frontend', sub: 'HTML + JavaScript', icon: 'i-code' },
      screen: { title: 'Screen', sub: 'What the user sees', icon: 'i-monitor', url: 'pet-shop.app' },
      link1: 'API', link2: 'App', laneNames: ['request', 'response'],
      steps: ['Click', 'Request', 'Database', 'Response', 'Read JSON', 'Render'],
      captions: ['You click a button.', 'The frontend sends a request.', 'The server uses the database.', 'The server sends a response.', 'The frontend reads the JSON.', 'The pets appear on screen.'],
      rows: [
        { key: 's1', tile: 'R', text: 'Rex', sub: '#1 · available' }, { key: 's2', tile: 'M', text: 'Misty', sub: '#2 · available' },
        { key: 's3', tile: 'G', text: 'Goldie', sub: '#3 · pending' },
      ],
    },
    food: {
      title: 'Order → Dish',
      server: { title: 'Kitchen', sub: 'cooks + pantry', icon: 'i-flame', dbTitle: 'Pantry' },
      front: { title: 'Order pad', sub: 'the order is written here', icon: 'i-scroll' },
      screen: { title: 'You', sub: 'at the table', icon: 'i-user', url: 'table-7' },
      link1: 'Waiter = API', link2: 'Table', laneNames: ['order', 'dish'],
      steps: ['Decide', 'Order', 'Pantry', 'Dish', 'Check', 'Eat'],
      captions: ['You decide what to eat.', 'The waiter takes the order to the kitchen.', 'The kitchen cooks from the pantry.', 'The waiter carries the dish back.', 'The waiter checks the dish.', 'Dinner is served.'],
      rows: [
        { key: 'f1', tile: 'D', text: 'Dough', sub: 'in stock' }, { key: 'f2', tile: 'C', text: 'Cheese', sub: 'in stock' },
        { key: 'f3', tile: 'T', text: 'Tomatoes', sub: 'in stock' },
      ],
    },
  };

  const scheme = Scheme.create(root, VIEWS.real);
  let view = 'real';

  /* ---------- screen content for each view ---------- */
  function paintScreen() {
    const s = scheme.screen;
    const real = view === 'real';
    s.replaceChildren(
      el('div', { class: 'app-head' }, real ? 'Pet Shop' : 'Menu', el('small', { id: 'count' }, real ? '' : 'Table 7')),
      el('button', { class: 'btn btn--method btn--sm ' + (real ? 'm-get' : 'm-post'), type: 'button', id: 'screenBtn' }, icon(real ? 'i-eye' : 'i-plus'), real ? 'Show available pets' : 'Order a pizza'),
      el('div', { id: 'out', style: 'margin-top:12px' }, el('div', { class: 'empty' }, real ? 'No pets yet.' : 'Nothing ordered yet.')));
    $('#screenBtn').addEventListener('click', send);
    scheme.db.set(VIEWS[view].rows);
  }

  /* ---------- play ---------- */
  async function send() {
    if (scheme.busy) return;
    playBtn.disabled = true;
    const btn = $('#screenBtn'); if (btn) btn.disabled = true;
    const label = $('span', playBtn);
    label.textContent = 'Sending…';

    if (view === 'real') {
      await scheme.run({
        method: 'GET', label: 'GET /pet/findByStatus',
        action: () => API.request({ method: 'GET', path: '/pet/findByStatus', query: { status: 'available' } }),
        dbEffect: (res, db) => {
          if (res.ok && Array.isArray(res.data)) { db.set(UI.pickPets(res.data, 3).map(UI.dbRowOf)); db.markAll('read'); }
        },
        render: async (res) => {
          const out = $('#out');
          if (!res.ok) { out.replaceChildren(UI.statusScreen(res)); return; }
          const pets = UI.pickPets(res.data, 4);
          $('#count').textContent = `${Array.isArray(res.data) ? res.data.length : 0} found`;
          out.replaceChildren(el('div', { class: 'pets' }, pets.map((p, i) => UI.petCard(p, { delay: i * 90 }))));
        },
      });
    } else {
      await scheme.run({
        method: 'POST', clickLabel: 'order', label: 'ORDER pizza',
        action: async () => { await sleep(500); return { status: 200, statusText: 'OK', ok: true, ms: 500, source: 'practice', data: { dish: 'pizza', served: true } }; },
        dbEffect: (res, db) => { db.mark('f1', 'update'); db.mark('f2', 'update'); db.mark('f3', 'update'); },
        render: async () => {
          $('#out').replaceChildren(el('div', { class: 'result-card' }, icon('i-check'), el('b', null, 'Pizza served'), el('small', null, 'No kitchen visit needed.')));
        },
      });
    }
    playBtn.disabled = false;
    const b2 = $('#screenBtn'); if (b2) b2.disabled = false;
    label.textContent = 'Send again';
  }
  playBtn.addEventListener('click', send);

  /* ---------- view switch ---------- */
  $$('.seg [data-view]').forEach((b) => b.addEventListener('click', () => {
    if (scheme.busy) return;
    view = b.dataset.view;
    $$('.seg [data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    scheme.apply(VIEWS[view]);
    scheme.reset();
    paintScreen();
    $('span', playBtn).textContent = view === 'real' ? 'Send request' : 'Place order';
  }));
  paintScreen();

  /* ---------- anatomy of a request ---------- */
  const ANATOMY = {
    method: ['m-get', '<b>Method</b> — what to do. GET reads.'],
    base: ['m-post', '<b>Base URL</b> — which server.'],
    path: ['m-put', '<b>Path</b> — which resource on it.'],
    query: ['m-delete', '<b>Query</b> — optional filters after the <code>?</code>.'],
  };
  const note = $('#anatomyNote');
  function showAnatomy(k) {
    const [cls, html] = ANATOMY[k];
    note.className = `note anatomy-note ${cls}`;
    $('p', note).innerHTML = html; // written in this file, not from the API
    $$('#anatomy button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
  }
  $$('#anatomy button').forEach((b) => b.addEventListener('click', () => showAnatomy(b.dataset.k)));
  showAnatomy('method');

  /* ---------- JSON hover map ---------- */
  const map = $('#jsonmap');
  const hl = (k, on) => $$(`[data-k="${k}"]`, map).forEach((n) => n.classList.toggle('hl', on));
  $$('[data-k]', map).forEach((n) => {
    const k = n.dataset.k;
    if (k === 'open' || k === 'close') return;
    n.addEventListener('mouseenter', () => hl(k, true));
    n.addEventListener('mouseleave', () => hl(k, false));
    n.addEventListener('focus', () => hl(k, true));
    n.addEventListener('blur', () => hl(k, false));
  });
})();
