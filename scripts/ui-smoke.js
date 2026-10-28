'use strict';
/**
 * UI smoke test (dev-only, not part of `node --test`).
 *
 * Loads the real page in jsdom against a running server, then drives the whole
 * workflow through the actual buttons. Catches the class of bug that only shows
 * up at runtime: missing elements, bad event wiring, render crashes.
 *
 * Usage:  node server.js &  &&  npm i --no-save jsdom  &&  node test/ui.smoke.js
 */

const { JSDOM, VirtualConsole } = require('jsdom');

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const errors = [];

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push(`jsdomError: ${e.message}`));
virtualConsole.on('error', (...args) => errors.push(`console.error: ${args.join(' ')}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class FakeEventSource {
  constructor() {
    this.listeners = {};
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  close() {}
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

(async () => {
  // Deterministic starting point: reimage the patient before loading the page.
  await fetch(`${BASE}/api/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  const html = await (await fetch(`${BASE}/`)).text();
  const dom = new JSDOM(html, {
    url: BASE,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;

  window.fetch = (path, opts) => fetch(new URL(path, BASE).toString(), opts);
  window.EventSource = FakeEventSource;

  // Load the app script manually so we control globals first.
  const appJs = await (await fetch(`${BASE}/app.js`)).text();
  window.eval(appJs);
  await sleep(700);

  const doc = window.document;
  const $ = (s) => doc.querySelector(s);
  const click = async (sel, wait = 700) => {
    const node = $(sel);
    assert(node, `missing element ${sel}`);
    node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(wait);
  };

  // --- initial paint ------------------------------------------------------
  assert($('#phase').textContent === 'clean', `phase should start clean, got ${$('#phase').textContent}`);
  assert($('#tree').children.length > 0, 'file tree did not render');
  const leafCount = doc.querySelectorAll('#tree .row.file').length;
  assert(leafCount >= 10, `expected at least 10 files in tree, saw ${leafCount}`);
  assert($('#console').children.length > 0, 'event log is empty on boot');

  // --- kill chain ---------------------------------------------------------
  await click('#btnInfectAll', 1400);
  assert($('#phase').textContent === 'infected', 'phase did not become infected');
  const infectedRows = doc.querySelectorAll('#tree .row.file.infected').length;
  assert(infectedRows > 0, 'no files marked infected in the tree after the kill chain');
  assert($('#step-infect').classList.contains('done'), 'step 1 not marked done');

  // --- file inspector -----------------------------------------------------
  const target = [...doc.querySelectorAll('#tree .row.file')].find((r) => r.textContent.includes('todo.txt'));
  target.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(500);
  assert($('#modal').classList.contains('open'), 'file modal did not open');
  assert($('#modalBody').textContent.includes('TODO'), 'file contents not shown');
  $('#modalClose').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(100);

  // --- vaccine: mount, scan, heal, immunise -------------------------------
  await click('#btnMount', 600);
  assert(!$('#btnScan').disabled, 'scan button should be enabled once the vaccine is mounted');

  await click('#btnScan', 1200);
  assert($('#findingPill').textContent !== '0', 'scan produced no findings');
  assert(doc.querySelectorAll('.finding').length > 0, 'findings list did not render');

  await click('#btnHeal', 1800);
  assert($('#phase').textContent === 'healed', `phase after heal should be healed, got ${$('#phase').textContent}`);
  assert($('#healResult').textContent.includes('Verified clean'), 'heal summary missing verification');
  assert(doc.querySelectorAll('#tree .row.file.infected').length === 0, 'tree still shows infected files after heal');

  await click('#btnImmunize', 800);
  assert($('#protectionStrip').classList.contains('armed'), 'protection strip not armed after vaccinate');
  assert($('#protectToggle').checked, 'real-time toggle should be on');

  // --- second attack is blocked ------------------------------------------
  await click('#btnInfectAll', 1600);
  assert($('#phase').textContent === 'contained', `phase should be contained, got ${$('#phase').textContent}`);
  assert(doc.querySelectorAll('#tree .row.file.infected').length === 0, 'files got infected despite protection');
  assert(doc.querySelectorAll('.toast').length > 0, 'no block toast shown');

  // --- tabs ---------------------------------------------------------------
  doc.querySelector('[data-tab="vault"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(300);
  assert(doc.querySelectorAll('.vault-item').length > 0, 'vault tab empty after remediation');

  doc.querySelector('[data-tab="registry"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(300);
  assert(!$('#tabBody').textContent.includes('SystemHealthMonitor'), 'malicious run key survived remediation');
  assert(!$('#tabBody').textContent.includes('MsEdgeUpdateTaskSIM7'), 'malicious task survived remediation');
  assert(doc.querySelectorAll('.reg-item.bad').length === 0, 'flagged autorun entries survived remediation');
  assert($('#tabBody').textContent.includes('OneDrive'), 'legitimate autoruns should still be listed');

  // --- reset --------------------------------------------------------------
  await click('#btnReset', 900);
  assert($('#phase').textContent === 'clean', 'reset did not return to clean');
  assert($('#findingPill').textContent === '0', 'findings survived reset');

  if (errors.length) {
    console.error('UI errors:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('UI smoke test passed');
  window.close();
})().catch((err) => {
  console.error('UI smoke test FAILED:', err.message);
  if (errors.length) console.error('console errors:\n' + errors.join('\n'));
  process.exit(1);
});
