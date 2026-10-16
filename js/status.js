/* status.js — Lesson 4: the five families and a lab that triggers 14 real status codes */
(function () {
  'use strict';
  const { $, $$, el, icon } = APIK;

  const FAMILIES = [
    { n: 1, name: 'Wait', text: 'Still working.', fault: 'none' },
    { n: 2, name: 'Success', text: 'It worked.', fault: 'none' },
    { n: 3, name: 'Moved', text: 'Look elsewhere.', fault: 'none' },
    { n: 4, name: 'Your mistake', text: 'Fix the request.', fault: 'client' },
    { n: 5, name: 'Server’s mistake', text: 'Try again later.', fault: 'server' },
  ];

  const CODES = [
    { code: 200, name: 'OK', live: true, plain: 'It worked.', analogy: 'You order a pizza. The pizza arrives.', req: { method: 'GET', path: '/pet/findByStatus', query: { status: 'available' } } },
    { code: 201, name: 'Created', plain: 'Something new was saved.', analogy: 'You book a table. Booked.',
      req: { method: 'POST', path: '/pet', body: { id: 9100, name: 'Sir Barksalot', category: { id: 1, name: 'Dogs' }, photoUrls: [], tags: [], status: 'available' } },
      prep: () => API.request({ mode: 'practice', method: 'DELETE', path: '/pet/9100' }) },
    { code: 204, name: 'No Content', plain: 'Done. Nothing to return.', analogy: 'You cancel an order. Cancelled.', req: { method: 'DELETE', path: '/pet/9101' },
      prep: () => API.request({ mode: 'practice', method: 'POST', path: '/pet', body: { id: 9101, name: 'Temp', status: 'available' } }) },
    { code: 301, name: 'Moved Permanently', plain: 'New address.', analogy: 'The restaurant moved. A sign shows where.', req: { method: 'GET', path: '/old-pets' } },
    { code: 304, name: 'Not Modified', plain: 'Use your saved copy.', analogy: '“Same menu as last week?” “Yes.”', req: { method: 'GET', path: '/pet/1/photo', headers: { 'If-None-Match': '"v1"' } } },
    { code: 400, name: 'Bad Request', plain: 'The request is wrong.', analogy: 'You order “a… thing”. Unclear.', req: { method: 'POST', path: '/pet', body: { status: 'available' } } },
    { code: 401, name: 'Unauthorized', plain: 'Log in first.', analogy: 'The bouncer asks for your ticket.', req: { method: 'GET', path: '/account' } },
    { code: 403, name: 'Forbidden', plain: 'You may not do this.', analogy: 'You have a ticket. The kitchen is staff only.', req: { method: 'GET', path: '/admin/reports', headers: { Authorization: 'Bearer sir-lancelot' } } },
    { code: 404, name: 'Not Found', live: true, plain: 'Nothing at this address.', analogy: 'You order a dish that is not on the menu.', req: { method: 'GET', path: '/pet/0' } },
    { code: 405, name: 'Method Not Allowed', plain: 'Wrong method.', analogy: 'You try to pay at the kitchen window.', req: { method: 'PATCH', path: '/pet/1' } },
    { code: 409, name: 'Conflict', plain: 'It already exists.', analogy: 'You book table 5. It is taken.', req: { method: 'POST', path: '/user', body: { username: 'sir_lancelot', email: 'lance@example.com', password: 'fake-pass-123' } },
      prep: () => API.request({ mode: 'practice', method: 'POST', path: '/user', body: { username: 'sir_lancelot', email: 'lance@example.com', password: 'fake-pass-123' } }) },
    { code: 429, name: 'Too Many Requests', plain: 'Slow down.', analogy: 'You ring the bell 50 times.', req: { method: 'GET', path: '/search', query: { q: 'pets' } } },
    { code: 500, name: 'Internal Server Error', plain: 'The server broke.', analogy: 'The kitchen is on fire.', req: { method: 'GET', path: '/boom' } },
    { code: 503, name: 'Service Unavailable', plain: 'Back soon.', analogy: 'Sign: “Closed for cleaning.”', req: { method: 'GET', path: '/maintenance' } },
  ];
  const famOf = (code) => Math.floor(code / 100);

  const scheme = Scheme.create($('#scheme'), {
    title: 'Trigger a status code',
    server: { title: 'Server', sub: 'live or practice', dbTitle: 'Database' },
    screen: { url: 'pet-shop.app' },
  });
  const inspector = UI.inspector($('#insp'));
  const codeBox = UI.codeBox();
  $('#code').append(codeBox);
  scheme.db.set([{ key: 'a', tile: 'R', text: 'Rex', sub: '#1 · available' }, { key: 'b', tile: 'M', text: 'Misty', sub: '#2 · available' }, { key: 'c', tile: 'G', text: 'Goldie', sub: '#3 · pending' }]);

  /* ---------- family cards ---------- */
  let filter = 0;
  const fams = $('#fams');
  FAMILIES.forEach((f) => {
    fams.append(el('button', { type: 'button', class: `fam s${f.n}`, 'aria-pressed': 'false', dataset: { n: f.n } },
      el('span', { class: 'big' }, f.n + 'xx'), el('b', null, f.name), el('span', null, f.text)));
  });
  fams.addEventListener('click', (e) => {
    const b = e.target.closest('.fam'); if (!b) return;
    const n = Number(b.dataset.n);
    filter = filter === n ? 0 : n;
    $$('.fam', fams).forEach((x) => x.setAttribute('aria-pressed', String(Number(x.dataset.n) === filter)));
    paintChips();
    if (filter === 1) $('#detail').replaceChildren(el('div', { class: 'card s1', style: 'grid-column:1/-1;box-shadow:inset 0 5px 0 var(--c)' }, el('p', null, el('code', null, '100 Continue'), ' and ', el('code', null, '101 Switching Protocols'), ' are handled by the browser. You rarely see them.')));
    else if (filter) { const first = CODES.find((c) => famOf(c.code) === filter); if (first) select(first.code); }
  });

  /* ---------- code chips ---------- */
  const chips = $('#chips');
  CODES.forEach((c) => chips.append(el('button', { type: 'button', class: `code-chip s${famOf(c.code)}`, 'aria-pressed': 'false', dataset: { code: c.code } }, el('b', null, c.code), el('span', null, c.name))));
  function paintChips() { $$('.code-chip', chips).forEach((ch) => { ch.hidden = filter !== 0 && famOf(Number(ch.dataset.code)) !== filter; }); }
  chips.addEventListener('click', (e) => { const ch = e.target.closest('.code-chip'); if (ch) select(Number(ch.dataset.code)); });

  /* ---------- detail ---------- */
  let current = null;
  function select(code) {
    if (scheme.busy) return;
    const c = CODES.find((x) => x.code === code) || CODES[0];
    current = c;
    const fam = famOf(c.code);
    $$('.code-chip', chips).forEach((ch) => ch.setAttribute('aria-pressed', String(Number(ch.dataset.code) === c.code)));
    const fault = FAMILIES[fam - 1].fault;
    const m = c.req.method.toLowerCase();
    const mode = c.live ? API.mode : 'practice';
    $('#detail').replaceChildren(
      el('div', { class: `card s${fam}` },
        el('div', { class: 'num' }, c.code), el('h3', null, c.name),
        el('p', { style: 'font-size:1.1rem;margin:0' }, c.plain),
        el('div', { class: 'kv' }, el('div', null, el('small', null, 'Restaurant'), c.analogy)),
        el('div', { class: 'blame', 'aria-label': 'Who should fix it?' },
          el('span', { class: fault === 'client' ? 'on' : '' }, 'Client'), el('span', { class: fault === 'server' ? 'on' : '' }, 'Server'), el('span', { class: fault === 'none' ? 'on' : '' }, 'Nobody'))),
      el('div', { class: `card m-${m}` },
        el('h3', null, 'Request'),
        el('p', null, el('span', { class: 'mbadge' }, c.req.method), ' ', el('code', null, c.req.path + (c.req.query ? '?' + new URLSearchParams(c.req.query) : ''))),
        el('p', { class: 'muted', style: 'font-size:.9rem' }, 'Answered by ', el('span', { class: 'src ' + (mode === 'live' ? 'live' : 'practice') }, mode === 'live' ? 'live server' : 'practice server')),
        el('button', { class: `btn btn--method btn--lg m-${m}`, type: 'button', id: 'fire', onclick: fire }, icon('i-play'), `Send → ${c.code}`)));
    scheme.reset();
    scheme.screen.replaceChildren(el('div', { class: 'empty' }, 'Press send.'));
    const spec = { ...c.req, mode: c.live ? undefined : 'practice' };
    codeBox.set(UI.fetchSnippet(spec, `console.log(res.status);   // ${c.code}\nif (res.ok) { /* 200–299 */ } else { /* show an error */ }\n`));
    inspector.reset();
    inspector.showRequest(API.describe(spec, spec.mode));
    try { history.replaceState(null, '', '#' + c.code); } catch (e) { /* ignore */ }
  }

  async function fire() {
    if (scheme.busy || !current) return;
    const c = current;
    const btn = $('#fire'); btn.disabled = true;
    const spec = { ...c.req, mode: c.live ? undefined : 'practice' };
    inspector.showRequest(API.describe(spec, spec.mode));
    inspector.clearResponse();
    if (c.prep) await c.prep(); // quietly put the practice server in the right state (e.g. make sure a pet exists before deleting it)
    await scheme.run({
      method: c.req.method, clickLabel: 'click', label: `${c.req.method} ${c.req.path.replace(/\/\d+$/, '/{id}')}`,
      action: () => API.request(spec),
      onResult: (res) => { if (res.url) inspector.showRequest(res); inspector.showResponse(res); },
      dbEffect: (res, db) => { if (res.status === 200 && Array.isArray(res.data)) { db.set(UI.pickPets(res.data, 3).map(UI.dbRowOf)); db.markAll('read'); } },
      render: (res) => {
        const parts = [UI.statusScreen(res)];
        if (res.status === 200 && Array.isArray(res.data)) parts.push(el('div', { class: 'pets', style: 'margin-top:10px' }, UI.pickPets(res.data, 3).map((p, i) => UI.petCard(p, { delay: i * 80 }))));
        if (res.status === 301) parts.push(el('p', { class: 'muted', style: 'text-align:center;font-size:.85rem' }, 'New address: ', el('code', null, '/pet/findByStatus?status=available')));
        scheme.screen.replaceChildren(...parts);
      },
    });
    btn.disabled = false;
  }

  window.addEventListener('apik:mode', () => { if (!scheme.busy && current) select(current.code); });
  const fromHash = Number((location.hash || '').replace('#', ''));
  select(CODES.some((c) => c.code === fromHash) ? fromHash : 404);
})();
