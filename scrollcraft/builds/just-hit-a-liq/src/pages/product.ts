import '../main';
import { bag } from '../commerce/cart';
import { getProduct, variantId } from '../commerce/catalog';
import { openDrawer } from '../main';
import type { Viewer } from '../three/viewer';

const handle = document.body.dataset.handle!;
const product = getProduct(handle)!;
const capture = new URLSearchParams(location.search).get('capture');
if (capture) document.documentElement.classList.add('is-capture');
if (capture) document.querySelector('[data-viewer]')?.classList.add('viewer--capture');

const form = document.querySelector<HTMLFormElement>('[data-buy]')!;
const msg = form.querySelector<HTMLElement>('[data-buy-msg]')!;
const note = form.querySelector<HTMLElement>('[data-colorway-note]')!;
const viewerEl = document.querySelector<HTMLElement>('[data-viewer]')!;
let viewer: Viewer | null = null;

const colorway = () => (form.elements.namedItem('colorway') as RadioNodeList).value;
const paintNote = () => (note.textContent = product.colorways[colorway()]?.note ?? '');
paintNote();

import('../three/viewer')
  .then(({ mountViewer }) => mountViewer(viewerEl, product.model, product.colorways[colorway()], { capture }))
  .then((v) => {
    viewer = v;
    if (capture) setTimeout(() => (document.title = 'captured'), 500);
    if (!v) document.querySelector('.viewer__views')?.setAttribute('hidden', '');
  });

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

document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    viewer?.setView(b.dataset.view as 'front' | 'back' | 'detail');
  }),
);
