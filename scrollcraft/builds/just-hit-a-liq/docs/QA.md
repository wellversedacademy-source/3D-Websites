# QA results · 2026-11-18

All checks were run against the **production build** served by Cloudflare's own
runtime locally (`wrangler dev`, the same package `npm run deploy` uploads),
in headless Chromium with software WebGL (SwiftShader).

## Automated

| Check | Result |
|---|---|
| Prettier format check | Pass |
| ESLint | Pass, 0 problems |
| TypeScript (`tsc --noEmit`, strict) | Pass |
| Unit tests (Vitest): catalogue, bag, sign-up validation and endpoint, copy rules | 25 / 25 pass |
| Production build | Pass |
| Routes on the Worker runtime: 11 pages, sitemap, robots, icons, manifest, models, renders, OG images | All 200; unknown path returns the branded 404 with status 404; `/cart`, `/hoodie` etc. 301 |
| Security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy) | Present |
| `POST /api/access` without storage bound | 503, "not open yet, nothing saved" (correct) |

## Scroll harness (scroll-craft `shoot.mjs`)

| Run | Dead scroll | Copy contrast on the rendered page |
|---|---|---|
| Desktop 1440×900 | None | All cues ≥ 4.5:1 at their worst frame |
| Phone 390×844 | None | All cues ≥ 4.5:1 |
| Reduced motion | None | All cues ≥ 4.5:1 |

Contact sheets were read frame by frame (`lab/qa-*/sheet.png`, not committed).

## Interaction suite (`lab/qa.cjs`): 87 / 87 pass

- 11 routes × 3 viewports (1440×900, 390×844, 360×640): no console errors, no
  failed requests, **no horizontal overflow** at any scroll position.
- Keyboard: first Tab is the skip link, focus ring visible, logical tab order.
- Bag: size required, add from product page and from a card, drawer opens,
  quantity changes, Escape closes, header count updates, persists across
  pages, remove empties, **checkout disabled with the reason shown**.
- Release access: invalid email blocked, phone without SMS consent blocked,
  unconnected storage reported honestly, email never placed in the URL.
- Homepage: ladder link jumps to the strike and stamps the time; the edition
  tag carries it; colorway and view controls work (Bone + Back verified
  visually).
- **No WebGL** (`--disable-webgl`): the page switches to five rendered stills
  and every chapter still reads; product pages keep their still image.

## Feel check (cold scroll, one word per act)

Intrigue · tactile · hush · arrival · curiosity · desire · resolve · belonging
· certainty. Matches the intended curve in BRIEF.md. The strike is the largest
visual change and holds the most scroll room; the act before it is the
quietest frame on the page; the close resolves on the mark rather than
fading into the footer.

Changes made because of QA: grey-looking garment (lighting and sheen
retuned), visible fabric grid (finer, softer normal map), annotation labels
and ladder bleeding over opaque sections (layering and reserved column),
phone strike headline off-screen (layout), product renders showing a stale
image under the live canvas (poster hidden once live), engine load order in
the production build, a view-button state bug, an empty "Follow" heading,
harsh sleeve ridges on light colorways.

## Not verified (needs a real device or a live account)

- **A real iPhone and Android phone.** Headless Chrome cannot reproduce mobile
  GPUs, thermal throttling, Low Power Mode or touch scrolling feel. Check
  frame rate and heat on a mid-range phone before launch.
- **Real GPU performance** on desktop (tests used software rendering, which is
  slower, so real hardware should be smoother, but it was not measured).
- **Lighthouse scores**: not run in this environment. Run PageSpeed Insights on
  the `workers.dev` preview.
- Screen-reader pass with VoiceOver/NVDA (structure, labels and live regions
  are in place; a human pass is still needed).
- Safari and Firefox rendering.
- Cloudflare deploy, DNS and KV: not performed, by design.

## Re-run after the product boards update · 2026-11-18

Same environment (production build on the Workers runtime, headless Chromium,
software WebGL).

| Check | Result |
|---|---|
| Format, lint, strict type check, production build | Pass |
| Unit tests | 25 / 25 |
| Interaction suite (`lab/qa.cjs`), now 15 routes × 3 viewports plus gallery checks | **116 / 116** |
| Scroll harness, desktop and phone | No dead scroll; all copy ≥ 4.5:1 at its worst frame |

New checks: product gallery thumbnails swap the main image; the 3D view loads
only on request; the jacket shows its honest placeholder; without WebGL the 3D
button hides itself and the photo stays.

Fixed during this pass: size dropdown unstyled outside the homepage; first
card stretching its text away from the image; the 3D button staying visible
without WebGL (a CSS rule overrode `hidden`); faint back print on the 3D
hoodie.

Still not verified: real phones, real GPUs, Safari/Firefox, Lighthouse, a
screen-reader pass (unchanged from the first run).
