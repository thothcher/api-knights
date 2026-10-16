/* quiz.js — Lesson 5: ten random questions out of fourteen, with a one-line explanation after every answer */
(function () {
  'use strict';
  const { $, el, icon, shuffle, store } = APIK;

  const BANK = [
    { q: 'What does API stand for?', a: ['Application Programming Interface', 'Automatic Program Installer', 'Advanced Page Index', 'Apple Phone Integration'], c: 0, why: 'A doorway that lets programs talk to each other.' },
    { q: 'In the restaurant story, who is the API?', a: ['The customer', 'The waiter', 'The kitchen', 'The menu'], c: 1, why: 'The waiter carries the order and the dish.' },
    { q: 'Which method reads the list of pets?', a: ['GET', 'POST', 'PUT', 'DELETE'], c: 0, why: 'GET only reads.' },
    { q: 'You press “Create account”. Which method?', a: ['GET', 'POST', 'PUT', 'DELETE'], c: 1, why: 'POST creates something new.' },
    { q: 'You change your name and press Save. Which method replaces the profile?', a: ['GET', 'POST', 'PUT', 'DELETE'], c: 2, why: 'PUT sends the whole new version.' },
    { q: 'You press “Delete my account”. Which method?', a: ['GET', 'POST', 'PUT', 'DELETE'], c: 3, why: 'DELETE removes it.' },
    { q: 'What does 404 mean?', a: ['The server crashed', 'You are not logged in', 'Not found', 'Success'], c: 2, why: 'Nothing exists at that address.' },
    { q: 'Which family means “the server made a mistake”?', a: ['2xx', '3xx', '4xx', '5xx'], c: 3, why: '5xx is the server. 4xx is you.' },
    { q: 'A normal user opens the admin page. Which code?', a: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Server Error'], c: 1, why: '401: who are you? 403: not allowed.' },
    { q: 'Which format do most web APIs use?', a: ['JSON', 'MP3', 'Excel', 'PDF'], c: 0, why: 'JSON: plain text, name and value pairs.' },
    { q: 'True or false: GET should change data.', a: ['True', 'False'], c: 1, why: 'GET only reads.' },
    { q: 'What is Swagger for?', a: ['Styling websites', 'Storing passwords', 'Documenting an API', 'Speeding up the internet'], c: 2, why: 'It is the menu of an API.' },
    { q: 'Which code means “Created”?', a: ['200', '201', '204', '301'], c: 1, why: '201 Created.' },
    { q: 'Why not put a password in a GET address?', a: ['It is slower', 'Addresses are saved in history and logs', 'GET cannot carry text', 'It must be longer'], c: 1, why: 'URLs leak. Use POST over HTTPS.' },
  ];
  const ROUND = 10;

  const root = $('#quiz');
  let qs = [], i = 0, score = 0, missed = [], locked = false;

  function start() {
    qs = shuffle(BANK).slice(0, ROUND).map((q) => {
      // keep GET/POST/PUT/DELETE, True/False and status codes in their natural order — shuffling those would only confuse
      const natural = q.a.every((t) => /^(GET|POST|PUT|DELETE|True|False|\dxx|\d{3}( .*)?)$/.test(t));
      const opts = q.a.map((text, idx) => ({ text, ok: idx === q.c }));
      return { ...q, opts: natural ? opts : shuffle(opts) };
    });
    i = 0; score = 0; missed = []; locked = false;
    show();
  }

  function show() {
    const q = qs[i];
    root.replaceChildren(
      el('div', { class: 'q-meta' }, el('span', null, `${i + 1} / ${qs.length}`), el('span', null, `Score ${score}`)),
      el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(qs.length), 'aria-valuenow': String(i) }, el('i', { style: `width:${(i / qs.length) * 100}%` })),
      el('h2', { class: 'q-text', id: 'qtext' }, q.q),
      el('div', { class: 'opts', role: 'group', 'aria-labelledby': 'qtext' }, q.opts.map((o, n) => el('button', { type: 'button', class: 'opt', style: `animation-delay:${n * 60}ms`, dataset: { n }, onclick: () => answer(n) },
        el('span', { class: 'k' }, 'ABCD'[n]), el('span', null, o.text)))),
      el('div', { class: 'explain', id: 'explain' }),
      el('div', { class: 'nav-row' }, el('span', { class: 'muted', style: 'font-size:.85rem' }, 'Keys: A B C D'), el('span')));
    requestAnimationFrame(() => { const first = $('.opt'); if (first && i > 0) first.focus({ preventScroll: true }); });
  }

  function answer(n) {
    if (locked) return;
    locked = true;
    const q = qs[i];
    const ok = q.opts[n].ok;
    if (ok) score++; else missed.push({ q: q.q, right: q.opts.find((o) => o.ok).text, why: q.why });
    document.querySelectorAll('.opt').forEach((b, idx) => {
      b.disabled = true;
      if (q.opts[idx].ok) b.classList.add('is-right');
      else if (idx === n) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });
    const last = i === qs.length - 1;
    $('#explain').replaceChildren(el('div', { class: 'note ' + (ok ? 'good' : 'danger') }, icon(ok ? 'i-check' : 'i-x'), el('p', null, el('b', null, ok ? 'Correct. ' : 'Not quite. '), q.why)));
    const nextBtn = el('button', { class: 'btn btn--primary', type: 'button', onclick: advance }, last ? 'Result' : 'Next', icon('i-arrow-right'));
    $('.nav-row').replaceChildren(el('span'), nextBtn);
    nextBtn.focus();
  }

  function advance() { locked = false; i++; if (i >= qs.length) finish(); else show(); }

  function finish() {
    const best = Math.max(store.get('quizBest', 0), score);
    store.set('quizBest', best);
    const rank = score >= 9 ? 'Royal Knight' : score >= 7 ? 'Knight' : score >= 5 ? 'Squire' : 'Page';
    root.replaceChildren(...[
      el('div', { class: 'center' },
        el('span', { class: 'eyebrow' }, `Best ${best} / ${qs.length}`),
        el('div', { class: 'score-big', role: 'img', 'aria-label': `You scored ${score} out of ${qs.length}` }, `${score}/${qs.length}`),
        el('div', { class: 'score-bar' }, el('i', { id: 'bar' })),
        el('h2', null, rank),
        el('div', { style: 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px' },
          el('button', { class: 'btn', type: 'button', onclick: start }, icon('i-replay'), 'Again'),
          el('a', { class: 'btn btn--primary', href: 'game.html' }, 'Play the game', icon('i-arrow-right')))),
      missed.length ? el('div', { class: 'review' }, missed.map((m) => el('div', { class: 'r' }, el('b', null, m.q), el('span', { class: 'mono' }, m.right), ' — ', el('span', { class: 'muted' }, m.why)))) : null].filter(Boolean));
    requestAnimationFrame(() => setTimeout(() => { const bar = $('#bar'); if (bar) bar.style.width = (score / qs.length) * 100 + '%'; }, 60));
  }

  document.addEventListener('keydown', (e) => {
    if (locked || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = 'abcd'.indexOf(e.key.toLowerCase());
    const btn = n >= 0 && document.querySelectorAll('.opt')[n];
    if (btn && !btn.disabled) { e.preventDefault(); answer(n); }
  });

  /* intro */
  root.replaceChildren(el('div', { class: 'center' },
    el('h2', null, `${ROUND} questions`),
    store.get('quizBest', 0) ? el('p', null, el('span', { class: 'src live' }, `Best ${store.get('quizBest', 0)} / ${ROUND}`)) : null,
    el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: start }, icon('i-play'), 'Start')));
})();
