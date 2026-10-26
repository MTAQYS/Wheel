# Wheel

A wheel of names that runs entirely in the browser. Paste a list, spin, and read the result. Nothing is sent to a server.

French is the default language. English is one click away.

## Fair draw

The winning segment is chosen with `crypto.getRandomValues`. Values that would bias a modulo are discarded (rejection sampling), then the animation is calculated so the wheel stops with that segment centered under the pointer. `Math.random` is not used.

If the system asks for reduced motion, the wheel does not spin: the result appears at once and the name is highlighted briefly.

## Privacy

- No analytics, no cookies, no account.
- Lists, options, and the last 20 results stay in `localStorage` on this browser.
- A shared list is stored in the URL hash (`#n=…`). The hash is not sent with HTTP requests.
- The page sets a strict Content-Security-Policy. `public/_headers` repeats it for a later Cloudflare Pages deploy.

## Develop

```bash
npm install
npm run dev
```

The dev server uses the GitHub Pages base path, so the app is at `http://localhost:5173/Wheel/`.

```bash
npm test
npm run lint
npm run build
```

`VITE_BASE` sets the Vite base path. It defaults to `/Wheel/` for GitHub Pages. For Cloudflare Pages, build with `VITE_BASE=/`.

## Lists

Type or paste one name per line, or import a `.txt` or `.csv` file. Names are trimmed. Empty lines are dropped. A name is kept to 100 characters, and a list is kept to 500 names. CSV files may use commas or semicolons. A table with several columns uses the first column.

Saved lists stay in this browser. **Copy link** puts the current list in the address bar and on the clipboard.

## Deploy

Pushing to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which publishes `dist/` to GitHub Pages with `VITE_BASE=/Wheel/`. The site is [https://mtaqys.github.io/Wheel/](https://mtaqys.github.io/Wheel/).

Open Graph and Twitter URLs are `SITE_ORIGIN` in [`src/site.ts`](src/site.ts) joined to that base path. It is `https://mtaqys.github.io` today. Change `SITE_ORIGIN` when the tool moves to dynamogic.com. The footer credit links to https://dynamogic.com/.

Pages has to use **GitHub Actions** as its source (Settings → Pages → Build and deployment). Enabling that needs permission to change the repository settings.

Every push also runs lint, tests, and the production build.

## License

[MIT](LICENSE) © Dynamogic
