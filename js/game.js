/* game.js — Lesson 6: "Defend the castle". Three hearts, three trials.
   1) Methods — which method fits the request?   2) Codes — what does the status code mean?
   3) Dragon — a mix of both, against the clock (the timer can be switched off). */
(function () {
  'use strict';
  const { $, $$, el, icon, shuffle, pick, store } = APIK;

  /* ---------- content ---------- */
  const METHOD_INFO = {
    GET: ['m-get', 'i-eye', 'read'], POST: ['m-post', 'i-plus', 'create'], PUT: ['m-put', 'i-pencil', 'replace'], DELETE: ['m-delete', 'i-trash', 'remove'],
  };
  const METHOD_WHY = { GET: 'GET reads.', POST: 'POST creates.', PUT: 'PUT replaces.', DELETE: 'DELETE removes.' };
  const REQUESTS = [
    ['GET', 'Show all available pets.'], ['GET', 'Open my profile.'], ['GET', 'Search for “goldfish”.'], ['GET', 'Load the last 10 messages.'], ['GET', 'Show pet number 7.'],
    ['POST', 'Sign me up.'], ['POST', 'Send this new message.'], ['POST', 'Add a new pet.'], ['POST', 'Upload a new photo.'], ['POST', 'Place a new order.'],
    ['PUT', 'Replace my profile with this one.'], ['PUT', 'Change the pet to “sold”.'], ['PUT', 'Update my address.'], ['PUT', 'Replace my comment with this text.'],
    ['DELETE', 'Delete my account.'], ['DELETE', 'Remove this item from my cart.'], ['DELETE', 'Delete that photo.'], ['DELETE', 'Cancel my booking.'], ['DELETE', 'Remove pet number 12.'],
  ];
  const CODE_NAME = { 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 429: 'Too Many Requests', 500: 'Server Error', 503: 'Unavailable' };
  const RESPONSES = [
    [200, 'Here is your pet.'], [201, 'Your account was created.'], [204, 'Deleted. Nothing to return.'], [301, 'This address moved.'],
    [304, 'Nothing changed. Use your copy.'], [400, 'The pet’s name is missing.'], [401, 'Please log in first.'], [403, 'Logged in, but admins only.'],
    [404, 'No pet with that number.'], [405, 'DELETE is not allowed here.'], [409, 'Username already taken.'], [429, 'Too many requests. Slow down.'],
    [500, 'The server crashed.'], [503, 'Down for maintenance.'],
  ];
  const STAGES = [
    { name: 'Methods', ico: 'i-shield', kind: 'method', n: 5, blurb: 'Pick the method.' },
    { name: 'Codes', ico: 'i-code', kind: 'code', n: 5, blurb: 'Read the status code.' },
    { name: 'Dragon', ico: 'i-flame', kind: 'mixed', n: 6, blurb: 'Both, against the clock.', timed: true },
  ];
  const BOSS_SECONDS = 12;

  const root = $('#game');
  let G = null;
  let timerAnim = null;

  /* ---------- building questions ---------- */
  function methodQ() {
    const [answer, text] = pick(REQUESTS.filter((r) => !G.used.has(r[1])));
    G.used.add(text);
    return { kind: 'method', label: 'Request', text, answer, options: Object.keys(METHOD_INFO), why: METHOD_WHY[answer] };
  }
  function codeQ() {
    const [answer, text] = pick(RESPONSES.filter((r) => !G.used.has(r[1])));
    G.used.add(text);
    const others = shuffle(Object.keys(CODE_NAME).map(Number).filter((c) => c !== answer));
    const options = shuffle([answer, ...others.slice(0, 3)]).map(Number);
    return { kind: 'code', label: 'Response', text: `“${text}”`, answer, options, why: `${answer} ${CODE_NAME[answer]}.` };
  }
  const makeQ = (stage) => (stage.kind === 'method' ? methodQ() : stage.kind === 'code' ? codeQ() : (Math.random() < 0.5 ? methodQ() : codeQ()));

  /* ---------- screens ---------- */
  function hearts() {
    return el('div', { class: 'hearts', role: 'img', 'aria-label': `Hearts left: ${G.hearts} of 3` },
      [0, 1, 2].map((n) => el('span', { class: 'heart' + (n >= G.hearts ? ' lost' : ''), dataset: { n } }, icon('i-heart', 'fill'))));
  }
  function hud() {
    const st = STAGES[G.stage];
    return el('div', { class: 'hud' },
      hearts(),
      el('div', { class: 'stat' }, icon(st.ico), st.name, el('span', null, `${G.step + 1}/${st.n}`)),
      el('div', { class: 'stat' }, G.streak > 1 ? el('span', { class: 'combo' }, `x${G.streak}`) : null, 'Score ', el('b', { id: 'score' }, G.score)));
  }

  function intro() {
    const best = store.get('gameBest', 0);
    root.replaceChildren(el('div', { class: 'center' },
      icon('i-castle', 'big-ico'),
      el('h2', null, '3 trials. 3 hearts.'),
      el('p', { class: 'muted' }, 'A wrong answer breaks a heart.'),
      el('div', { class: 'start-grid' },
        STAGES.map((s, i) => el('div', { class: 'card' }, el('b', null, icon(s.ico), `${i + 1}. ${s.name}`), el('p', { class: 'muted', style: 'margin:6px 0 0;font-size:.92rem' }, s.blurb)))),
      el('label', { class: 'switch', style: 'justify-content:center;margin-bottom:18px' }, el('input', { type: 'checkbox', id: 'notimer', checked: store.get('noTimer', false) }), 'No timer'),
      best ? el('p', null, el('span', { class: 'src live' }, `Best ${best}`)) : null,
      el('div', null, el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: begin }, icon('i-play'), 'Start')),
      el('p', { class: 'muted', style: 'font-size:.85rem;margin-top:14px' }, 'Keys: 1 2 3 4')));
  }

  function begin() {
    store.set('noTimer', $('#notimer').checked);
    G = { stage: 0, step: 0, hearts: 3, score: 0, streak: 0, used: new Set(), wrong: [], q: null, locked: false, noTimer: $('#notimer').checked, answered: 0, correct: 0 };
    banner();
  }

  /* a short title card between trials */
  function banner() {
    const st = STAGES[G.stage];
    root.replaceChildren(hud(), el('div', { class: 'center', style: 'padding:28px 0' },
      icon(st.ico, 'big-ico'),
      el('h2', null, `Trial ${G.stage + 1}: ${st.name}`),
      el('p', { class: 'muted' }, st.blurb + (st.timed && !G.noTimer ? ` ${BOSS_SECONDS}s per question.` : '')),
      el('button', { class: 'btn btn--primary btn--lg', type: 'button', id: 'go', onclick: () => ask() }, 'Go', icon('i-arrow-right'))));
    $('#go').focus();
  }

  function ask() {
    const st = STAGES[G.stage];
    G.q = makeQ(st);
    G.locked = false;
    const timed = st.timed && !G.noTimer;
    const q = G.q;
    const choices = q.options.map((o, n) => {
      if (q.kind === 'method') {
        const [cls, ico, sub] = METHOD_INFO[o];
        return el('button', { type: 'button', class: `choice ${cls}`, dataset: { v: o }, onclick: () => answer(o), 'aria-label': `${n + 1}. ${o} — ${sub}` },
          el('span', { class: 'kbd' }, n + 1), el('span', { class: 'shield' }, icon(ico)), o, el('small', null, sub));
      }
      const fam = Math.floor(o / 100);
      return el('button', { type: 'button', class: `choice codechoice s${fam}`, dataset: { v: o }, onclick: () => answer(o), 'aria-label': `${n + 1}. ${o} ${CODE_NAME[o]}` },
        el('span', { class: 'kbd' }, n + 1), el('span', { class: 'num' }, o), el('small', null, CODE_NAME[o]));
    });
    root.replaceChildren(...[
      hud(),
      timed ? el('div', { class: 'timer', role: 'timer', 'aria-label': 'Time left' }, el('i', { id: 'bar' })) : null,
      el('div', { class: 'arena' },
        el('div', { class: 'arena-scene' },
          el('div', { class: 'scroll' }, el('div', { class: 'lbl' }, icon('i-scroll'), q.label), el('p', { id: 'qtext' }, q.text)),
          el('div', { class: 'castle', id: 'castle', 'aria-hidden': 'true' }, icon('i-castle'), el('small', null, 'Castle'))),
        el('div', { class: 'choices', role: 'group', 'aria-labelledby': 'qtext' }, choices)),
      el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite', id: 'fb' })].filter(Boolean));
    if (timed) startTimer();
    const qt = $('#qtext'); // move focus to the question so screen readers read it and Tab reaches the choices next
    qt.tabIndex = -1; qt.focus({ preventScroll: true });
  }

  function startTimer() {
    const bar = $('#bar');
    if (!bar || !bar.animate) return;
    timerAnim = bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: BOSS_SECONDS * 1000, easing: 'linear', fill: 'forwards' });
    timerAnim.onfinish = () => { if (!G.locked) answer(null); };
  }
  function stopTimer() { if (timerAnim) { timerAnim.onfinish = null; timerAnim.pause(); timerAnim = null; } }

  function answer(v) {
    if (G.locked) return;
    G.locked = true; stopTimer();
    const q = G.q;
    const ok = v === q.answer;
    G.answered++;
    $$('.choice').forEach((b) => {
      b.disabled = true;
      const val = q.kind === 'code' ? Number(b.dataset.v) : b.dataset.v;
      if (val === q.answer) b.classList.add('is-right');
      else if (val === v) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });
    const castle = $('#castle');
    let gained = 0;
    if (ok) {
      G.correct++; G.streak++;
      gained = 10 + Math.min(G.streak - 1, 5) * 2;
      G.score += gained;
      castle.classList.add('safe');
    } else {
      G.hearts--; G.streak = 0;
      G.wrong.push(q);
      castle.classList.add('hit');
      const gone = $$('.hearts .heart')[G.hearts];
      if (gone) gone.classList.add('lost', 'breaking');
      $('.hearts').setAttribute('aria-label', `Hearts left: ${G.hearts} of 3`);
    }
    $('#score').textContent = G.score;
    const dead = G.hearts <= 0;
    const lastOfAll = G.stage === STAGES.length - 1 && G.step === STAGES[G.stage].n - 1;
    const msg = ok ? `+${gained}` : (v === null ? 'Time is up.' : 'Wrong.');
    const nextLabel = dead ? 'Continue' : lastOfAll ? 'Finish' : G.step === STAGES[G.stage].n - 1 ? 'Next trial' : 'Next';
    const nextBtn = el('button', { class: 'btn btn--primary', type: 'button', onclick: advance }, nextLabel, icon('i-arrow-right'));
    $('#fb').replaceChildren(el('div', { class: 'note ' + (ok ? 'good' : 'danger') }, icon(ok ? 'i-check' : 'i-heart'), el('p', null, el('b', null, msg + ' '), q.why)),
      el('div', { style: 'margin-top:12px;text-align:right' }, nextBtn));
    nextBtn.focus();
  }

  function advance() {
    if (G.hearts <= 0) return end(false);
    G.step++;
    if (G.step >= STAGES[G.stage].n) {
      G.stage++; G.step = 0;
      if (G.stage >= STAGES.length) return end(true);
      return banner();
    }
    ask();
  }

  function end(won) {
    const prev = store.get('gameBest', 0);
    const isBest = G.score > prev;
    store.set('gameBest', Math.max(prev, G.score));
    const stars = won ? G.hearts : 0;
    root.replaceChildren(...[el('div', { class: 'center' },
      icon(won ? 'i-trophy' : 'i-x', 'big-ico'),
      el('h2', null, won ? 'Castle saved' : 'Castle lost'),
      won ? el('div', { class: 'stars', role: 'img', 'aria-label': `${stars} out of 3 stars` }, [0, 1, 2].map((n) => icon('i-star', n < stars ? 'on' : 'off'))) : null,
      el('p', null, el('b', { style: 'font-size:2rem;letter-spacing:-.03em' }, `${G.score}`), ' points', isBest ? el('span', { class: 'src live', style: 'margin-left:10px' }, 'New best') : null),
      el('p', { class: 'muted' }, `${G.correct} of ${G.answered} correct`),
      el('div', { style: 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:14px 0' },
        el('button', { class: 'btn btn--primary', type: 'button', onclick: intro }, icon('i-replay'), 'Again'),
        el('a', { class: 'btn', href: 'quiz.html' }, 'Quiz'),
        el('a', { class: 'btn', href: 'index.html' }, 'Start over'))),
      G.wrong.length ? el('div', { class: 'review' }, G.wrong.slice(0, 6).map((q) => el('div', { class: 'r' }, el('b', null, q.text), el('span', { class: 'muted' }, q.why)))) : null].filter(Boolean));
  }

  document.addEventListener('keydown', (e) => {
    if (!G || G.locked || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = Number(e.key) - 1;
    const btn = $$('.choice')[n];
    if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
  });

  intro();
})();
