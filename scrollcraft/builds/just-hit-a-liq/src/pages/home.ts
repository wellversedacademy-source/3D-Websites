// Homepage: the scroll narrative.
//
// One film on a fixed stage; the chapters scroll over it in normal document
// flow (no pinning), and scroll position is the film's playhead: the hoodie
// lights up, turns to show its back, then comes apart along its seams. The
// signature move is the strike: a price ladder on the right edge doubles as
// chapter navigation, the price falls as you descend, and when it crosses the
// cobalt liquidity level the line runs across the screen and onto the garment,
// stamped with the visitor's own time. That time returns on their edition tag
// in the access form.

import '../main';
import './home.css';
import { bindCards } from '../ui/cards';
import { bindAccess } from '../ui/access';

declare global {
  interface Window {
    ScrollCraft?: { mount(root: Element): unknown };
  }
}

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) =>
  Array.from(r.querySelectorAll<T>(s));

const params = new URLSearchParams(location.search);
const capture = params.get('capture'); // poster rendering, see scripts/render-posters.mjs
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || capture !== null;
const mobileMQ = matchMedia('(max-width: 860px), (hover: none) and (pointer: coarse)');
const mobile = mobileMQ.matches;
const root = document.documentElement;

// ------------------------------------------------------------------- film --
// Where each chapter lands on the film, in seconds. The film is three chained
// 5 s clips whose joins are the four approved stills: dark front (0), lit
// three-quarter (5), back graphic (10), pattern pieces laid out (15).
const FILM: Record<string, number> = {
  hero: 0,
  awaken: 5,
  meaning: 7.4,
  strike: 10,
  construct: 15,
  manifesto: 15,
};
const FILM_W = 1920;
const FILM_H = 1080;
// The cobalt level on the back graphic, as a fraction of frame height.
const BACK_LEVEL = 0.476;

// --------------------------------------------------------------- chapters --
type Ch = { el: HTMLElement; name: string; anchor: number };
let chapters: Ch[] = [];
const measure = () => {
  chapters = $$('[data-ch]').map((el) => {
    const r = el.getBoundingClientRect();
    const top = r.top + scrollY;
    // A chapter's pose lands when its copy is centred in the viewport.
    return { el, name: el.dataset.ch!, anchor: top + r.height / 2 - innerHeight / 2 };
  });
};

const timeFor = (ch: string) => FILM[ch] ?? 0;
const smooth = (x: number) => x * x * (3 - 2 * x);
function target(y: number): { time: number; active: string } {
  if (!chapters.length) return { time: 0, active: 'hero' };
  if (y <= chapters[0].anchor) return { time: timeFor(chapters[0].name), active: chapters[0].name };
  for (let i = 0; i < chapters.length - 1; i++) {
    const a = chapters[i];
    const b = chapters[i + 1];
    if (y <= b.anchor) {
      const t = (y - a.anchor) / (b.anchor - a.anchor);
      const n = t < 0.5 ? a : b;
      // Reduced motion: no playback, cut to the nearest chapter's frame.
      if (reduced) return { time: timeFor(n.name), active: n.name };
      return { time: timeFor(a.name) + (timeFor(b.name) - timeFor(a.name)) * smooth(t), active: n.name };
    }
  }
  const last = chapters[chapters.length - 1];
  return { time: timeFor(last.name), active: last.name };
}

// ----------------------------------------------------------------- ladder --
const LEVEL = 4370;
const ladderLinks = $$<HTMLAnchorElement>('[data-ladder] a');
const priceEl = $('[data-ladder-price]');
const markerEl = $('[data-ladder-marker]');
let ladderStops: { y: number; price: number; link: HTMLAnchorElement }[] = [];
const measureLadder = () => {
  // The full-width strike line runs exactly through the ladder's level.
  const liq = document.querySelector('.ladder__liq a');
  const r = liq?.getBoundingClientRect();
  if (r && r.height) root.style.setProperty('--level-y', `${(r.top + r.height / 2).toFixed(0)}px`);
  ladderStops = ladderLinks.map((link) => {
    const target = document.getElementById(link.hash.slice(1))!;
    const r = target.getBoundingClientRect();
    const y = Math.max(0, r.top + scrollY + Math.min(r.height, innerHeight) / 2 - innerHeight / 2);
    return { y, price: parseFloat(link.dataset.level!), link };
  });
};
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function priceAt(y: number): { price: number; index: number; frac: number } {
  const s = ladderStops;
  if (!s.length || y <= s[0].y) return { price: s[0]?.price ?? 0, index: 0, frac: 0 };
  for (let i = 0; i < s.length - 1; i++)
    if (y <= s[i + 1].y) {
      const f = (y - s[i].y) / (s[i + 1].y - s[i].y);
      return { price: s[i].price + (s[i + 1].price - s[i].price) * f, index: i, frac: f };
    }
  return { price: s[s.length - 1].price, index: s.length - 1, frac: 0 };
}

// ----------------------------------------------------------------- strike --
let struck = false;
let strikeTime = '';
const strikeLine = $('[data-strike-line]');
function fireStrike() {
  if (struck) return;
  struck = true;
  const now = new Date();
  strikeTime = now.toLocaleTimeString('en-GB', { hour12: false });
  const zone =
    new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value ?? '';
  const stamp = $('[data-stamp-time]');
  if (stamp) stamp.textContent = `${strikeTime} ${zone}`.trim();
  const tag = $('[data-tag-strike]');
  if (tag) tag.textContent = `Your strike: ${strikeTime} ${zone}`.trim();
  const field = $<HTMLInputElement>('[data-strike-field]');
  if (field) field.value = strikeTime;
  root.classList.add('is-struck');
  strikeLine?.classList.add('is-on');
}

// ------------------------------------------------------------------ stage --
const video = $<HTMLVideoElement>('[data-film]')!;
/** Where the film's frame actually sits on screen (cover on desktop, CSS box on phones). */
function frameRect() {
  const r = video.getBoundingClientRect();
  const s = Math.max(r.width / FILM_W, r.height / FILM_H);
  const h = FILM_H * s;
  return { top: r.top + (r.height - h) / 2, height: h };
}
async function loadFilm(): Promise<void> {
  const src = (mobile && video.dataset.srcMobile) || video.dataset.src!;
  // Fetched whole so seeking never depends on HTTP range support.
  const res = await fetch(src);
  if (!res.ok) throw new Error(`film ${res.status}`);
  // Typed explicitly: Safari will not decode a blob served as a generic file.
  video.src = URL.createObjectURL(new Blob([await res.arrayBuffer()], { type: 'video/mp4' }));
  await new Promise<void>((ok, fail) => {
    video.addEventListener('loadeddata', () => ok(), { once: true });
    video.addEventListener('error', () => fail(new Error('film decode failed')), { once: true });
    video.load();
  });
}

// ------------------------------------------------------------------ boot --
async function boot() {
  // The engine is a classic deferred script; mount it as soon as it exists.
  if (window.ScrollCraft) window.ScrollCraft.mount(document.body);
  else addEventListener('load', () => window.ScrollCraft?.mount(document.body), { once: true });
  bindCards();
  const access = $<HTMLFormElement>('[data-access]');
  if (access) bindAccess(access);
  measure();
  measureLadder();
  addEventListener('resize', () => {
    measure();
    measureLadder();
  });
  // Fonts and lazy images shift layout slightly; re-measure once settled.
  document.fonts?.ready.then(() => {
    measure();
    measureLadder();
  });
  addEventListener('load', () => {
    measure();
    measureLadder();
  });

  // Close: draw the level across the final mark when it arrives.
  const close = $('[data-close-mark]');
  if (close)
    new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && close.classList.add('is-drawn')), {
      threshold: 0.4,
    }).observe(close);

  // Ladder: highlight the current level and keep the marker honest.
  const covers = $$('.covers');

  const loader = $('[data-loader]');
  let ready = false;
  const showFrames = (err: unknown) => {
    console.warn('Film unavailable, showing still frames instead.', err);
    root.classList.add('no-webgl');
    loader?.remove();
  };
  const film = loadFilm()
    .then(() => {
      ready = true;
      // The poster stays up until a real frame has painted (iOS keeps a
      // seeked-but-never-played video blank).
      video.addEventListener('seeked', () => root.classList.add('stage-ready'), { once: true });
      video.currentTime = 0.001;
      loader?.classList.add('is-done');
    })
    .catch(showFrames);

  // Poster capture: freeze on one chapter's frame.
  if (capture) {
    root.classList.add('is-capture');
    const ch = capture.split(':')[0];
    if (ch === 'strike') fireStrike();
    await film;
    video.addEventListener(
      'seeked',
      () => {
        root.classList.add('stage-ready');
        setTimeout(() => (document.title = 'captured'), 300);
      },
      { once: true },
    );
    video.currentTime = Math.min(timeFor(ch), video.duration - 0.05);
    return;
  }

  let playhead = 0;
  let lastActive = '';
  const frame = () => {
    requestAnimationFrame(frame);
    const y = scrollY;
    const { time, active } = target(y);
    // Ease toward the scroll target so wheel steps never stutter the film.
    playhead = reduced ? time : playhead + (time - playhead) * 0.18;

    // Price ladder and the strike.
    const { price, index } = priceAt(y);
    if (priceEl) priceEl.textContent = fmt(price);
    if (markerEl) {
      const first = ladderLinks[0].getBoundingClientRect();
      const last = ladderLinks[ladderLinks.length - 1].getBoundingClientRect();
      const span = ladderStops[0].price - ladderStops[ladderStops.length - 1].price;
      const f = (ladderStops[0].price - price) / span;
      markerEl.style.transform = `translate3d(0, ${(first.top + first.height / 2 + (last.top - first.top) * f).toFixed(1)}px, 0)`;
    }
    ladderLinks.forEach((a, i) => a.toggleAttribute('data-current', i === index));
    if (!struck && price <= LEVEL + 0.001 && ladderStops.length) fireStrike();
    root.classList.toggle('below-level', price <= LEVEL);

    if (active !== lastActive) {
      root.dataset.chapter = active;
      lastActive = active;
    }

    // Hide and pause the stage while an opaque section covers the viewport.
    const covered = covers.some((c) => {
      const r = c.getBoundingClientRect();
      return r.top <= 0 && r.bottom >= innerHeight;
    });
    root.classList.toggle('stage-covered', covered);
    if (!ready || covered) return;
    const t = Math.min(playhead, video.duration - 0.05);
    // Coalesce seeks: never queue one while the decoder is still resolving the last.
    if (!video.seeking && Math.abs(video.currentTime - t) > (mobile ? 0.02 : 0.008)) video.currentTime = t;

    // During the strike the full-width line continues the level on the back graphic.
    if (active === 'strike') {
      const f = frameRect();
      root.style.setProperty('--level-y', `${(f.top + f.height * BACK_LEVEL).toFixed(0)}px`);
    }
  };
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
