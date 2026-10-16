/* status.js — pick a status code, send the request that causes it, watch the answer travel back */
(function () {
  'use strict';
  const { $, $$, el, icon } = APIK;

  const FAMILIES = [
    { n: 2, name: 'Success' },
    { n: 3, name: 'Moved' },
    { n: 4, name: 'Your mistake' },
    { n: 5, name: 'Server’s mistake' },
  ];

  const CODES = [
    { code: 200, name: 'OK', live: true, req: { method: 'GET', path: '/pet/findByStatus', query: { status: 'available' } } },
    { code: 201, name: 'Created',
      req: { method: 'POST', path: '/pet', body: { id: 9100, name: 'Sir Barksalot', category: { id: 1, name: 'Dogs' }, photoUrls: [], tags: [], status: 'available' } },
      prep: () => API.request({ mode: 'practice', method: 'DELETE', path: '/pet/9100' }) },
    { code: 204, name: 'No Content', req: { method: 'DELETE', path: '/pet/9101' },
      prep: () => API.request({ mode: 'practice', method: 'POST', path: '/pet', body: { id: 9101, name: 'Temp', status: 'available' } }) },
    { code: 301, name: 'Moved Permanently', req: { method: 'GET', path: '/old-pets' } },
    { code: 304, name: 'Not Modified', req: { method: 'GET', path: '/pet/1/photo', headers: { 'If-None-Match': '"v1"' } } },
    { code: 400, name: 'Bad Request', req: { method: 'POST', path: '/pet', body: { status: 'available' } } },
    { code: 401, name: 'Unauthorized', req: { method: 'GET', path: '/account' } },
    { code: 403, name: 'Forbidden', req: { method: 'GET', path: '/admin/reports', headers: { Authorization: 'Bearer sir-lancelot' } } },
    { code: 404, name: 'Not Found', live: true, req: { method: 'GET', path: '/pet/0' } },
    { code: 405, name: 'Method Not Allowed', req: { method: 'PATCH', path: '/pet/1' } },
    { code: 409, name: 'Conflict', req: { method: 'POST', path: '/user', body: { username: 'sir_lancelot', email: 'lance@example.com', password: 'fake-pass-123' } },
      prep: () => API.request({ mode: 'practice', method: 'POST', path: '/user', body: { username: 'sir_lancelot', email: 'lance@example.com', password: 'fake-pass-123' } }) },
    { code: 429, name: 'Too Many Requests', req: { method: 'GET', path: '/search', query: { q: 'pets' } } },
    { code: 500, name: 'Server Error', req: { method: 'GET', path: '/boom' } },
    { code: 503, name: 'Unavailable', req: { method: 'GET', path: '/maintenance' } },
  ];
  const famOf = (code) => Math.floor(code / 100);

  const scheme = Scheme.create($('#scheme'), {
    title: 'Trigger a status code',
    server: { title: 'Server', dbTitle: 'Database' },
    screen: { url: 'pet-shop.app' },
  });
  scheme.db.set([{ key: 'a', tile: 'R', text: 'Rex', sub: '#1 · available' }, { key: 'b', tile: 'M', text: 'Misty', sub: '#2 · available' }, { key: 'c', tile: 'G', text: 'Goldie', sub: '#3 · pending' }]);

  /* ---------- the four families, each with its codes ---------- */
  const groups = $('#groups');
  FAMILIES.forEach((f) => {
    groups.append(el('section', { class: `group s${f.n}` },
      el('div', { class: 'group-head' }, el('b', null, f.n + 'xx'), el('span', null, f.name)),
      el('div', { class: 'group-body' }, CODES.filter((c) => famOf(c.code) === f.n).map((c) =>
        el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', dataset: { code: c.code } }, el('b', null, c.code), el('span', null, c.name))))));
  });
  groups.addEventListener('click', (e) => { const ch = e.target.closest('.chip'); if (ch) select(Number(ch.dataset.code)); });

  /* ---------- select ---------- */
  let current = null;
  function select(code) {
    if (scheme.busy) return;
    const c = CODES.find((x) => x.code === code) || CODES[0];
    current = c;
    $$('.chip', groups).forEach((ch) => {
      const on = Number(ch.dataset.code) === c.code;
      ch.setAttribute('aria-pressed', String(on));
      ch.parentElement.parentElement.classList.toggle('is-open', on);
    });
    const fire = $('#fire');
    fire.className = "btn btn--primary btn--lg";
    fire.replaceChildren(icon('i-play'), `Send → ${c.code}`);
    const live = (c.live ? API.mode : 'practice') === 'live';
    $('#src').replaceChildren(el('span', { class: 'src ' + (live ? 'live' : 'practice') }, live ? 'live server' : 'practice server'));
    scheme.reset();
    scheme.screen.replaceChildren(el('div', { class: 'empty' }, 'Press send.'));
    try { history.replaceState(null, '', '#' + c.code); } catch (e) { /* ignore */ }
  }

  /* ---------- send ---------- */
  async function fire() {
    if (scheme.busy || !current) return;
    const c = current;
    const btn = $('#fire'); btn.disabled = true;
    const spec = { ...c.req, mode: c.live ? undefined : 'practice' };
    if (c.prep) await c.prep(); // quietly put the practice server in the right state (e.g. make sure a pet exists before deleting it)
    await scheme.run({
      method: c.req.method, clickLabel: 'click', label: `${c.req.method} ${c.req.path.replace(/\/\d+$/, '/{id}')}`, request: spec,
      action: () => API.request(spec),
      dbEffect: (res, db) => { if (res.status === 200 && Array.isArray(res.data)) { db.set(UI.pickPets(res.data, 3).map(UI.dbRowOf)); db.markAll('read'); } },
      render: (res) => {
        const parts = [UI.statusScreen(res)];
        if (res.status === 200 && Array.isArray(res.data)) parts.push(el('div', { class: 'pets', style: 'margin-top:10px' }, UI.pickPets(res.data, 3).map((p, i) => UI.petCard(p, { delay: i * 80 }))));
        scheme.screen.replaceChildren(...parts);
      },
    });
    btn.disabled = false;
  }
  $('#fire').addEventListener('click', fire);

  window.addEventListener('apik:mode', () => { if (!scheme.busy && current) select(current.code); });
  const fromHash = Number((location.hash || '').replace('#', ''));
  select(CODES.some((c) => c.code === fromHash) ? fromHash : 404);
})();
