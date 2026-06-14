# Spectra — landing site

A self-contained static marketing page for the Spectra extension. No build step, no
dependencies — just HTML, CSS, and vanilla JS.

## The concept

A **scroll descent** from space to the core of the earth, mirroring what Spectra does to a
profile: read it top-down, from the surface to the core.

| Layer        | Section                | Ambient motion              |
| ------------ | ---------------------- | --------------------------- |
| Space        | Hero + product panel   | Starfield, shooting stars   |
| Sky          | Features               | Drifting clouds             |
| Land / grass | How it works           | Falling leaves, swaying grass |
| Soil         | Privacy                | Wiggling worms, roots       |
| Core         | CTA + footer           | Molten glow, rising embers  |

All motion is GPU-cheap (transforms/opacity only), pauses when its section is off-screen, and
is **fully disabled under `prefers-reduced-motion`**.

## Local preview

No tooling required — serve the folder with any static server:

```bash
cd landing
npx serve .          # or: python -m http.server 8080
```

Then open the printed URL.

## Deploy on Vercel

This folder is a standalone static site, deployable as its own Vercel project alongside the
`server/` proxy (`internet-detective-proxy`).

```bash
cd landing
npx vercel deploy --prod
```

Set **Root Directory** to `landing` if deploying from the repo root in the Vercel dashboard.
There is no build command and no output directory to configure — Vercel serves the static
files directly. `vercel.json` handles clean URLs and long-lived caching for `/assets`.

## Files

```
landing/
  index.html      # all sections / structure
  styles.css      # layer gradients, components, ambient keyframes, reduced-motion
  main.js         # starfield canvas, reveal-on-scroll, depth rail, leaves/embers
  vercel.json     # static hosting config
  assets/icons/   # Spectra logo (copied from /public/icons)
```

## Configuration

Two things are meant to be edited as the product ships — both live at the top of `main.js`:

- **Chrome Web Store URL** — set `CONFIG.storeUrl` to the listing link. Every button marked
  `data-install` (nav, hero, final CTA) then points there and opens in a new tab. While it's
  empty, those buttons safely fall back to scrolling to the in-page CTA section instead of
  404-ing.

  ```js
  const CONFIG = { storeUrl: "https://chromewebstore.google.com/detail/…" };
  ```

- **Character avatar** — the hero panel avatar is gender-aware and data-driven. Set
  `data-gender="male"` or `data-gender="female"` on the `[data-character]` element in
  `index.html`; `main.js` renders the matching stylized SVG. This is a stand-in for the planned
  3D Pixar-style render — when the real renders exist, drop them into `assets/` and replace the
  `buildAvatar()` call with an `<img>` swap keyed off the same `data-gender`.

## Notes

- The product panel in the hero is a faithful **mock** of the extension's analysis view.
- Icons are copied from `public/icons/`. If the brand mark changes, re-copy them into
  `landing/assets/icons/`.
- This site is independent of the extension bundle and does **not** affect extension
  performance.
