// PREVIEW Worker: serves the built site from a KV namespace instead of
// Workers static assets.
//
// Why it exists: the cloud workspace this site was built in replaces the
// Authorization header on every request to api.cloudflare.com with the
// stored API token. Workers static-asset uploads authenticate with a
// separate short-lived upload token in that same header, so they fail from
// there. KV writes use the API token directly, so they work. Production
// should still use the normal `npm run deploy` (worker/index.ts with
// assets); this file is only for previews pushed by scripts/deploy-preview.mjs.

import { handleAccess, type Env as SiteEnv } from './index';

type KV = {
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string): Promise<string | null>;
};
interface Env extends Omit<SiteEnv, 'ASSETS'> {
  SITE: KV;
}

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  xml: 'application/xml',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  mp4: 'video/mp4',
  avif: 'image/avif',
  ico: 'image/vnd.microsoft.icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  glb: 'model/gltf-binary',
};

const SECURITY: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'x-frame-options': 'DENY',
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  // A preview must never be indexed.
  'x-robots-tag': 'noindex, nofollow',
};

function cacheFor(path: string): string {
  if (path.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (/^\/(models|renders|photos|og)\//.test(path)) return 'public, max-age=3600';
  return 'no-cache';
}

async function file(env: Env, key: string): Promise<ArrayBuffer | null> {
  return env.SITE.get(key, 'arrayBuffer');
}

let redirects: [string, string, number][] | null = null;
async function redirectFor(env: Env, path: string): Promise<[string, number] | null> {
  if (!redirects) {
    const text = (await env.SITE.get('/_redirects')) ?? '';
    redirects = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split(/\s+/))
      .filter((p) => p.length >= 2)
      .map(([from, to, code]) => [from, to, Number(code) || 301]);
  }
  const hit = redirects.find(([from]) => from === path || from === path.replace(/\/$/, ''));
  return hit ? [hit[1], hit[2]] : null;
}

function respond(body: ArrayBuffer, path: string, status = 200): Response {
  const ext = path.split('.').pop() ?? '';
  return new Response(body, {
    status,
    headers: {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      'cache-control': cacheFor(path),
      ...SECURITY,
    },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === '/api/access')
      return handleAccess(req, {
        ...env,
        ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
      });
    if (path.startsWith('/api/')) return new Response('Not found', { status: 404 });
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return new Response('Method not allowed', { status: 405 });
    if (path.startsWith('/_')) return new Response('Not found', { status: 404 });

    const r = await redirectFor(env, path);
    if (r) return Response.redirect(new URL(r[0], url).toString(), r[1]);

    if (path.endsWith('/')) path += 'index.html';
    const body = await file(env, path);
    if (!body && !/\.[a-z0-9]+$/i.test(path)) {
      // Pretty URL without the trailing slash: redirect like the real site does.
      if (await file(env, `${path}/index.html`))
        return Response.redirect(new URL(`${url.pathname}/`, url).toString(), 307);
    }
    if (!body) {
      const notFound = await file(env, '/404.html');
      return notFound ? respond(notFound, '/404.html', 404) : new Response('Not found', { status: 404 });
    }
    return respond(body, path);
  },
};
