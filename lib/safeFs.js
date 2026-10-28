'use strict';
/**
 * safeFs.js — the containment chokepoint.
 *
 * Every single filesystem operation performed by the simulated malware AND by
 * the vaccination engine goes through this module. It refuses to touch
 * anything outside of `sandbox/pc`.
 *
 * This is the most important file in the project. A "virus" demo that can
 * escape its pretend PC is just a virus. So containment is enforced in code,
 * not by convention: path traversal (`../`), absolute paths, drive letters and
 * symlink escapes are all rejected before any syscall happens.
 *
 * See test/containment.test.js — the guard is covered by tests.
 */

const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');

class ContainmentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContainmentError';
    this.code = 'ECONTAINMENT';
  }
}

const LAB_DIR = path.resolve(process.env.LAB_DIR || path.join(__dirname, '..', 'sandbox'));
const PC_ROOT = path.join(LAB_DIR, 'pc');           // the "patient laptop" C:\ and D:\
const QUARANTINE_DIR = path.join(LAB_DIR, 'quarantine');
const IMAGE_DIR = path.join(LAB_DIR, 'clean-image'); // the "golden image" / clean backup

/** Normalise Windows-ish separators so callers can use either. */
const norm = (p) => String(p).replace(/\\/g, '/');

/**
 * Resolve a virtual path (e.g. "C/Users/guest/Desktop/todo.txt") to a real
 * absolute path that is guaranteed to live inside PC_ROOT.
 */
async function safePath(relPath, { forWrite = false } = {}) {
  const raw = norm(relPath).trim();

  // Reject absolute/host paths *before* stripping anything, so "/etc/passwd"
  // cannot be laundered into the relative path "etc/passwd".
  if (!raw) throw new ContainmentError('empty path');
  if (raw.startsWith('/') || raw.startsWith('~') || /^[A-Za-z]:/.test(raw)) {
    throw new ContainmentError(`absolute paths are not allowed: ${relPath}`);
  }

  const cleaned = raw.replace(/^\.\//, '');
  if (!cleaned) throw new ContainmentError('empty path');
  if (cleaned.split('/').some((seg) => seg === '..')) {
    throw new ContainmentError(`path traversal is not allowed: ${relPath}`);
  }

  const abs = path.resolve(PC_ROOT, cleaned);
  const rootReal = await fsp.realpath(PC_ROOT).catch(() => PC_ROOT);

  // Walk up to the deepest existing ancestor and realpath *that*, so a symlink
  // planted anywhere along the way cannot redirect us outside the box. Then
  // re-append the segments that do not exist yet.
  let p = abs;
  const rest = [];
  while (!fs.existsSync(p)) {
    const parent = path.dirname(p);
    if (parent === p) break;
    rest.unshift(path.basename(p));
    p = parent;
  }
  const realAncestor = await fsp.realpath(p).catch(() => p);
  const finalAbs = path.join(realAncestor, ...rest);

  const inside = (base, target) => {
    const rel = path.relative(base, target);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  };

  if (!inside(rootReal, realAncestor) || !inside(rootReal, finalAbs)) {
    throw new ContainmentError(`path escapes the sandbox: ${relPath}`);
  }
  return finalAbs;
}

/** Convert an absolute path back to the virtual ("C/Users/...") form. */
function toVirtual(abs) {
  return norm(path.relative(PC_ROOT, abs));
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

async function read(relPath, encoding = 'utf8') {
  const abs = await safePath(relPath);
  return fsp.readFile(abs, encoding);
}

async function readBuffer(relPath) {
  const abs = await safePath(relPath);
  return fsp.readFile(abs);
}

async function exists(relPath) {
  try {
    const abs = await safePath(relPath);
    await fsp.access(abs);
    return true;
  } catch {
    return false;
  }
}

async function stat(relPath) {
  const abs = await safePath(relPath);
  return fsp.stat(abs);
}

async function list(relPath) {
  const abs = await safePath(relPath);
  return fsp.readdir(abs, { withFileTypes: true });
}

/** Recursively list every regular file, as virtual paths. */
async function walk(relPath = '.') {
  const abs = await safePath(relPath);
  const out = [];

  async function step(dir, prefix) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      // Never follow symlinks inside the sandbox; they are not part of the sim.
      if (entry.isSymbolicLink()) continue;
      const childAbs = path.join(dir, entry.name);
      const childRel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await step(childAbs, childRel);
      } else if (entry.isFile()) {
        out.push(toVirtual(childAbs));
      }
    }
  }

  await step(abs, norm(relPath) === '.' ? '' : norm(relPath).replace(/^\/+/, ''));
  return out.sort();
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

async function write(relPath, data) {
  const abs = await safePath(relPath, { forWrite: true });
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, data);
  return toVirtual(abs);
}

async function append(relPath, data) {
  const abs = await safePath(relPath, { forWrite: true });
  await fsp.appendFile(abs, data);
  return toVirtual(abs);
}

async function mkdir(relPath) {
  const abs = await safePath(relPath, { forWrite: true });
  await fsp.mkdir(abs, { recursive: true });
  return toVirtual(abs);
}

async function remove(relPath) {
  const abs = await safePath(relPath, { forWrite: true });
  await fsp.rm(abs, { force: true, recursive: true });
  return toVirtual(abs);
}

async function move(fromRel, toRel) {
  const from = await safePath(fromRel, { forWrite: true });
  const to = await safePath(toRel, { forWrite: true });
  await fsp.mkdir(path.dirname(to), { recursive: true });
  await fsp.rename(from, to);
  return { from: toVirtual(from), to: toVirtual(to) };
}

// ---------------------------------------------------------------------------
// Quarantine (lives OUTSIDE the patient PC, like a real AV vault)
// ---------------------------------------------------------------------------

async function quarantine(virtualPath, buffer, meta) {
  const hash = require('node:crypto').createHash('sha256').update(buffer).digest('hex');
  await fsp.mkdir(QUARANTINE_DIR, { recursive: true });
  const base = `${Date.now()}-${hash.slice(0, 12)}`;
  const blobPath = path.join(QUARANTINE_DIR, `${base}.quarantined`);
  const metaPath = path.join(QUARANTINE_DIR, `${base}.json`);
  await fsp.writeFile(blobPath, buffer);
  await fsp.writeFile(
    metaPath,
    JSON.stringify({ originalPath: virtualPath, sha256: hash, quarantinedAt: new Date().toISOString(), ...meta }, null, 2)
  );
  return { id: base, sha256: hash, blob: blobPath };
}

async function quarantineList() {
  try {
    const entries = await fsp.readdir(QUARANTINE_DIR);
    const metas = entries.filter((e) => e.endsWith('.json'));
    const out = [];
    for (const m of metas) {
      try {
        const raw = await fsp.readFile(path.join(QUARANTINE_DIR, m), 'utf8');
        out.push({ id: m.replace(/\.json$/, ''), ...JSON.parse(raw) });
      } catch { /* skip unreadable vault entries */ }
    }
    return out.sort((a, b) => String(b.quarantinedAt).localeCompare(String(a.quarantinedAt)));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Golden image access (trusted, host-side)
// ---------------------------------------------------------------------------

const imagePath = (relPath) => path.join(IMAGE_DIR, norm(relPath).replace(/^\/+/, ''));
const labPath = (relPath) => path.join(LAB_DIR, norm(relPath).replace(/^\/+/, ''));

module.exports = {
  ContainmentError,
  LAB_DIR,
  PC_ROOT,
  QUARANTINE_DIR,
  IMAGE_DIR,
  safePath,
  toVirtual,
  read,
  readBuffer,
  exists,
  stat,
  list,
  walk,
  write,
  append,
  mkdir,
  remove,
  move,
  quarantine,
  quarantineList,
  imagePath,
  labPath,
  fsp,
  path,
};
