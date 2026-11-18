// Release-access form. Posts to the Worker endpoint (worker/index.ts). Shows
// only what actually happened: saved, not open yet, or what to fix.

type Result = { ok: boolean; field?: string; message?: string };

export function bindAccess(form: HTMLFormElement): void {
  const result = form.querySelector<HTMLElement>('[data-access-result]')!;
  const errs = new Map<string, HTMLElement>();
  form.querySelectorAll<HTMLElement>('[data-err]').forEach((el) => errs.set(el.dataset.err!, el));

  // Message from a no-JavaScript post that redirected back here.
  const flag = new URLSearchParams(location.search).get('access');
  if (flag) {
    result.textContent =
      flag === 'ok'
        ? 'You are on the list.'
        : flag === 'closed'
          ? 'Release access is not open yet. Nothing was saved.'
          : 'Something in the form needs fixing. Please try again.';
  }

  const clear = () => {
    errs.forEach((el) => (el.textContent = ''));
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  };
  const fail = (field: string | undefined, message: string) => {
    const el = field ? errs.get(field) : undefined;
    if (el) el.textContent = message;
    const input = field ? form.querySelector<HTMLElement>(`[name="${field}"]`) : null;
    input?.setAttribute('aria-invalid', 'true');
    input?.focus();
    result.textContent = message;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear();
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('email', 'Enter a valid email address.');
    const phone = String(data.get('phone') ?? '').trim();
    if (phone && !data.get('smsConsent'))
      return fail('smsConsent', 'Tick the text-message consent box, or remove the phone number.');
    if (!data.getAll('interests').length)
      return fail('interests', 'Choose at least one thing to hear about.');

    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    button.disabled = true;
    result.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          phone,
          smsConsent: Boolean(data.get('smsConsent')),
          interests: data.getAll('interests'),
          strike: data.get('strike') || null,
          company: data.get('company') || '',
        }),
      });
      const body = (await res.json().catch(() => null)) as Result | null;
      if (res.ok && body?.ok) {
        result.textContent = body.message ?? 'You are on the list.';
        form.reset();
      } else if (body?.field) fail(body.field, body.message ?? 'Please check this field.');
      else
        result.textContent =
          body?.message ?? 'Release access is not open yet. Nothing was saved. Please check back soon.';
    } catch {
      result.textContent = 'Could not reach the server. Nothing was saved. Please try again later.';
    } finally {
      button.disabled = false;
    }
  });
}
