// Commerce provider seam.
//
// TODAY: no provider is connected. The site reads products from local JSON and
// keeps the bag on the device. Checkout is unavailable, and the UI says so.
//
// TO GO LIVE WITH SHOPIFY (recommended headless route, see docs/COMMERCE.md):
//   1. Create the products in Shopify with the same handles as products.json
//      and options named exactly "Colorway" and "Size".
//   2. Create a Storefront API access token (Headless channel).
//   3. Set VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN at build
//      time (the Storefront token is designed to be public).
//   4. Implement ShopifyProvider.checkoutUrl() with the cartCreate mutation,
//      mapping each local variantId to the Shopify variant whose
//      selectedOptions match, then redirect to the returned checkoutUrl.
//
// Nothing in this file may pretend a checkout exists when it does not.

import type { Line } from './cart';

export interface CommerceProvider {
  readonly name: string;
  readonly checkoutAvailable: boolean;
  /** Reason shown to the visitor when checkout is unavailable. */
  readonly unavailableReason: string;
  checkoutUrl(lines: Line[]): Promise<string>;
}

class LocalProvider implements CommerceProvider {
  readonly name = 'local';
  readonly checkoutAvailable = false;
  readonly unavailableReason = 'Checkout opens with the Drop 001 release. Your bag is saved on this device.';
  async checkoutUrl(): Promise<string> {
    throw new Error('No commerce provider is connected.');
  }
}

class ShopifyProvider implements CommerceProvider {
  readonly name = 'shopify';
  readonly checkoutAvailable = false; // flip to true once checkoutUrl is implemented and tested
  readonly unavailableReason = 'Checkout is being connected.';
  constructor(
    readonly domain: string,
    readonly token: string,
  ) {}
  async checkoutUrl(): Promise<string> {
    throw new Error('ShopifyProvider.checkoutUrl is not implemented yet. See docs/COMMERCE.md.');
  }
}

export function provider(): CommerceProvider {
  const domain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN as string | undefined;
  const token = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined;
  return domain && token ? new ShopifyProvider(domain, token) : new LocalProvider();
}
