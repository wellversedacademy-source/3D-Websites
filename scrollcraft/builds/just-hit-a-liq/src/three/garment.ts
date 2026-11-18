// The garment object: model, fabric, and the decoration layers that make it a
// Just hit a LiQ piece. Shared by the homepage stage and the product viewer.
//
// Each decoration is its own mesh, projected onto the garment surface at the
// placement the brand plan specifies (Phase 3 and the Phase 7 tech-pack
// example). Keeping them separate is what lets the homepage pull the garment
// apart into its fabrication layers.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { drawMark, Q_BOUNDS } from '../brand/mark';

export const ACCENT = new THREE.Color('#3a63f2');

export type Palette = { garment: string; print: string; micro: string };

export type Layer = {
  id: 'print' | 'level' | 'micro' | 'chest' | 'sleeve' | 'cuff' | 'strike';
  mesh: THREE.Mesh;
  /** Outward direction, used to lift the layer off the garment. */
  dir: THREE.Vector3;
  /** How far this layer travels at full deconstruction, in metres. */
  lift: number;
  /** World position of the layer's anchor, for on-screen annotations. */
  anchor: THREE.Vector3;
};

export type Garment = {
  root: THREE.Group;
  body: THREE.Mesh;
  fabric: THREE.MeshPhysicalMaterial;
  layers: Layer[];
  setPalette(p: Palette): void;
  setExplode(t: number): void;
  setStrike(glow: number): void;
  dispose(): void;
};

// ---------------------------------------------------------------- textures --

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Fine fleece knit as a normal map: rows of soft loops plus a little fuzz. */
function fabricNormal(): THREE.CanvasTexture {
  const S = 256;
  const [c, g] = canvas(S, S);
  const img = g.createImageData(S, S);
  const height = (x: number, y: number) => {
    const loop = Math.sin((x / S) * Math.PI * 2 * 24) * 0.5 + 0.5;
    const row = Math.sin((y / S) * Math.PI * 2 * 32 + Math.sin((x / S) * Math.PI * 2 * 24) * 0.8) * 0.5 + 0.5;
    return loop * 0.55 + row * 0.45;
  };
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = height((x + 1) % S, y) - height((x - 1 + S) % S, y) + rnd() * 0.25;
      const dy = height(x, (y + 1) % S) - height(x, (y - 1 + S) % S) + rnd() * 0.25;
      const i = (y * S + x) * 4;
      img.data[i] = 128 - dx * 70;
      img.data[i + 1] = 128 - dy * 70;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(16, 16);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// Back composition, in mark units (the mark is 300 units wide). Matches the
// Signature Hoodie board: JUST HIT A above, the LiQ with the level through
// it, a price ladder at the level's end, the session stamp below.
const MARK_H = 172;
const LADDER_X = 318;
const LEVEL_Y = 79.7;
const STEP = 22;
const LADDER = [4380, 4378, 4376, 4374, 4372, 4370, 4368, 4366, 4364];
const MICRO = { u0: -40, v0: -70, w: 440, h: 360 };
const serif = (px: number, w = 500) => `${w} ${px}px "Bodoni Moda", "Didot", serif`;
const mono = (px: number, w = 400) => `${w} ${px}px "IBM Plex Mono", ui-monospace, monospace`;

/** Tonal LiQ letters and the candlestick i. */
function printTexture(color: string): THREE.CanvasTexture {
  const W = 1200;
  const [c, g] = canvas(W, Math.round((W * MARK_H) / 300));
  drawMark(g, 0, 0, W, { letters: color });
  return finish(c);
}

function solid(color: string): THREE.CanvasTexture {
  const [c, g] = canvas(4, 4);
  g.fillStyle = color;
  g.fillRect(0, 0, 4, 4);
  return finish(c);
}

/** Bone microtype: JUST HIT A, the price ladder, the session stamp. */
function microTexture(color: string): THREE.CanvasTexture {
  const K = 4; // pixels per mark unit
  const [c, g] = canvas(MICRO.w * K, MICRO.h * K);
  g.scale(K, K);
  g.translate(-MICRO.u0, -MICRO.v0);
  g.fillStyle = color;
  g.strokeStyle = color;
  g.textAlign = 'center';
  g.font = serif(15);
  g.letterSpacing = '7px';
  g.fillText('JUST HIT A', 128, -26);
  g.font = serif(11);
  g.letterSpacing = '4.5px';
  g.fillText('LIQUIDITY / SWEPT', 128, 206);
  g.fillText('NY SESSION', 128, 228);
  g.fillText('09:42:17', 128, 250);
  // Ladder: spine, ticks, prices.
  const top = LEVEL_Y - 5 * STEP;
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(LADDER_X, top - 6);
  g.lineTo(LADDER_X, top + 8 * STEP + 6);
  g.stroke();
  g.textAlign = 'left';
  g.font = mono(7.5);
  g.letterSpacing = '0.6px';
  LADDER.forEach((v, i) => {
    const y = top + i * STEP;
    g.fillRect(LADDER_X, y - 0.45, 6, 0.9);
    g.fillText(v.toFixed(2), LADDER_X + 10, y + 2.6);
  });
  return finish(c);
}

/** The Q crossed by the level, cropped tight: chest and cuff embroidery. */
const QBOX = {
  u0: Q_BOUNDS.x1 - 14,
  v0: Q_BOUNDS.y1 - 10,
  w: Q_BOUNDS.x2 - Q_BOUNDS.x1 + 28,
  h: Q_BOUNDS.y2 - Q_BOUNDS.y1 + 20,
};
function qTexture(ink: string, diagonal = false): THREE.CanvasTexture {
  const K = 4;
  const [c, g] = canvas(Math.round(QBOX.w * K), Math.round(QBOX.h * K));
  g.scale(K, K);
  g.translate(-QBOX.u0, -QBOX.v0);
  drawMark(g, 0, 0, 300, { letters: ink, qOnly: true });
  g.fillStyle = ACCENT.getStyle();
  if (diagonal) {
    g.save();
    g.translate((Q_BOUNDS.x1 + Q_BOUNDS.x2) / 2, LEVEL_Y + 6);
    g.rotate(-0.32);
    g.fillRect(-QBOX.w / 2, -2, QBOX.w, 4);
    g.restore();
  } else g.fillRect(QBOX.u0 + 2, LEVEL_Y - 2, QBOX.w - 4, 4);
  return finish(c);
}

function capTexture(ink: string): THREE.CanvasTexture {
  const W = 900;
  const [c, g] = canvas(W, Math.round((W * MARK_H) / 300));
  drawMark(g, 0, 0, W, { letters: ink, level: ACCENT.getStyle() });
  return finish(c);
}

function sleeveTexture(color: string): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 128);
  g.fillStyle = color;
  g.font = serif(58);
  g.letterSpacing = '26px';
  g.textBaseline = 'middle';
  g.fillText('LIQUIDITY', 20, 66);
  return finish(c);
}

function finish(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ model --

const loader = new GLTFLoader();

export async function loadGarment(
  model: string,
  opts: { mobile: boolean; palette: Palette },
): Promise<Garment> {
  const url = `/models/${model}${opts.mobile ? '-m' : ''}.glb`;
  // Canvas prints are typeset in the brand mono; make sure the face is ready.
  await Promise.all([
    document.fonts?.load('500 30px "IBM Plex Mono"'),
    document.fonts?.load('400 20px "IBM Plex Mono"'),
    document.fonts?.load('500 30px "Bodoni Moda"'),
  ]).catch(() => undefined);
  const gltf = await loader.loadAsync(url);
  let body: THREE.Mesh | null = null;
  gltf.scene.traverse((o) => {
    if (!body && (o as THREE.Mesh).isMesh) body = o as THREE.Mesh;
  });
  if (!body) throw new Error(`No mesh in ${url}`);
  const mesh = body as THREE.Mesh;
  gltf.scene.updateMatrixWorld(true);

  const fabric = new THREE.MeshPhysicalMaterial({
    color: opts.palette.garment,
    roughness: 0.94,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#3b3a3d'),
    normalMap: fabricNormal(),
    normalScale: new THREE.Vector2(0.16, 0.16),
  });
  mesh.material = fabric;

  const root = new THREE.Group();
  root.add(gltf.scene);
  const layers: Layer[] = [];

  const decalMat = (map: THREE.Texture, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      roughness: 0.8,
      ...o,
    });

  const add = (
    id: Layer['id'],
    material: THREE.MeshStandardMaterial,
    position: THREE.Vector3,
    orientation: THREE.Euler,
    size: THREE.Vector3,
    dir: THREE.Vector3,
    lift: number,
    order: number,
  ) => {
    const geo = new DecalGeometry(mesh, position, orientation, size);
    const m = new THREE.Mesh(geo, material);
    m.renderOrder = order;
    m.userData.base = new THREE.Vector3();
    root.add(m);
    layers.push({ id, mesh: m, dir: dir.clone().normalize(), lift, anchor: position.clone() });
  };

  const isHoodie = model === 'signature-hoodie';
  const isTee = model === 'heavyweight-tee';
  const back = new THREE.Euler(0, Math.PI, 0);
  const front = new THREE.Euler(0, 0, 0);
  const outBack = new THREE.Vector3(0, 0, -1);
  const outFront = new THREE.Vector3(0, 0, 1);

  if (isHoodie || isTee) {
    // Back composition, 355 mm wide (Phase 7 tech pack), centred as on the
    // product boards. k converts mark units to metres.
    const k = 0.355 / 300;
    const cy = isHoodie ? -0.17 : -0.13;
    const zBack = -0.2;
    // Seen from behind, the viewer's right is world -X.
    const wx = (u: number) => -(u - 128) * k;
    const wy = (v: number) => cy - (v - 90) * k;
    // Level: through the letters, on to the price ladder.
    add(
      'level',
      decalMat(solid('#ffffff'), {
        color: ACCENT,
        emissive: ACCENT,
        emissiveIntensity: 0.25,
        roughness: 0.55,
      }),
      new THREE.Vector3(wx(157), wy(LEVEL_Y), zBack),
      back,
      new THREE.Vector3(326 * k, 3.6 * k, 0.5),
      outBack,
      0.16,
      3,
    );
    add(
      'print',
      decalMat(printTexture(opts.palette.print), { roughness: 0.7 }),
      new THREE.Vector3(wx(150), wy(MARK_H / 2), zBack),
      back,
      new THREE.Vector3(300 * k, MARK_H * k, 0.4),
      outBack,
      0.08,
      2,
    );
    add(
      'micro',
      decalMat(microTexture(opts.palette.micro), { roughness: 0.75 }),
      new THREE.Vector3(wx(MICRO.u0 + MICRO.w / 2), wy(MICRO.v0 + MICRO.h / 2), zBack),
      back,
      new THREE.Vector3(MICRO.w * k, MICRO.h * k, 0.4),
      outBack,
      0.24,
      2,
    );
    // Chest: the Q and its level, about 40 mm tall, over the heart (world +X).
    const qh = 0.04;
    add(
      'chest',
      decalMat(qTexture(opts.palette.print), { roughness: 0.62 }),
      new THREE.Vector3(0.13, isHoodie ? 0.12 : 0.1, 0.2),
      front,
      new THREE.Vector3((qh * QBOX.w) / QBOX.h, qh, 0.2),
      outFront,
      0.1,
      2,
    );
  }
  if (isHoodie) {
    add(
      'sleeve',
      decalMat(sleeveTexture(opts.palette.micro), { roughness: 0.75 }),
      new THREE.Vector3(0.43, -0.16, 0.03),
      new THREE.Euler(0, Math.PI / 2, -Math.PI / 2 + 0.16),
      new THREE.Vector3(0.2, 0.025, 0.2),
      new THREE.Vector3(1, 0, 0),
      0.1,
      2,
    );
    add(
      'cuff',
      decalMat(qTexture(opts.palette.print, true), { roughness: 0.7 }),
      new THREE.Vector3(-0.46, -0.412, 0.06),
      new THREE.Euler(0, -Math.PI / 2, 0),
      new THREE.Vector3((0.032 * QBOX.w) / QBOX.h, 0.032, 0.2),
      new THREE.Vector3(-1, 0, 0),
      0.08,
      2,
    );
  }
  if (model === 'cap') {
    add(
      'chest',
      decalMat(capTexture(opts.palette.micro), { roughness: 0.62 }),
      new THREE.Vector3(0, 0.045, 0.12),
      new THREE.Euler(-0.35, 0, 0),
      new THREE.Vector3(0.09, (0.09 * MARK_H) / 300, 0.1),
      outFront,
      0.05,
      2,
    );
  }

  const setPalette = (p: Palette) => {
    fabric.color.set(p.garment);
    // Light garments need less sheen or they read as plastic.
    const light = new THREE.Color(p.garment).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
    fabric.sheen = light ? 0.3 : 1;
    fabric.sheenColor.set(light ? '#ffffff' : '#3b3a3d');
    for (const L of layers) {
      const mat = L.mesh.material as THREE.MeshStandardMaterial;
      const old = mat.map;
      if (L.id === 'print') mat.map = printTexture(p.print);
      else if (L.id === 'micro') mat.map = microTexture(p.micro);
      else if (L.id === 'chest') mat.map = model === 'cap' ? capTexture(p.micro) : qTexture(p.print);
      else if (L.id === 'sleeve') mat.map = sleeveTexture(p.micro);
      else if (L.id === 'cuff') mat.map = qTexture(p.print, true);
      else continue;
      old?.dispose();
      mat.needsUpdate = true;
    }
  };

  const setExplode = (t: number) => {
    for (const L of layers) L.mesh.position.copy(L.dir).multiplyScalar(L.lift * t);
  };

  const setStrike = (glow: number) => {
    const level = layers.find((l) => l.id === 'level');
    if (level) (level.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + glow * 2.6;
  };

  const dispose = () => {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.normalMap?.dispose();
      mat.dispose();
    });
  };

  return { root, body: mesh, fabric, layers, setPalette, setExplode, setStrike, dispose };
}

// --------------------------------------------------------------- the set ----

/** Soft volumetric haze: a few slow planes of noise at the garment's feet. */
export function haze(count: number): THREE.Group {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  // Break up the disc so it reads as vapour.
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, Math.random() * 18 + 4, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.7),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        color: '#b8bcc8',
        blending: THREE.AdditiveBlending,
      }),
    );
    m.position.set((i / count - 0.5) * 1.4, -0.48 + Math.sin(i * 1.7) * 0.05, (i % 3) * 0.18 - 0.2);
    m.userData.speed = 0.02 + (i % 5) * 0.006;
    m.userData.phase = i * 1.3;
    group.add(m);
  }
  return group;
}

export function floorGlow(): THREE.Mesh {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(232,227,215,0.16)');
  grad.addColorStop(0.45, 'rgba(232,227,215,0.05)');
  grad.addColorStop(1, 'rgba(232,227,215,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.56;
  return m;
}
