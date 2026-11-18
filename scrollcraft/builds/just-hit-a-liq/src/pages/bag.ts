import '../main';
import { bag } from '../commerce/cart';
import { provider } from '../commerce/provider';
import { bindLines, renderLines } from '../main';

const list = document.querySelector<HTMLElement>('[data-bag-page]')!;
const count = document.querySelector<HTMLElement>('[data-bag-summary]')!;
const checkout = document.querySelector<HTMLButtonElement>('[data-checkout]')!;
const reason = document.querySelector<HTMLElement>('[data-checkout-reason]')!;
const p = provider();

const paint = () => {
  const lines = bag().all();
  list.innerHTML = renderLines(lines);
  const n = bag().count();
  count.textContent = n
    ? `${n} item${n === 1 ? '' : 's'} reserved on this device.`
    : 'Nothing in your bag yet.';
  checkout.disabled = !p.checkoutAvailable || !n;
};
reason.textContent = p.unavailableReason;
bindLines(list);
bag().subscribe(paint);
paint();

checkout.addEventListener('click', async () => {
  if (!p.checkoutAvailable) return;
  location.href = await p.checkoutUrl(bag().all());
});
