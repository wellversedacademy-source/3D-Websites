// Cloudflare Worker: serves the static site and owns one endpoint,
// POST /api/access (release-access sign-up).
//
// Integration point. No paid email or SMS service is connected. If a KV
// namespace is bound as ACCESS_LIST (see wrangler.jsonc), sign-ups are stored
// there for export into whichever provider is approved later (Klaviyo,
// Shopify Email, Postscript, etc.). Without the binding the endpoint answers
// 503 and the page tells the visitor sign-up is not open yet. It never claims
// success it did not achieve.

export interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
  ACCESS_LIST?: {
    put(key: string, value: string, opts?: { metadata?: unknown }): Promise<void>;
    get(key: string): Promise<string | null>;
  };
}

export const INTERESTS = ['drops', 'early-access', 'restocks', 'updates'] as const;
export type Interest = (typeof INTERESTS)[number];

export type AccessRequest = {
  email: string;
  phone: string | null;
  smsConsent: boolean;
  interests: Interest[];
  strike: string | null;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export function validate(
  input: Record<string, unknown>,
): { ok: true; value: AccessRequest } | { ok: false; field: string; message: string } {
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, field: 'email', message: 'Enter a valid email address.' };

  const rawPhone = String(input.phone ?? '').trim();
  const digits = rawPhone.replace(/[^\d+]/g, '');
  const phone = rawPhone ? digits : null;
  if (phone && !/^\+?\d{10,15}$/.test(phone))
    return {
      ok: false,
      field: 'phone',
      message: 'Enter a phone number with country code, or leave it empty.',
    };

  const smsConsent = input.smsConsent === true || input.smsConsent === 'on' || input.smsConsent === 'true';
  if (phone && !smsConsent)
    return {
      ok: false,
      field: 'smsConsent',
      message: 'Tick the text-message consent box, or remove the phone number.',
    };

  const raw = Array.isArray(input.interests) ? input.interests : input.interests ? [input.interests] : [];
  const interests = raw
    .map(String)
    .filter((i): i is Interest => (INTERESTS as readonly string[]).includes(i));
  if (!interests.length)
    return { ok: false, field: 'interests', message: 'Choose at least one thing to hear about.' };

  const strike =
    typeof input.strike === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(input.strike) ? input.strike : null;
  return { ok: true, value: { email, phone, smsConsent: Boolean(phone && smsConsent), interests, strike } };
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return (await req.json()) as Record<string, unknown>;
  const form = await req.formData();
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    const all = form.getAll(key).map(String);
    out[key] = key === 'interests' ? all : all[0];
  }
  return out;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handleAccess(req: Request, env: Env): Promise<Response> {
  const wantsJson = (req.headers.get('accept') ?? '').includes('application/json');
  const reply = (status: number, body: Record<string, unknown>) => {
    if (wantsJson) return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
    // No-JS form post: send the visitor back to the form with a result flag,
    // never with their personal data in the URL.
    const result = status === 200 ? 'ok' : status === 503 ? 'closed' : 'invalid';
    return Response.redirect(new URL(`/?access=${result}#access`, req.url).toString(), 303);
  };

  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch {
    return reply(400, { ok: false, message: 'The request could not be read.' });
  }
  // Honeypot: real visitors never fill this.
  if (body.company) return reply(200, { ok: true });

  const result = validate(body);
  if (!result.ok) return reply(422, { ok: false, field: result.field, message: result.message });

  if (!env.ACCESS_LIST) {
    return reply(503, {
      ok: false,
      message: 'Release access is not open yet. Nothing was saved. Please check back soon.',
    });
  }
  const key = `access:${await sha256(result.value.email)}`;
  await env.ACCESS_LIST.put(key, JSON.stringify({ ...result.value, at: new Date().toISOString() }));
  return reply(200, {
    ok: true,
    message: 'You are on the list. We will only write when there is something to say.',
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/access') return handleAccess(req, env);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(req);
  },
};
