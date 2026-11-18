// The fixed 3D stage behind the homepage: renderer, set, lights, camera, and
// a pose interpolator. Page code decides the pose; the stage only draws it.

import * as THREE from 'three';
import { floorGlow, haze, loadGarment, type Garment, type Palette } from './garment';

export type Pose = {
  /** Camera orbit around the garment, radians. 0 = straight on to the front. */
  az: number;
  el: number;
  dist: number;
  /** Camera target height. */
  ty: number;
  /** Garment turn, radians. PI shows the back. */
  rot: number;
  /** Horizontal composition shift, fraction of frame width (+ moves garment right). */
  shift: number;
  key: number;
  rim: number;
  explode: number;
  haze: number;
};

export const POSE_KEYS: (keyof Pose)[] = [
  'az',
  'el',
  'dist',
  'ty',
  'rot',
  'shift',
  'key',
  'rim',
  'explode',
  'haze',
];

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of POSE_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

export type StageOptions = { mobile: boolean; reduced: boolean; palette: Palette; model: string };

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
  garment: Garment | null = null;
  private key: THREE.SpotLight;
  private rim: THREE.DirectionalLight;
  private fill: THREE.HemisphereLight;
  private hazeGroup: THREE.Group;
  private pivot = new THREE.Group();
  private pose: Pose | null = null;
  private pointer = new THREE.Vector2();
  private pointerEased = new THREE.Vector2();
  private glow = 0;
  private running = false;
  private dirty = true;
  private visible = true;
  private frame = 0;
  private t0 = performance.now();

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly opts: StageOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !opts.mobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.add(this.pivot);
    this.fill = new THREE.HemisphereLight(0x9aa0b4, 0x050506, 0.35);
    this.key = new THREE.SpotLight(0xfff6ea, 60, 8, 0.42, 0.75, 1.6);
    this.key.position.set(0.5, 2.6, 1.3);
    this.key.target.position.set(0, -0.1, 0);
    this.rim = new THREE.DirectionalLight(0x8fa6ff, 2.2);
    this.rim.position.set(-1.6, 0.7, -1.8);
    const back = new THREE.DirectionalLight(0xffffff, 0.6);
    back.position.set(1.4, 0.4, -1.6);
    this.scene.add(this.fill, this.key, this.key.target, this.rim, back);
    this.hazeGroup = haze(opts.mobile ? 4 : 9);
    this.scene.add(this.hazeGroup, floorGlow());

    addEventListener('resize', this.resize, { passive: true });
    if (!opts.mobile && !opts.reduced) {
      addEventListener(
        'pointermove',
        (e) => {
          if (e.pointerType !== 'mouse') return;
          this.pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
          this.dirty = true;
        },
        { passive: true },
      );
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.start();
    });
    this.resize();
  }

  async load(onProgress?: (p: number) => void): Promise<Garment> {
    onProgress?.(0.2);
    const g = await loadGarment(this.opts.model, { mobile: this.opts.mobile, palette: this.opts.palette });
    onProgress?.(1);
    this.garment = g;
    this.pivot.add(g.root);
    this.dirty = true;
    return g;
  }

  resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, this.opts.mobile ? 1.5 : 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  };

  setPose(p: Pose) {
    this.pose = p;
    this.dirty = true;
  }

  setPalette(p: Palette) {
    this.garment?.setPalette(p);
    this.dirty = true;
  }

  /** Cobalt glow on the liquidity level, 0..1. */
  setGlow(v: number) {
    this.glow = v;
    this.dirty = true;
  }

  setVisible(v: boolean) {
    if (v === this.visible) return;
    this.visible = v;
    if (v) this.start();
    else this.stop();
  }

  start() {
    if (this.running || !this.visible || document.hidden) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.frame++;
      // Reduced motion: draw only when something actually changed.
      if (this.opts.reduced && !this.dirty) return;
      // Phones: every other frame is plenty for slow ambient motion.
      if (this.opts.mobile && this.frame % 2 && !this.dirty) return;
      this.tick();
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  /** Project a garment-space point to viewport pixels. */
  project(v: THREE.Vector3): { x: number; y: number; behind: boolean } {
    const p = v.clone().applyMatrix4(this.pivot.matrixWorld).project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, behind: p.z > 1 };
  }

  /** True when a garment-space point faces the camera (not hidden behind the body). */
  facing(v: THREE.Vector3, normal: THREE.Vector3): boolean {
    const world = v.clone().applyMatrix4(this.pivot.matrixWorld);
    const n = normal.clone().applyQuaternion(this.pivot.quaternion);
    return n.dot(this.camera.position.clone().sub(world)) > 0;
  }

  private tick() {
    const p = this.pose;
    const g = this.garment;
    if (!p) return;
    const ambient = !this.opts.reduced;
    const t = (performance.now() - this.t0) / 1000;

    this.pointerEased.lerp(this.pointer, 0.06);
    const px = this.opts.reduced ? 0 : this.pointerEased.x * 0.06;
    const py = this.opts.reduced ? 0 : this.pointerEased.y * 0.03;

    const az = p.az + px;
    const el = p.el + py;
    this.camera.position.set(
      Math.sin(az) * Math.cos(el) * p.dist,
      p.ty + Math.sin(el) * p.dist,
      Math.cos(az) * Math.cos(el) * p.dist,
    );
    this.camera.lookAt(0, p.ty, 0);
    // Shift the composition without moving the camera off its orbit.
    // Always frame for the canvas's own shape (full window on the homepage,
    // the 4:5 box on product pages).
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    if (aspect && Math.abs(aspect - this.camera.aspect) > 1e-3) this.camera.aspect = aspect;
    this.camera.filmOffset = -p.shift * this.camera.filmGauge;
    this.camera.updateProjectionMatrix();

    // A slow breath in the garment, so a held frame still feels alive.
    const breathe = ambient ? Math.sin(t * 0.6) * 0.012 : 0;
    this.pivot.rotation.y = p.rot + breathe;
    this.pivot.position.y = ambient ? Math.sin(t * 0.8) * 0.004 : 0;

    this.key.intensity = 4 + p.key * 30;
    this.rim.intensity = 0.3 + p.rim * 1.7;
    this.fill.intensity = 0.06 + p.key * 0.16;

    for (const m of this.hazeGroup.children as THREE.Mesh[]) {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.05 * p.haze;
      if (ambient) m.position.x += Math.sin(t * m.userData.speed + m.userData.phase) * 0.0004;
      m.lookAt(this.camera.position);
    }

    if (g) {
      g.setExplode(p.explode);
      g.setStrike(this.glow);
    }
    this.renderer.render(this.scene, this.camera);
    this.dirty =
      ambient &&
      Math.abs(this.pointer.x - this.pointerEased.x) + Math.abs(this.pointer.y - this.pointerEased.y) > 0.001;
  }

  /** Render one frame right now (posters, reduced motion). */
  renderNow() {
    this.tick();
  }
}
