/* scheme.js — the animated "how data travels" diagram.

   [ Swagger server + database ]  ⇄ API ⇄  [ your frontend project ]  ⇄  [ the screen ]

   Scheme.create(rootElement, config) builds the diagram and returns a controller:
     scheme.screen            the element where a page draws its "app"
     scheme.db                little database table (set / add / update / remove / mark)
     scheme.run({...})        plays one full round trip, doing a REAL request in the middle
   The node that holds the data turns solid, so the audience always knows where it is. */
(function () {
  'use strict';
  const { el, esc, sleep, store, reduced } = APIK;

  const STEPS = ['Click', 'Request', 'Database', 'Response', 'Read JSON', 'Render'];
  const CAPTIONS = [
    'You click a button.',
    'The frontend sends a request.',
    'The server uses the database.',
    'The server sends a response.',
    'The frontend reads the JSON.',
    'The result appears on screen.',
  ];

  const DEFAULTS = {
    title: 'Request → Response',
    server: { title: 'Swagger Petstore', icon: 'i-server', dbTitle: 'Database' },
    front: { title: 'Frontend', icon: 'i-code' },
    screen: { title: 'Screen', icon: 'i-monitor', url: 'pet-shop.app' },
    steps: STEPS, captions: CAPTIONS,
    laneNames: ['request', 'response'],
  };

  let uid = 0;
  const SLOW = 2.4;
  const speed = () => (store.get('slowmo', false) ? SLOW : 1);

  function create(root, userCfg) {
    let cfg = merge(DEFAULTS, userCfg || {});
    const id = ++uid;
    root.classList.add('scheme');
    root.innerHTML = `
      <div class="scheme-bar">
        <h3 data-ref="title"></h3>
        <button type="button" class="slowmo" id="slow-${id}" aria-pressed="false" title="Slow motion (S)"><svg class="ico" aria-hidden="true"><use href="#i-clock"></use></svg><span>Slow motion</span><em></em></button>
      </div>
      <div class="scheme-grid">
        <section class="node node--server" data-node="server" aria-label="Server and database">
          <div class="node-head"><span class="node-ico"><svg class="ico" aria-hidden="true"><use data-ref="serverIco" href="#i-server"></use></svg></span><b data-ref="serverTitle"></b></div>
          <div class="db"><div class="db-title"><svg class="ico" aria-hidden="true"><use href="#i-database"></use></svg><span data-ref="dbTitle"></span></div><div class="db-rows" data-ref="rows"></div></div>
        </section>
        <div class="link">
          <div class="lane" data-dir="toServer" data-ref="l1req"><span class="lane-name" data-ref="n1"></span></div>
          <div class="lane" data-dir="toScreen" data-ref="l1res"><span class="lane-name" data-ref="n2"></span></div>
        </div>
        <section class="node node--front" data-node="front" aria-label="Frontend project">
          <div class="node-head"><span class="node-ico"><svg class="ico" aria-hidden="true"><use data-ref="frontIco" href="#i-code"></use></svg></span><b data-ref="frontTitle"></b></div>
          <div class="hand" data-ref="hand"><span class="hand-tag" data-ref="handTag"></span><pre data-ref="inHand" aria-label="What the frontend sends and receives"></pre></div>
        </section>
        <div class="link">
          <div class="lane" data-dir="toServer" data-ref="l2req"></div>
          <div class="lane" data-dir="toScreen" data-ref="l2res"></div>
        </div>
        <section class="node node--screen" data-node="screen" aria-label="Screen">
          <div class="node-head"><span class="node-ico"><svg class="ico" aria-hidden="true"><use data-ref="screenIco" href="#i-monitor"></use></svg></span><b data-ref="screenTitle"></b></div>
          <div class="browser"><div class="browser-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="browser-url" data-ref="url"></span></div>
            <div class="screen" data-ref="screen"></div></div>
        </section>
      </div>
      <ol class="steps" data-ref="steps">${STEPS.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <p class="sr-only" data-ref="caption" role="status" aria-live="polite"></p>`;

    const ref = (n) => root.querySelector(`[data-ref="${n}"]`);
    const nodes = { server: root.querySelector('[data-node="server"]'), front: root.querySelector('[data-node="front"]'), screen: root.querySelector('[data-node="screen"]') };
    const lanes = { l1req: ref('l1req'), l1res: ref('l1res'), l2req: ref('l2req'), l2res: ref('l2res') };
    const stepEls = Array.from(ref('steps').children);
    const hand = ref('hand');
    let busy = false;

    /* ---- slow motion: a big button, and the S key ---- */
    const slowBtn = root.querySelector('.slowmo');
    const paintSlow = () => {
      const on = !!store.get('slowmo', false);
      slowBtn.setAttribute('aria-pressed', String(on));
      slowBtn.querySelector('em').textContent = on ? 'ON' : 'OFF';
    };
    slowBtn.addEventListener('click', () => { store.set('slowmo', !store.get('slowmo', false)); paintSlow(); });
    paintSlow();
    document.addEventListener('keydown', (e) => {
      if (!root.isConnected || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 's') return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      slowBtn.click();
    });

    /* ---- (re)label everything — used when a page flips vocabulary (e.g. "Real app" / "Restaurant") ---- */
    function apply(next) {
      cfg = merge(cfg, next || {});
      ref('title').textContent = cfg.title;
      ref('serverTitle').textContent = cfg.server.title;
      ref('dbTitle').textContent = cfg.server.dbTitle;
      ref('frontTitle').textContent = cfg.front.title;
      ref('screenTitle').textContent = cfg.screen.title;
      ref('url').textContent = cfg.screen.url;
      ref('n1').textContent = cfg.laneNames[0]; ref('n2').textContent = cfg.laneNames[1];
      stepEls.forEach((li, i) => { li.textContent = cfg.steps[i]; });
      ref('serverIco').setAttribute('href', '#' + cfg.server.icon);
      ref('frontIco').setAttribute('href', '#' + cfg.front.icon);
      ref('screenIco').setAttribute('href', '#' + cfg.screen.icon);
    }

    /* ---- node highlight + steps ---- */
    function activate(which) {
      for (const [k, n] of Object.entries(nodes)) n.classList.toggle('is-active', k === which);
    }
    function setStep(n) {
      stepEls.forEach((li, i) => {
        li.classList.toggle('is-active', i === n - 1);
        li.classList.toggle('is-done', i < n - 1);
      });
      if (n >= 1) ref('caption').textContent = cfg.captions[n - 1];
    }
    /* the frontend's hand: first the request it builds, then the response it receives */
    function showHand(tag, html, fresh) {
      ref('handTag').textContent = tag;
      ref('inHand').innerHTML = html;
      hand.classList.toggle('fresh', !!fresh);
    }

    /* ---- the little database ---- */
    const rowsEl = ref('rows');
    const rowKeys = () => Array.from(rowsEl.children).map((r) => r.dataset.key);
    const buildRow = (r) => el('div', { class: 'db-row', dataset: { key: r.key } },
      el('span', { class: 'tile', 'aria-hidden': 'true' }, r.tile || '#'), el('span', null, el('b', null, r.text), el('small', null, r.sub || '')));
    const rowEl = (key) => Array.from(rowsEl.children).find((r) => r.dataset.key === String(key));
    const db = {
      set(rows) { rowsEl.replaceChildren(...rows.slice(0, 4).map(buildRow)); },
      mark(key, kind, ms = 1700) {
        const r = rowEl(key); if (!r) return;
        r.classList.add('is-' + kind);
        setTimeout(() => r.classList.remove('is-' + kind), ms);
      },
      markAll(kind, ms) { rowKeys().forEach((k) => db.mark(k, kind, ms)); },
      add(row) {
        const old = rowEl(row.key); if (old) old.remove();
        const r = buildRow(row); r.classList.add('is-new');
        rowsEl.prepend(r);
        while (rowsEl.children.length > 4) rowsEl.lastElementChild.remove();
        setTimeout(() => r.classList.remove('is-new'), 1700);
      },
      update(key, row) {
        const r = rowEl(key);
        if (!r) return db.add(row);
        r.replaceChildren(...buildRow(row).children);
        r.classList.add('is-update'); setTimeout(() => r.classList.remove('is-update'), 1700);
      },
      remove(key) {
        const r = rowEl(key); if (!r) return;
        r.classList.add('is-gone'); setTimeout(() => r.remove(), 900);
      },
    };

    /* ---- the moving packets ---- */
    function packet(laneKey, { label, tone = 'neutral', ms = 1000 }) {
      const lane = lanes[laneKey];
      if (!lane || !lane.isConnected) return Promise.resolve();
      const p = el('div', { class: 'packet', dataset: { tone } }, label);
      lane.append(p);
      const dur = ms * speed();
      if (reduced()) { // no travelling — just a quick fade so the step is still visible
        p.style.left = '50%'; p.style.top = '50%'; p.style.transform = 'translate(-50%,-50%)';
        return p.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: Math.min(dur, 700) }).finished.catch(() => {}).then(() => p.remove());
      }
      const horizontal = lane.clientWidth >= lane.clientHeight;
      const len = horizontal ? lane.clientWidth : lane.clientHeight;
      const w = p.offsetWidth, h = p.offsetHeight;
      const forward = lane.dataset.dir === 'toScreen';
      const from = forward ? 0 : len, to = forward ? len : 0;
      if (horizontal) { p.style.left = '0'; p.style.top = '50%'; } else { p.style.top = '0'; p.style.left = '50%'; }
      const at = (v) => (horizontal ? `translate(${v - w / 2}px, -50%)` : `translate(-50%, ${v - h / 2}px)`);
      const anim = p.animate([
        { transform: at(from), opacity: 0 },
        { transform: at(from + (to - from) * .12), opacity: 1, offset: .12 },
        { transform: at(from + (to - from) * .88), opacity: 1, offset: .88 },
        { transform: at(to), opacity: 0 },
      ], { duration: dur, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
      return anim.finished.catch(() => {}).then(() => p.remove());
    }

    const hold = (ms) => sleep(reduced() ? Math.min(ms, 250) : ms * speed());

    /* ---- one full round trip ----
       spec = {
         method:'GET', label:'GET /pet/1',            the text on the request packet
         request: {method, path, query, body},        what the frontend writes down (shown in its box)
         action: async () => API.request(...),        the REAL call (runs while the packet flies)
         onRequest(): called as the request leaves,  onResult(res): called when the answer is known (before it flies back)
         dbEffect(res, db): what happens inside the database,
         render(res): draw the result on screen (after the last packet arrives)
       } */
    async function run(spec) {
      if (busy) return null;
      busy = true; root.dataset.busy = 'true';
      const tone = (spec.method || 'GET').toLowerCase();
      let res;
      try {
        setStep(1); activate('screen'); showHand('', '');
        await packet('l2req', { label: spec.clickLabel || 'click', tone: 'neutral', ms: 560 });

        setStep(2); activate('front');
        showHand('request', spec.request ? window.UI.requestHTML(spec.request) : esc(spec.label || ''));
        if (spec.onRequest) spec.onRequest();
        const pending = Promise.resolve().then(spec.action).catch((e) => ({ status: 0, statusText: 'Error', ok: false, ms: 0, source: 'practice', data: { message: String(e && e.message || e) } }));
        await packet('l1req', { label: spec.label, tone, ms: 1050 });

        setStep(3); activate('server');
        const [r] = await Promise.all([pending, hold(760)]);
        res = r;
        if (spec.dbEffect) spec.dbEffect(res, db);
        if (spec.onResult) spec.onResult(res);
        await hold(380);

        setStep(4); activate('server');
        const fam = res.status ? Math.floor(res.status / 100) : 0;
        await packet('l1res', { label: `${res.status || '×'} ${res.statusText || 'No answer'}`, tone: 's' + fam, ms: 1050 });

        setStep(5); activate('front');
        showHand('response', window.UI.jsonHTML(res.data, 9), true);
        await packet('l2res', { label: 'render', tone: 'neutral', ms: 560 });

        setStep(6); activate('screen');
        if (spec.render) await spec.render(res);
        stepEls.forEach((li) => { li.classList.remove('is-active'); li.classList.add('is-done'); });
        await hold(500);
      } finally {
        activate(null); busy = false; root.dataset.busy = 'false';
      }
      return res;
    }

    function reset() {
      setStep(0); activate(null);
      stepEls.forEach((li) => li.classList.remove('is-done', 'is-active'));
      showHand('', '');
    }

    apply(cfg);
    return { root, screen: ref('screen'), db, run, reset, apply, activate, get busy() { return busy; }, packet, ref };
  }

  /* shallow-recursive merge for plain config objects */
  function merge(a, b) {
    const o = Array.isArray(a) ? a.slice() : { ...a };
    for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a && typeof a[k] === 'object' ? merge(a[k], v) : v;
    return o;
  }

  window.Scheme = { create };
})();
