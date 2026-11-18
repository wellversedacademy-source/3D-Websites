#!/usr/bin/env node
// Renders every still image the site uses FROM the live 3D scene, so posters,
// product cards, no-WebGL fallbacks and social previews share one art
// direction until real photography replaces them (docs/ASSETS.md).
//
//   npm run dev            (in another terminal; or set RENDER_URL)
//   npm run posters
//
// Needs Chromium + playwright-core and an ffmpeg with libwebp and libaom.

import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.RENDER_URL ?? 'http://localhost:5173';
const CHROME = process.env.SCROLLCRAFT_CHROME ?? '/opt/pw-browsers/chromium';
const RAW = path.join(ROOT, 'lab', 'renders-raw');
const OUT = path.join(ROOT, 'public');
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(path.join(OUT, 'renders'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'og'), { recursive: true });

const jobs = [
  // homepage chapter posters (no-WebGL fallback), 16:10
  ...['hero', 'awaken', 'strike', 'manifesto'].map((c) => ({
    url: `/?capture=${c}`,
    w: 1600,
    h: 1000,
    out: `renders/home-${c}`,
  })),
  { url: '/?capture=construct:layers', w: 1600, h: 1000, out: 'renders/home-construct' },
  { url: '/?capture=hero', w: 1200, h: 630, out: 'og/og-default', jpg: true },
];
// Pieces photographed on the owner's boards use those photos instead (crop-boards.mjs).
for (const handle of []) {
  jobs.push({ url: `/product/${handle}/?capture=front`, w: 1200, h: 1500, out: `renders/${handle}-front` });
  jobs.push({ url: `/product/${handle}/?capture=back`, w: 1200, h: 1500, out: `renders/${handle}-back` });
  jobs.push({
    url: `/product/${handle}/?capture=front`,
    w: 1200,
    h: 1500,
    out: `renders/${handle}-card`,
    card: true,
  });
  jobs.push({ url: `/product/${handle}/?capture=front`, w: 1200, h: 630, out: `og/${handle}`, jpg: true });
}

const ff = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const j of jobs.filter((x) => !process.env.ONLY || x.url.includes(process.env.ONLY))) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
  await page.goto(BASE + j.url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(() => document.title === 'captured', null, { timeout: 120000 });
  await page.waitForTimeout(600);
  const png = path.join(RAW, j.out.replace('/', '__') + '.png');
  await page.screenshot({ path: png });
  await page.close();
  const dest = path.join(OUT, j.out);
  if (j.jpg) ff('-i', png, '-q:v', '3', dest + '.jpg');
  else {
    ff('-i', png, '-c:v', 'libwebp', '-quality', '82', dest + '.webp');
    ff(
      '-i',
      png,
      '-c:v',
      'libaom-av1',
      '-still-picture',
      '1',
      '-crf',
      '30',
      '-cpu-used',
      '6',
      dest + '.avif',
    );
  }
  console.log('rendered', j.out);
}
await browser.close();

// Favicons and app icons from the strike icon.
const { strikeIconSVG } = await import('../src/brand/mark.ts');
const svg = path.join(RAW, 'icon.svg');
fs.writeFileSync(svg, strikeIconSVG('#E8E3D7', '#3A63F2', '#0B0B0D'));
const icons = path.join(OUT, 'icons');
fs.mkdirSync(icons, { recursive: true });
const iconBrowser = await chromium.launch({ executablePath: CHROME });
for (const [name, size] of [
  ['apple-touch-icon', 180],
  ['icon-192', 192],
  ['icon-512', 512],
  ['favicon-32', 32],
]) {
  const p = await iconBrowser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(
    `<style>html,body{margin:0;background:#0b0b0d}</style>${fs.readFileSync(svg, 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `)}`,
  );
  await p.screenshot({ path: path.join(icons, `${name}.png`) });
  await p.close();
}
await iconBrowser.close();
ff('-i', path.join(icons, 'favicon-32.png'), path.join(OUT, 'favicon.ico'));
console.log('icons written');
