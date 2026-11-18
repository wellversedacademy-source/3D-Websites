# Commerce: current state and the path to live checkout

The brand conversation did not choose a commerce platform. So the site has a
clean product-data layer that is ready for **Shopify Storefront API (headless)**
or another approved system, and **no checkout exists**. Nothing on the site
takes payment, reserves stock or creates an order, and the interface says so.

## What works today

- **Products** live in `src/data/products.json`, shaped like Shopify products
  (handle, options named `Colorway` and `Size`, variants derived from them).
  Pages, cards, sitemap and structured data are all generated from this file.
- **Bag** (`src/commerce/cart.ts`): add, change quantity (max 5), remove; saved
  in the visitor's browser; stays in step across open tabs. Tested in
  `tests/cart.test.ts`.
- **Checkout button** is disabled with the reason shown. **Notify me** goes to
  release access.
- **Prices** are `null` and display as "Price at release". The conversation's
  price ladder ($275 to $395 for the hoodie, etc.) is a planning target, and the
  launch plan is on HOLD pending budget, clearance and samples.
- **Structured data:** each product page emits `schema.org/Product` without an
  `Offer`, because there is no price or availability to state truthfully. Add
  the Offer when there is.

## Before commerce can go live

1. **Decide the platform.** Recommended: Shopify (Basic is enough) with this
   site as a headless storefront. Shopify then handles payments, tax (including
   Connecticut sales tax once registered), inventory, fulfilment and order
   email.
2. Create the three products in Shopify with the **same handles** and option
   names. Set real prices only when approved.
3. Create a **Storefront API token** (Headless sales channel). Put
   `VITE_SHOPIFY_STORE_DOMAIN` and `VITE_SHOPIFY_STOREFRONT_TOKEN` in the
   Cloudflare build environment (see `.env.example`).
4. Implement `ShopifyProvider.checkoutUrl()` in `src/commerce/provider.ts` with
   the `cartCreate` mutation: map each local `variantId` to the Shopify variant
   whose `selectedOptions` match, then redirect to the returned `checkoutUrl`.
   Flip `checkoutAvailable` to `true` only after a real test order.
5. Set `price` (and `status: "available"`) per product, or fetch them live.
6. Add the `Offer` to product JSON-LD in `vite.config.ts`.
7. Publish real shipping, returns, privacy and terms (the current pages are
   marked as drafts).

## Release-access sign-ups

`POST /api/access` (in `worker/index.ts`) validates email, optional phone with
explicit SMS consent, and interests. It **stores nothing** until a Cloudflare
KV namespace is bound as `ACCESS_LIST`; until then it answers "not open yet"
and the page says nothing was saved. When bound, entries are keyed by a hash
of the email and include the visitor's strike time.

No paid email or SMS service is connected. When one is approved (Klaviyo,
Shopify Email, Postscript…), either export from KV or replace the KV write in
`handleAccess` with the provider's API call. SMS needs the provider's own
compliance setup (opt-in language, STOP handling, A2P registration in the US).
