'use strict';
/**
 * build-pages.js — publish the standalone simulation for GitHub Pages.
 *
 * The page is a single self-contained HTML file, so "building" is a copy.
 *
 * GitHub Pages for this repo is configured as: branch = this branch,
 * folder = "/" (repo root). So the files have to sit at the ROOT of the repo,
 * not in public/ and not in docs/. Writing them here keeps the source of truth
 * in public/system-check.html and makes the published copy disposable.
 *
 *   node scripts/build-pages.js
 *     → index.html          (same page, so /anonymous/ works)
 *     → system-check.html   (so /anonymous/system-check.html works)
 *     → .nojekyll           (serve verbatim, skip Jekyll)
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'system-check.html');

const html = fs.readFileSync(SRC, 'utf8');

/** A published copy must not be mistaken for a server-rendered app. */
const banner = `<!--
  GENERATED FILE — do not edit here.
  Source: public/system-check.html   ·   Rebuild: node scripts/build-pages.js
  Self-contained: no assets, no network requests, no backend required.
-->\n`;

const out = html.replace(/^<!doctype html>/i, (m) => `${m}\n${banner}`);

for (const name of ['index.html', 'system-check.html']) {
  fs.writeFileSync(path.join(ROOT, name), out);
}
fs.writeFileSync(path.join(ROOT, '.nojekyll'), '');

// Retire the docs/ variant: Pages is pointed at the root, so a second copy in
// docs/ is just a thing that can go stale.
fs.rmSync(path.join(ROOT, 'docs'), { recursive: true, force: true });

console.log(`published ${(out.length / 1024).toFixed(1)} KB → /index.html, /system-check.html, /.nojekyll`);
