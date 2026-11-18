# Deploying to Cloudflare and connecting JustHitALiq.com

Target: **Cloudflare Workers with static assets.** The built site in `dist/` is
served as static files; a small Worker answers only `/api/*`. This is
Cloudflare's current recommended way to host a static site with a little
server logic, and it works on the free plan.

**Nothing below has been run.** No deploy, DNS change or domain connection
happens until you approve it. Canonical host: `justhitaliq.com` (lowercase is
the same domain; the brand stays "Just hit a LiQ").

## A. One-time setup (about 10 minutes)

1. Cloudflare dashboard → confirm **justhitaliq.com** shows as an *Active* zone
   (domains bought through Cloudflare Registrar are added automatically).
2. In this folder:
   ```bash
   npm ci
   ```
   ```bash
   npx wrangler login
   ```
3. *(Optional, enables sign-ups)* create storage for release access:
   ```bash
   npx wrangler kv namespace create ACCESS_LIST
   ```
   Paste the printed `id` into `wrangler.jsonc` (uncomment `kv_namespaces`).

## B. First deploy, to a private preview address

```bash
npm run deploy
```

This builds, then uploads to `https://just-hit-a-liq.<your-subdomain>.workers.dev`.
Review it on desktop and on a real phone before going further.

## C. Connect the domain (DNS checklist)

Do these in order, in the Cloudflare dashboard:

1. **DNS → Records** for justhitaliq.com: delete any existing `A`, `AAAA` or
   `CNAME` record for `@` (apex) and `www` that points somewhere else
   (registrar parking records). Leave `MX`/`TXT` records alone.
2. **Workers & Pages → just-hit-a-liq → Settings → Domains & Routes → Add →
   Custom domain** → `justhitaliq.com`. Cloudflare creates the DNS record and
   the TLS certificate itself. Wait for status *Active* (usually minutes).
3. Redirect `www` to the apex:
   - DNS → Add record: type `AAAA`, name `www`, IPv6 `100::`, **Proxied** (orange cloud).
   - **Rules → Redirect Rules → Create from template → "Redirect from WWW to
     root"**, status 301, preserve query string.
4. **SSL/TLS → Overview:** mode *Full (strict)*. **SSL/TLS → Edge
   Certificates:** turn on *Always Use HTTPS* and *Automatic HTTPS Rewrites*.
5. Leave HSTS *preload* off until the site has run cleanly for a few weeks (the
   site already sends a 1-year HSTS header from `public/_headers`).
6. Optional: instead of the dashboard step 2, uncomment `routes` in
   `wrangler.jsonc` and run `npm run deploy` again; same result.

### Verify

```bash
curl -sI https://justhitaliq.com/ | head -5
```
```bash
curl -sI https://www.justhitaliq.com/ | grep -i location
```

Expect `200` for the apex and a `301` to `https://justhitaliq.com/` for `www`.
Then open the site, scroll the homepage, add to bag, open a product, and submit
release access once (it should say *not open yet* unless KV is bound).

## D. Search and sharing

- Submit `https://justhitaliq.com/sitemap.xml` in Google Search Console (verify
  with a DNS `TXT` record in Cloudflare).
- Test a share preview with a link debugger; images are at `/og/*.jpg`.

## E. Rollback

**Workers & Pages → just-hit-a-liq → Deployments →** pick an earlier version →
*Rollback*. To take the domain offline entirely, remove the custom domain.

## Environment variables

Build-time values (see `.env.example`) are read by Vite when `npm run build`
runs on your machine. None are secret except, by convention, the Shopify
Storefront token. Never commit `.env`. No secrets are stored in this repository.
