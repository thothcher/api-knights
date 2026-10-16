/* home.js — How it works: one diagram, two vocabularies (real app / restaurant) */
(function () {
  'use strict';
  const { $, $$, el, icon, sleep } = APIK;

  const root = $('#scheme');
  const playBtn = $('#play');

  const VIEWS = {
    real: {
      title: 'Request → Response',
      server: { title: 'Swagger Petstore', icon: 'i-server', dbTitle: 'Database' },
      front: { title: 'Frontend', icon: 'i-code' },
      screen: { title: 'Screen', icon: 'i-monitor', url: 'pet-shop.app' },
      laneNames: ['request', 'response'],
      steps: ['Click', 'Request', 'Database', 'Response', 'Read JSON', 'Render'],
      captions: ['You click a button.', 'The frontend sends a request.', 'The server uses the database.', 'The server sends a response.', 'The frontend reads the JSON.', 'The pets appear on screen.'],
      rows: [
        { key: 's1', tile: 'R', text: 'Rex', sub: '#1 · available' }, { key: 's2', tile: 'M', text: 'Misty', sub: '#2 · available' },
        { key: 's3', tile: 'G', text: 'Goldie', sub: '#3 · pending' },
      ],
    },
    food: {
      title: 'Order → Dish',
      server: { title: 'Kitchen', icon: 'i-flame', dbTitle: 'Pantry' },
      front: { title: 'Order pad', icon: 'i-scroll' },
      screen: { title: 'You', icon: 'i-user', url: 'table-7' },
      laneNames: ['order', 'dish'],
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
      el('div', { class: 'app-head' }, real ? 'Pet Shop' : 'Menu', el('small', { id: 'count' })),
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
      const request = { method: 'GET', path: '/pet/findByStatus', query: { status: 'available' } };
      await scheme.run({
        method: 'GET', label: 'GET /pet/findByStatus', request,
        action: () => API.request(request),
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
          $('#out').replaceChildren(el('div', { class: 'result-card' }, icon('i-check'), el('b', null, 'Pizza served')));
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
})();
