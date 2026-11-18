#!/usr/bin/env node
// Builds the placeholder garment models in public/models/ from the SDF sculpts
// in scripts/garments/sdf.mjs.
//
//   node scripts/build-garments.mjs
//
// Surface nets mesher -> Newton projection onto the surface -> analytic normals
// -> box-projected UVs -> quantized GLB (KHR_mesh_quantization), one desktop
// LOD and one lighter mobile LOD per garment. Deterministic: the same sculpt
// always produces the same file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GARMENTS } from './garments/sdf.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'models');

function mesh(fn, min, max, res) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const step = Math.max(...size) / res;
  const n = size.map((s) => Math.ceil(s / step) + 1);
  const [nx, ny, nz] = n;
  const field = new Float32Array(nx * ny * nz);
  const at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++)
        field[at(i, j, k)] = fn(min[0] + i * step, min[1] + j * step, min[2] + k * step);

  // One vertex per cell that straddles the surface.
  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cat = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [];
  const corners = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ];
  const edges = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const v = corners.map(([a, b, c]) => field[at(i + a, j + b, k + c)]);
        let inside = 0;
        for (const x of v) if (x < 0) inside++;
        if (inside === 0 || inside === 8) continue;
        let sx = 0,
          sy = 0,
          sz = 0,
          cnt = 0;
        for (const [a, b] of edges) {
          if (v[a] < 0 === v[b] < 0) continue;
          const t = v[a] / (v[a] - v[b]);
          const ca = corners[a];
          const cb = corners[b];
          sx += ca[0] + (cb[0] - ca[0]) * t;
          sy += ca[1] + (cb[1] - ca[1]) * t;
          sz += ca[2] + (cb[2] - ca[2]) * t;
          cnt++;
        }
        cellVert[cat(i, j, k)] = pos.length / 3;
        pos.push(
          min[0] + (i + sx / cnt) * step,
          min[1] + (j + sy / cnt) * step,
          min[2] + (k + sz / cnt) * step,
        );
      }

  // Quads across every grid edge with a sign change.
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c);
    else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const f0 = field[at(i, j, k)] < 0;
        if (i < nx - 1 && f0 !== field[at(i + 1, j, k)] < 0)
          quad(
            cellVert[cat(i, j - 1, k - 1)],
            cellVert[cat(i, j, k - 1)],
            cellVert[cat(i, j, k)],
            cellVert[cat(i, j - 1, k)],
            !f0,
          );
        if (j < ny - 1 && f0 !== field[at(i, j + 1, k)] < 0)
          quad(
            cellVert[cat(i - 1, j, k - 1)],
            cellVert[cat(i - 1, j, k)],
            cellVert[cat(i, j, k)],
            cellVert[cat(i, j, k - 1)],
            !f0,
          );
        if (k < nz - 1 && f0 !== field[at(i, j, k + 1)] < 0)
          quad(
            cellVert[cat(i - 1, j - 1, k)],
            cellVert[cat(i, j - 1, k)],
            cellVert[cat(i, j, k)],
            cellVert[cat(i - 1, j, k)],
            !f0,
          );
      }

  // Project each vertex onto the true surface and take the analytic normal.
  const e = step * 0.25;
  const grad = (x, y, z) => {
    const gx = fn(x + e, y, z) - fn(x - e, y, z);
    const gy = fn(x, y + e, z) - fn(x, y - e, z);
    const gz = fn(x, y, z + e) - fn(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1;
    return [gx / l, gy / l, gz / l];
  };
  const nrm = new Float32Array(pos.length);
  for (let v = 0; v < pos.length; v += 3) {
    let x = pos[v],
      y = pos[v + 1],
      z = pos[v + 2];
    for (let it = 0; it < 2; it++) {
      const d = fn(x, y, z);
      const g = grad(x, y, z);
      x -= g[0] * d;
      y -= g[1] * d;
      z -= g[2] * d;
    }
    pos[v] = x;
    pos[v + 1] = y;
    pos[v + 2] = z;
    const g = grad(x, y, z);
    nrm[v] = g[0];
    nrm[v + 1] = g[1];
    nrm[v + 2] = g[2];
  }

  // Box-projected UVs at 1 unit = 1 metre. The fabric texture tiles finely, so
  // projection seams sit far below the scale anyone can read.
  const uv = new Float32Array((pos.length / 3) * 2);
  for (let v = 0, u = 0; v < pos.length; v += 3, u += 2) {
    const ax = Math.abs(nrm[v]),
      ay = Math.abs(nrm[v + 1]),
      az = Math.abs(nrm[v + 2]);
    if (az >= ax && az >= ay) {
      uv[u] = pos[v];
      uv[u + 1] = pos[v + 1];
    } else if (ax >= ay) {
      uv[u] = pos[v + 2];
      uv[u + 1] = pos[v + 1];
    } else {
      uv[u] = pos[v];
      uv[u + 1] = pos[v + 2];
    }
  }
  return { pos: new Float32Array(pos), nrm, uv, idx };
}

// ---------------------------------------------------------------------------
// Minimal GLB writer with KHR_mesh_quantization.
// ---------------------------------------------------------------------------
function writeGLB(file, name, m) {
  const count = m.pos.length / 3;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.pos.length; i += 3)
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], m.pos[i + a]);
      hi[a] = Math.max(hi[a], m.pos[i + a]);
    }
  const center = lo.map((l, a) => (l + hi[a]) / 2);
  const half = Math.max(...hi.map((h, a) => (h - lo[a]) / 2));

  const qpos = new Int16Array(count * 4); // padded to 8 bytes per vertex
  const qnrm = new Int8Array(count * 4);
  const quv = new Float32Array(m.uv);
  for (let v = 0; v < count; v++) {
    for (let a = 0; a < 3; a++) {
      qpos[v * 4 + a] = Math.round(((m.pos[v * 3 + a] - center[a]) / half) * 32767);
      qnrm[v * 4 + a] = Math.round(m.nrm[v * 3 + a] * 127);
    }
  }
  const index = count < 65536 ? new Uint16Array(m.idx) : new Uint32Array(m.idx);
  const pad = (n) => (n + 3) & ~3;
  const views = [qpos, qnrm, quv, index];
  let off = 0;
  const bufferViews = views.map((arr, i) => {
    const bv = { buffer: 0, byteOffset: off, byteLength: arr.byteLength };
    if (i < 3) bv.byteStride = i === 2 ? 8 : arr === qpos ? 8 : 4;
    bv.target = i < 3 ? 34962 : 34963;
    off = pad(off + arr.byteLength);
    return bv;
  });
  const bin = Buffer.alloc(off);
  let o = 0;
  for (const arr of views) {
    Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).copy(bin, o);
    o = pad(o + arr.byteLength);
  }
  const posMin = [-1, -1, -1].map((x, a) => Math.round(((lo[a] - center[a]) / half) * 32767) / 32767);
  const posMax = [1, 1, 1].map((x, a) => Math.round(((hi[a] - center[a]) / half) * 32767) / 32767);
  const json = {
    asset: { version: '2.0', generator: 'just-hit-a-liq build-garments (placeholder sculpt)' },
    extensionsUsed: ['KHR_mesh_quantization'],
    extensionsRequired: ['KHR_mesh_quantization'],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name, mesh: 0, translation: center, scale: [half, half, half] }],
    meshes: [
      { name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, mode: 4 }] },
    ],
    buffers: [{ byteLength: bin.length }],
    bufferViews,
    accessors: [
      { bufferView: 0, componentType: 5122, normalized: true, count, type: 'VEC3', min: posMin, max: posMax },
      { bufferView: 1, componentType: 5120, normalized: true, count, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count, type: 'VEC2' },
      {
        bufferView: 3,
        componentType: index instanceof Uint16Array ? 5123 : 5125,
        count: index.length,
        type: 'SCALAR',
      },
    ],
  };
  let jsonBuf = Buffer.from(JSON.stringify(json));
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad(jsonBuf.length) - jsonBuf.length, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8);
  const ch = (len, type) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(len, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  fs.writeFileSync(
    file,
    Buffer.concat([header, ch(jsonBuf.length, 0x4e4f534a), jsonBuf, ch(bin.length, 0x004e4942), bin]),
  );
  return { verts: count, tris: index.length / 3, bytes: fs.statSync(file).size };
}

fs.mkdirSync(OUT, { recursive: true });
const LODS = { '': 0, '-m': 1 };
for (const [slug, g] of Object.entries(GARMENTS)) {
  for (const [suffix, res] of Object.entries(LODS)) {
    const t = Date.now();
    const m = mesh(g.fn, g.min, g.max, g.res[res]);
    const r = writeGLB(path.join(OUT, `${slug}${suffix}.glb`), slug, m);
    console.log(
      `${slug}${suffix}.glb  ${r.verts} verts  ${r.tris} tris  ${(r.bytes / 1024).toFixed(0)} KB  ${Date.now() - t} ms`,
    );
  }
}
