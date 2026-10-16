/* examples.js — five everyday API flows (get data, register, log in, edit profile, delete account).
   The forms live on the diagram's "screen", so submitting one sends a packet across the scheme. */
(function () {
  'use strict';
  const { $, $$, el, icon, rand, store } = APIK;

  /* ---------- who is our pretend user? ---------- */
  const session = Object.assign({ username: 'knight_' + rand(1000, 9999), firstName: 'Demo', lastName: 'Knight', id: rand(1000000, 9000000), registered: false }, store.get('session', {}));
  const saveSession = () => store.set('session', session);
  const emailOf = () => session.email || `${session.username}@example.com`;
  const FAKE_PW = 'fake-pass-123';
  /* The public server shows stored passwords to everyone, so in live mode we never send what was typed. */
  const wire = (typed) => (API.mode === 'live' ? 'demo-password' : typed);

  const userRows = () => [
    ...(session.registered ? [{ key: session.username, tile: UI.tileOf(session.username), text: session.username, sub: 'you' }] : []),
    { key: 'ada_l', tile: 'A', text: 'ada_l', sub: 'user' }, { key: 'bob_k', tile: 'B', text: 'bob_k', sub: 'user' }, { key: 'cleo_m', tile: 'C', text: 'cleo_m', sub: 'user' },
  ].slice(0, 4);

  const scheme = Scheme.create($('#scheme'), {
    title: 'App ⇄ Server',
    server: { title: 'Swagger Petstore', dbTitle: 'Database' },
    screen: { title: 'App screen', icon: 'i-monitor', url: 'pet-shop.app' },
  });
  const S = scheme.screen;

  /* ---------- small helpers ---------- */
  const field = (id, label, attrs, help) => el('div', { class: 'field' }, el('label', { for: id }, label), el('input', { id, autocomplete: 'off', ...attrs }), help ? el('small', null, help) : null);
  const setBusy = (b) => $$('button, input, select', S).forEach((x) => { x.disabled = b; });
  const shortPath = (p) => p.replace(/^(\/user\/)(?!login).+$/, '$1{username}').replace(/\/\d{4,}$/, '/{id}');
  const next = (label, hash) => el('a', { class: 'btn btn--sm btn--primary', href: '#' + hash, onclick: (e) => { e.preventDefault(); select(hash); } }, label, icon('i-arrow-right'));
  const actions = (...kids) => el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:center' }, ...kids);

  async function go(spec, h) {
    if (scheme.busy) return null;
    setBusy(true);
    const res = await scheme.run({
      method: spec.method, clickLabel: h.click || 'submit', label: `${spec.method} ${shortPath(spec.path)}`, request: spec,
      action: () => API.request(spec),
      dbEffect: h.db,
      render: h.render,
    });
    setBusy(false);
    return res;
  }
  const showBanner = (res, text) => {
    const old = $('.banner', S); if (old) old.remove();
    S.prepend(UI.banner(res, text));
  };

  /* ====================================================================
     The five scenarios
     ==================================================================== */
  const SCENARIOS = {
    list: {
      method: 'GET', title: 'Get data', url: 'pet-shop.app/pets',
      rows: () => [{ key: 's1', tile: 'R', text: 'Rex', sub: '#1 · available' }, { key: 's2', tile: 'M', text: 'Misty', sub: '#2 · available' }, { key: 's3', tile: 'G', text: 'Goldie', sub: '#3 · pending' }],
      mount() {
        const sel = el('select', { id: 'st' }, ['available', 'pending', 'sold'].map((s) => el('option', { value: s }, s)));
        const form = el('form', { class: 'form', onsubmit: async (e) => {
          e.preventDefault();
          const status = sel.value;
          await go({ method: 'GET', path: '/pet/findByStatus', query: { status } }, {
            click: 'search',
            db: (res, db) => { if (res.ok && Array.isArray(res.data)) { db.set(UI.pickPets(res.data, 3).map(UI.dbRowOf)); db.markAll('read'); } },
            render: (res) => {
              const out = $('#results');
              const old = $('.banner', S); if (old) old.remove();
              if (!res.ok) { S.prepend(UI.banner(res)); out.replaceChildren(); return; }
              const pets = UI.pickPets(res.data, 5);
              S.prepend(UI.banner(res, `${Array.isArray(res.data) ? res.data.length : 0} found.`));
              out.replaceChildren(el('div', { class: 'row-list' }, pets.map((p, i) => el('div', { class: 'r', style: `animation-delay:${i * 80}ms` },
                el('span', { class: 'tile', 'aria-hidden': 'true' }, UI.tileOf(p.name)), el('b', { title: p.name }, String(p.name || '(no name)').slice(0, 30)),
                el('span', { class: 'spill ' + ({ available: 'm-post', pending: 'm-put', sold: 'm-delete' }[p.status] || 's1') }, String(p.status || '?'))))));
            },
          });
        } },
        el('div', { class: 'app-head' }, 'Find a pet'),
        el('div', { class: 'field' }, el('label', { for: 'st' }, 'Status'), sel),
        el('button', { class: 'btn btn--method m-get btn--sm', type: 'submit' }, icon('i-eye'), 'Search'));
        S.replaceChildren(form, el('div', { id: 'results', style: 'margin-top:12px' }, el('div', { class: 'empty' }, 'Results appear here.')));
      },
    },

    register: {
      method: 'POST', title: 'Register', url: 'pet-shop.app/sign-up',
      rows: () => userRows(),
      mount() {
        const form = el('form', { class: 'form', novalidate: true, onsubmit: async (e) => {
          e.preventDefault();
          const username = $('#u').value.trim(), email = $('#e').value.trim(), pw = $('#p').value;
          const body = { id: session.id, username, firstName: 'Demo', lastName: 'Knight', email, password: wire(pw), phone: '', userStatus: 1 };
          await go({ method: 'POST', path: '/user', body }, {
            click: 'sign up',
            db: (res, db) => { if (res.ok) db.add({ key: username, tile: UI.tileOf(username), text: username, sub: 'new' }); },
            render: (res) => {
              if (!res.ok) { showBanner(res, UI.messageOf(res) || undefined); return; }
              Object.assign(session, { username, email, registered: true }); saveSession();
              S.replaceChildren(el('div', { class: 'result-card m-post' }, icon('i-check'), el('b', null, `Welcome, ${username}`), el('small', null, 'Account saved.')),
                actions(next('Log in', 'login'),
                  el('button', { class: 'btn btn--sm', type: 'button', onclick: () => { session.username = 'knight_' + rand(1000, 9999); session.registered = false; saveSession(); select('register'); } }, 'Another')));
            },
          });
        } },
        el('div', { class: 'app-head' }, 'Create account'),
        field('u', 'Username', { value: session.username, maxlength: 20 }),
        field('e', 'Email', { type: 'email', value: emailOf() }),
        field('p', 'Password', { type: 'password', value: FAKE_PW, autocomplete: 'new-password' }, 'Fake password only.'),
        el('button', { class: 'btn btn--method m-post btn--sm', type: 'submit' }, icon('i-plus'), 'Create account'));
        S.replaceChildren(form);
      },
    },

    login: {
      method: 'GET', title: 'Log in', url: 'pet-shop.app/login',
      rows: () => userRows(),
      mount() {
        const form = el('form', { class: 'form', onsubmit: async (e) => {
          e.preventDefault();
          const username = $('#lu').value.trim(), typed = $('#lp').value, wrong = $('#wrong').checked;
          await go({ method: 'GET', path: '/user/login', query: { username, password: wrong ? 'wrong-password' : wire(typed) } }, {
            click: 'log in',
            db: (res, db) => { if (res.ok) db.mark(username, 'read'); },
            render: (res) => {
              if (!res.ok) { showBanner(res, UI.messageOf(res) || undefined); return; }
              const token = String(UI.messageOf(res).replace('logged in user session:', '')).slice(0, 18);
              const demoNote = wrong && res.source === 'live' ? 'The public server accepts any password. Switch to the practice server for a 401.' : null;
              S.replaceChildren(...[
                el('div', { class: 'result-card m-post' }, icon('i-check'), el('b', null, `Logged in as ${username}`), el('small', null, `Token ${token}…`)),
                demoNote ? el('div', { class: 'note warn', style: 'margin-top:10px' }, icon('i-info'), el('p', null, demoNote)) : null,
                actions(next('Edit profile', 'update'), el('button', { class: 'btn btn--sm', type: 'button', onclick: () => select('login') }, 'Back')),
              ].filter(Boolean));
            },
          });
        } },
        el('div', { class: 'app-head' }, 'Log in'),
        field('lu', 'Username', { value: session.username, maxlength: 20 }),
        field('lp', 'Password', { type: 'password', value: FAKE_PW, autocomplete: 'off' }, 'Fake password only.'),
        el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'wrong' }), 'Use a wrong password'),
        el('button', { class: 'btn btn--method m-get btn--sm', type: 'submit' }, icon('i-key'), 'Log in'));
        S.replaceChildren(form);
      },
    },

    update: {
      method: 'PUT', title: 'Edit profile', url: 'pet-shop.app/profile',
      rows: () => userRows(),
      mount() {
        const form = el('form', { class: 'form', onsubmit: async (e) => {
          e.preventDefault();
          const firstName = $('#fn').value.trim(), lastName = $('#ln').value.trim(), email = $('#pe').value.trim();
          const body = { id: session.id, username: session.username, firstName, lastName, email, password: wire(FAKE_PW), phone: '', userStatus: 1 };
          await go({ method: 'PUT', path: '/user/' + encodeURIComponent(session.username), body }, {
            click: 'save',
            db: (res, db) => { if (res.ok) db.update(session.username, { key: session.username, tile: UI.tileOf(session.username), text: session.username, sub: `${firstName} ${lastName}`.trim() || 'user' }); },
            render: (res) => {
              if (!res.ok) { showBanner(res, UI.messageOf(res) || undefined); return; }
              Object.assign(session, { firstName, lastName, email }); saveSession();
              showBanner(res, 'Saved. Press Reload to check.');
            },
          });
        } },
        el('div', { class: 'app-head' }, 'My profile', el('small', null, session.username)),
        field('fn', 'First name', { value: session.firstName, maxlength: 30 }),
        field('ln', 'Last name', { value: session.lastName, maxlength: 30 }),
        field('pe', 'Email', { type: 'email', value: emailOf() }),
        el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
          el('button', { class: 'btn btn--method m-put btn--sm', type: 'submit' }, icon('i-pencil'), 'Save'),
          el('button', { class: 'btn btn--method m-get btn--sm', type: 'button', onclick: reload }, icon('i-eye'), 'Reload')));
        S.replaceChildren(form);

        async function reload() {
          await go({ method: 'GET', path: '/user/' + encodeURIComponent(session.username) }, {
            click: 'reload',
            db: (res, db) => { if (res.ok) db.mark(session.username, 'read'); },
            render: (res) => {
              if (!res.ok) { showBanner(res, UI.messageOf(res) || undefined); return; }
              const u = res.data || {};
              $('#fn').value = u.firstName || ''; $('#ln').value = u.lastName || ''; $('#pe').value = u.email || '';
              showBanner(res, `Server has: ${[u.firstName, u.lastName].filter(Boolean).join(' ') || '(no name)'}.`);
            },
          });
        }
      },
    },

    delete: {
      method: 'DELETE', title: 'Delete account', url: 'pet-shop.app/profile/delete',
      rows: () => userRows(),
      mount() {
        const area = el('div');
        const ask = () => area.replaceChildren(el('div', { class: 'confirm' }, el('b', null, 'Are you sure?'),
          el('div', { class: 'btns' }, el('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: doDelete }, icon('i-trash'), 'Delete'), el('button', { class: 'btn btn--sm', type: 'button', onclick: idle }, 'Cancel'))));
        const idle = () => area.replaceChildren(el('button', { class: 'btn btn--method m-delete btn--sm btn--block', type: 'button', onclick: ask }, icon('i-trash'), 'Delete my account'));
        S.replaceChildren(el('div', { class: 'app-head' }, 'Settings'),
          el('div', { class: 'result-card', style: '--c:var(--ink);--c-ink:var(--ink);margin-bottom:12px' }, icon('i-user'), el('b', null, session.username), el('small', null, emailOf())), area);
        idle();

        async function doDelete() {
          await go({ method: 'DELETE', path: '/user/' + encodeURIComponent(session.username) }, {
            click: 'delete',
            db: (res, db) => { if (res.ok) db.remove(session.username); },
            render: (res) => {
              if (res.ok) { session.registered = false; saveSession(); }
              area.replaceChildren(UI.statusScreen(res),
                actions(el('button', { class: 'btn btn--sm', type: 'button', onclick: ask }, icon('i-trash'), 'Delete again'), next('Register', 'register')));
            },
          });
        }
      },
    },
  };
  const ORDER = ['list', 'register', 'login', 'update', 'delete'];
  const ICON = { GET: 'i-eye', POST: 'i-plus', PUT: 'i-pencil', DELETE: 'i-trash' };

  /* ---------- tabs ---------- */
  const tabs = $('#tabs');
  ORDER.forEach((id) => {
    const s = SCENARIOS[id];
    tabs.append(el('button', { type: 'button', role: 'tab', id: 'tab-' + id, class: `tab tab--text m-${s.method.toLowerCase()}`, 'aria-selected': 'false', tabindex: '-1', dataset: { id } },
      el('span', { class: 'nm' }, icon(ICON[s.method]), s.title), el('span', { class: 'rl' }, s.method)));
  });

  let current = null;
  function select(id, focus) {
    if (scheme.busy) return;
    if (!SCENARIOS[id]) id = 'list';
    current = id;
    const s = SCENARIOS[id];
    $$('.tab', tabs).forEach((t) => { const on = t.dataset.id === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    scheme.reset();
    scheme.apply({ screen: { url: s.url } });
    scheme.db.set(s.rows());
    s.mount();
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
  }
  tabs.addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) select(t.dataset.id); });
  tabs.addEventListener('keydown', (e) => {
    const i = ORDER.indexOf(current);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); select(ORDER[(i + step + ORDER.length) % ORDER.length], true); }
  });
  window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (SCENARIOS[h] && h !== current) select(h); });
  window.addEventListener('apik:mode', () => { if (!scheme.busy) select(current); });

  $('#reset').addEventListener('click', () => { API.resetPractice(); session.registered = false; saveSession(); APIK.toast('Practice data reset'); select(current); });

  select((location.hash || '').replace('#', '') || 'list');
})();
