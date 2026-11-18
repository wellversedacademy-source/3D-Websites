// Add-to-bag behaviour for the static product cards (homepage and /shop/).
import { bag } from '../commerce/cart';
import { getProduct, variantId } from '../commerce/catalog';
import { openDrawer } from '../main';

export function bindCards(root: ParentNode = document): void {
  root.querySelectorAll<HTMLFormElement>('[data-card-buy]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const handle = form.dataset.handle!;
      const p = getProduct(handle);
      const msg = form.querySelector<HTMLElement>('.card__msg');
      const size = (form.elements.namedItem('size') as HTMLInputElement | HTMLSelectElement | null)?.value;
      if (!p) return;
      if (!size) {
        if (msg) msg.textContent = 'Choose a size first.';
        form.querySelector<HTMLSelectElement>('select')?.focus();
        return;
      }
      bag().add(variantId(handle, form.dataset.colorway!, size));
      if (msg) msg.textContent = `${p.title}, ${size}, added to your bag.`;
      openDrawer();
    });
  });
}
