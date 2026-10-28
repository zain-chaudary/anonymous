'use strict';
/**
 * lab.js — orchestration and state for one "patient laptop".
 *
 * Sits between the two halves of the project:
 *   virus.js   -> wants to write files
 *   patientFs  -> asks the vaccine first (on-access protection)
 *   vaccine.js -> decides whether the write is allowed
 *
 * Everything is serialised through a promise chain so a scan can never
 * interleave with an infection mid-write.
 */

const { EventEmitter } = require('node:events');
const safeFs = require('./safeFs');
const image = require('./image');
const virus = require('./virus');
const vaccine = require('./vaccine');

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

const MAX_LOGS = 500;

const state = {
  phase: 'clean',        // clean | infected | healed
  stage: 0,
  mounted: false,
  protection: false,
  immunity: null,
  lastScan: null,
  lastHeal: null,
  logs: [],
  startedAt: new Date().toISOString(),
};

let chain = Promise.resolve();
const serialize = (fn) => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
};

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(level, msg) {
  const entry = { t: new Date().toISOString(), level, msg };
  state.logs.push(entry);
  if (state.logs.length > MAX_LOGS) state.logs.shift();
  emitter.emit('log', entry);
  return entry;
}

const on = (event, handler) => emitter.on(event, handler);

// ---------------------------------------------------------------------------
// The patient filesystem, with on-access protection in front of it
// ---------------------------------------------------------------------------

async function patientWrite(targetPath, content, meta = {}) {
  if (state.protection && state.immunity) {
    const verdict = vaccine.inspectWrite(targetPath, content, state.immunity);
    if (verdict.blocked) {
      log('shield', `[vaccine] BLOCKED write → ${targetPath} (${verdict.reason})`);
      emitter.emit('blocked', { path: targetPath, ...verdict });
      return { blocked: true, ...verdict };
    }
  }
  await safeFs.write(targetPath, content);
  if (meta.actor === 'virus') log('virus', `[virus] wrote ${targetPath}`);
  return { blocked: false };
}

async function patientMove(fromPath, toPath, meta = {}) {
  if (state.protection && state.immunity) {
    const verdict = vaccine.inspectWrite(toPath, '', state.immunity);
    if (verdict.blocked) {
      log('shield', `[vaccine] BLOCKED move → ${toPath} (${verdict.reason})`);
      return { blocked: true, ...verdict };
    }
  }
  await safeFs.move(fromPath, toPath);
  if (meta.actor === 'virus') log('virus', `[virus] moved ${fromPath} → ${toPath}`);
  return { blocked: false };
}

async function readRegistry() {
  try {
    return JSON.parse(await safeFs.read(image.REGISTRY_PATH));
  } catch {
    return { entries: [], scheduledTasks: [], denyList: [] };
  }
}

const ctx = {
  log,
  exists: safeFs.exists,
  read: (p) => safeFs.read(p).catch(() => null),
  walk: (p) => safeFs.walk(p).catch(() => []),
  remove: async (p, meta) => {
    if (state.protection && state.immunity) {
      const v = vaccine.inspectWrite(p, '', state.immunity);
      if (v.blocked) {
        log('shield', `[vaccine] BLOCKED delete → ${p} (${v.reason})`);
        return { blocked: true };
      }
    }
    await safeFs.remove(p);
    if (meta?.actor === 'virus') log('virus', `[virus] deleted ${p}`);
    return { blocked: false };
  },
  move: patientMove,
  write: patientWrite,
  registry: {
    async add(entry) {
      const reg = await readRegistry();
      if (state.protection && state.immunity && entry.trusted === false) {
        log('shield', `[vaccine] BLOCKED persistence → Run\\${entry.name} (untrusted logon entry while protection is armed)`);
        return { blocked: true };
      }
      if (reg.denyList?.includes(entry.path)) {
        log('shield', `[vaccine] BLOCKED persistence → ${entry.name} (path on deny-list)`);
        return { blocked: true };
      }
      reg.entries = [...(reg.entries || []).filter((e) => e.name !== entry.name), entry];
      await safeFs.write(image.REGISTRY_PATH, JSON.stringify(reg, null, 2));
      log('virus', `[virus] registry Run key added: ${entry.name}`);
      return { blocked: false };
    },
    async addTask(task) {
      if (state.protection && state.immunity) {
        log('shield', `[vaccine] BLOCKED persistence → scheduled task \\${task.name} (protection is armed)`);
        return { blocked: true };
      }
      const reg = await readRegistry();
      reg.scheduledTasks = [...(reg.scheduledTasks || []).filter((t) => t.name !== task.name), task];
      await safeFs.write(image.REGISTRY_PATH, JSON.stringify(reg, null, 2));
      log('virus', `[virus] scheduled task created: ${task.name}`);
      return { blocked: false };
    },
  },
};

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function reset() {
  return serialize(async () => {
    await image.reset();
    Object.assign(state, {
      phase: 'clean',
      stage: 0,
      mounted: false,
      protection: false,
      immunity: null,
      lastScan: null,
      lastHeal: null,
      logs: [],
      startedAt: new Date().toISOString(),
    });
    log('info', '[lab] patient PC reimaged: clean Windows guest profile, D:\\ removable attached');
    log('info', `[lab] signature database v${vaccine.SIGNATURES.version} available on the vaccine`);
    emitter.emit('state', await snapshot());
    return snapshot();
  });
}

async function infect(stages) {
  return serialize(async () => {
    const wanted = stages === 'all' ? virus.STAGES.map((s) => s.id) : stages;
    const results = [];

    // Any new activity invalidates the previous scan: the report you are
    // looking at no longer describes the disk. Forcing a rescan is the honest
    // behaviour, and it stops a stale green tick from lying to the operator.
    state.lastScan = null;
    state.lastHeal = null;
    for (const id of wanted) {
      const stage = virus.STAGES.find((s) => s.id === id);
      if (!stage) continue;
      log('stage', `[virus] ▶ stage ${stage.id}: ${stage.title} — ${stage.blurb}`);
      const out = await stage.run(ctx);
      results.push({ id, title: stage.title, out });
      state.stage = Math.max(state.stage, id);
    }
    state.phase = state.protection && state.immunity ? 'contained' : 'infected';
    emitter.emit('state', await snapshot());
    return { phase: state.phase, results };
  });
}

async function mount() {
  state.mounted = true;
  log('shield', `[vaccine] USB vaccine inserted — definition set ${vaccine.SIGNATURES.version} mounted read-only`);
  emitter.emit('state', await snapshot());
  return { mounted: true, version: vaccine.SIGNATURES.version };
}

async function unmount() {
  state.mounted = false;
  log('warn', '[vaccine] USB vaccine removed — definitions offline, on-access protection paused');
  state.protection = false;
  emitter.emit('state', await snapshot());
  return { mounted: false };
}

async function scan() {
  return serialize(async () => {
    if (!state.mounted) {
      const err = 'no definition set mounted — insert the vaccine first';
      log('error', `[scan] ${err}`);
      return { error: err };
    }
    log('info', '[scan] full disk scan started');
    const report = await vaccine.scan({ log });
    state.lastScan = report;
    if (!report.stats.clean) state.phase = state.phase === 'contained' ? 'contained' : 'infected';
    log(
      'info',
      `[scan] complete — ${report.filesScanned} files, ${report.stats.infected} infected, ${report.stats.suspicious} suspicious`
    );
    emitter.emit('state', await snapshot());
    return report;
  });
}

async function heal() {
  return serialize(async () => {
    if (!state.lastScan) {
      const err = 'run a scan before healing — an engine must know what it is removing';
      log('error', `[heal] ${err}`);
      return { error: err };
    }
    log('info', '[heal] remediation started');
    const report = await vaccine.heal(state.lastScan, { log });
    state.lastHeal = report;
    // The verification rescan becomes the new source of truth for the UI, so a
    // healed patient shows a clean disk instead of stale red markers.
    state.lastScan = report.rescan;
    if (report.verification.clean) {
      state.phase = state.protection ? 'contained' : 'healed';
      log('ok', '[heal] verification rescan is clean — 0 findings');
    } else {
      log('warn', `[heal] ${report.verification.remaining} finding(s) survived remediation`);
    }
    emitter.emit('state', await snapshot());
    return report;
  });
}

async function immunize() {
  return serialize(async () => {
    if (!state.mounted) {
      const err = 'insert the vaccine before immunising';
      log('error', `[immunize] ${err}`);
      return { error: err };
    }
    const reg = await readRegistry();
    const record = await vaccine.immunize({ registry: reg });
    state.immunity = record;
    state.protection = true;
    state.phase = 'contained';
    log('shield', '[immunize] vaccination record written to C:\\Windows\\immunity.json');
    log('shield', '[immunize] on-access protection armed — known payloads are now blocked at write time');
    emitter.emit('state', await snapshot());
    return record;
  });
}

async function setProtection(enabled) {
  if (enabled && !state.immunity) {
    const err = 'immunise first — protection without signatures is theatre';
    log('error', `[protect] ${err}`);
    return { error: err };
  }
  state.protection = !!enabled;
  log(enabled ? 'shield' : 'warn', `[protect] on-access protection ${enabled ? 'ARMED' : 'DISARMED'}`);
  emitter.emit('state', await snapshot());
  return { protection: state.protection };
}

// ---------------------------------------------------------------------------
// Snapshot for the UI
// ---------------------------------------------------------------------------

function buildTree(paths, findings, quick = new Map()) {
  const byPath = new Map(findings.map((f) => [f.path, f]));
  const root = { name: '', type: 'dir', children: [] };
  const dirs = new Map([['', root]]);

  const ensureDir = (full) => {
    if (dirs.has(full)) return dirs.get(full);
    const idx = full.lastIndexOf('/');
    const parentFull = idx === -1 ? '' : full.slice(0, idx);
    const parent = ensureDir(parentFull);
    const node = { name: full.slice(idx + 1), type: 'dir', children: [], path: full };
    parent.children.push(node);
    dirs.set(full, node);
    return node;
  };

  for (const p of paths) {
    const idx = p.lastIndexOf('/');
    const parent = ensureDir(idx === -1 ? '' : p.slice(0, idx));
    const finding = byPath.get(p);
    parent.children.push({
      name: p.slice(idx + 1),
      type: 'file',
      path: p,
      size: null,
      verdict: finding ? finding.verdict : quick.get(p) || 'clean',
      action: finding ? finding.action : null,
    });
  }

  const sort = (node) => {
    if (!node.children) return;
    node.children.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    node.children.forEach(sort);
  };
  sort(root);
  return root;
}

async function snapshot() {
  const files = await safeFs.walk('.').catch(() => []);
  const findings = state.lastScan?.findings?.filter((f) => f.kind === 'file') || [];

  // Truthful disk view: mark what is actually on the disk right now, so the
  // patient looks compromised the instant it is, not only after a scan.
  const quick = new Map();
  for (const f of files) {
    try {
      quick.set(f, vaccine.quickVerdict(f, await safeFs.readBuffer(f)));
    } catch { /* unreadable */ }
  }
  let registry = { entries: [], scheduledTasks: [], denyList: [] };
  try {
    registry = await readRegistry();
  } catch { /* ignore */ }
  const quarantined = await safeFs.quarantineList();

  return {
    phase: state.phase,
    stage: state.stage,
    mounted: state.mounted,
    protection: state.protection,
    immunity: state.immunity,
    signatureVersion: vaccine.SIGNATURES.version,
    files: files.length,
    tree: buildTree(files, findings, quick),
    registry,
    quarantined,
    lastScan: state.lastScan
      ? {
          filesScanned: state.lastScan.filesScanned,
          stats: state.lastScan.stats,
          findings: state.lastScan.findings,
        }
      : null,
    lastHeal: state.lastHeal,
    logs: state.logs.slice(-200),
  };
}

module.exports = {
  state,
  on,
  log,
  snapshot,
  reset,
  infect,
  mount,
  unmount,
  scan,
  heal,
  immunize,
  setProtection,
  virus,
  vaccine,
};
