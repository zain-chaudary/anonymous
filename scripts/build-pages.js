'use strict';
/**
 * build-pages.js — publish the standalone simulation for GitHub Pages.
 *
 * The page is a single self-contained HTML file, so "building" is a copy. It is
 * duplicated into docs/ because GitHub Pages can only serve from the repo root
 * or /docs, and serving the whole repo root would publish the lab alongside it.
 *
 *   node scripts/build-pages.js   → writes docs/index.html + docs/system-check.html
 */

const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'public', 'system-check.html');
const OUT_DIR = path.join(__dirname, '..', 'docs');

const html = fs.readFileSync(SRC, 'utf8');
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const name of ['index.html', 'system-check.html']) {
  fs.writeFileSync(path.join(OUT_DIR, name), html);
}

// GitHub Pages runs Jekyll by default; this tells it to serve files verbatim.
fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

console.log(`published ${(html.length / 1024).toFixed(1)} KB → docs/index.html, docs/system-check.html`);
