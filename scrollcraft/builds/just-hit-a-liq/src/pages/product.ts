import '../main';
import { bag } from '../commerce/cart';
import { getProduct, variantId } from '../commerce/catalog';
import { openDrawer } from '../main';
import type { Viewer } from '../three/viewer';

const handle = document.body.dataset.handle!;
const product = getProduct(handle)!;
const capture = new URLSearchParams(location.search).get('capture');

const form = document.querySelector<HTMLFormElement>('[data-buy]')!;
const msg = form.querySelector<HTMLElement>('[data-buy-msg]')!;
const note = form.querySelector<HTMLElement>('[data-colorway-note]')!;
const viewerEl = document.querySelector<HTMLElement>('[data-viewer]')!;
const views3d = document.querySelector<HTMLElement>('[data-3d-views]');
const thumbs = Array.from(document.querySelectorAll<HTMLButtonElement>('.thumb'));
let viewer: Viewer | null = null;
let loading3d: Promise<Viewer | null> | null = null;

const colorway = () => (form.elements.namedItem('colorway') as RadioNodeList).value;
const paintNote = () => (note.textContent = product.colorways[colorway()]?.note ?? '');
paintNote();

/** Load the 3D garment into the viewer box. Only on request (or for renders). */
function open3d(): Promise<Viewer | null> {
  if (!product.model) return Promise.resolve(null);
  loading3d ??= import('../three/viewer')
    .then(({ mountViewer }) =>
      mountViewer(viewerEl, product.model!, product.colorways[colorway()], { capture, eager: true }),
    )
    .then((v) => {
      viewer = v;
      if (!v) {
        thumbs.find((t) => t.hasAttribute('data-thumb-3d'))?.setAttribute('hidden', '');
        viewerEl.removeAttribute('data-3d');
      }
      return v;
    });
  return loading3d;
}

function show(btn: HTMLButtonElement) {
  thumbs.forEach((t) => t.setAttribute('aria-pressed', String(t === btn)));
  if (btn.hasAttribute('data-thumb-3d')) {
    viewerEl.setAttribute('data-3d', '');
    views3d?.removeAttribute('hidden');
    open3d();
    return;
  }
  viewerEl.removeAttribute('data-3d');
  views3d?.setAttribute('hidden', '');
  const main = viewerEl.querySelector('[data-main]');
  if (!main) return;
  const src = btn.dataset.thumb!;
  const avif = btn.dataset.avif === 'true';
  main.innerHTML = `<picture>${avif ? `<source srcset="${src}.avif" type="image/avif">` : ''}<img src="${src}.webp" alt="${btn.dataset.alt ?? ''}" width="960" height="1200"></picture>`;
}
thumbs.forEach((t) => t.addEventListener('click', () => show(t)));

// Render pipeline (scripts/render-posters.mjs): straight into 3D, full window.
if (capture) {
  document.documentElement.classList.add('is-capture');
  viewerEl.classList.add('viewer--capture');
  viewerEl.setAttribute('data-3d', '');
  open3d().then(() => setTimeout(() => (document.title = 'captured'), 500));
}

form.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.name === 'colorway') {
    paintNote();
    viewer?.setPalette(product.colorways[t.value]);
  }
  msg.textContent = '';
  msg.removeAttribute('data-tone');
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const size = (form.elements.namedItem('size') as RadioNodeList).value;
  if (!size) {
    msg.dataset.tone = 'error';
    msg.textContent = 'Choose a size first.';
    form.querySelector<HTMLInputElement>('input[name="size"]')?.focus();
    return;
  }
  bag().add(variantId(handle, colorway(), size));
  msg.removeAttribute('data-tone');
  msg.textContent = `${product.title}, ${colorway()}, ${size}, added to your bag.`;
  openDrawer();
});

document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    document
      .querySelectorAll('button[data-view]')
      .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    viewer?.setView(b.dataset.view as 'front' | 'back' | 'detail');
  }),
);
