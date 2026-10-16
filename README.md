# API Knights — how an API works, animated

A request flies from the **screen** through the **frontend** to the **server + database**, and the
**response** flies back. Real calls to the public [Swagger Petstore](https://petstore.swagger.io/).
The node that holds the data turns solid, so the audience always sees where it is.

**Live site:** https://thothcher.github.io/api-knights/

## Run it

No install, no build. Double-click `index.html`, or serve the folder (`npx serve`, `python -m http.server`).

## Pages

| Page | What it shows |
|------|---------------|
| `index.html` — How it works | The full round trip. Switch between **Real app** and **Restaurant** |
| `knights.html` — Methods | GET, POST, PUT, DELETE. Pick one, send it, watch the pet shop change |
| `examples.html` — Examples | Get data, register, log in, edit profile, delete account |
| `status.html` — Status codes | 14 codes in four families. Send the request that causes each one |
| `quiz.html` — Quiz | 10 random questions out of 14 |
| `game.html` — Game | Defend the castle: 3 hearts, 3 trials |

Deep links: `knights.html#POST`, `examples.html#login`, `status.html#404`.

## While presenting

- **Slow motion** button (or press **S**) stretches every animation 2.4×.
- The frontend box shows the **request** it builds, then the **response** it receives.
- Header pill: **Live Swagger** (real server) or **Practice server** (built-in, works offline).
  If the internet fails, it switches to practice by itself.
- Light and dark theme: the moon / sun button.

## Safety

The public Petstore is shared by everyone. Use fake data only. In live mode the app never sends the
password you typed, and passwords are masked on screen.

## Files

```
css/styles.css   tokens (light + dark), the diagram, every component
js/common.js     helpers, icons, header, theme, server pill
js/api.js        live client + the offline practice server
js/scheme.js     the animated diagram (packets, solid active node, slow motion)
js/ui.js         pet cards, JSON colouring, request preview
js/home.js, knights.js, examples.js, status.js, quiz.js, game.js   one file per page
```
