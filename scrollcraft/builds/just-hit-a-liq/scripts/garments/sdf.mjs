// Signed-distance descriptions of the Drop 001 garments.
//
// These are PLACEHOLDER sculpts. They exist so the site has a real, lit,
// rotatable object while the physical samples are in development. When the
// pre-production sample exists, replace public/models/*.glb with a scanned or
// CLO3D-exported model (see docs/ASSETS.md) and delete nothing else: the site
// loads whatever GLB sits at that path.
//
// Units are metres. +Y is up, +Z is the garment front, X is the wearer's left.

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Polynomial smooth minimum: blends two shapes the way fabric bridges a seam.
export function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return mix(b, a, h) - k * h * (1 - h);
}
const smax = (a, b, k) => -smin(-a, -b, k);

function sdRoundBox(px, py, pz, bx, by, bz, r) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  const qz = Math.abs(pz) - bz + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const oz = Math.max(qz, 0);
  return Math.hypot(ox, oy, oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

// Capsule whose radius tapers from ra at A to rb at B.
function sdCone(px, py, pz, ax, ay, az, bx, by, bz, ra, rb) {
  const pax = px - ax;
  const pay = py - ay;
  const paz = pz - az;
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - mix(ra, rb, h);
}

// Distance-ish to an ellipsoid. Not exact, but monotone and smooth, which is
// all the mesher needs.
function sdEllipsoid(px, py, pz, rx, ry, rz) {
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

// Cheap deterministic value noise for drape. No randomness between builds.
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  let v = 0;
  for (let k = 0; k < 2; k++)
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        const w = (i ? ux : 1 - ux) * (j ? uy : 1 - uy) * (k ? uz : 1 - uz);
        v += w * hash(ix + i, iy + j, iz + k);
      }
  return v * 2 - 1;
}

// ---------------------------------------------------------------------------
// Signature Hoodie: boxy, dropped shoulder, slightly cropped, hood down,
// kangaroo pocket, no drawcords (per the Phase 4 recommendation).
// ---------------------------------------------------------------------------
export function hoodie(x, y, z) {
  const ax = Math.abs(x);

  // Body. Width and depth swell a little toward the chest.
  const chest = smoothstep(-0.5, 0.12, y);
  const hw = mix(0.268, 0.292, chest);
  const hd = mix(0.112, 0.132, chest);
  let d = sdRoundBox(x * (0.29 / hw), y + 0.15, z * (0.13 / hd), 0.29, 0.35, 0.13, 0.08);

  // Hem rib: a slightly narrower band with a seam groove above it.
  const hemBand = smoothstep(-0.405, -0.42, y);
  d += 0.008 * hemBand;
  d += 0.0035 * Math.exp(-(((y + 0.41) / 0.004) ** 2));

  // Dropped shoulder yoke.
  const yoke = sdCone(x, y, z, -0.26, 0.17, -0.01, 0.26, 0.17, -0.01, 0.112, 0.112);
  d = smin(d, yoke, 0.06);

  // Sleeves: shoulder to elbow to wrist, hanging slightly away from the body.
  for (const s of [-1, 1]) {
    const upper = sdCone(x, y, z, s * 0.29, 0.155, -0.01, s * 0.385, -0.1, 0.006, 0.098, 0.086);
    const lower = sdCone(x, y, z, s * 0.385, -0.1, 0.006, s * 0.43, -0.37, 0.05, 0.086, 0.072);
    let sleeve = smin(upper, lower, 0.03);
    // Fabric bunching above the cuff.
    const along = smoothstep(-0.24, -0.37, y);
    sleeve -= 0.0022 * along * Math.sin((y + 0.37) * 70);
    const cuff = sdCone(x, y, z, s * 0.432, -0.374, 0.051, s * 0.438, -0.45, 0.056, 0.058, 0.056);
    // Seam groove where the cuff rib meets the sleeve.
    sleeve = smin(sleeve, cuff, 0.012);
    const cuffSeam = Math.exp(-(((y + 0.378) / 0.005) ** 2)) * smoothstep(0.34, 0.4, ax);
    sleeve += 0.004 * cuffSeam;
    d = smin(d, sleeve, 0.045);
  }

  // Hood, worn down: a soft mass behind the neck and a fall over the upper back.
  const hoodMass = sdEllipsoid(x, y - 0.285, z + 0.085, 0.15, 0.075, 0.085);
  const hoodFall = sdEllipsoid(x, y - 0.155, z + 0.142, 0.2, 0.175, 0.04);
  d = smin(d, smin(hoodMass, hoodFall, 0.05), 0.03);
  // The hood seam rolled around the front of the neck.
  {
    const ny = y - 0.305 + 0.12 * (z - 0.0);
    const rr = Math.hypot(x, (z - 0.012) * 1.15) - 0.098;
    const rim = Math.hypot(rr, ny) - 0.03;
    d = smin(d, rim, 0.02);
  }
  // Neck opening.
  {
    const open = Math.hypot(x, (z - 0.03) * 1.25) - 0.07;
    const cut = smax(open, -(y - 0.215), 0.01);
    d = smax(d, -cut, 0.012);
  }

  // Kangaroo pocket: a thin raised panel with soft edges.
  {
    const py = y + 0.255;
    const taper = mix(0.165, 0.2, smoothstep(0.08, -0.08, py));
    const pocket = sdRoundBox(x * (0.17 / taper), py, z - 0.124, 0.17, 0.085, 0.012, 0.01);
    d = smin(d, pocket, 0.004);
  }

  // Drape: long vertical folds that grow toward the hem, quieter on the chest.
  const drape = smoothstep(0.1, -0.48, y);
  d += 0.006 * drape * Math.sin(x * 34 + noise3(x * 6, y * 2, z * 6) * 2.2);
  d += 0.0018 * noise3(x * 18, y * 18, z * 18);
  // Underarm diagonal folds.
  const pit = Math.exp(-(((ax - 0.27) / 0.05) ** 2)) * Math.exp(-(((y - 0.03) / 0.08) ** 2));
  d += 0.004 * pit * Math.sin((y + ax) * 70);
  return d;
}

// ---------------------------------------------------------------------------
// Heavyweight Tee: oversized, dropped shoulder, dense neck rib.
// ---------------------------------------------------------------------------
export function tee(x, y, z) {
  const ax = Math.abs(x);
  const chest = smoothstep(-0.46, 0.1, y);
  const hw = mix(0.262, 0.285, chest);
  const hd = mix(0.094, 0.108, chest);
  let d = sdRoundBox(x * (0.28 / hw), y + 0.135, z * (0.11 / hd), 0.28, 0.32, 0.11, 0.06);
  d += 0.0025 * Math.exp(-(((y + 0.425) / 0.004) ** 2));
  const yoke = sdCone(x, y, z, -0.25, 0.155, -0.004, 0.25, 0.155, -0.004, 0.095, 0.095);
  d = smin(d, yoke, 0.05);
  for (const s of [-1, 1]) {
    const sleeve = sdCone(x, y, z, s * 0.28, 0.14, -0.004, s * 0.39, -0.03, 0.0, 0.09, 0.083);
    const hemSeam = Math.exp(-(((y + 0.01 - (ax - 0.37) * 0.6) / 0.005) ** 2)) * smoothstep(0.33, 0.38, ax);
    d = smin(d, sleeve + 0.003 * hemSeam, 0.04);
  }
  // Neck rib and opening.
  {
    const ny = y - 0.248 + 0.08 * z;
    const rr = Math.hypot(x, (z - 0.01) * 1.2) - 0.085;
    const rib = Math.hypot(rr, ny) - 0.018;
    d = smin(d, rib, 0.012);
    const open = Math.hypot(x, (z - 0.012) * 1.2) - 0.07;
    d = smax(d, -smax(open, -(y - 0.2), 0.01), 0.01);
  }
  const drape = smoothstep(0.1, -0.46, y);
  d += 0.005 * drape * Math.sin(x * 30 + noise3(x * 5, y * 2, z * 5) * 2.4);
  d += 0.0015 * noise3(x * 20, y * 20, z * 20);
  return d;
}

// ---------------------------------------------------------------------------
// Cap: six-panel crown, pre-curved brim, top button.
// ---------------------------------------------------------------------------
export function cap(x, y, z) {
  const crownE = sdEllipsoid(x, y, z + 0.01, 0.098, 0.088, 0.112);
  let crown = smax(crownE, -y, 0.004);
  // Panel seams: grooves along six meridians.
  const ang = Math.atan2(x, z);
  const seam = Math.abs(Math.sin(ang * 3));
  crown += 0.0022 * Math.exp(-((seam / 0.06) ** 2)) * smoothstep(0.0, 0.03, y);
  // Brim: a thin pre-curved disc in front of the crown, bent down at the sides.
  const bend = 0.028 * (x / 0.09) ** 2;
  const outline = (Math.hypot(x / 0.092, (z - 0.07) / 0.118) - 1) * 0.09;
  const slab = Math.abs(y - 0.004 + bend) - 0.0045;
  const brimD = smax(smax(slab, outline, 0.003), -(z - 0.05), 0.004);
  let d = smin(crown, brimD, 0.006);
  // Top button.
  d = smin(d, Math.hypot(x, y - 0.087, z + 0.01) - 0.008, 0.002);
  return d;
}

export const GARMENTS = {
  'signature-hoodie': { fn: hoodie, min: [-0.54, -0.53, -0.25], max: [0.54, 0.4, 0.22], res: [128, 80] },
  'heavyweight-tee': { fn: tee, min: [-0.5, -0.5, -0.17], max: [0.5, 0.3, 0.17], res: [116, 76] },
  cap: { fn: cap, min: [-0.13, -0.03, -0.14], max: [0.13, 0.11, 0.23], res: [104, 72] },
};
