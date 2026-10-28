'use strict';
/**
 * End-to-end proof that the lab does what the README claims:
 *   1. containment really contains,
 *   2. the kill chain really infects,
 *   3. the scanner really detects,
 *   4. remediation really cleans and verifies,
 *   5. the vaccine really blocks a second run.
 *
 * Run with:  node --test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Point the lab at a throwaway directory *before* requiring the modules.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'malware-lab-test-'));
process.env.LAB_DIR = TMP;

const safeFs = require('../lib/safeFs');
const lab = require('../lib/lab');

test.after(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

test('containment rejects anything outside the sandbox', async () => {
  await lab.reset();

  for (const bad of ['../etc/passwd', 'C/../../secret.txt', '/etc/passwd', 'C:/Windows/x', '~/x', '']) {
    await assert.rejects(() => safeFs.safePath(bad), /not allowed|empty/, `should reject ${JSON.stringify(bad)}`);
  }

  // A legitimate path resolves inside PC_ROOT.
  const ok = await safeFs.safePath('C/Users/guest/Desktop/todo.txt');
  assert.ok(ok.startsWith(safeFs.PC_ROOT), 'resolved path must stay inside PC_ROOT');

  // A symlink planted inside the sandbox must not be usable to escape it.
  const escapeTarget = path.join(TMP, 'outside-secret.txt');
  fs.writeFileSync(escapeTarget, 'do not read me');
  const linkPath = path.join(safeFs.PC_ROOT, 'link-out');
  try {
    fs.symlinkSync(escapeTarget, linkPath);
    await assert.rejects(() => safeFs.read('link-out'), /sandbox/);
  } catch (err) {
    if (err.code !== 'EPERM' && err.code !== 'EACCES') throw err;
  } finally {
    fs.rmSync(linkPath, { force: true });
    fs.rmSync(escapeTarget, { force: true });
  }
});

test('a clean patient produces zero findings', async () => {
  await lab.reset();
  await lab.mount();
  const report = await lab.scan();
  assert.equal(report.findings.length, 0, `expected clean, got: ${report.findings.map((f) => f.path)}`);
  assert.equal(report.stats.clean, true);
});

test('the kill chain infects the disk and the scanner detects every stage', async () => {
  await lab.reset();
  await lab.mount();
  await lab.infect('all');

  const report = await lab.scan();
  const paths = report.findings.map((f) => f.path);

  assert.ok(report.findings.length > 0, 'expected findings after infection');
  assert.ok(paths.some((p) => p.includes('svch0st.exe')), 'replicant not detected');
  assert.ok(paths.some((p) => p.includes('autorun.inf')), 'USB autorun not detected');
  assert.ok(paths.some((p) => p.endsWith('.locked')), 'ransomware blob not detected');
  assert.ok(paths.some((p) => p.includes('registry.json')), 'persistence not detected');
  assert.ok(
    report.findings.some((f) => f.reasons.some((r) => r.code === 'marker')),
    'document infection marker not detected'
  );

  // Nothing outside the sandbox was touched.
  assert.ok(!fs.existsSync(path.join(os.homedir(), 'svch0st.exe')));
});

test('healing cleans the disk, verifies it, and admits what it could not save', async () => {
  await lab.reset();
  await lab.mount();
  await lab.infect('all');
  await lab.scan();
  const heal = await lab.heal();

  assert.equal(heal.verification.clean, true, `leftovers: ${JSON.stringify(heal.verification.leftovers)}`);
  assert.ok(heal.summary.persistenceRemoved >= 1, 'persistence was not removed');
  assert.ok(heal.summary.quarantined >= 1, 'nothing quarantined');

  // The backed-up document is restored verbatim.
  const thesis = await safeFs.read('C/Users/guest/Documents/thesis-draft.txt');
  assert.ok(!thesis.includes('WORM::SIM-7'), 'restored file still infected');
  assert.match(thesis, /CHAPTER 2/);

  // The file with no backup is honestly reported as lost.
  assert.equal(heal.summary.unrecoverable, 1, 'expected exactly one unrecoverable file');

  // Quarantine has chain-of-custody metadata.
  const vault = await safeFs.quarantineList();
  assert.ok(vault.length >= 3);
  for (const item of vault) {
    assert.ok(item.sha256 && item.originalPath && item.quarantinedAt);
  }
});

test('the vaccine blocks a second infection at write time', async () => {
  await lab.reset();
  await lab.mount();
  await lab.infect('all');
  await lab.scan();
  await lab.heal();
  await lab.immunize();

  const before = (await safeFs.walk('.')).length;
  await lab.infect('all');
  const after = await safeFs.walk('.');

  // The delivery file must never have landed.
  assert.equal(await safeFs.exists('C/Users/guest/AppData/Roaming/svch0st.exe'), false, 'replicant got through');
  assert.equal(await safeFs.exists('D/removable/autorun.inf'), false, 'USB autorun got through');
  assert.ok(after.length <= before + 2, `too many new files written: ${after.length} vs ${before}`);

  const report = await lab.scan();
  assert.equal(report.findings.length, 0, `post-vaccine infection left findings: ${report.findings.map((f) => f.path)}`);
});

test('unmounting the vaccine disarms protection, so the same attack succeeds again', async () => {
  await lab.reset();
  await lab.mount();
  await lab.immunize();
  await lab.unmount();
  await lab.mount();

  await lab.infect('all');
  const report = await lab.scan();
  assert.ok(report.findings.length > 0, 'attack should succeed once protection is off');
});
