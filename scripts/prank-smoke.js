'use strict';
/**
 * Prank-mode smoke test (dev-only).
 *
 * Proves three things about the scare page:
 *   1. it runs end to end and lands on the reveal screen,
 *   2. ESC gets you out immediately, mid-sequence,
 *   3. it makes ZERO network requests — no address lookup, no telemetry, no
 *      fake "callback to the attacker" that would be a real privacy problem.
 *
 * Usage:  node server.js &  &&  node scripts/prank-smoke.js
 */

const { JSDOM, VirtualConsole } = require('jsdom');

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function boot({ speed = 4, watchNetwork } = {}) {
  const virtualConsole = new VirtualConsole();
  const pageErrors = [];
  virtualConsole.on('jsdomError', (e) => pageErrors.push(e.message));

  const dom = await JSDOM.fromURL(`${BASE}/prank?speed=${speed}`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
  });

  const requests = [];
  if (watchNetwork) {
    // Intercept anything that tries to leave the page.
    dom.window.fetch = (url) => {
      requests.push(String(url));
      return Promise.reject(new Error('blocked in test'));
    };
    dom.window.XMLHttpRequest = function XHR() {
      requests.push('xhr');
      throw new Error('blocked in test');
    };
    const RealWS = dom.window.WebSocket;
    if (RealWS) {
      dom.window.WebSocket = function WS(url) {
        requests.push(`ws:${url}`);
        throw new Error('blocked in test');
      };
    }
    dom.window.navigator.sendBeacon = (url) => {
      requests.push(`beacon:${url}`);
      return true;
    };
  }

  return { dom, requests, pageErrors };
}

(async () => {
  // ---------------------------------------------------------- full run ----
  {
    const { dom, requests, pageErrors } = await boot({ speed: 4, watchNetwork: true });
    const { window } = dom;
    const doc = window.document;

    const gate = doc.querySelector('#gate');
    const prank = doc.querySelector('#prank');
    assert(gate && prank, 'page structure missing');
    assert(!gate.classList.contains('hidden'), 'gate should be visible on load');
    assert(prank.hidden, 'theatre must stay hidden until the user opts in');

    doc.querySelector('#btnStart').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(300);
    assert(gate.classList.contains('hidden'), 'gate did not hide after start');
    assert(!prank.hidden, 'theatre did not start');
    assert(doc.querySelector('.scene.on'), 'no scene became active');

    // Wait for the sequence to finish (10s countdown at 4x + the rest).
    const deadline = Date.now() + 25000;
    while (doc.querySelector('#reveal').hidden && Date.now() < deadline) await sleep(200);

    assert(!doc.querySelector('#reveal').hidden, 'sequence never reached the reveal screen');
    assert(/That was fake/i.test(doc.querySelector('#reveal').textContent), 'reveal copy missing');
    assert(doc.querySelector('#prank').hidden, 'theatre still visible after finishing');
    assert(pageErrors.length === 0, `page threw: ${pageErrors.join(' | ')}`);
    assert(requests.length === 0, `page made network requests: ${requests.join(', ')}`);

    // Every address on the page must be non-routable: documentation ranges
    // (RFC 5737) or private space (RFC 1918). Never a real host.
    const body = doc.body.textContent;
    assert(body.includes('203.0.113.'), 'expected the reserved documentation address in the trace');

    const ips = body.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || [];
    const allowed = [
      /^192\.0\.2\.\d+$/,     // TEST-NET-1
      /^198\.51\.100\.\d+$/,  // TEST-NET-2
      /^203\.0\.113\.\d+$/,   // TEST-NET-3
      /^10\.\d+\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+$/,
      /^127\.0\.0\.1$/,
    ];
    for (const ip of [...new Set(ips)]) {
      assert(allowed.some((re) => re.test(ip)), `page contains a routable address: ${ip}`);
    }

    window.close();
  }

  // -------------------------------------------------------------- ESC -----
  {
    const { dom } = await boot({ speed: 1 });
    const { window } = dom;
    const doc = window.document;

    doc.querySelector('#btnStart').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(600);
    assert(!doc.querySelector('#prank').hidden, 'theatre did not start');

    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(300);

    assert(doc.querySelector('#prank').hidden, 'ESC did not stop the theatre');
    assert(!doc.querySelector('#reveal').hidden, 'ESC did not show the reveal screen');
    assert(/Simulation ended/i.test(doc.querySelector('.reveal-tag').textContent), 'reveal should say it was ended by the user');

    // Scenes must stop advancing after the panic exit.
    const before = doc.querySelector('.scene.on')?.dataset.scene;
    await sleep(1200);
    const after = doc.querySelector('.scene.on')?.dataset.scene;
    assert(before === after, 'timeline kept running after ESC');

    window.close();
  }

  console.log('Prank smoke test passed');
})().catch((err) => {
  console.error('Prank smoke test FAILED:', err.message);
  process.exit(1);
});
