#!/usr/bin/env node
// Pushes the built site (dist/) to a private-by-obscurity workers.dev PREVIEW,
// served from KV by worker/preview.ts. See that file for why this exists.
//
//   npm run build
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/deploy-preview.mjs
//
// Production deploys use `npm run deploy` (Workers static assets) instead.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const LAB = path.join(ROOT, 'lab');
const API = 'https://api.cloudflare.com/client/v4';
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const NAME = 'just-hit-a-liq-preview';
if (!ACCOUNT || !TOKEN) throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.');
fs.mkdirSync(LAB, { recursive: true });

const cf = async (method, p, body, headers = { 'content-type': 'application/json' }) => {
  const res = await fetch(API + p, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, ...headers },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) throw new Error(`${method} ${p}: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  return json.result;
};

// 1. KV namespace for the site files (created once, reused after).
const title = `${NAME}-site`;
const spaces = await cf('GET', `/accounts/${ACCOUNT}/storage/kv/namespaces?per_page=100`);
let ns = spaces.find((s) => s.title === title);
if (!ns) ns = await cf('POST', `/accounts/${ACCOUNT}/storage/kv/namespaces`, JSON.stringify({ title }));
console.log('kv namespace ready');

// 2. Upload every file in dist/ as /path -> base64 value, in batches.
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(DIST);
let batch = [];
let size = 0;
const flush = async () => {
  if (!batch.length) return;
  await cf('PUT', `/accounts/${ACCOUNT}/storage/kv/namespaces/${ns.id}/bulk`, JSON.stringify(batch));
  batch = [];
  size = 0;
};
for (const f of files) {
  const value = fs.readFileSync(f).toString('base64');
  if (size + value.length > 60_000_000) await flush();
  batch.push({ key: '/' + path.relative(DIST, f).split(path.sep).join('/'), value, base64: true });
  size += value.length;
}
await flush();
console.log(`uploaded ${files.length} files`);

// 3. Deploy the preview Worker bound to that namespace.
const config = path.join(LAB, 'wrangler.preview.json');
fs.writeFileSync(
  config,
  JSON.stringify(
    {
      name: NAME,
      main: path.join(ROOT, 'worker', 'preview.ts'),
      compatibility_date: '2025-09-01',
      workers_dev: true,
      kv_namespaces: [{ binding: 'SITE', id: ns.id }],
    },
    null,
    2,
  ),
);
execFileSync('npx', ['wrangler', 'deploy', '--config', config], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
