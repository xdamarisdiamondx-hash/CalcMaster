#!/usr/bin/env node
/* Builds www/ — the web bundle the Android (Capacitor) app ships with.
   Only runtime files are copied; server-side files (server.ps1, api/,
   .env, scripts) are deliberately excluded. */
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const www = join(root, 'www');

const FILES = [
  'index.html',
  'styles.css',
  'config.js',
  'audio.js',
  'history.js',
  'calculator.js',
  'currency.js',
  'unit.js',
  'app.js'
];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

let bytes = 0;
for (const file of FILES) {
  const src = join(root, file);
  if (!existsSync(src)) {
    console.error(`build-web: missing ${file}`);
    process.exit(1);
  }
  cpSync(src, join(www, file));
  bytes += statSync(src).size;
}

console.log(`build-web: www/ ready (${FILES.length} files, ${(bytes / 1024).toFixed(1)} KB)`);
