// Shared by every page: fonts, chrome, the bag drawer.
import '@fontsource/bodoni-moda/400.css';
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/400-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/site.css';

import { bag, MAX_QTY, type Line } from './commerce/cart';
import { getProduct, parseVariantId, priceLabel } from './commerce/catalog';
import { provider } from './commerce/provider';

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel as string) as T | null;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Markup for bag lines, shared by the drawer and /bag/. */
export function renderLines(lines: Line[]): string {
  if (!lines.length) return `<p class="empty">Your bag is empty. <a href="/shop/">See Drop 001</a>.</p>`;
  return `<ul class="lines">${lines
    .map((l) => {
      const v = parseVariantId(l.variantId)!;
      const p = getProduct(v.handle)!;
      return `<li class="line" data-line="${esc(l.variantId)}">
        <img src="/renders/${p.handle}-card.webp" width="300" height="375" alt="" loading="lazy">
        <div>
          <p class="line__title"><a href="/product/${p.handle}/">${esc(p.title)}</a></p>
          <p class="line__meta">${esc(v.colorway)} · ${esc(v.size)} · ${esc(priceLabel(p))}</p>
          <div class="qty" role="group" aria-label="Quantity for ${esc(p.title)}">
            <button type="button" data-dec aria-label="Decrease quantity">−</button>
            <output aria-live="polite">${l.quantity}</output>
            <button type="button" data-inc aria-label="Increase quantity"${l.quantity >= MAX_QTY ? ' disabled' : ''}>+</button>
          </div>
          <button type="button" class="line__remove" data-remove>Remove</button>
        </div>
      </li>`;
    })
    .join('')}</ul>`;
}

/** Wire quantity and remove buttons inside a container of rendered lines. */
export function bindLines(root: HTMLElement): void {
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    const li = btn?.closest<HTMLElement>('[data-line]');
    if (!btn || !li) return;
    const id = li.dataset.line!;
    const line = bag()
      .all()
      .find((l) => l.variantId === id);
    if (!line) return;
    if (btn.hasAttribute('data-inc')) bag().setQuantity(id, line.quantity + 1);
    if (btn.hasAttribute('data-dec')) bag().setQuantity(id, line.quantity - 1);
    if (btn.hasAttribute('data-remove')) bag().remove(id);
    // Keep focus somewhere sensible after the list re-renders.
    requestAnimationFrame(() => {
      const again = root.querySelector<HTMLElement>(
        `[data-line="${CSS.escape(id)}"] [data-${btn.hasAttribute('data-inc') ? 'inc' : 'dec'}]`,
      );
      (again ?? root.querySelector<HTMLElement>('a, button'))?.focus();
    });
  });
}

function chrome() {
  const bar = $('[data-bar]');
  const menu = $<HTMLButtonElement>('[data-menu]');
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    bar?.toggleAttribute('data-open', open);
  });
  $$('#primary-nav a').forEach((a) =>
    a.addEventListener('click', () => {
      menu?.setAttribute('aria-expanded', 'false');
      bar?.removeAttribute('data-open');
    }),
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bar?.hasAttribute('data-open')) {
      bar.removeAttribute('data-open');
      menu?.setAttribute('aria-expanded', 'false');
      menu?.focus();
    }
  });
  // Mark the current page in the nav.
  $$<HTMLAnchorElement>('.bar__nav a').forEach((a) => {
    if (a.pathname === location.pathname && !a.hash) a.setAttribute('aria-current', 'page');
  });

  // Bag count + drawer.
  const count = $('[data-bag-count]');
  const openers = $$<HTMLAnchorElement>('[data-bag-open]');
  const drawer = $<HTMLDialogElement>('[data-bag-drawer]');
  const body = $('[data-bag-lines]');
  const note = $('[data-checkout-note]');
  if (note) note.textContent = provider().unavailableReason;
  const paint = (lines: Line[]) => {
    const n = lines.reduce((s, l) => s + l.quantity, 0);
    if (count) count.textContent = String(n);
    openers.forEach((o) => o.setAttribute('aria-label', `Bag, ${n} item${n === 1 ? '' : 's'}`));
    if (body && drawer?.open) body.innerHTML = renderLines(lines);
  };
  paint(bag().all());
  bag().subscribe(paint);
  if (body) bindLines(body);
  openers.forEach((o) =>
    o.addEventListener('click', (e) => {
      if (!drawer || location.pathname === '/bag/') return;
      e.preventDefault();
      openDrawer();
    }),
  );
  $('[data-bag-close]')?.addEventListener('click', () => drawer?.close());
  drawer?.addEventListener('click', (e) => {
    if (e.target === drawer) drawer.close(); // backdrop click
  });
}

export function openDrawer(): void {
  const drawer = $<HTMLDialogElement>('[data-bag-drawer]');
  const body = $('[data-bag-lines]');
  if (!drawer) return;
  if (body) body.innerHTML = renderLines(bag().all());
  drawer.showModal();
  $<HTMLElement>('[data-bag-close]')?.focus();
}

chrome();
