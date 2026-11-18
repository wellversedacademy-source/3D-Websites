// Homepage: the scroll narrative.
//
// One garment on a fixed stage; the chapters scroll over it in normal document
// flow (no pinning), and scroll position decides the garment's pose. The
// signature move is the strike: a price ladder on the right edge doubles as
// chapter navigation, the price falls as you descend, and when it crosses the
// cobalt liquidity level the line runs across the screen and onto the garment,
// stamped with the visitor's own time. That time returns on their edition tag
// in the access form.

import '../main';
import './home.css';
import type { Vector3 } from 'three';
import type { Stage, Pose } from '../three/stage';
import { webglAvailable } from '../three/support';
import { getProduct } from '../commerce/catalog';
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
const hoodie = getProduct('signature-hoodie')!;

// ------------------------------------------------------------------ poses --
const P = (o: Partial<Pose>): Pose => ({
  az: 0,
  el: 0.02,
  dist: 2.4,
  ty: -0.04,
  rot: 0,
  shift: 0,
  key: 0.8,
  rim: 0.8,
  explode: 0,
  haze: 1,
  ...o,
});
const DESKTOP: Record<string, Pose> = {
  hero: P({ az: 0.22, el: 0.04, dist: 2.55, ty: -0.03, key: 0.55, rim: 0.7, shift: 0.17 }),
  awaken: P({ az: -0.62, el: 0.14, dist: 1.75, ty: 0.05, key: 1, rim: 1, shift: 0.2 }),
  meaning: P({
    az: 0.35,
    el: -0.02,
    dist: 2.9,
    ty: -0.05,
    rot: Math.PI * 0.82,
    key: 0.18,
    rim: 1.1,
    shift: -0.2,
    haze: 1.4,
  }),
  strike: P({ az: 0, el: 0.02, dist: 1.95, ty: -0.12, rot: Math.PI, key: 0.85, rim: 0.7, shift: 0 }),
  construct: P({
    az: 0.62,
    el: 0.1,
    dist: 2.05,
    ty: -0.12,
    rot: Math.PI,
    key: 1,
    rim: 0.8,
    explode: 1,
    shift: 0.2,
  }),
  manifesto: P({
    az: -0.18,
    el: -0.16,
    dist: 3.4,
    ty: 0.02,
    rot: 0.15,
    key: 0.55,
    rim: 1.2,
    shift: -0.22,
    haze: 1.6,
  }),
};
const VIEWS: Record<string, Partial<Pose>> = {
  layers: {},
  front: { az: 0.3, el: 0.05, dist: 2.3, ty: -0.04, rot: 0, explode: 0 },
  back: { az: 0.25, el: 0.04, dist: 2.2, ty: -0.08, rot: Math.PI, explode: 0 },
  detail: { az: 0.15, el: 0.04, dist: 0.62, ty: 0.115, rot: 0.42, explode: 0, key: 1.1 },
};
// Phones: the garment sits higher and centred, the copy below it; less travel.
const phone = (p: Pose): Pose => ({
  ...p,
  shift: 0,
  dist: Math.max(p.dist * 1.5 + 0.3, 3.3),
  ty: p.ty - 0.2,
});

let view = 'layers';
const poseFor = (ch: string): Pose => {
  let p = DESKTOP[ch] ?? DESKTOP.hero;
  if (ch === 'construct') p = { ...p, ...VIEWS[view] };
  return mobile ? phone(p) : p;
};

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

const KEYS: (keyof Pose)[] = ['az', 'el', 'dist', 'ty', 'rot', 'shift', 'key', 'rim', 'explode', 'haze'];
function mixPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

const smooth = (x: number) => x * x * (3 - 2 * x);
function targetPose(y: number): { pose: Pose; active: string; local: number } {
  if (!chapters.length) return { pose: poseFor('hero'), active: 'hero', local: 0 };
  if (y <= chapters[0].anchor) return { pose: poseFor(chapters[0].name), active: chapters[0].name, local: 0 };
  for (let i = 0; i < chapters.length - 1; i++) {
    const a = chapters[i];
    const b = chapters[i + 1];
    if (y <= b.anchor) {
      const t = (y - a.anchor) / (b.anchor - a.anchor);
      if (reduced) {
        // No camera travel: cut to the nearest chapter's composition.
        const n = t < 0.5 ? a : b;
        return { pose: poseFor(n.name), active: n.name, local: 0 };
      }
      return {
        pose: mixPose(poseFor(a.name), poseFor(b.name), smooth(t)),
        active: t < 0.5 ? a.name : b.name,
        local: t,
      };
    }
  }
  const last = chapters[chapters.length - 1];
  return { pose: poseFor(last.name), active: last.name, local: 0 };
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
let glow = 0;
let glowTarget = 0;
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
  glow = reduced ? 0.6 : 1.6;
  glowTarget = 0.6;
  strikeLine?.classList.add('is-on');
}

// ------------------------------------------------------------ annotations --
const NAMED: Record<string, [number, number, number, number, number, number]> = {
  // point xyz, outward normal xyz (garment space)
  hood: [-0.12, 0.3, -0.02, -0.4, 0.6, -0.4],
  shoulder: [0.31, 0.2, 0.02, 0.8, 0.5, 0.2],
  neck: [0.03, 0.24, 0.11, 0, 0.4, 1],
  hem: [0.16, -0.43, 0.12, 0.2, -0.3, 1],
};
const annotations = $$('[data-anchor]');

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

  const canvas = $<HTMLCanvasElement>('[data-stage-canvas]')!;
  const loader = $('[data-loader]');
  let stage: Stage | null = null;
  if (!webglAvailable()) {
    root.classList.add('no-webgl');
    loader?.remove();
  } else {
    try {
      const { Stage } = await import('../three/stage');
      stage = new Stage(canvas, {
        mobile,
        reduced,
        model: 'signature-hoodie',
        palette: hoodie.colorways['Washed Black'],
      });
      stage
        .load()
        .then(() => {
          root.classList.add('stage-ready');
          loader?.classList.add('is-done');
          if (capture) setTimeout(() => (document.title = 'captured'), 400);
        })
        .catch((err) => {
          console.warn('3D stage unavailable, showing still frames instead.', err);
          root.classList.add('no-webgl');
          loader?.remove();
          stage = null;
        });
    } catch (err) {
      console.warn('WebGL failed to start, showing still frames instead.', err);
      root.classList.add('no-webgl');
      loader?.remove();
      stage = null;
    }
  }

  // Deconstruction controls.
  $$<HTMLButtonElement>('[data-view]').forEach((b) =>
    b.addEventListener('click', () => {
      view = b.dataset.view!;
      $$('button[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }),
  );
  const note = $('[data-colorway-note]');
  $$<HTMLButtonElement>('[data-colorway]').forEach((b) =>
    b.addEventListener('click', () => {
      const name = b.dataset.colorway!;
      const cw = hoodie.colorways[name];
      $$('[data-colorway]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      stage?.setPalette(cw);
      if (note) note.textContent = `${name}. ${cw.note}.`;
    }),
  );

  // Poster capture: freeze on one chapter's composition.
  if (capture) {
    root.classList.add('is-capture');
    const [ch, v] = capture.split(':');
    if (v) view = v;
    if (ch === 'strike') fireStrike();
    stage?.setPose({ ...poseFor(ch), shift: 0 });
    stage?.setGlow(ch === 'strike' ? 0.9 : 0);
    stage?.start();
    return;
  }

  let current: Pose | null = null;
  let lastActive = '';
  const THREE = stage ? await import('three') : null;
  const tmp: Vector3 | null = THREE ? new THREE.Vector3() : null;
  const tmpN: Vector3 | null = THREE ? new THREE.Vector3() : null;
  const frame = () => {
    requestAnimationFrame(frame);
    const y = scrollY;
    const { pose, active } = targetPose(y);
    // Ease toward the scroll target so wheel steps and clicks never jump.
    current = current && !reduced ? mixPose(current, pose, 0.11) : pose;

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

    glow += (glowTarget - glow) * (reduced ? 1 : 0.035);
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
    if (!stage) return;
    stage.setVisible(!covered);
    if (covered) return;
    stage.setPose(current);
    stage.setGlow(glow);

    // During the strike the full-width line continues the garment's own level.
    const levelLayer = stage.garment?.layers.find((l) => l.id === 'level');
    if (levelLayer && tmp && active === 'strike') {
      stage.garment!.root.updateMatrixWorld();
      tmp.copy(levelLayer.anchor);
      tmp.x = 0;
      const p = stage.project(tmp);
      root.style.setProperty('--level-y', `${p.y.toFixed(0)}px`);
    }

    // Annotations follow their points on the garment (desktop only).
    if (mobile || !tmp || !tmpN) return;
    const g = stage.garment;
    for (const el of annotations) {
      const show = el.dataset.chShow === active && (active !== 'construct' || view === 'layers');
      let visible = false;
      if (show && g) {
        const key = el.dataset.anchor!;
        if (key.startsWith('layer:')) {
          const layer = g.layers.find((l) => l.id === key.slice(6));
          if (layer) {
            tmp.copy(layer.anchor).addScaledVector(layer.dir, layer.lift * current.explode);
            tmpN.copy(layer.dir);
          }
        } else {
          const n = NAMED[key];
          tmp.set(n[0], n[1], n[2]);
          tmpN.set(n[3], n[4], n[5]).normalize();
        }
        stage.garment?.root.updateMatrixWorld();
        const p = stage.project(tmp);
        visible = !p.behind && stage.facing(tmp, tmpN);
        el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      }
      el.classList.toggle('is-on', visible);
    }
  };
  requestAnimationFrame(frame);
  stage?.start();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
