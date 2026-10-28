'use strict';
/**
 * System-check smoke test (dev-only).
 *
 * Proves three things about the scare page:
 *   1. it runs end to end and lands on the reveal screen,
 *   2. ESC gets you out immediately, mid-sequence,
 *   3. it makes ZERO network requests — no address lookup, no telemetry, no
 *      fake "callback to the attacker" that would be a real privacy problem.
 *
 * Usage:  node server.js &  &&  node scripts/system-check-smoke.js
 */

const { JSDOM, VirtualConsole } = require('jsdom');

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}


/**
 * Minimal WebAudio stand-in. Real browsers are not available to this test, but
 * the synth is the part most likely to throw at runtime (bad exponential ramp,
 * connect to a param, missing node) — so we execute every code path against a
 * strict fake that fails the way a real implementation would.
 */
function makeFakeAudio() {
  const stats = { oscillators: 0, noiseSources: 0, filters: 0, gains: 0, buffers: 0, ramps: 0, badRamps: 0 };

  class Param {
    constructor(v) { this.value = v; }
    setValueAtTime(v) { if (!Number.isFinite(v)) throw new Error('setValueAtTime(NaN)'); this.value = v; return this; }
    exponentialRampToValueAtTime(v) {
      stats.ramps += 1;
      if (!Number.isFinite(v) || v <= 0) {
        stats.badRamps += 1;
        throw new Error(`exponentialRampToValueAtTime(${v}) — must be finite and > 0 in WebAudio`);
      }
      this.value = v;
      return this;
    }
    linearRampToValueAtTime(v) { this.value = v; return this; }
    cancelScheduledValues() { return this; }
  }

  class Node {
    constructor() {
      this.gain = new Param(1);
      this.frequency = new Param(440);
      this.Q = new Param(1);
      this.threshold = new Param(-24);
      this.knee = new Param(30);
      this.ratio = new Param(12);
      this.attack = new Param(0.003);
      this.release = new Param(0.25);
      this.type = 'sine';
      this.buffer = null;
      this.loop = false;
      this.started = false;
      this.stopped = false;
    }
    connect(next) {
      if (!next) throw new Error('connect(undefined)');
      return next;
    }
    disconnect() {}
    start() { this.started = true; }
    stop() { this.stopped = true; }
  }

  class FakeCtx {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 48000;
      this.state = 'running';
      this.destination = new Node();
    }
    createGain() { stats.gains += 1; return new Node(); }
    createOscillator() { stats.oscillators += 1; return new Node(); }
    createBiquadFilter() { stats.filters += 1; return new Node(); }
    createDynamicsCompressor() { return new Node(); }
    createBufferSource() { stats.noiseSources += 1; return new Node(); }
    createBuffer(channels, len, rate) {
      stats.buffers += 1;
      const data = new Float32Array(len);
      return { length: len, sampleRate: rate, numberOfChannels: channels, getChannelData: () => data };
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }

  return { Ctx: FakeCtx, stats };
}

async function boot({ speed = 4, watchNetwork, audio } = {}) {
  const virtualConsole = new VirtualConsole();
  const pageErrors = [];
  virtualConsole.on('jsdomError', (e) => pageErrors.push(e.message));

  const dom = await JSDOM.fromURL(`${BASE}/system-check?speed=${speed}`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      if (audio) {
        window.AudioContext = audio.Ctx;
        window.webkitAudioContext = audio.Ctx;
      }
    },
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
    const stage = doc.querySelector('#stage');
    assert(gate && stage, 'page structure missing');
    assert(!gate.classList.contains('hidden'), 'gate should be visible on load');
    assert(stage.hidden, 'theatre must stay hidden until the user opts in');

    doc.querySelector('#btnStart').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(300);
    assert(gate.classList.contains('hidden'), 'gate did not hide after start');
    assert(!stage.hidden, 'theatre did not start');
    assert(doc.querySelector('.scene.on'), 'no scene became active');

    // Wait for the sequence to finish (10s countdown at 4x + the rest).
    const deadline = Date.now() + 25000;
    while (doc.querySelector('#reveal').hidden && Date.now() < deadline) await sleep(200);

    assert(!doc.querySelector('#reveal').hidden, 'sequence never reached the reveal screen');
    assert(/That was fake/i.test(doc.querySelector('#reveal').textContent), 'reveal copy missing');
    assert(doc.querySelector('#stage').hidden, 'theatre still visible after finishing');
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
    assert(!doc.querySelector('#stage').hidden, 'theatre did not start');

    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(300);

    assert(doc.querySelector('#stage').hidden, 'ESC did not stop the theatre');
    assert(!doc.querySelector('#reveal').hidden, 'ESC did not show the reveal screen');
    assert(/Simulation ended/i.test(doc.querySelector('.reveal-tag').textContent), 'reveal should say it was ended by the user');

    // Scenes must stop advancing after the panic exit.
    const before = doc.querySelector('.scene.on')?.dataset.scene;
    await sleep(1200);
    const after = doc.querySelector('.scene.on')?.dataset.scene;
    assert(before === after, 'timeline kept running after ESC');

    window.close();
  }

  // -------------------------------------------------- sound synthesis -----
  {
    const audio = makeFakeAudio();
    const { dom, pageErrors } = await boot({ speed: 4, audio });

    const { window } = dom;
    const doc = window.document;
    assert(doc.querySelector('#chkSound').checked, 'sound should be on by default');
    assert(doc.querySelector('#mute'), 'mute button missing from the HUD');

    doc.querySelector('#btnStart').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const deadline = Date.now() + 25000;
    while (doc.querySelector('#reveal').hidden && Date.now() < deadline) await sleep(200);
    assert(!doc.querySelector('#reveal').hidden, 'sound run never finished');
    assert(pageErrors.length === 0, `page threw with audio active: ${pageErrors.join(' | ')}`);

    assert(audio.stats.badRamps === 0, `invalid exponential ramps: ${audio.stats.badRamps}`);
    assert(audio.stats.oscillators > 40, `too few tones scheduled (${audio.stats.oscillators}) — synth may not have run`);
    assert(audio.stats.noiseSources > 20, `too few noise events (${audio.stats.noiseSources}) — textures missing`);
    assert(audio.stats.buffers === 1, 'the shared noise buffer should be built exactly once');
    assert(audio.stats.filters > 10, 'filters are what make the sounds distinct — none were used');

    // Mute has to actually silence the graph and stop the loops.
    const before = audio.stats.oscillators;
    doc.querySelector('#btnReplay').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(100);
    doc.querySelector('#btnStart').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(400);
    doc.querySelector('#mute').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(120);
    const mutedAt = audio.stats.oscillators;
    assert(/sound: off/i.test(doc.querySelector('#mute').textContent), 'mute button label did not update');
    await sleep(900);
    assert(audio.stats.oscillators === mutedAt, 'tones kept firing after mute');

    window.close();
  }

  console.log('System-check smoke test passed');
})().catch((err) => {
  console.error('System-check smoke test FAILED:', err.message);
  process.exit(1);
});
