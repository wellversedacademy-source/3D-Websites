import { describe, expect, it } from 'vitest';
import worker, { handleAccess, validate, type Env } from '../worker/index';

const assets: Env['ASSETS'] = { fetch: async () => new Response('asset') };
const kv = () => {
  const data = new Map<string, string>();
  return {
    data,
    put: async (k: string, v: string) => void data.set(k, v),
    get: async (k: string) => data.get(k) ?? null,
  };
};
const post = (body: unknown, json = true) =>
  new Request('https://justhitaliq.com/api/access', {
    method: 'POST',
    headers: json ? { 'content-type': 'application/json', accept: 'application/json' } : {},
    body: json ? JSON.stringify(body) : (body as FormData),
  });

describe('validate', () => {
  it('accepts a minimal email sign-up', () => {
    const r = validate({ email: ' Person@Example.com ', interests: ['drops'] });
    expect(r.ok && r.value.email).toBe('person@example.com');
  });
  it('requires a valid email', () => {
    expect(validate({ email: 'nope', interests: ['drops'] })).toMatchObject({ ok: false, field: 'email' });
  });
  it('requires consent when a phone number is given', () => {
    expect(validate({ email: 'a@b.co', phone: '+12035550123', interests: ['drops'] })).toMatchObject({
      ok: false,
      field: 'smsConsent',
    });
    expect(
      validate({ email: 'a@b.co', phone: '+12035550123', smsConsent: true, interests: ['drops'] }).ok,
    ).toBe(true);
  });
  it('rejects malformed phone numbers', () => {
    expect(validate({ email: 'a@b.co', phone: '12', smsConsent: true, interests: ['drops'] })).toMatchObject({
      field: 'phone',
    });
  });
  it('requires at least one known interest', () => {
    expect(validate({ email: 'a@b.co', interests: ['spam'] })).toMatchObject({ field: 'interests' });
  });
});

describe('POST /api/access', () => {
  it('answers 503 and saves nothing when no storage is bound', async () => {
    const res = await handleAccess(post({ email: 'a@b.co', interests: ['drops'] }), { ASSETS: assets });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
  });
  it('stores a valid sign-up keyed by a hash, not the raw email', async () => {
    const store = kv();
    const res = await handleAccess(post({ email: 'a@b.co', interests: ['drops'], strike: '09:42:17' }), {
      ASSETS: assets,
      ACCESS_LIST: store,
    });
    expect(res.status).toBe(200);
    const [key, value] = [...store.data.entries()][0];
    expect(key).toMatch(/^access:[0-9a-f]{64}$/);
    expect(JSON.parse(value)).toMatchObject({ email: 'a@b.co', strike: '09:42:17' });
  });
  it('returns 422 with the field for invalid input', async () => {
    const res = await handleAccess(post({ email: 'x', interests: ['drops'] }), {
      ASSETS: assets,
      ACCESS_LIST: kv(),
    });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ field: 'email' });
  });
  it('redirects a no-JavaScript form post without personal data in the URL', async () => {
    const fd = new FormData();
    fd.set('email', 'a@b.co');
    fd.append('interests', 'drops');
    const res = await handleAccess(post(fd, false), { ASSETS: assets });
    expect(res.status).toBe(303);
    const loc = res.headers.get('location')!;
    expect(loc).toContain('access=closed');
    expect(loc).not.toContain('a@b.co');
  });
  it('silently accepts honeypot submissions without storing them', async () => {
    const store = kv();
    const res = await handleAccess(post({ email: 'a@b.co', interests: ['drops'], company: 'bot inc' }), {
      ASSETS: assets,
      ACCESS_LIST: store,
    });
    expect(res.status).toBe(200);
    expect(store.data.size).toBe(0);
  });
  it('routes other paths to static assets and rejects GET on the endpoint', async () => {
    expect(
      await (await worker.fetch(new Request('https://justhitaliq.com/shop/'), { ASSETS: assets })).text(),
    ).toBe('asset');
    expect(
      (await worker.fetch(new Request('https://justhitaliq.com/api/access'), { ASSETS: assets })).status,
    ).toBe(405);
  });
});
