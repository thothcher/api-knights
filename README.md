# API Knights — a visual, animated guide to how APIs work

An interactive lecture tool. A request flies from the **screen** through your **frontend project** to the
**Swagger server + database**, and the **response** flies back — using real calls to the public
[Swagger Petstore](https://petstore.swagger.io/). Target audience: students aged 12–60, no prior knowledge.

**Live site:** https://thothcher.github.io/api-knights/

## Run it

No install, no build. **Double-click `index.html`.**
(Or serve the folder: `npx serve` / `python -m http.server` and open the printed address.)

Needs a modern browser (Chrome, Edge, Firefox, Safari). Internet is optional — see *Offline-safe* below.

## The six lessons

| # | Page | What it teaches | Interactive bits |
|---|------|-----------------|------------------|
| 1 | `index.html` | What an API is (waiter ⇄ kitchen), anatomy of a request, Swagger = the menu, JSON | Animated scheme with a **Real app ⇄ Restaurant** switch, clickable URL anatomy, JSON hover-map |
| 2 | `knights.html` | The four methods: **GET** (read), **POST** (create), **PUT** (replace), **DELETE** (remove) | A live pet-shop mission per knight; the database on the left and the screen on the right change for real |
| 3 | `examples.html` | Get data, register, log in, edit profile, delete account | Forms on the diagram's screen; request/response inspector; the `fetch` code behind each |
| 4 | `status.html` | Status-code families and 14 common codes (200 201 204 301 304 400 401 403 404 405 409 429 500 503) | "Make it happen" lab — trigger every code and see what the user sees |
| 5 | `quiz.html` | Check understanding | 10 random questions out of 14, with an explanation after each |
| 6 | `game.html` | Reinforce it | **Defend the API Castle** — three hearts, three trials (knights, codes, a timed Dragon boss) |

Deep links: `knights.html#POST`, `examples.html#login`, `status.html#404`.

## How the scheme animation works

```
 [ Swagger server + database ] ⇄ API ⇄ [ your frontend project ] ⇄ [ the screen ]
        left                                   middle                  right
```

`Scheme.run()` plays one full round trip in six steps while a **real** request is made in the middle:
click → request leaves the frontend → server works with the database → response travels back (coloured by
status family) → frontend reads the JSON → result drawn on screen. A **Slow motion** switch is built in
for lecturing. On phones the diagram turns vertical.

## Offline-safe

Two servers sit behind one function, `API.request()` (`js/api.js`):

* **Live** — the real Swagger Petstore (`https://petstore.swagger.io/v2`).
* **Practice** — a pretend server that runs inside the page. It behaves like a *strict, well-built* API
  (`201 Created`, `401`, `404`, `409`, validation `400`s …), which the shared public server does not.

If the live server can't be reached, the page falls back to Practice automatically (the header pill says so).
Click the pill in the header to switch by hand — useful to show a real `401` on the login example, or the
status codes the public server can't produce.

## Safety notes for a shared public API

* Everyone in the world shares the Petstore, and `GET /user/{name}` returns stored passwords **in plain text**.
  So on the live server the demo **never sends what you type in a password box** — it sends a placeholder, and
  passwords are masked in the on-screen inspector. Forms are pre-filled with fake data.
* All text coming from the API is inserted as text (never HTML), because the public data is untrusted.
* The Petstore's test data is messy (e.g. 19-digit ids that JavaScript cannot represent exactly), so the
  screen picks tidy-looking pets and shortens ids.

## Suggested 20-minute flow

1. **Lesson 1** (4 min): press *Send a request*, toggle Restaurant ⇄ Real app, turn on Slow motion once.
2. **Lesson 2** (6 min): go GET → POST → PUT → DELETE in order, then press DELETE once more to meet `404`.
3. **Lesson 3** (4 min): Register → Log in (tick *wrong password* on the practice server for a `401`).
4. **Lesson 4** (3 min): fire 200, 404, 401, 500; explain "first digit tells the story".
5. **Lesson 5 / 6** (3 min): the game works well on a projector — let the room shout the answers.

## Project layout

```
index.html knights.html examples.html status.html quiz.html game.html
css/styles.css        design tokens (silver / taupe / mauve bark / terracotta clay / espresso), light + dark themes, all components
js/common.js          helpers, icon sprite, header / lesson nav / theme / progress
js/api.js             API client: live + practice server
js/ui.js              pet cards, request/response inspector, JSON + code colouring, status explanations
js/scheme.js          the animated diagram (packets, database table, steps)
js/home.js knights.js examples.js status.js quiz.js game.js    one script per page
```

Accessibility: keyboard-operable everywhere (tabs use arrow keys, quiz/game answers use A–D / 1–4), visible focus,
colour is never the only signal, `prefers-reduced-motion` is respected, and the game's timer can be switched off.
