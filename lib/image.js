'use strict';
/**
 * image.js — the "golden image" of the patient laptop.
 *
 * Builds a fake C:\ and D:\ drive out of plain text files. Nothing here is
 * executable: every "program" in the simulation is a text file that merely
 * *pretends* to be a binary. That is deliberate — a demo should be readable,
 * inspectable and obviously harmless.
 */

const fsp = require('node:fs').promises;
const path = require('node:path');
const safeFs = require('./safeFs');

/** Files that make up a clean install. Key = virtual path. */
const CLEAN_IMAGE = {
  'C/Users/guest/Desktop/todo.txt': [
    'TODO',
    '----',
    '[x] renew domain',
    '[ ] back up laptop before the trip',
    '[ ] stop opening cracked installers (this is the whole point)',
    '',
  ].join('\n'),

  'C/Users/guest/Documents/quarterly-report.txt': [
    'QUARTERLY REPORT — Q3',
    '',
    'Revenue: 412,900',
    'Costs:   318,400',
    'Margin:  22.9%',
    '',
    'Notes: beat plan by 3 points. Headcount flat.',
    '',
  ].join('\n'),

  'C/Users/guest/Documents/meeting-notes.txt': [
    'Standup — Monday',
    '',
    '- migration window moves to Thursday',
    '- ops wants the backup restore drill documented',
    '- nobody has tested the offline copy since March',
    '',
  ].join('\n'),

  'C/Users/guest/Documents/thesis-draft.txt': [
    'CHAPTER 2 — DRAFT',
    '',
    'Automated remediation is only as good as the integrity of its reference',
    'baseline. If the baseline is compromised, the cure becomes the disease.',
    '',
  ].join('\n'),

  'C/Users/guest/Documents/tax-return-2025.txt': [
    'TAX RETURN 2025 (final)',
    '',
    'Filed: 2026-03-14',
    'Reference: TR-2025-88213',
    '',
  ].join('\n'),

  'C/Users/guest/Pictures/holiday-2025.txt': [
    'PHOTO INDEX — Hunza, July 2025',
    '',
    'img_0142 — Karimabad at sunrise',
    'img_0157 — Attabad lake, windy',
    'img_0203 — pass road, cloud level',
    '',
  ].join('\n'),

  'C/Users/guest/Downloads/Invoice_2026-04.pdf': [
    '%PDF-1.4 (simulated document)',
    'INVOICE 2026-04',
    'Amount due: 1,240.00',
    '',
  ].join('\n'),

  'C/Users/guest/AppData/Roaming/prefs.txt': [
    'theme=dark',
    'autosave=true',
    'backup.frequency=daily',
    '',
  ].join('\n'),

  'C/Windows/System32/readme.txt': [
    'Windows system directory (simulated). Read-only in this lab.',
    '',
  ].join('\n'),

  'D/removable/backup-notes.txt': [
    'USB STICK — offline backup',
    '',
    'copy of tax-return-2025.txt',
    'copy of thesis-draft.txt (June revision)',
    '',
  ].join('\n'),
};

/**
 * Which files have a restorable copy in the "clean backup"? In the real world
 * this is whatever your backup product actually captured — and knowing that
 * gap is the difference between "annoying" and "catastrophic".
 */
const BACKED_UP = new Set([
  'C/Users/guest/Documents/quarterly-report.txt',
  'C/Users/guest/Documents/meeting-notes.txt',
  'C/Users/guest/Desktop/todo.txt',
  'C/Users/guest/Downloads/Invoice_2026-04.pdf',
  'C/Users/guest/Documents/thesis-draft.txt',
]);

const CLEAN_REGISTRY = {
  entries: [
    { name: 'SecurityHealth', path: 'C/Windows/System32/readme.txt', publisher: 'Microsoft', trusted: true },
    { name: 'OneDrive', path: 'C/Users/guest/AppData/Roaming/prefs.txt', publisher: 'Microsoft', trusted: true },
  ],
  scheduledTasks: [],
  denyList: [],
};

const REGISTRY_PATH = 'C/Windows/registry.json';

/** Wipe the lab and rebuild a pristine patient PC + golden image. */
async function reset() {
  await fsp.rm(safeFs.LAB_DIR, { recursive: true, force: true });
  await fsp.mkdir(safeFs.PC_ROOT, { recursive: true });

  for (const [virtualPath, content] of Object.entries(CLEAN_IMAGE)) {
    await safeFs.write(virtualPath, content);
  }
  await safeFs.write(REGISTRY_PATH, JSON.stringify(CLEAN_REGISTRY, null, 2));

  // Build the golden image (trusted host-side reference copies).
  await fsp.mkdir(safeFs.IMAGE_DIR, { recursive: true });
  for (const virtualPath of BACKED_UP) {
    const target = safeFs.imagePath(virtualPath);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, CLEAN_IMAGE[virtualPath]);
  }
  await fsp.writeFile(
    path.join(safeFs.IMAGE_DIR, 'manifest.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), files: [...BACKED_UP] }, null, 2)
  );

  await fsp.mkdir(safeFs.QUARANTINE_DIR, { recursive: true });
  return { files: Object.keys(CLEAN_IMAGE).length, backedUp: BACKED_UP.size };
}

async function hasBackup(virtualPath) {
  return BACKED_UP.has(virtualPath) && (await fileExists(safeFs.imagePath(virtualPath)));
}

async function fileExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readBackup(virtualPath) {
  return fsp.readFile(safeFs.imagePath(virtualPath), 'utf8');
}

module.exports = {
  CLEAN_IMAGE,
  CLEAN_REGISTRY,
  BACKED_UP,
  REGISTRY_PATH,
  reset,
  hasBackup,
  readBackup,
};
