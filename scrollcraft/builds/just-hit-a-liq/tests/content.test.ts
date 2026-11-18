// Guards on the copy and the brand rules from the brief.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = [
  'index.html',
  'shop/index.html',
  'bag/index.html',
  'care/index.html',
  '404.html',
  'legal/privacy/index.html',
  'legal/terms/index.html',
  'legal/shipping-returns/index.html',
  'src/partials/header.html',
  'src/partials/footer.html',
];
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

describe('copy rules', () => {
  it('uses no em dashes in visible copy or data', () => {
    for (const f of [...html, 'src/data/products.json']) expect(read(f), f).not.toMatch(/—/);
  });
  it('spells the brand canonically', () => {
    for (const f of html)
      expect(read(f), f).not.toMatch(/Just Hit A Liq|JustHitALiQ|just hit a liq(?!\.com)/);
  });
  it('states no invented prices', () => {
    const data = JSON.parse(read('src/data/products.json'));
    for (const p of data.products) expect(p.price).toBeNull();
  });
});
