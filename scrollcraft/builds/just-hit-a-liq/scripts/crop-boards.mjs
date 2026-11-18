#!/usr/bin/env node
// Cuts the product boards in assets-src/boards/ into individual product
// images (front, back, angle, details) for the site.
//
//   node scripts/crop-boards.mjs
//
// The boards are design concepts at 1122x1402; replace them with real
// sample photography when it exists (docs/ASSETS.md) and re-run.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets-src', 'boards');
const OUT = path.join(ROOT, 'public', 'photos');
const RAW = path.join(ROOT, 'lab', 'crops');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

// [x, y, w, h] on the 1122x1402 board. Garment views share one layout; the
// detail tiles differ slightly per board.
const VIEWS = {
  front: [12, 58, 548, 590],
  back: [560, 40, 552, 590],
};
const BOARDS = {
  'signature-hoodie': {
    front: [15, 72, 540, 545],
    back: [565, 64, 545, 545],
    angle: [50, 612, 300, 333],
    details: {
      label: [12, 966, 298, 182],
      chest: [317, 966, 236, 182],
      back: [560, 966, 288, 182],
      fleece: [855, 966, 255, 182],
      neck: [12, 1180, 290, 157],
      cuff: [573, 1180, 264, 157],
    },
  },
  'technical-zip-hoodie': {
    front: [15, 66, 540, 548],
    back: [565, 64, 545, 545],
    angle: [50, 604, 300, 333],
    details: {
      label: [12, 966, 294, 180],
      zipper: [314, 966, 240, 180],
      chest: [562, 966, 252, 180],
      back: [822, 966, 288, 180],
      hood: [12, 1178, 292, 160],
      pocket: [310, 1178, 258, 160],
    },
  },
  'heavyweight-tee': {
    front: [25, 72, 525, 500],
    back: [552, 72, 550, 500],
    angle: [55, 590, 285, 330],
    details: {
      label: [12, 930, 296, 182],
      chest: [316, 930, 238, 182],
      back: [562, 930, 284, 182],
      jersey: [852, 930, 258, 182],
      neck: [12, 1145, 288, 180],
      sleeve: [576, 1145, 258, 180],
    },
  },
  'structured-sweatpants': {
    front: [262, 58, 300, 590],
    back: [648, 58, 302, 590],
    angle: [38, 592, 225, 345],
    details: {
      label: [12, 966, 298, 180],
      waist: [318, 966, 236, 180],
      thigh: [562, 966, 284, 180],
      ladder: [852, 966, 258, 180],
      pocket: [12, 1176, 292, 160],
      cuff: [576, 1176, 258, 160],
    },
  },
  'limited-atelier-jacket': {
    front: [15, 62, 545, 512],
    back: [565, 58, 545, 545],
    angle: [116, 592, 220, 352],
    details: {
      label: [12, 955, 296, 173],
      zipper: [316, 955, 244, 173],
      chest: [567, 955, 263, 173],
      back: [838, 955, 275, 173],
      collar: [12, 1165, 286, 161],
      pocket: [307, 1165, 258, 161],
      snap: [574, 1165, 258, 161],
      twill: [840, 1165, 273, 161],
    },
  },
  'signature-knit-long-sleeve': {
    front: [40, 64, 500, 532],
    back: [568, 64, 525, 532],
    angle: [60, 600, 260, 345],
    details: {
      label: [12, 966, 298, 180],
      chest: [318, 966, 240, 180],
      ladder: [565, 966, 280, 180],
      knit: [851, 966, 260, 180],
      collar: [12, 1176, 248, 142],
      sleeve: [488, 1176, 200, 142],
    },
  },
};
const BG = '0xd7d8dc';
const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a]);

for (const [handle, b] of Object.entries(BOARDS)) {
  const src = path.join(SRC, `${handle}.webp`);
  const jobs = { front: b.front ?? VIEWS.front, back: b.back ?? VIEWS.back, angle: b.angle };
  for (const [name, [x, y, w, h]] of Object.entries(jobs)) {
    // Garment views: centre on a 4:5 canvas of the board's own grey, upscaled
    // to 960x1200 with a sharp filter.
    const png = path.join(RAW, `${handle}-${name}.png`);
    ff(
      '-i',
      src,
      '-vf',
      `crop=${w}:${h}:${x}:${y},scale=w='min(960,iw*1200/ih)':h='min(1200,ih*960/iw)':flags=lanczos,pad=960:1200:(ow-iw)/2:(oh-ih)/2:color=${BG}`,
      png,
    );
    ff('-i', png, '-c:v', 'libwebp', '-quality', '86', path.join(OUT, `${handle}-${name}.webp`));
    ff(
      '-i',
      png,
      '-c:v',
      'libaom-av1',
      '-still-picture',
      '1',
      '-crf',
      '28',
      '-cpu-used',
      '6',
      path.join(OUT, `${handle}-${name}.avif`),
    );
  }
  for (const [name, [x, y, w, h]] of Object.entries(b.details)) {
    const png = path.join(RAW, `${handle}-detail-${name}.png`);
    ff('-i', src, '-vf', `crop=${w}:${h}:${x}:${y},scale=-2:480:flags=lanczos`, png);
    ff('-i', png, '-c:v', 'libwebp', '-quality', '86', path.join(OUT, `${handle}-detail-${name}.webp`));
  }
  // Social preview: front and back side by side on the board's grey.
  ff(
    '-i',
    path.join(RAW, `${handle}-front.png`),
    '-i',
    path.join(RAW, `${handle}-back.png`),
    '-filter_complex',
    `[0]scale=-1:600[a];[1]scale=-1:600[b];[a][b]hstack,pad=1200:630:(ow-iw)/2:(oh-ih)/2:color=${BG}`,
    '-q:v',
    '3',
    path.join(ROOT, 'public', 'og', `${handle}.jpg`),
  );
  console.log('cropped', handle);
}
