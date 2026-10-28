'use strict';
/**
 * vaccine.js — the detection and remediation engine.
 *
 * This half of the project is real software doing real work against a virtual
 * disk: SHA-256 hashing, behavioural scoring, persistence enumeration,
 * surgical disinfection, quarantine with chain-of-custody metadata,
 * restore-from-clean-image, verification rescan and on-access blocking.
 *
 * The only thing that is simulated is the target. If you pointed `PC_ROOT` at
 * a directory of your own test files, this engine would behave the same way.
 */

const crypto = require('node:crypto');
const fsp = require('node:fs').promises;
const path = require('node:path');
const safeFs = require('./safeFs');
const image = require('./image');
const virus = require('./virus');
const SIGNATURES = require('./signatures.json');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const MALICIOUS_HASHES = new Set(SIGNATURES.families.flatMap((f) => f.hashes));
const MALICIOUS_NAMES = new Set(SIGNATURES.families.flatMap((f) => f.filenames.map((n) => n.toLowerCase())));
const MARKERS = SIGNATURES.families.flatMap((f) => f.markers);
const RANSOM_EXT = SIGNATURES.families.flatMap((f) => f.ransomExtensions);
const PERSIST_TARGETS = SIGNATURES.families.flatMap((f) => f.persistenceTargets);
const RULES = SIGNATURES.heuristics;
const NOTE_MARKERS = RULES.ransomNote?.markers || [];

const doubleExtRe = new RegExp(RULES.doubleExtension.pattern, 'i');
const ransomExtRe = new RegExp(RULES.ransomExtension.pattern, 'i');

/** Paths that only exist because of the incident; never a false positive. */
const SUSPICIOUS_DIRS = [/\/AppData\/Roaming\//i, /\/AppData\/Local\/Temp\//i, /^D\/removable\//i];

/**
 * Real antivirus products exclude their own definition store from scanning —
 * otherwise the signature list flags itself. Same problem, same solution.
 */
const SCAN_EXCLUSIONS = new Set(['C/Windows/immunity.json']);

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function fileNameOf(p) {
  return p.slice(p.lastIndexOf('/') + 1);
}

/**
 * Score one file. Returns a finding or null.
 * `cloneIndex` maps sha256 -> [paths] for the mass-clone heuristic.
 */
function inspectFile(filePath, buffer, cloneIndex) {
  const reasons = [];
  let score = 0;
  let family = null;

  const hash = sha256(buffer);
  const text = buffer.length < 2_000_000 ? buffer.toString('utf8') : '';
  const name = fileNameOf(filePath);
  const lower = name.toLowerCase();

  // 1. Exact hash match — fast, precise, and defeated by one changed byte.
  if (MALICIOUS_HASHES.has(hash)) {
    score = 100;
    family = SIGNATURES.families[0].name;
    reasons.push({
      code: 'exact-hash',
      weight: 100,
      detail: `SHA-256 ${hash.slice(0, 16)}… matches a known-bad sample in the signature database.`,
    });
  }

  // 2. Content marker — resilient to repacking, which is why behaviour beats
  //    hashes the moment malware changes by a byte.
  for (const marker of MARKERS) {
    if (text.includes(marker)) {
      score = Math.max(score, 100);
      family = family || SIGNATURES.families[0].name;
      reasons.push({
        code: 'marker',
        weight: 100,
        detail: `File contains the family marker "${marker}". Appended by the file infector.`,
      });
      break;
    }
  }

  // 3. Known malicious filename.
  if (MALICIOUS_NAMES.has(lower)) {
    score += 35;
    reasons.push({ code: 'bad-filename', weight: 35, detail: `"${name}" is on the known-bad filename list.` });
  }

  // 4. Double extension: Invoice.pdf.exe
  if (RULES.doubleExtension.enabled && doubleExtRe.test(name)) {
    score += RULES.doubleExtension.weight;
    reasons.push({
      code: 'double-extension',
      weight: RULES.doubleExtension.weight,
      detail: `"${name}" names a document but is an executable. Windows hides the trailing extension by default.`,
    });
  }

  // 5. Ransomware extension.
  if (RULES.ransomExtension.enabled && ransomExtRe.test(name)) {
    score += RULES.ransomExtension.weight;
    reasons.push({
      code: 'ransom-extension',
      weight: RULES.ransomExtension.weight,
      detail: `"${name}" carries a mass-encryption extension. The original bytes are not recoverable without a backup.`,
    });
  }

  // 6. Ransom note text.
  for (const marker of NOTE_MARKERS) {
    if (text.includes(marker)) {
      score = 100;
      family = family || SIGNATURES.families[0].name;
      reasons.push({
        code: 'ransom-note',
        weight: 100,
        detail: 'Body text matches a known ransom note. The note often arrives before the damage is complete — this is your window.',
      });
      break;
    }
  }

  // 7. autorun.inf on removable media.
  if (RULES.autorunInf.enabled && lower === 'autorun.inf') {
    score += RULES.autorunInf.weight;
    reasons.push({
      code: 'autorun-inf',
      weight: RULES.autorunInf.weight,
      detail: 'autorun.inf on removable media: this is how an infected USB stick executes on the next host.',
    });
  }

  // 7. Mass clone: identical content in unrelated folders.
  const twins = (cloneIndex.get(hash) || []).filter((p) => !p.startsWith('C/Windows'));
  if (RULES.massClone.enabled && twins.length >= 3 && /\.(exe|scr|vbs|js|bat)$/i.test(name)) {
    score += RULES.massClone.weight;
    reasons.push({
      code: 'mass-clone',
      weight: RULES.massClone.weight,
      detail: `Identical copy found in ${twins.length} locations. Legitimate installers do not replicate this way.`,
    });
  }

  if (!reasons.length) return null;

  const verdict = score >= 60 ? 'infected' : score >= 30 ? 'suspicious' : 'clean';
  if (verdict === 'clean') return null;

  // Decide the repair strategy the way a real engine triages.
  let action = 'quarantine';
  if (reasons.some((r) => r.code === 'marker') && /\.(txt|pdf|csv|md|json|doc|docx)$/i.test(name)) {
    action = 'disinfect';
  } else if (reasons.some((r) => r.code === 'ransom-extension')) {
    action = 'restore'; // falls back to quarantine when no clean copy exists
  } else if (reasons.some((r) => r.code === 'autorun-inf' || r.code === 'ransom-note')) {
    action = 'delete';
  }

  return {
    path: filePath,
    kind: 'file',
    verdict,
    score: Math.min(score, 100),
    family,
    reasons,
    sha256: hash,
    size: buffer.length,
    action,
    hasBackup: false, // filled in by the caller for restore candidates
  };
}

/**
 * Cheap content-based verdict for the file-tree view. This is the disk telling
 * you what is actually on it, not the scanner: a file either carries a marker
 * or it does not. The full scan is what produces scored, explained findings.
 */
function quickVerdict(filePath, buffer) {
  if (SCAN_EXCLUSIONS.has(filePath)) return 'clean';
  const text = buffer.toString('utf8');
  const name = fileNameOf(filePath);
  if (MARKERS.some((m) => text.includes(m)) || NOTE_MARKERS.some((m) => text.includes(m))) return 'infected';
  if (MALICIOUS_NAMES.has(name.toLowerCase())) return 'infected';
  if (ransomExtRe.test(name) || doubleExtRe.test(name) || name.toLowerCase() === 'autorun.inf') return 'suspicious';
  return 'clean';
}

/** Walk the fake registry and flag anything that looks like persistence. */
function inspectRegistry(registry) {
  const findings = [];
  for (const entry of registry.entries || []) {
    const reasons = [];
    let score = 0;

    // A signed publisher running from a user-writable directory is normal
    // (OneDrive, Teams, Slack all do it). The same path with no verified
    // publisher is not. That distinction is the whole point of the heuristic.
    const pointsAtBadTarget =
      PERSIST_TARGETS.some((t) => String(entry.path).startsWith(t)) ||
      (entry.trusted !== true && SUSPICIOUS_DIRS.some((re) => re.test(String(entry.path))));

    if (entry.trusted === false) {
      score += 20;
      reasons.push({ code: 'untrusted', weight: 20, detail: `Publisher is not verified ("${entry.publisher}").` });
    }
    if (pointsAtBadTarget) {
      score += RULES.untrustedRunKey.weight;
      reasons.push({
        code: 'untrusted-run-key',
        weight: RULES.untrustedRunKey.weight,
        detail: `Runs at logon from ${entry.path} — user-writable space, not a signed program directory.`,
      });
    }
    if (score >= 30) {
      findings.push({
        path: `C/Windows/registry.json → Run\\${entry.name}`,
        kind: 'registry',
        entryName: entry.name,
        verdict: score >= 60 ? 'infected' : 'suspicious',
        score: Math.min(score, 100),
        family: score >= 60 ? SIGNATURES.families[0].name : null,
        reasons,
        action: 'remove-entry',
      });
    }
  }

  for (const task of registry.scheduledTasks || []) {
    findings.push({
      path: `C/Windows/registry.json → Task Scheduler\\${task.name}`,
      kind: 'registry',
      entryName: task.name,
      verdict: 'infected',
      score: 80,
      family: SIGNATURES.families[0].name,
      reasons: [
        {
          code: 'scheduled-task',
          weight: 80,
          detail: `Task runs "${task.action}" ${task.trigger}. Attackers use logon tasks because they survive reboots.`,
        },
      ],
      action: 'remove-task',
    });
  }

  return findings;
}

/**
 * Full disk scan. Returns a report object; does not modify anything.
 */
async function scan({ log = () => {} } = {}) {
  const startedAt = new Date().toISOString();
  const files = await safeFs.walk('.');
  const cloneIndex = new Map();
  const buffers = new Map();

  for (const file of files) {
    if (SCAN_EXCLUSIONS.has(file)) continue;
    let buf;
    try {
      buf = await safeFs.readBuffer(file);
    } catch {
      continue;
    }
    buffers.set(file, buf);
    const h = sha256(buf);
    if (!cloneIndex.has(h)) cloneIndex.set(h, []);
    cloneIndex.get(h).push(file);
  }

  const findings = [];
  for (const [file, buf] of buffers) {
    const finding = inspectFile(file, buf, cloneIndex);
    if (!finding) continue;
    if (finding.action === 'restore') {
      finding.hasBackup = await image.hasBackup(file.replace(/\.locked$/i, ''));
      if (finding.hasBackup) finding.restoreFrom = file.replace(/\.locked$/i, '');
      else finding.action = 'quarantine';
    }
    findings.push(finding);
    log('warn', `[scan] ${finding.verdict.toUpperCase()}  ${file}  (score ${finding.score})`);
  }

  let registry = { entries: [], scheduledTasks: [], denyList: [] };
  try {
    registry = JSON.parse(await safeFs.read(image.REGISTRY_PATH));
  } catch { /* no registry yet */ }
  const regFindings = inspectRegistry(registry);
  for (const f of regFindings) log('warn', `[scan] ${f.verdict.toUpperCase()}  ${f.path}`);

  const all = [...findings, ...regFindings].sort((a, b) => b.score - a.score);

  const report = {
    kind: 'scan',
    startedAt,
    finishedAt: new Date().toISOString(),
    signatureVersion: SIGNATURES.version,
    filesScanned: buffers.size,
    registryEntriesChecked: (registry.entries || []).length + (registry.scheduledTasks || []).length,
    findings: all,
    stats: {
      infected: all.filter((f) => f.verdict === 'infected').length,
      suspicious: all.filter((f) => f.verdict === 'suspicious').length,
      clean: true,
    },
  };
  report.stats.clean = all.length === 0;
  return report;
}

// ---------------------------------------------------------------------------
// On-access (real-time) protection
// ---------------------------------------------------------------------------

/**
 * Decide whether a write should be blocked. Called by the lab *before* the
 * write hits the virtual disk — the same place a real filter driver sits.
 */
function inspectWrite(targetPath, content, immunity) {
  if (!immunity) return { blocked: false };

  const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
  const name = fileNameOf(targetPath).toLowerCase();

  for (const marker of immunity.blockedMarkers || []) {
    if (text.includes(marker)) {
      return { blocked: true, reason: `payload marker "${marker}"`, rule: 'content-signature' };
    }
  }
  if ((immunity.blockedHashes || []).includes(sha256(Buffer.from(text)))) {
    return { blocked: true, reason: 'exact hash match', rule: 'hash-blacklist' };
  }
  for (const denied of immunity.blockedPaths || []) {
    if (targetPath === denied || targetPath.startsWith(`${denied}/`)) {
      return { blocked: true, reason: `path is on the vaccine deny-list (${denied})`, rule: 'path-block' };
    }
  }
  if ((immunity.blockedFilenames || []).includes(name)) {
    return { blocked: true, reason: `filename "${name}" is denylisted`, rule: 'filename-block' };
  }
  if (ransomExtRe.test(name)) {
    return { blocked: true, reason: 'ransomware extension pattern', rule: 'behaviour-block' };
  }
  return { blocked: false };
}

// ---------------------------------------------------------------------------
// Remediation
// ---------------------------------------------------------------------------

/**
 * Heal everything in the report.
 * Order is deliberate and matches real incident response:
 *   persistence first, then payloads, then data, then verify.
 */
async function heal(report, { log = () => {} } = {}) {
  const actions = [];
  const push = (a) => {
    actions.push(a);
    const tag = a.ok === false ? 'error' : 'ok';
    log(tag, `[heal] ${a.type.padEnd(10)} ${a.path} — ${a.detail}`);
  };

  const findings = report.findings || [];

  // --- 1. Persistence. Kill the foothold before cleaning anything else. ----
  const registryFindings = findings.filter((f) => f.kind === 'registry');
  if (registryFindings.length) {
    let registry;
    try {
      registry = JSON.parse(await safeFs.read(image.REGISTRY_PATH));
    } catch {
      registry = { entries: [], scheduledTasks: [], denyList: [] };
    }
    for (const f of registryFindings) {
      if (f.action === 'remove-entry') {
        const before = registry.entries.length;
        registry.entries = registry.entries.filter((e) => e.name !== f.entryName);
        push({
          type: 'persistence',
          path: f.path,
          ok: registry.entries.length < before,
          detail: `run key "${f.entryName}" deleted`,
        });
      } else if (f.action === 'remove-task') {
        const before = registry.scheduledTasks.length;
        registry.scheduledTasks = registry.scheduledTasks.filter((t) => t.name !== f.entryName);
        push({
          type: 'persistence',
          path: f.path,
          ok: registry.scheduledTasks.length < before,
          detail: `scheduled task "${f.entryName}" deleted`,
        });
      }
    }
    await safeFs.write(image.REGISTRY_PATH, JSON.stringify(registry, null, 2));
  }

  // --- 2. Payload files and autorun. --------------------------------------
  for (const f of findings.filter((x) => x.kind === 'file')) {
    if (f.action === 'disinfect') {
      const buf = await safeFs.readBuffer(f.path).catch(() => null);
      if (!buf) continue;
      const cleaned = buf
        .toString('utf8')
        .split('\n')
        .filter((line) => !MARKERS.some((m) => line.includes(m)))
        .filter((line) => !line.includes('--- this line is the detection signature'))
        .join('\n')
        .replace(/\n{3,}$/, '\n');
      await safeFs.write(f.path, cleaned);
      const after = await safeFs.read(f.path);
      const stillBad = MARKERS.some((m) => after.includes(m));
      push({
        type: 'disinfect',
        path: f.path,
        ok: !stillBad,
        detail: stillBad ? 'marker still present after rewrite' : 'injected block removed surgically, file kept',
      });
    } else if (f.action === 'restore' && f.hasBackup) {
      const clean = await image.readBackup(f.restoreFrom);
      await safeFs.write(f.restoreFrom, clean);
      const buf = await safeFs.readBuffer(f.path).catch(() => null);
      if (buf) {
        const q = await safeFs.quarantine(f.path, buf, { reason: 'ransomware blob', restoredTo: f.restoreFrom });
        await safeFs.remove(f.path);
        push({
          type: 'restore',
          path: f.restoreFrom,
          ok: true,
          detail: `restored from clean image; encrypted blob quarantined as ${q.id}`,
        });
      }
    } else if (f.action === 'delete') {
      const buf = await safeFs.readBuffer(f.path).catch(() => null);
      if (buf) {
        const q = await safeFs.quarantine(f.path, buf, { reason: 'USB autorun' });
        await safeFs.remove(f.path);
        push({ type: 'delete', path: f.path, ok: true, detail: `quarantined as ${q.id}, removed from media` });
      }
    } else {
      // quarantine (default)
      const buf = await safeFs.readBuffer(f.path).catch(() => null);
      if (!buf) continue;
      const q = await safeFs.quarantine(f.path, buf, { reason: f.reasons?.[0]?.code || 'malicious' });
      await safeFs.remove(f.path);
      const unrecoverable = f.reasons?.some((r) => r.code === 'ransom-extension');
      push({
        type: unrecoverable ? 'lost' : 'quarantine',
        path: f.path,
        ok: !unrecoverable,
        detail: unrecoverable
          ? `no clean backup existed — blob vaulted as ${q.id}; original data is NOT recoverable`
          : `moved to vault as ${q.id}`,
      });
    }
  }

  // --- 3. Stray incident artefacts the scanner would not signature. -------
  if (await safeFs.exists(virus.RANSOM_NOTE)) {
    const buf = await safeFs.readBuffer(virus.RANSOM_NOTE);
    await safeFs.quarantine(virus.RANSOM_NOTE, buf, { reason: 'ransom note' });
    await safeFs.remove(virus.RANSOM_NOTE);
    push({ type: 'quarantine', path: virus.RANSOM_NOTE, ok: true, detail: 'ransom note removed from Desktop' });
  }

  // --- 4. Verify. A real engine rescans; "we cleaned it" is not a result. --
  log('info', '[heal] verification rescan…');
  const verify = await scan({ log: () => {} });

  return {
    kind: 'heal',
    finishedAt: new Date().toISOString(),
    actions,
    rescan: verify,
    verification: {
      filesScanned: verify.filesScanned,
      remaining: verify.findings.length,
      clean: verify.findings.length === 0,
      leftovers: verify.findings.map((f) => ({ path: f.path, score: f.score })),
    },
    summary: {
      quarantined: actions.filter((a) => a.type === 'quarantine').length,
      disinfected: actions.filter((a) => a.type === 'disinfect' && a.ok).length,
      restored: actions.filter((a) => a.type === 'restore').length,
      persistenceRemoved: actions.filter((a) => a.type === 'persistence' && a.ok).length,
      unrecoverable: actions.filter((a) => a.type === 'lost').length,
    },
  };
}

// ---------------------------------------------------------------------------
// Immunisation
// ---------------------------------------------------------------------------

/**
 * Write the vaccination record and switch on on-access protection.
 * This is the part that answers "can a vaccine stop the *next* infection?"
 */
async function immunize({ registry }) {
  const record = {
    vaccinatedAt: new Date().toISOString(),
    signatureVersion: SIGNATURES.version,
    protection: 'on-access (simulated filter driver)',
    blockedMarkers: [...MARKERS, ...NOTE_MARKERS],
    blockedHashes: [...MALICIOUS_HASHES],
    blockedFilenames: [...MALICIOUS_NAMES],
    blockedPaths: [
      virus.HIDDEN_PATH,
      'C/Users/guest/AppData/Roaming/Startup',
      'D/removable/autorun.inf',
    ],
    rules: [
      'deny writes containing a known payload marker',
      'deny writes at known persistence paths',
      'deny mass-encryption extensions',
      'make removable media read-only for executable content',
    ],
    caveat:
      'This only blocks the family in this signature set. A new variant with a new marker and a new filename walks straight past it — which is exactly why real defence is layered.',
  };
  await safeFs.write('C/Windows/immunity.json', JSON.stringify(record, null, 2));

  const next = {
    entries: registry.entries || [],
    scheduledTasks: registry.scheduledTasks || [],
    denyList: [...new Set([...(registry.denyList || []), ...record.blockedPaths])],
    immunized: true,
  };
  await safeFs.write(image.REGISTRY_PATH, JSON.stringify(next, null, 2));
  return record;
}

async function readImmunity() {
  try {
    return JSON.parse(await safeFs.read('C/Windows/immunity.json'));
  } catch {
    return null;
  }
}

module.exports = {
  SIGNATURES,
  scan,
  heal,
  immunize,
  readImmunity,
  inspectWrite,
  inspectRegistry,
  quickVerdict,
  sha256,
};
