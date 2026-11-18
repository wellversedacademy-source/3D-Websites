#!/usr/bin/env node
// Extracts the L and Q outlines from Bodoni Moda (the site's display face)
// into src/brand/glyphs.json, so the LiQ mark renders identically in the
// header, favicon, and the prints on the 3D garments without depending on a
// font being loaded. Run after changing the face or the mark's proportions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const font = opentype.loadSync(
  path.join(ROOT, 'node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-500-normal.woff'),
);
const SIZE = 150; // units per mark, in the 300 x 160 mark viewBox
const BASE = 128; // baseline
const glyph = (ch, x) => {
  const p = font.getPath(ch, x, BASE, SIZE);
  const bb = p.getBoundingBox();
  return {
    d: p.toPathData(2),
    x1: +bb.x1.toFixed(2),
    x2: +bb.x2.toFixed(2),
    y1: +bb.y1.toFixed(2),
    y2: +bb.y2.toFixed(2),
  };
};
const L = glyph('L', 4);
const Q = glyph('Q', 0);
// Place Q after the candlestick i with a fixed gap.
const qx = 150 - Q.x1;
const Qp = glyph('Q', qx);
fs.writeFileSync(
  path.join(ROOT, 'src/brand/glyphs.json'),
  JSON.stringify({ size: SIZE, base: BASE, L, Q: Qp }, null, 2) + '\n',
);
console.log('L', L.x1, L.x2, L.y1, L.y2, ' Q', Qp.x1, Qp.x2, Qp.y1, Qp.y2);
