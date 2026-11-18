// Product-page viewer: the same garment and set, framed for one product,
// with Front / Back / Detail views and drag-to-turn. Loads only when the
// viewer is near the screen; the rendered poster image holds until then.

import { Stage, mixPose, type Pose } from './stage';
import type { Palette } from './garment';
import { webglAvailable } from './support';

type View = 'front' | 'back' | 'detail';

const FRAMES: Record<string, Record<View, Partial<Pose>>> = {
  'signature-hoodie': {
    front: { az: 0.28, el: 0.04, dist: 2.35, ty: -0.06, rot: 0 },
    back: { az: 0.2, el: 0.04, dist: 2.25, ty: -0.1, rot: Math.PI },
    detail: { az: 0.15, el: 0.04, dist: 0.62, ty: 0.115, rot: 0.42, key: 1.1 },
  },
  'heavyweight-tee': {
    front: { az: 0.28, el: 0.04, dist: 2.2, ty: -0.08, rot: 0 },
    back: { az: 0.2, el: 0.04, dist: 2.1, ty: -0.1, rot: Math.PI },
    detail: { az: 0.15, el: 0.04, dist: 0.6, ty: 0.1, rot: 0.42, key: 1.1 },
  },
  cap: {
    front: { az: 0.55, el: 0.22, dist: 0.85, ty: 0.03, rot: 0 },
    back: { az: 0.3, el: 0.22, dist: 0.85, ty: 0.03, rot: Math.PI },
    detail: { az: 0.1, el: 0.12, dist: 0.42, ty: 0.045, rot: 0, key: 1.1 },
  },
};

const BASE: Pose = {
  az: 0,
  el: 0.04,
  dist: 2.3,
  ty: -0.06,
  rot: 0,
  shift: 0,
  key: 0.95,
  rim: 0.9,
  explode: 0,
  haze: 0.8,
};

export type Viewer = { setView(v: View): void; setPalette(p: Palette): void };

export function mountViewer(
  el: HTMLElement,
  model: string,
  palette: Palette,
  opts: { capture?: string | null } = {},
): Promise<Viewer | null> {
  return new Promise((resolve) => {
    if (!webglAvailable()) return resolve(null);
    const start = async () => {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      el.appendChild(canvas);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean(opts.capture);
      const mobile = matchMedia('(max-width: 860px), (hover: none) and (pointer: coarse)').matches;
      // The stage sizes itself to the window; the viewer overrides that to the box.
      const stage = new Stage(canvas, { mobile, reduced, palette, model });
      const fit = () => {
        const r = el.getBoundingClientRect();
        stage.renderer.setSize(r.width, r.height, false);
        stage.camera.aspect = r.width / r.height;
        stage.camera.updateProjectionMatrix();
      };
      removeEventListener('resize', stage.resize);
      new ResizeObserver(fit).observe(el);
      fit();
      try {
        await stage.load();
      } catch (err) {
        console.warn('Viewer could not load the model; keeping the still image.', err);
        canvas.remove();
        return resolve(null);
      }
      const frames = FRAMES[model] ?? FRAMES['signature-hoodie'];
      let target: Pose = { ...BASE, ...frames.front };
      let current = target;
      let drag = 0;
      let spin = 0;
      const setView = (v: View) => {
        target = { ...BASE, ...frames[v] };
        drag = 0;
      };
      // Drag to turn (pointer and touch). Vertical page scroll stays native.
      let down: number | null = null;
      canvas.addEventListener('pointerdown', (e) => {
        down = e.clientX;
        canvas.setPointerCapture?.(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (down == null) return;
        drag += (e.clientX - down) * 0.008;
        down = e.clientX;
      });
      const up = () => (down = null);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);

      const loop = () => {
        requestAnimationFrame(loop);
        spin += (drag - spin) * (reduced ? 1 : 0.15);
        current = reduced ? target : mixPose(current, target, 0.1);
        stage.setPose({ ...current, rot: current.rot + spin });
      };
      if (opts.capture) {
        const [v] = opts.capture.split(':') as [View];
        setView(v);
        stage.setPose(target);
      } else loop();
      stage.start();
      el.setAttribute('data-live', '');
      resolve({ setView, setPalette: (p) => stage.setPalette(p) });
    };
    if (opts.capture) return void start();
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
  });
}
