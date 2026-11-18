# Just hit a LiQ · JustHitALiq.com

The official website for **Just hit a LiQ**: a scroll-driven 3D storefront for
Drop 001. One garment holds the stage while the story scrolls over it; the
price ladder on the right is the chapter navigation; crossing the cobalt level
"takes the liquidity" and stamps the visitor's time.

Built with the scroll-craft skill (see `BRIEF.md` for the creative decisions).
Stack: Vite + TypeScript + Three.js, static pages, one Cloudflare Worker.

## Folder map

| Path | What it is |
|---|---|
| `index.html` | Homepage (the scroll narrative) |
| `shop/`, `bag/`, `care/`, `legal/`, `404.html` | Other pages |
| `product/` | **Generated** from `src/data/products.json` on every build. Do not edit by hand. |
| `src/data/products.json` | Products, options, colorways. Edit this to change the catalogue. |
| `src/brand/mark.ts` | The LiQ strike mark (provisional). Every logo and garment print comes from it. |
| `src/styles/site.css` | Colours, type, shared components |
| `src/pages/` | Page scripts (`home.ts` is the scroll choreography) |
| `src/three/` | The 3D garment, stage and product viewer |
| `src/commerce/` | Catalogue, bag, and the commerce-provider seam |
| `worker/index.ts` | Cloudflare Worker: release-access sign-up endpoint |
| `assets-src/boards/` | The owner's product boards (masters, not served) |
| `public/photos/` | Product photos cut from the boards |
| `public/` | Static files: models, renders, icons, Cloudflare `_headers` and `_redirects` |
| `public/engine/` | The scroll-craft engine. Never edited per project. |
| `scripts/` | Model generator and the render pipeline |
| `docs/` | Assets, commerce, deployment, QA |

## Everyday commands

Run these in this folder (`scrollcraft/builds/just-hit-a-liq`).

```bash
npm ci
```
```bash
npm run dev
```
Opens a local preview at http://localhost:5173.

```bash
npm run check
```
Formatting, lint, type check, tests and a production build, in one go. Run it
before every deploy.

```bash
npm run worker:dev
```
Serves the built site exactly as Cloudflare will (http://localhost:8787),
including the sign-up endpoint. Run `npm run build` first.

## Common changes

- **Edit product text, details or colorways:** `src/data/products.json`, then
  `npm run check`. Product pages, cards, sitemap and structured data update.
- **Set a price:** replace `null` with the number (USD). Only when approved.
- **Replace the 3D garment with the real one:** drop the new GLB at
  `public/models/signature-hoodie.glb` (and a lighter `-m.glb`), see
  `docs/ASSETS.md` for the spec, then re-render stills:
  `npm run dev` in one terminal and `npm run posters` in another.
- **Add or replace product photos:** put the board or photo in
  `assets-src/boards/`, set its crop boxes in `scripts/crop-boards.mjs`, run
  `node scripts/crop-boards.mjs`, and set `"photos": true` for that product.
- **Replace the mark:** update `src/brand/mark.ts` (or the face in
  `scripts/build-mark.mjs`), then re-render stills the same way.
- **Social links / care email:** set the `VITE_SOCIAL_*` and `VITE_CARE_EMAIL`
  values (see `.env.example`). Empty values hide the link.

## Deploying

See `docs/DEPLOY.md`. Short version: `npx wrangler login`, then
`npm run deploy` gives a private `workers.dev` preview; connecting
JustHitALiq.com is a separate, explicit step.

## What is not connected yet

Checkout, sign-up storage, social links and the care email (see
`docs/COMMERCE.md`). The site says so plainly wherever it matters.

## Licences

Fonts: Bodoni Moda and IBM Plex Mono, SIL Open Font License. Three.js: MIT.
scroll-craft engine: MIT.
