# Express'Arte catalogue — working notes

Static, no-build site (`index.html` + `styles.css` + `app.js` + `config.js` + `assets/`).
There is no package manager, bundler, backend or database. `LEIA-ME.txt` is the
owner's own Portuguese hand-off note, not dev documentation.

## Running in the sandbox

`docker compose -f docker-compose.base44.yml up -d` → http://localhost:3000

- One `web` service: `nginx:alpine` serving the bind-mounted checkout read-only.
  No build step, so source edits are visible on the next browser reload.
- `.base44/nginx.conf` is a **full** `nginx.conf`, not a server snippet, and sets
  `user root`. Reason: the checkout root directory is mode 700, so nginx's
  default `nginx` worker gets `Permission denied` on every file. Keep the
  `user root;` line or every request 404s.
- That config also disables caching (`Cache-Control: no-store`, so reloads show
  edits) and denies dotfiles (`.git/`, `.base44/` return 403).
- Healthcheck: `GET /index.html` -> 200.

## Gotchas

- A product appears in **two** places: a card in `index.html` (`.product-card`
  with `data-product-id`, `data-name`, `data-category`) and an entry in the
  `products` array at the top of `app.js` (id/name/category/price). The order
  total only counts products present in `app.js`.
- Filters/search work off the card's `data-*` attributes; `state.category`
  defaults to `"Todas"`.
- The WhatsApp number lives in `config.js` (`whatsappNumber`, digits only with
  country code). With it empty, sending is disabled with an inline warning; no
  external API is called at runtime. The order button opens `wa.me` in a new tab
  (do not trigger it during automated checks — it leaves the sandbox).
- `styles.css` line 1 `@import`s Google Fonts over the network; if that is
  blocked the site falls back to system fonts and still works.
- Prices are deliberate placeholders (`draftMode: true`) — do not "fix" them.

## Verifying

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s http://localhost:3000/ | grep -o '<title>[^<]*</title>'
```

In the browser: search/filter the grid, use the card's −/+ quantity, click
"Incluir no pedido", and confirm the header bubble / floating cart / order panel
totals update.
