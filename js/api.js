/* api.js — the "API client" of our frontend project.
   1) Live mode      → real HTTP requests to the public Swagger Petstore (https://petstore.swagger.io/v2).
   2) Practice mode  → a tiny pretend server that runs inside this page. It behaves like a strict,
                       well-built API (201 Created, 401, 404, 409 ...) and works with no internet.
   If a live request cannot reach the internet, we quietly fall back to practice mode. */
(function () {
  'use strict';
  const { store } = APIK;

  const LIVE = 'https://petstore.swagger.io/v2';
  const PRACTICE = 'https://practice.petshop.test/v2';

  const TEXT = {
    0: 'No connection', 100: 'Continue', 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 304: 'Not Modified',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict',
    429: 'Too Many Requests', 500: 'Internal Server Error', 503: 'Service Unavailable',
  };

  /* ====================================================================
     The practice server (a pretend backend + database)
     ==================================================================== */
  const seedPets = () => [
    { id: 1, name: 'Rex', category: { id: 1, name: 'Dogs' }, photoUrls: [], tags: [{ id: 1, name: 'friendly' }], status: 'available' },
    { id: 2, name: 'Misty', category: { id: 2, name: 'Cats' }, photoUrls: [], tags: [{ id: 2, name: 'sleepy' }], status: 'available' },
    { id: 3, name: 'Goldie', category: { id: 3, name: 'Fish' }, photoUrls: [], tags: [], status: 'pending' },
    { id: 4, name: 'Pip', category: { id: 4, name: 'Birds' }, photoUrls: [], tags: [], status: 'available' },
    { id: 5, name: 'Thumper', category: { id: 5, name: 'Rabbits' }, photoUrls: [], tags: [], status: 'sold' },
    { id: 6, name: 'Nibbles', category: { id: 6, name: 'Hamsters' }, photoUrls: [], tags: [], status: 'available' },
    { id: 7, name: 'Scales', category: { id: 7, name: 'Reptiles' }, photoUrls: [], tags: [], status: 'available' },
    { id: 8, name: 'Biscuit', category: { id: 1, name: 'Dogs' }, photoUrls: [], tags: [], status: 'pending' },
  ];
  let db = store.get('pdb', null) || { pets: seedPets(), users: [], nextId: 100 };
  const save = () => store.set('pdb', db);

  /* A toy hash. Real servers use bcrypt/argon2 — the point is: the server never keeps the password itself. */
  const toyHash = (s) => { let h = 5381; for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'h' + (h >>> 0).toString(16); };
  const publicUser = (u) => ({ id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, userStatus: u.userStatus });
  const out = (status, data, headers) => ({ status, data: data === undefined ? null : data, headers: headers || {} });
  const fail = (status, message, headers) => out(status, { code: status, type: 'error', message }, headers);

  const ROUTES = [];
  const route = (method, pattern, fn) => ROUTES.push({ method, re: new RegExp('^' + pattern + '$'), fn });

  /* --- pets --- */
  route('GET', '/pet/findByStatus', ({ query }) => {
    if (!['available', 'pending', 'sold'].includes(query.status)) return fail(400, 'Invalid status value. Use available, pending or sold.');
    return out(200, db.pets.filter((p) => p.status === query.status));
  });
  route('GET', '/pet/(\\d+)', ({ m }) => {
    const pet = db.pets.find((p) => p.id === Number(m[1]));
    return pet ? out(200, pet) : fail(404, 'Pet not found');
  });
  route('GET', '/pet/([^/]+)', () => fail(400, 'A pet id must be a number'));
  route('POST', '/pet', ({ body }) => {
    if (!body || typeof body.name !== 'string' || !body.name.trim()) return fail(400, 'A pet needs a name');
    const id = Number.isInteger(body.id) ? body.id : db.nextId++;
    if (db.pets.some((p) => p.id === id)) return fail(409, 'A pet with this id already exists');
    const pet = { id, category: body.category || { id: 0, name: 'Unknown' }, name: body.name.trim(), photoUrls: body.photoUrls || [], tags: body.tags || [], status: body.status || 'available' };
    db.pets.unshift(pet); save();
    return out(201, pet, { Location: '/pet/' + id });
  });
  route('PUT', '/pet', ({ body }) => {
    if (!body || !Number.isInteger(body.id) || typeof body.name !== 'string' || !body.name.trim()) return fail(400, 'To update a pet send its id and name');
    const i = db.pets.findIndex((p) => p.id === body.id);
    if (i < 0) return fail(404, 'Pet not found — you cannot update something that does not exist');
    db.pets[i] = { ...db.pets[i], ...body }; save();
    return out(200, db.pets[i]);
  });
  route('DELETE', '/pet/(\\d+)', ({ m }) => {
    const i = db.pets.findIndex((p) => p.id === Number(m[1]));
    if (i < 0) return fail(404, 'Pet not found');
    db.pets.splice(i, 1); save();
    return out(204, null);
  });

  /* --- users --- */
  route('POST', '/user', ({ body }) => {
    const u = body || {};
    if (!/^[A-Za-z0-9_]{3,20}$/.test(u.username || '')) return fail(400, 'Username needs 3–20 letters, numbers or _');
    if (!/^\S+@\S+\.\S+$/.test(u.email || '')) return fail(400, 'That email address does not look right');
    if (String(u.password || '').length < 4) return fail(400, 'Password is too short (min 4 characters)');
    if (db.users.some((x) => x.username.toLowerCase() === u.username.toLowerCase())) return fail(409, 'That username is already taken');
    const user = { id: db.nextId++, username: u.username, firstName: u.firstName || '', lastName: u.lastName || '', email: u.email, phone: u.phone || '', userStatus: 1, pw: toyHash(u.password) };
    db.users.push(user); save();
    return out(201, publicUser(user), { Location: '/user/' + user.username });
  });
  route('GET', '/user/login', ({ query }) => {
    if (!query.username || !query.password) return fail(400, 'Please send both username and password');
    const user = db.users.find((x) => x.username.toLowerCase() === String(query.username).toLowerCase());
    // Same message for "no such user" and "wrong password" — it does not tell attackers which usernames exist.
    if (!user || user.pw !== toyHash(query.password)) return fail(401, 'Wrong username or password');
    return out(200, { code: 200, type: 'session', message: 'logged in user session:' + Date.now() }, { 'X-Expires-After': new Date(Date.now() + 3600e3).toUTCString() });
  });
  route('GET', '/user/([^/]+)', ({ m }) => {
    const user = db.users.find((x) => x.username.toLowerCase() === decodeURIComponent(m[1]).toLowerCase());
    return user ? out(200, publicUser(user)) : fail(404, 'User not found');
  });
  route('PUT', '/user/([^/]+)', ({ m, body }) => {
    const user = db.users.find((x) => x.username.toLowerCase() === decodeURIComponent(m[1]).toLowerCase());
    if (!user) return fail(404, 'User not found');
    if (!body || typeof body !== 'object') return fail(400, 'Send the new version of the user as JSON');
    for (const k of ['firstName', 'lastName', 'email', 'phone']) if (typeof body[k] === 'string') user[k] = body[k];
    save();
    return out(200, publicUser(user));
  });
  route('DELETE', '/user/([^/]+)', ({ m }) => {
    const i = db.users.findIndex((x) => x.username.toLowerCase() === decodeURIComponent(m[1]).toLowerCase());
    if (i < 0) return fail(404, 'User not found');
    db.users.splice(i, 1); save();
    return out(204, null);
  });

  /* --- special addresses used by the Status Codes lab --- */
  route('GET', '/account', ({ headers }) => (headers.Authorization ? out(200, { username: 'sir_lancelot', plan: 'free' }) : fail(401, 'Please log in first')));
  route('GET', '/admin/reports', () => fail(403, 'You are logged in, but only admins may open this door'));
  route('GET', '/search', () => fail(429, 'Too many requests — please wait 30 seconds', { 'Retry-After': '30' }));
  route('GET', '/boom', () => fail(500, 'Something broke inside the server (this is not your fault)'));
  route('GET', '/maintenance', () => fail(503, 'We are updating the server. Back in a few minutes!', { 'Retry-After': '120' }));
  route('GET', '/old-pets', () => out(301, null, { Location: '/pet/findByStatus?status=available' }));
  route('GET', '/pet/1/photo', ({ headers }) => (headers['If-None-Match'] === '"v1"' ? out(304, null, { ETag: '"v1"' }) : out(200, { photo: 'rex.jpg' }, { ETag: '"v1"' })));

  function handle(info) {
    const { method, path } = info;
    for (const r of ROUTES) {
      if (r.method !== method) continue;
      const m = path.match(r.re);
      if (m) return r.fn({ m, query: info.query || {}, body: info.body, headers: info.headers || {} });
    }
    const allowed = ROUTES.filter((r) => r.re.test(path)).map((r) => r.method);
    if (allowed.length) return fail(405, `${method} is not allowed here. Try: ${[...new Set(allowed)].join(', ')}`, { Allow: [...new Set(allowed)].join(', ') });
    return fail(404, 'Nothing lives at this address');
  }

  /* ====================================================================
     The public API of this file
     ==================================================================== */
  const queryString = (q) => {
    const s = q ? new URLSearchParams(q).toString() : '';
    return s ? '?' + s : '';
  };

  const API = {
    LIVE, PRACTICE, DOCS: 'https://petstore.swagger.io/', TEXT,
    offline: false,
    get mode() { return store.get('mode', 'live'); },
    setMode(mode) { API.offline = false; store.set('mode', mode); window.dispatchEvent(new CustomEvent('apik:mode', { detail: mode })); },
    statusText: (code) => TEXT[code] || '',
    liveUrl: (path, query) => LIVE + path + queryString(query),

    /* what we are about to send — used by the inspector before the answer is back */
    describe(spec, mode) {
      const m = (mode || API.mode) === 'live' ? LIVE : PRACTICE;
      const method = (spec.method || 'GET').toUpperCase();
      const headers = { Accept: 'application/json' };
      if (spec.body !== undefined) headers['Content-Type'] = 'application/json';
      Object.assign(headers, spec.headers || {});
      return { method, url: m + spec.path + queryString(spec.query), headers, body: spec.body };
    },

    /* never throws: always resolves to {status, statusText, ok, data, ms, source, ...} */
    async request(spec) {
      const mode = spec.mode || API.mode;
      const req = API.describe(spec, mode);
      const info = { method: req.method, path: spec.path, query: spec.query, body: spec.body, headers: req.headers };

      if (mode === 'live') {
        const t0 = performance.now();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), spec.timeout || 9000);
        try {
          const res = await fetch(req.url, { method: req.method, headers: req.headers, body: spec.body !== undefined ? JSON.stringify(spec.body) : undefined, signal: ctrl.signal });
          clearTimeout(timer);
          const text = await res.text();
          let data = null;
          if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
          if (API.offline) { API.offline = false; window.dispatchEvent(new CustomEvent('apik:net')); }
          return { ...req, ok: res.ok, status: res.status, statusText: res.statusText || TEXT[res.status] || '', data, ms: Math.round(performance.now() - t0), source: 'live', responseHeaders: {} };
        } catch (err) {
          clearTimeout(timer);
          // Could not reach the internet (or CORS/timeout). Keep the lecture alive with the practice server.
          if (!API.offline) { API.offline = true; window.dispatchEvent(new CustomEvent('apik:net')); APIK.toast('Offline — using the practice server'); }
          const r = await runPractice({ ...info });
          return { ...r, fellBack: true };
        }
      }
      return runPractice(info);
    },
    resetPractice() { db = { pets: seedPets(), users: [], nextId: 100 }; save(); },
  };

  function runPractice(info) {
    return new Promise((resolve) => {
      const delay = 260 + Math.random() * 320;
      setTimeout(() => {
        const r = handle(info);
        const url = PRACTICE + info.path + queryString(info.query);
        resolve({
          method: info.method, url, headers: info.headers, body: info.body,
          ok: r.status >= 200 && r.status < 300, status: r.status, statusText: TEXT[r.status] || '', data: r.data,
          ms: Math.round(delay), source: 'practice', responseHeaders: r.headers,
        });
      }, delay);
    });
  }

  window.API = API;
})();
