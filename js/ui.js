/* ui.js — shared building blocks: pet cards, the request/response inspector, syntax colours,
   short explanations of status codes. All text from the API goes through textContent / esc(). */
(function () {
  'use strict';
  const { el, esc, icon } = APIK;

  const family = (code) => (code ? Math.floor(code / 100) : 0);
  const toneOf = (code) => 's' + family(code);

  /* ---------- pets ---------- */
  const tileOf = (name) => { const m = String(name || '').trim().match(/[\p{L}\p{N}]/u); return m ? m[0].toUpperCase() : '#'; };
  const niceName = (n) => typeof n === 'string' && /^[\p{L}\p{N} _.'’-]{1,22}$/u.test(n.trim());
  /* The public Petstore is full of junk test data. Pick tidy, unique-looking pets for the screen. */
  function pickPets(list, n) {
    const arr = Array.isArray(list) ? list : [];
    const seen = new Set();
    const tidy = arr.filter((p) => p && niceName(p.name) && !seen.has(p.name.toLowerCase()) && seen.add(p.name.toLowerCase()));
    const rest = arr.filter((p) => p && !tidy.includes(p) && typeof p.name === 'string' && p.name.trim());
    return [...tidy, ...rest].slice(0, n);
  }
  /* Some public ids are 19 digits — more than JavaScript can hold exactly — so never show them in full. */
  const shortId = (id) => { const s = String(id); return s.length > 8 ? '#' + s.slice(0, 4) + '…' : '#' + s; };
  function petCard(pet, opts = {}) {
    const status = String(pet.status || 'unknown');
    const stCls = { available: 'm-post', pending: 'm-put', sold: 'm-delete' }[status] || 's1';
    const name = typeof pet.name === 'string' && pet.name.trim() ? pet.name.trim().slice(0, 40) : '(no name)';
    return el('div', { class: 'pet ' + (opts.cls || ''), dataset: { id: pet.id }, style: opts.delay ? `animation-delay:${opts.delay}ms` : null },
      opts.tag ? el('span', { class: 'tag ' + (opts.tagCls || 'm-post') }, opts.tag) : null,
      el('span', { class: 'tile', 'aria-hidden': 'true' }, tileOf(name)),
      el('b', { title: name }, opts.oldName ? [el('s', null, opts.oldName), ' ', name] : name),
      el('small', null, (pet.category && pet.category.name ? String(pet.category.name).slice(0, 20) : 'pet') + ' · ' + shortId(pet.id)),
      el('span', { class: 'st ' + stCls }, opts.oldStatus ? `${opts.oldStatus} → ${status}` : status));
  }
  const dbRowOf = (pet) => ({ key: String(pet.id), tile: tileOf(pet.name), text: String(pet.name || '(no name)').slice(0, 22), sub: `${shortId(pet.id)} · ${pet.status || '—'}` });

  /* ---------- short explanations (what a *person* sees) ---------- */
  const EXPLAIN = {
    0: { t: 'No connection', d: 'The request never arrived.' },
    200: { t: 'Success', d: 'Here is your data.' },
    201: { t: 'Created', d: 'Saved on the server.' },
    204: { t: 'Done', d: 'Nothing to send back.' },
    301: { t: 'Moved', d: 'Follow the new address.' },
    304: { t: 'Not modified', d: 'Use your saved copy.' },
    400: { t: 'Bad request', d: 'Check what you sent.' },
    401: { t: 'Please log in', d: 'The server does not know you.' },
    403: { t: 'Not allowed', d: 'You lack permission.' },
    404: { t: 'Not found', d: 'Nothing at this address.' },
    405: { t: 'Wrong method', d: 'Not accepted here.' },
    409: { t: 'Already exists', d: 'It clashes with existing data.' },
    429: { t: 'Slow down', d: 'Too many requests.' },
    500: { t: 'Server error', d: 'Not your fault.' },
    503: { t: 'Back soon', d: 'Server busy or updating.' },
  };
  const explain = (code) => EXPLAIN[code] || { t: code >= 500 ? 'Server error' : code >= 400 ? 'Request error' : 'Done', d: '' };

  const messageOf = (res) => {
    const d = res && res.data;
    if (d && typeof d === 'object' && !Array.isArray(d)) return String(d.message || d.error || '');
    return typeof d === 'string' ? d.slice(0, 120) : '';
  };

  /* a ready-made "what the user sees" box for any response */
  function statusScreen(res) {
    const info = explain(res.status);
    const msg = messageOf(res);
    return el('div', { class: 'status-screen ' + toneOf(res.status) },
      el('div', { class: 'big' }, res.status || '×'),
      el('h4', null, info.t),
      el('p', null, msg && family(res.status) >= 4 ? msg : info.d));
  }
  function banner(res, text) {
    const bad = family(res.status) >= 4 || res.status === 0;
    return el('div', { class: 'banner ' + toneOf(res.status), role: bad ? 'alert' : 'status' },
      icon(bad ? 'i-alert' : 'i-check'),
      el('div', null, el('b', null, `${res.status || '×'} ${res.statusText || explain(res.status).t}`), ' — ', text || explain(res.status).d));
  }

  /* ---------- colouring ---------- */
  const maskSecrets = (v) => {
    if (Array.isArray(v)) return v.map(maskSecrets);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, /pass/i.test(k) ? '••••••••' : maskSecrets(x)]));
    return v;
  };
  const maskUrl = (u) => u.replace(/(password=)[^&]*/i, '$1••••••••');

  /* Shorten long strings and long arrays so previews stay small. */
  function trimForDisplay(v, depth = 0) {
    if (typeof v === 'string') return v.length > 48 ? v.slice(0, 45) + '…' : v;
    if (Array.isArray(v)) {
      const head = v.slice(0, depth === 0 ? 2 : 3).map((x) => trimForDisplay(x, depth + 1));
      if (v.length > head.length) head.push(`… ${v.length - head.length} more`);
      return head;
    }
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trimForDisplay(x, depth + 1)]));
    return v;
  }

  const JSON_RE = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  function colourJSON(text) {
    let html = '', last = 0, m;
    JSON_RE.lastIndex = 0;
    while ((m = JSON_RE.exec(text))) {
      html += esc(text.slice(last, m.index));
      if (m[1]) html += m[2] ? `<span class="j-key">${esc(m[1])}</span>${esc(m[2])}` : `<span class="j-str">${esc(m[1])}</span>`;
      else if (m[3]) html += `<span class="j-kw">${m[3]}</span>`;
      else html += `<span class="j-num">${m[4]}</span>`;
      last = JSON_RE.lastIndex;
    }
    return html + esc(text.slice(last));
  }
  function jsonHTML(data, maxLines = 18) {
    if (data === null || data === undefined || data === '') return '<span class="j-cm">(empty body)</span>';
    if (typeof data === 'string') return esc(data.slice(0, 400));
    let lines = JSON.stringify(trimForDisplay(maskSecrets(data)), null, 2).split('\n');
    let cut = false;
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); cut = true; }
    return colourJSON(lines.join('\n')) + (cut ? '\n<span class="j-cm">…</span>' : '');
  }

  const JS_RE = /(\/\/.*)|("(?:\\.|[^"\\])*")|\b(const|await|async|let|return|new)\b|\b(fetch|JSON|console)\b/g;
  function colourJS(code) {
    let html = '', last = 0, m;
    JS_RE.lastIndex = 0;
    while ((m = JS_RE.exec(code))) {
      html += esc(code.slice(last, m.index));
      if (m[1]) html += `<span class="j-cm">${esc(m[1])}</span>`;
      else if (m[2]) html += `<span class="j-str">${esc(m[2])}</span>`;
      else if (m[3]) html += `<span class="j-kw">${m[3]}</span>`;
      else html += `<span class="j-fn">${m[4]}</span>`;
      last = JS_RE.lastIndex;
    }
    return html + esc(code.slice(last));
  }

  /* The code a developer would write in the frontend project for this request. */
  function fetchSnippet(spec, tail) {
    const url = maskUrl(API.liveUrl(spec.path, spec.query));
    const m = (spec.method || 'GET').toUpperCase();
    const hasBody = spec.body !== undefined;
    const headers = { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...(spec.headers || {}) };
    const lines = [];
    if (m !== 'GET') lines.push(`  method: "${m}",`);
    if (Object.keys(headers).length) {
      lines.push(`  headers: { ${Object.entries(headers).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ')} },`);
    }
    if (hasBody) {
      const body = JSON.stringify(maskSecrets(spec.body), null, 2).split('\n').join('\n  ');
      lines.push(`  body: JSON.stringify(${body}),`);
    }
    let code = lines.length
      ? `const res = await fetch("${url}", {\n${lines.join('\n')}\n});\n`
      : `const res = await fetch("${url}");\n`;
    code += tail || (m === 'DELETE'
      ? 'console.log(res.status);\n'
      : 'const data = await res.json();   // JSON → object\nconsole.log(res.status, data);\n');
    return code;
  }
  function codeBox() {
    const pre = el('pre', { class: 'code', tabindex: '0', 'aria-label': 'Example frontend code' });
    const btn = el('button', { class: 'btn btn--sm copy', type: 'button', onclick: () => APIK.copy(pre.textContent) }, icon('i-copy'), 'Copy');
    const box = el('div', { class: 'codebox' }, pre, btn);
    box.set = (text) => { pre.innerHTML = colourJS(text); };
    return box;
  }

  /* ---------- the inspector: request + response ---------- */
  function inspector(root) {
    root.classList.add('insp');
    const reqPre = el('pre', { class: 'code', tabindex: '0', 'aria-label': 'The request that was sent' });
    const resPre = el('pre', { class: 'code', tabindex: '0', 'aria-label': 'The response that came back' });
    const meta = el('div', { class: 'insp-meta' });
    root.replaceChildren(
      el('section', { class: 'insp-col' }, el('h3', { class: 'insp-h' }, 'Request'), reqPre),
      el('section', { class: 'insp-col' }, el('h3', { class: 'insp-h' }, 'Response'), meta, resPre));
    return {
      showRequest(r) {
        let h = `<span class="tok-method m-${r.method.toLowerCase()}">${r.method}</span> ${esc(maskUrl(r.url))}\n`;
        for (const [k, v] of Object.entries(r.headers || {})) h += `<span class="tok-h">${esc(k)}:</span> ${esc(v)}\n`;
        if (r.body !== undefined) h += '\n' + jsonHTML(r.body, 22);
        reqPre.innerHTML = h;
      },
      showResponse(res) {
        meta.replaceChildren(
          el('span', { class: 'spill ' + toneOf(res.status) }, `${res.status || '×'} ${res.statusText || ''}`.trim()),
          el('span', { class: 'muted' }, `${res.ms} ms`),
          el('span', { class: 'src ' + (res.source === 'live' ? 'live' : 'practice') }, res.source === 'live' ? 'Live' : (res.fellBack ? 'Offline → practice' : 'Practice')));
        resPre.innerHTML = jsonHTML(res.data);
      },
      clearResponse() { meta.replaceChildren(); resPre.innerHTML = '<span class="j-cm">…</span>'; },
      reset() { reqPre.textContent = ''; resPre.textContent = ''; meta.replaceChildren(); },
    };
  }

  window.UI = { family, toneOf, tileOf, pickPets, petCard, dbRowOf, explain, messageOf, statusScreen, banner, jsonHTML, colourJSON, colourJS, trimForDisplay, maskSecrets, fetchSnippet, codeBox, inspector };
})();
