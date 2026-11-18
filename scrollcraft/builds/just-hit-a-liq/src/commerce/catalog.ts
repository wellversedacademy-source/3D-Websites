// Product data layer. The rest of the site only talks to these functions, so
// the source can move from the local JSON to Shopify (see provider.ts) without
// any page code changing.

import data from '../data/products.json';

export type Colorway = { garment: string; print: string; micro: string; note: string };
export type ProductStatus = 'available' | 'coming-soon' | 'sold-out';
export type Product = {
  handle: string;
  title: string;
  role: string;
  status: ProductStatus;
  /** Price in the store currency, or null when not yet set. Never guess one. */
  price: number | null;
  model: string;
  summary: string;
  description: string;
  details: string[];
  edition: string;
  options: { name: string; values: string[] }[];
  colorways: Record<string, Colorway>;
};

export const CURRENCY = 'USD';
export const collection = data.collection;
export const laterInDrop: string[] = data.later;
export const products: Product[] = data.products as Product[];

export function getProduct(handle: string): Product | undefined {
  return products.find((p) => p.handle === handle);
}

export function optionValues(p: Product, name: string): string[] {
  return p.options.find((o) => o.name === name)?.values ?? [];
}

/** Stable variant id, same shape the Shopify adapter will map onto. */
export function variantId(handle: string, colorway: string, size: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${handle}--${slug(colorway)}--${slug(size)}`;
}

export function parseVariantId(id: string): { handle: string; colorway: string; size: string } | null {
  const [handle, c, s] = id.split('--');
  const p = handle ? getProduct(handle) : undefined;
  if (!p || !c || !s) return null;
  const colorway = optionValues(p, 'Colorway').find((v) => variantId(handle, v, 'x').split('--')[1] === c);
  const size = optionValues(p, 'Size').find((v) => variantId(handle, 'x', v).split('--')[2] === s);
  return colorway && size ? { handle, colorway, size } : null;
}

export function priceLabel(p: Product): string {
  if (p.price == null) return p.status === 'coming-soon' ? 'Price at release' : 'Price on request';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(p.price);
}

export function statusLabel(p: Product): string {
  return { available: 'Available', 'coming-soon': 'Coming soon', 'sold-out': 'Sold out' }[p.status];
}
