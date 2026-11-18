import { describe, expect, it } from 'vitest';
import { Bag, MAX_QTY, type Storage } from '../src/commerce/cart';
import { variantId, parseVariantId, products, priceLabel, getProduct } from '../src/commerce/catalog';

const memory = (): Storage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('catalog', () => {
  it('round-trips every variant id', () => {
    for (const p of products)
      for (const c of p.options.find((o) => o.name === 'Colorway')!.values)
        for (const s of p.options.find((o) => o.name === 'Size')!.values)
          expect(parseVariantId(variantId(p.handle, c, s))).toEqual({
            handle: p.handle,
            colorway: c,
            size: s,
          });
  });
  it('rejects unknown variants', () => {
    expect(parseVariantId('signature-hoodie--neon--m')).toBeNull();
    expect(parseVariantId('nope--washed-black--m')).toBeNull();
  });
  it('never shows a price that has not been set', () => {
    for (const p of products) if (p.price == null) expect(priceLabel(p)).toBe('Price at release');
  });
  it('has a colour definition for every colorway option', () => {
    for (const p of products)
      for (const c of p.options.find((o) => o.name === 'Colorway')!.values)
        expect(p.colorways[c]).toBeDefined();
  });
  it('finds products by handle', () => {
    expect(getProduct('signature-hoodie')?.title).toBe('Signature Hoodie');
  });
});

describe('bag', () => {
  const id = variantId('signature-hoodie', 'Washed Black', 'M');
  it('adds, merges and caps quantities', () => {
    const b = new Bag(memory());
    b.add(id);
    b.add(id, 2);
    expect(b.count()).toBe(3);
    b.add(id, 10);
    expect(b.all()[0].quantity).toBe(MAX_QTY);
  });
  it('persists and reloads', () => {
    const s = memory();
    new Bag(s).add(id, 2);
    expect(new Bag(s).count()).toBe(2);
  });
  it('removes at zero', () => {
    const b = new Bag(memory());
    b.add(id);
    b.setQuantity(id, 0);
    expect(b.count()).toBe(0);
  });
  it('ignores corrupt or unknown stored lines', () => {
    const s = memory();
    s.setItem(
      'liq.bag.v1',
      JSON.stringify([{ variantId: 'fake--x--y', quantity: 1 }, { variantId: id, quantity: 2 }, 'junk']),
    );
    expect(new Bag(s).all()).toEqual([{ variantId: id, quantity: 2 }]);
    s.setItem('liq.bag.v1', '{not json');
    expect(new Bag(s).count()).toBe(0);
  });
  it('throws on an unknown variant instead of adding it', () => {
    expect(() => new Bag(memory()).add('ghost--black--m')).toThrow();
  });
  it('notifies subscribers', () => {
    const b = new Bag(memory());
    let seen = -1;
    b.subscribe((l) => (seen = l.length));
    b.add(id);
    expect(seen).toBe(1);
  });
});
