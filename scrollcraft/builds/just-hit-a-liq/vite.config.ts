/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { markSVG, strikeIconSVG } from './src/brand/mark.ts';
import catalog from './src/data/products.json' with { type: 'json' };

const ROOT = import.meta.dirname;
const BRAND = 'Just hit a LiQ';

type Meta = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: string;
  noindex?: boolean;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function head(meta: Meta, origin: string): string {
  const url = origin + meta.path;
  const image = origin + (meta.image ?? '/og/og-default.jpg');
  const title = meta.path === '/' ? meta.title : `${meta.title} | ${BRAND}`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}">`,
    meta.noindex ? `<meta name="robots" content="noindex">` : `<link rel="canonical" href="${url}">`,
    `<meta property="og:site_name" content="${BRAND}">`,
    `<meta property="og:type" content="${meta.type ?? 'website'}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="theme-color" content="#0B0B0D">`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="/favicon.ico" sizes="32x32">`,
    `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`,
    `<link rel="manifest" href="/site.webmanifest">`,
    `<link rel="stylesheet" href="/engine/scrollcraft.css">`,
  ].join('\n    ');
}

// ---------------------------------------------------------------------------
// Product pages are generated from products.json so the data has one home.
// ---------------------------------------------------------------------------
type P = (typeof catalog.products)[number];
type Img = { src: string; avif: boolean; alt: string; caption?: string };

/** Every still image a product has, in display order. Photos (from the
 *  owner's boards) win over 3D renders; a product with neither has none. */
function images(p: P): Img[] {
  const out: Img[] = [];
  if (p.photos) {
    const views = ((p as { views?: string[] }).views ?? ['front', 'back', 'angle']) as string[];
    const names: Record<string, string> = { front: 'front', back: 'back', angle: 'three-quarter' };
    for (const v of views)
      out.push({ src: `/photos/${p.handle}-${v}`, avif: true, alt: `${p.title}, ${names[v] ?? v} view` });
    for (const [key, caption] of p.gallery as [string, string][])
      out.push({
        src: `/photos/${p.handle}-detail-${key}`,
        avif: false,
        alt: `${p.title}: ${caption}`,
        caption,
      });
  } else if (p.model) {
    out.push({ src: `/renders/${p.handle}-front`, avif: true, alt: `${p.title}, front view, 3D render` });
    out.push({ src: `/renders/${p.handle}-back`, avif: true, alt: `${p.title}, back view, 3D render` });
  }
  return out;
}

const picture = (img: Img, attrs: string) =>
  `<picture>${img.avif ? `<source srcset="${img.src}.avif" type="image/avif">` : ''}<img src="${img.src}.webp" alt="${esc(img.alt)}" ${attrs}></picture>`;

/** Placeholder for a product whose imagery has not been supplied yet: the
 *  mark and the name, never a fake photo. */
const pending = (p: P) =>
  `<div class="pending" role="img" aria-label="${esc(p.title)}: images coming soon">${markSVG({ className: 'mark' })}<span>${esc(p.title)}</span><span class="pending__note">Images coming soon</span></div>`;

function productPage(p: P): string {
  const colorways = p.options.find((o) => o.name === 'Colorway')!.values;
  const sizes = p.options.find((o) => o.name === 'Size')!.values;
  const cw = p.colorways as unknown as Record<string, { garment: string; note: string }>;
  const radios = (name: string, values: string[], swatch = false) =>
    values
      .map(
        (v, i) =>
          `<label class="opt${swatch ? ' opt--swatch' : ''}"><input type="radio" name="${name}" value="${esc(v)}"${
            i === 0 && (swatch || values.length === 1) ? ' checked' : ''
          }${swatch ? ` data-color="${cw[v]?.garment ?? ''}"` : ''}><span>${
            swatch ? `<i style="--sw:${cw[v]?.garment ?? '#333'}" aria-hidden="true"></i>` : ''
          }${esc(v)}</span></label>`,
      )
      .join('');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <!--@head ${JSON.stringify({ title: p.title, description: p.summary, path: `/product/${p.handle}/`, image: p.photos || p.model ? `/og/${p.handle}.jpg` : '/og/og-default.jpg', type: 'product' })}-->
    <!--@product-jsonld ${p.handle}-->
  </head>
  <body class="page page--product" data-handle="${p.handle}">
    <!--@header-->
    <main id="main" class="product">
      <nav class="crumbs wrap" aria-label="Breadcrumb"><a href="/shop/">Drop 001</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.title)}</span></nav>
      <div class="product__grid wrap">
        <section class="product__view" aria-label="${esc(p.title)} images">
          <div class="viewer" data-viewer data-model="${p.model ?? ''}">
            ${(() => {
              const imgs = images(p);
              return imgs.length
                ? `<div class="viewer__poster" data-main>${picture(imgs[0], 'width="960" height="1200" fetchpriority="high"')}</div>`
                : pending(p);
            })()}
          </div>
          <div class="viewer__views" role="group" aria-label="3D view" hidden data-3d-views>
            <button type="button" data-view="front" aria-pressed="true">Front</button>
            <button type="button" data-view="back" aria-pressed="false">Back</button>
            <button type="button" data-view="detail" aria-pressed="false">Detail</button>
          </div>
          ${(() => {
            const imgs = images(p);
            if (imgs.length < 2 && !p.model) return '';
            const thumbs = imgs
              .map(
                (img, i) =>
                  `<li><button type="button" class="thumb" data-thumb="${img.src}" data-avif="${img.avif}" data-alt="${esc(img.alt)}" aria-pressed="${i === 0}" aria-label="Show ${esc(img.caption ?? img.alt)}">${picture(img, 'width="160" height="200" loading="lazy"')}</button></li>`,
              )
              .join('');
            const three = p.model
              ? `<li><button type="button" class="thumb thumb--3d" data-thumb-3d aria-pressed="false" aria-label="Turn it in 3D"><span>3D</span></button></li>`
              : '';
            return `<ul class="thumbs" aria-label="Images">${thumbs}${three}</ul>`;
          })()}
        </section>
        <section class="product__info" aria-labelledby="product-title">
          <p class="label">${esc(p.role)} · ${esc(p.edition)}</p>
          <h1 id="product-title" class="product__title">${esc(p.title)}</h1>
          <p class="product__price"><span data-price>${p.price == null ? 'Price at release' : '$' + p.price}</span> <span class="tag">${p.status === 'coming-soon' ? 'Coming soon' : 'Available'}</span></p>
          <p class="product__desc">${esc(p.description)}</p>
          <form class="buy" data-buy novalidate>
            <fieldset><legend>Colorway <output data-colorway-note></output></legend><div class="opts">${radios('colorway', colorways, true)}</div></fieldset>
            <fieldset><legend>Size</legend><div class="opts">${radios('size', sizes)}</div></fieldset>
            <p class="buy__msg" role="status" aria-live="polite" data-buy-msg></p>
            <div class="buy__actions">
              <button class="btn btn--solid" type="submit">Add to bag</button>
              <a class="btn btn--line" href="/#access">Notify me</a>
            </div>
            <p class="fine">Drop 001 is in development. Checkout opens at release, and nothing is charged before then.</p>
          </form>
          <section class="specs" aria-labelledby="specs-h">
            <h2 id="specs-h" class="label">Construction</h2>
            <ul>${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
          </section>
          <section class="specs" aria-labelledby="cw-h">
            <h2 id="cw-h" class="label">Colorways</h2>
            <ul>${colorways.map((c) => `<li><strong>${esc(c)}.</strong> ${esc(cw[c]?.note ?? '')}</li>`).join('')}</ul>
          </section>
        </section>
      </div>
    </main>
    <!--@footer-->
    <script type="module" src="/src/pages/product.ts"></script>
  </body>
</html>
`;
}

/** Product card, shared by the homepage drop and /shop/. Static, so it reads
 *  and shops without JavaScript; scripts only add the bag behaviour. */
function card(p: P, i: number): string {
  const colorways = p.options.find((o) => o.name === 'Colorway')!.values;
  const sizes = p.options.find((o) => o.name === 'Size')!.values;
  const cw = p.colorways as unknown as Record<string, { garment: string }>;
  const id = `c-${p.handle}`;
  return `<article class="card" aria-labelledby="${id}-t">
  <a class="card__media" href="/product/${p.handle}/" tabindex="-1" aria-hidden="true">
    ${(() => {
      const img = images(p)[0];
      return img
        ? picture({ ...img, alt: '' }, `width="960" height="1200" loading="${i === 0 ? 'eager' : 'lazy'}"`)
        : pending(p);
    })()}
  </a>
  <div class="card__head">
    <h3 class="card__title" id="${id}-t"><a href="/product/${p.handle}/">${esc(p.title)}</a></h3>
    <p class="card__price">${p.price == null ? 'Price at release' : '$' + p.price}</p>
  </div>
  <p class="fine">${esc(p.summary)}</p>
  <dl class="card__facts">
    <dt>Status</dt><dd><span class="tag">${p.status === 'coming-soon' ? 'Coming soon' : 'Available'}</span></dd>
    <dt>Colorways</dt><dd><span class="swatches">${colorways.map((c) => `<i style="--sw:${cw[c]?.garment}" title="${esc(c)}"></i>`).join('')}</span> ${colorways.map(esc).join(', ')}</dd>
    <dt>Sizes</dt><dd>${sizes.length > 1 ? `${sizes[0]} to ${sizes[sizes.length - 1]}` : esc(sizes[0])}</dd>
    <dt>Detail</dt><dd>${esc(p.details[0])}</dd>
  </dl>
  <form class="card__actions" data-card-buy data-handle="${p.handle}" data-colorway="${esc(colorways[0])}">
    ${
      sizes.length > 1
        ? `<label class="visually-hidden" for="${id}-s">Size for ${esc(p.title)}</label><select id="${id}-s" name="size" class="select"><option value="">Size</option>${sizes.map((s) => `<option>${s}</option>`).join('')}</select>`
        : `<input type="hidden" name="size" value="${esc(sizes[0])}">`
    }
    <button class="btn btn--solid" type="submit">Add to bag</button>
    <a class="btn btn--line" href="/#access">Notify me</a>
    <p class="card__msg fine" role="status" aria-live="polite"></p>
  </form>
</article>`;
}

function generateProductPages() {
  for (const p of catalog.products as P[]) {
    const dir = path.join(ROOT, 'product', p.handle);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'index.html');
    const html = productPage(p);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) fs.writeFileSync(file, html);
  }
}

function pages(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        [
          'node_modules',
          'dist',
          'public',
          'src',
          'lab',
          'docs',
          '.wrangler',
          'scripts',
          'worker',
          'tests',
        ].includes(e.name)
      )
        continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.html')) out[path.relative(ROOT, full).replace(/\.html$/, '')] = full;
    }
  };
  walk(ROOT);
  return out;
}

function brandSite(origin: string, env: Record<string, string>): Plugin {
  const partial = (name: string) => fs.readFileSync(path.join(ROOT, 'src/partials', `${name}.html`), 'utf8');
  const social = [
    ['Instagram', env.VITE_SOCIAL_INSTAGRAM],
    ['TikTok', env.VITE_SOCIAL_TIKTOK],
    ['X', env.VITE_SOCIAL_X],
  ].filter(([, href]) => href);
  return {
    name: 'just-hit-a-liq:site',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace(/<!--@head (\{.*?\})-->/, (_, json) => head(JSON.parse(json), origin))
          .replace(/<!--@product-jsonld ([\w-]+)-->/, (_, handle) => {
            const p = catalog.products.find((x) => x.handle === handle)!;
            // Product structured data without an Offer: there is no price or
            // availability to state truthfully yet. Add an Offer when there is.
            const ld = {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: p.title,
              description: p.description,
              brand: { '@type': 'Brand', name: BRAND },
              image: images(p)
                .slice(0, 3)
                .map((img) => `${origin}${img.src}.webp`),
              url: `${origin}/product/${p.handle}/`,
            };
            return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
          })
          .replace('<!--@header-->', partial('header'))
          .replace('<!--@footer-->', partial('footer'))
          .replace(/<!--@mark-->/g, markSVG({ className: 'mark', title: BRAND }))
          .replace(/<!--@mark-plain-->/g, markSVG({ className: 'mark' }))
          .replace(/<section[^>]*foot__social[^>]*>[\s\S]*?<!--@social-->[\s\S]*?<\/section>/, (block) =>
            social.length
              ? block.replace(
                  '<!--@social-->',
                  social
                    .map(([n, h]) => `<li><a href="${h}" rel="me noopener" target="_blank">${n}</a></li>`)
                    .join(''),
                )
              : '',
          )
          .replace('<!--@year-->', String(new Date().getFullYear()))
          .replace(
            '<!--@care-email-->',
            env.VITE_CARE_EMAIL
              ? `Write to <a href="mailto:${env.VITE_CARE_EMAIL}">${env.VITE_CARE_EMAIL}</a>. We reply within two business days.`
              : 'A customer care address is published before release. Until then, <a href="/#access">request release access</a> and we will be in touch.',
          )
          .replace(
            '<!--@loader-->',
            strikeIconSVG('#e8e3d7', '#3a63f2').replace(
              '<svg ',
              '<svg class="loader__mark" aria-hidden="true" ',
            ),
          )
          .replace(
            '<!--@cards:home-->',
            ['signature-hoodie', 'technical-zip-hoodie', 'heavyweight-tee']
              .map((h, i) =>
                card(
                  catalog.products.find((p) => p.handle === h)!,
                  i,
                ),
              )
              .join(''),
          )
          .replace('<!--@cards-->', catalog.products.map(card).join(''));
      },
    },
    generateBundle() {
      const indexable = Object.keys(pages())
        .filter((p) => p !== '404' && !p.startsWith('bag'))
        .map((p) => '/' + p.replace(/(^|\/)index$/, '$1'))
        .sort();
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          indexable.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n') +
          `\n</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /bag/\n\nSitemap: ${origin}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'favicon.svg',
        source: strikeIconSVG('#E8E3D7', '#3A63F2', '#0B0B0D'),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'brand/liq-mark.svg',
        source: markSVG({ ink: '#E8E3D7', level: '#3A63F2', title: BRAND }),
      });
    },
    configureServer(server) {
      server.middlewares.use('/favicon.svg', (_req, res) => {
        res.setHeader('content-type', 'image/svg+xml');
        res.end(strikeIconSVG('#E8E3D7', '#3A63F2', '#0B0B0D'));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ROOT, 'VITE_');
  const origin = (env.VITE_SITE_ORIGIN || 'https://justhitaliq.com').replace(/\/$/, '');
  generateProductPages();
  return {
    appType: 'mpa',
    plugins: [brandSite(origin, env)],
    build: {
      target: 'es2022',
      sourcemap: false,
      rollupOptions: { input: pages() },
      chunkSizeWarningLimit: 800,
    },
    test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  };
});
