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
import { drawMark } from '../brand/mark';

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

const MARK_ASPECT = 160 / 228;

/** Tonal graphite LiQ letters. The strike wick is drawn in its own layer. */
function printTexture(color: string): THREE.CanvasTexture {
  const W = 1024;
  const [c, g] = canvas(W, Math.round(W * MARK_ASPECT));
  drawMark(g, 0, 0, W, { letters: color, level: null, strike: null });
  return finish(c);
}

function strikeTexture(color: string): THREE.CanvasTexture {
  const [c, g] = canvas(64, 256);
  g.fillStyle = color;
  g.fillRect(0, 0, 64, 256);
  return finish(c);
}

function solid(color: string): THREE.CanvasTexture {
  const [c, g] = canvas(4, 4);
  g.fillStyle = color;
  g.fillRect(0, 0, 4, 4);
  return finish(c);
}

/** Bone microtype: the copy above and below the mark, and the price ladder. */
function microTexture(color: string): THREE.CanvasTexture {
  const W = 1536;
  const H = 1536;
  const [c, g] = canvas(W, H);
  g.fillStyle = color;
  g.textBaseline = 'alphabetic';
  const mono = (px: number, w = 500) => `${w} ${px}px "IBM Plex Mono", ui-monospace, monospace`;
  // Layout is in a 1536px square that maps to 0.5 m x 0.5 m of garment back.
  g.font = mono(30);
  g.letterSpacing = '6px';
  g.fillText('JUST HIT A', 220, 300);
  g.font = mono(26);
  g.fillText('LIQUIDITY / SWEPT', 220, 1130);
  g.fillText('NY SESSION', 220, 1172);
  g.fillText('09:42:17', 220, 1214);
  // Price ladder near the side seam.
  g.font = mono(20, 400);
  g.letterSpacing = '2px';
  const top = 330;
  for (let i = 0; i < 26; i++) {
    const y = top + i * 34;
    const price = (4861.25 - i * 3.25).toFixed(2);
    g.fillRect(1290, y - 6, i % 4 === 0 ? 26 : 12, 2);
    if (i % 2 === 0) g.fillText(price.replace(/\B(?=(\d{3})+(?!\d))/, ','), 1330, y);
  }
  return finish(c);
}

function chestTexture(ink: string): THREE.CanvasTexture {
  const W = 512;
  const [c, g] = canvas(W, Math.round(W * (160 / 300)));
  drawMark(g, 0, 0, W * (228 / 300), {
    letters: ink,
    level: ACCENT.getStyle(),
    strike: ink,
    levelWidth: 300,
  });
  return finish(c);
}

function sleeveTexture(color: string): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 128);
  g.fillStyle = color;
  g.font = '500 76px "IBM Plex Mono", ui-monospace, monospace';
  g.letterSpacing = '22px';
  g.textBaseline = 'middle';
  g.fillText('LIQUIDITY', 20, 66);
  return finish(c);
}

function cuffTexture(ink: string): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  // Just the Q and its strike, centred.
  g.fillStyle = ink;
  g.beginPath();
  g.roundRect(68, 40, 120, 128, 20);
  g.roundRect(88, 60, 80, 88, 8);
  g.fill('evenodd');
  g.fillRect(125, 14, 6, 26);
  g.fillStyle = ACCENT.getStyle();
  g.fillRect(0, 183, 256, 7);
  g.fillStyle = ink;
  g.fillRect(155, 168, 10, 50);
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
    // Back composition. Tech pack: 355 mm wide, centre 22 mm right of the
    // garment centreline (seen from behind, that is world -X).
    const w = 0.355;
    const h = w * MARK_ASPECT;
    const cx = -0.022;
    const cy = isHoodie ? -0.15 : -0.12;
    const left = cx + w / 2; // the L sits at viewer-left, world +X
    const unit = w / 228;
    const zBack = -0.2;
    // Level: from the L across the Q and on to the side seam.
    const levelY = cy + h / 2 - (128 + 2) * unit;
    const levelLen = 0.5;
    add(
      'level',
      decalMat(solid('#ffffff'), {
        color: ACCENT,
        emissive: ACCENT,
        emissiveIntensity: 0.25,
        roughness: 0.55,
      }),
      new THREE.Vector3(left - levelLen / 2, levelY, zBack),
      back,
      new THREE.Vector3(levelLen, 4 * unit, 0.5),
      outBack,
      0.16,
      3,
    );
    add(
      'print',
      decalMat(printTexture(opts.palette.print), { roughness: 0.7 }),
      new THREE.Vector3(cx, cy, zBack),
      back,
      new THREE.Vector3(w, h, 0.4),
      outBack,
      0.08,
      2,
    );
    // The strike: the Q's lower wick, laid over the level.
    const sx = left - (198 + 3) * unit;
    const sy = cy + h / 2 - (118 + 17) * unit;
    add(
      'strike',
      decalMat(strikeTexture(opts.palette.print), { roughness: 0.7 }),
      new THREE.Vector3(sx, sy, zBack),
      back,
      new THREE.Vector3(6 * unit, 34 * unit, 0.4),
      outBack,
      0.16,
      4,
    );
    add(
      'micro',
      decalMat(microTexture(opts.palette.micro), { roughness: 0.75 }),
      new THREE.Vector3(cx - 0.02, cy - 0.06, zBack),
      back,
      new THREE.Vector3(0.5, 0.5, 0.4),
      outBack,
      0.24,
      2,
    );
    // Chest: about 1.5 in over the heart (wearer's left, world +X).
    add(
      'chest',
      decalMat(chestTexture(opts.palette.print), { roughness: 0.62 }),
      new THREE.Vector3(0.13, isHoodie ? 0.12 : 0.1, 0.2),
      front,
      new THREE.Vector3(0.048, 0.048 * (160 / 300), 0.2),
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
      decalMat(cuffTexture(opts.palette.micro), { roughness: 0.7 }),
      new THREE.Vector3(-0.46, -0.412, 0.06),
      new THREE.Euler(0, -Math.PI / 2, 0),
      new THREE.Vector3(0.03, 0.03, 0.2),
      new THREE.Vector3(-1, 0, 0),
      0.08,
      2,
    );
  }
  if (model === 'cap') {
    add(
      'chest',
      decalMat(chestTexture(opts.palette.print), { roughness: 0.62 }),
      new THREE.Vector3(0, 0.045, 0.12),
      new THREE.Euler(-0.35, 0, 0),
      new THREE.Vector3(0.07, 0.07 * (160 / 300), 0.1),
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
      else if (L.id === 'strike') mat.map = strikeTexture(p.print);
      else if (L.id === 'micro') mat.map = microTexture(p.micro);
      else if (L.id === 'chest') mat.map = chestTexture(p.print);
      else if (L.id === 'sleeve') mat.map = sleeveTexture(p.micro);
      else if (L.id === 'cuff') mat.map = cuffTexture(p.micro);
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
