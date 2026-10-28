'use strict';

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const STAGES = [
  { id: 1, label: 'deliver' },
  { id: 2, label: 'persist' },
  { id: 3, label: 'infect' },
  { id: 4, label: 'usb' },
  { id: 5, label: 'payload' },
];

let STATE = null;
let activeTab = 'findings';
const seenLogs = new Set();
const expanded = new Set(['C', 'C/Users', 'C/Users/guest', 'C/Users/guest/Documents', 'C/Users/guest/Desktop', 'C/Users/guest/Downloads', 'D', 'D/removable']);
const firedStages = new Set();

// --------------------------------------------------------------------- api --
async function api(path, body) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.disabled = true;
    btn.textContent = label || 'working…';
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

// ------------------------------------------------------------------- toast --
function toast(title, msg, kind) {
  const t = el('div', `toast ${kind || ''}`);
  const body = el('div');
  body.appendChild(el('span', 'tt', title));
  body.appendChild(document.createTextNode(msg));
  t.appendChild(el('span', null, '🛡'));
  t.appendChild(body);
  $('#toasts').appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 320);
  }, 4200);
}

// -------------------------------------------------------------------- tree --
function renderTree(node, container, prefix = '', depth = 0) {
  for (const child of node.children || []) {
    const isDir = child.type === 'dir';
    const full = prefix ? `${prefix}/${child.name}` : child.name;

    const wrap = el('div', 'node');
    const row = el('div', `row ${isDir ? 'dir' : 'file'} ${!isDir && child.verdict ? child.verdict : ''}`);

    const caret = el('span', 'caret', isDir ? '▶' : '');
    row.appendChild(caret);

    const icon = isDir ? '📁' : fileIcon(child.name);
    row.appendChild(el('span', 'icon', icon));
    row.appendChild(el('span', 'name', child.name));

    if (!isDir && child.verdict === 'infected') row.appendChild(el('span', 'leaf-flags', '● threat'));
    else if (!isDir && child.verdict === 'suspicious') row.appendChild(el('span', 'leaf-flags', '● odd'));

    if (!isDir) {
      row.addEventListener('click', () => openFile(child.path));
    }

    wrap.appendChild(row);

    if (isDir) {
      const kids = el('div', `children ${expanded.has(full) ? '' : 'collapsed'}`);
      if (expanded.has(full)) caret.classList.add('open');
      renderTree(child, kids, full, depth + 1);
      wrap.appendChild(kids);
      if (!expanded.has(full)) caret.classList.remove('open');
      row.addEventListener('click', () => {
        const open = kids.classList.toggle('collapsed');
        caret.classList.toggle('open', !open);
        if (!open) expanded.add(full);
        else expanded.delete(full);
      });
      if (!kids.children.length) {
        kids.appendChild(el('div', 'row', ''));
      }
    }

    container.appendChild(wrap);
  }
}

function fileIcon(name) {
  if (/\.(exe|scr|bat|cmd|vbs|js)$/i.test(name)) return '⚙️';
  if (/\.(txt|md|csv)$/i.test(name)) return '📄';
  if (/\.pdf$/i.test(name)) return '📕';
  if (/\.json$/i.test(name)) return '🧾';
  if (/\.locked$/i.test(name)) return '🔒';
  if (/autorun\.inf/i.test(name)) return '💾';
  return '•';
}

async function openFile(path) {
  try {
    const data = await api(`/api/file?path=${encodeURIComponent(path)}`);
    $('#modalTitle').textContent = path.split('/').pop();
    $('#modalPath').textContent = path;
    const meta = $('#modalMeta');
    meta.innerHTML = '';
    meta.appendChild(el('span', 'chip clean', `${data.size} bytes`));
    const finding = (STATE?.lastScan?.findings || []).find((f) => f.path === path);
    if (finding) {
      meta.appendChild(el('span', `chip ${finding.verdict === 'infected' ? 'infected' : 'suspicious'}`, finding.verdict));
      meta.appendChild(el('span', 'chip stage', finding.action || ''));
    }
    const body = $('#modalBody');
    body.innerHTML = '';
    for (const line of data.content.split('\n')) {
      const bad = /WORM::SIM-7|MZ-SIMULATED-PAYLOAD|BEGIN SIMULATED-ENCRYPTED/.test(line);
      const span = el('span', bad ? 'bad-line' : '', line || ' ');
      body.appendChild(span);
      body.appendChild(document.createTextNode('\n'));
    }
    $('#modal').classList.add('open');
  } catch (err) {
    toast('unreadable', String(err.message || err), 'danger');
  }
}

// ---------------------------------------------------------------- findings --
function renderFindings(report, healed) {
  const body = $('#tabBody');
  body.innerHTML = '';

  const findings = report?.findings || [];

  if (healed) {
    body.appendChild(healBanner(healed));
  }

  if (!findings.length) {
    const empty = el('div', 'empty');
    empty.appendChild(el('span', 'big', report ? '✓' : '🔍'));
    empty.appendChild(
      document.createTextNode(
        report ? 'No findings. The disk is clean — run the kill chain again to see what a scanner looks for.' : 'No scan yet. Insert the vaccine and scan the patient.'
      )
    );
    body.appendChild(empty);
    return;
  }

  for (const f of findings) {
    const card = el('div', `finding ${f.verdict} ${f.kind === 'registry' ? 'registry' : ''}`);
    const head = el('div', 'finding-head');
    const p = el('span', 'finding-path', f.path);
    head.appendChild(p);
    head.appendChild(el('span', 'score', `${f.score}`));
    card.appendChild(head);

    const why = f.reasons?.slice(0, 3) || [];
    for (const r of why) {
      const line = el('div', 'reason');
      line.innerHTML = `<b>${escapeHtml(r.code)}</b> — ${escapeHtml(r.detail)}`;
      card.appendChild(line);
    }
    if (f.action) card.appendChild(el('span', 'action-tag', `repair: ${f.action}`));
    body.appendChild(card);
  }
}

function healBanner(heal) {
  const wrap = el('div', 'finding');
  wrap.style.borderLeftColor = heal.verification.clean ? 'var(--green)' : 'var(--amber)';
  const head = el('div', 'finding-head');
  head.appendChild(el('span', 'finding-path', heal.verification.clean ? 'REMEDIATION VERIFIED CLEAN' : 'REMEDIATION INCOMPLETE'));
  wrap.appendChild(head);
  const s = heal.summary;
  const line = el(
    'div',
    'reason',
    `${s.quarantined} quarantined · ${s.disinfected} disinfected · ${s.restored} restored · ${s.persistenceRemoved} persistence entries removed · ${s.unrecoverable} unrecoverable`
  );
  wrap.appendChild(line);
  if (s.unrecoverable) {
    wrap.appendChild(
      el('div', 'reason', `${s.unrecoverable} file(s) had no clean backup. Those bytes are gone — that is what an untested backup strategy costs.`)
    );
  }
  return wrap;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderVault(items) {
  const body = $('#tabBody');
  body.innerHTML = '';
  if (!items.length) {
    const empty = el('div', 'empty');
    empty.appendChild(el('span', 'big', '🗄'));
    empty.appendChild(document.createTextNode('The quarantine vault is empty. Nothing has been removed yet.'));
    body.appendChild(empty);
    return;
  }
  for (const item of items) {
    const card = el('div', 'vault-item');
    card.appendChild(el('div', 'vp', item.originalPath));
    card.appendChild(
      el('div', 'vm', `${item.reason || 'malicious'}  ·  sha256 ${String(item.sha256).slice(0, 20)}…  ·  ${new Date(item.quarantinedAt).toLocaleTimeString()}`)
    );
    if (item.restoredTo) card.appendChild(el('div', 'vm', `restored clean copy → ${item.restoredTo}`));
    body.appendChild(card);
  }
}

function renderRegistry(reg) {
  const body = $('#tabBody');
  body.innerHTML = '';
  const entries = [...(reg.entries || []).map((e) => ({ ...e, kind: 'Run key' })), ...(reg.scheduledTasks || []).map((t) => ({ name: t.name, path: t.action, kind: 'Task', trigger: t.trigger }))];
  if (!entries.length) {
    const empty = el('div', 'empty');
    empty.appendChild(el('span', 'big', '✅'));
    empty.appendChild(document.createTextNode('No autoruns. Nothing is set to execute at logon.'));
    body.appendChild(empty);
    return;
  }
  for (const e of entries) {
    // Mirror the engine's rule: signed publisher in user space is normal,
    // unsigned is not. Scheduled tasks are only ever created by the intruder.
    const bad = e.kind === 'Task' || e.trusted === false;
    const card = el('div', `reg-item ${bad ? 'bad' : ''}`);
    card.appendChild(el('div', 'rp', `${e.kind === 'Task' ? '⏱' : '🔑'} ${e.name}`));
    card.appendChild(el('div', 'rm', `${e.path || ''}  ·  ${e.trigger || 'at logon'}  ·  ${e.publisher || 'unverified'}`));
    body.appendChild(card);
  }
}

// ------------------------------------------------------------------ console --
function logLine(entry) {
  const line = el('div', 'log-line');
  line.appendChild(el('span', 't', new Date(entry.t).toLocaleTimeString([], { hour12: false })));
  line.appendChild(el('span', `lv ${entry.level}`, entry.level));
  line.appendChild(el('span', 'msg', entry.msg));
  return line;
}

function logKey(entry) {
  return `${entry.t}|${entry.level}|${entry.msg}`;
}

/** Replay-safe: the SSE stream and a state snapshot may both deliver a line. */
function syncLogs(entries) {
  for (const entry of entries || []) {
    if (seenLogs.has(logKey(entry))) continue;
    seenLogs.add(logKey(entry));
    appendLog(entry);
  }
}

function appendLog(entry) {
  seenLogs.add(logKey(entry));
  const c = $('#console');
  const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 60;
  c.appendChild(logLine(entry));
  while (c.children.length > 400) c.removeChild(c.firstChild);
  if (atBottom) c.scrollTop = c.scrollHeight;
}

// ------------------------------------------------------------------- state --
function render(state) {
  STATE = state;

  // header
  $('#sigVersion').textContent = state.signatureVersion;
  const phase = $('#phase');
  phase.textContent = state.phase;
  phase.className = `phase ${state.phase}`;
  $('#fileCount').textContent = `${state.files} files`;
  $('#quarantineCount').textContent = `${state.quarantined.length} quarantined`;
  $('#vaultPill').textContent = state.quarantined.length;
  syncLogs(state.logs);
  $('#regPill').textContent = (state.registry.entries?.length || 0) + (state.registry.scheduledTasks?.length || 0);

  // protection strip
  const strip = $('#protectionStrip');
  const ptext = $('#protectionText');
  strip.className = 'protection-strip';
  if (state.protection) {
    strip.classList.add('armed');
    ptext.textContent = `On-access protection ARMED — ${state.immunity?.blockedMarkers?.length || 0} markers, ${state.immunity?.blockedPaths?.length || 0} denied paths`;
  } else if (state.mounted) {
    ptext.textContent = 'Vaccine mounted — protection not armed (vaccinate to enable)';
  } else if (state.phase === 'infected') {
    strip.classList.add('infected');
    ptext.textContent = 'No protection. The patient is compromised.';
  } else {
    ptext.textContent = 'No vaccine inserted';
  }

  // tree
  const tree = $('#tree');
  tree.innerHTML = '';
  renderTree(state.tree, tree);
  if (!tree.children.length) tree.appendChild(el('div', 'empty', 'disk is empty — reimage the laptop'));

  // findings
  const findings = state.lastScan?.findings || [];
  $('#findingPill').textContent = findings.length;
  if (activeTab === 'findings') renderFindings(state.lastScan, state.lastHeal);
  if (activeTab === 'vault') renderVault(state.quarantined);
  if (activeTab === 'registry') renderRegistry(state.registry);

  // stage buttons + chain
  const stageBox = $('#stageButtons');
  if (!stageBox.children.length) {
    for (const s of STAGES) {
      const b = el('button', null, `${s.id} ${s.label}`);
      b.dataset.stage = s.id;
      b.addEventListener('click', () => runInfect([s.id]));
      stageBox.appendChild(b);
    }
  }
  for (const b of stageBox.children) {
    b.classList.toggle('fired', firedStages.has(Number(b.dataset.stage)));
  }

  const chain = $('#chain');
  chain.innerHTML = '';
  for (const s of STAGES) {
    const c = el('span', firedStages.has(s.id) ? 'on' : '', s.label);
    chain.appendChild(c);
  }

  // buttons
  const infected = state.phase === 'infected';
  const protectedNow = state.protection;
  $('#btnMount').disabled = state.mounted;
  $('#btnUnmount').disabled = !state.mounted;
  $('#btnScan').disabled = !state.mounted;
  $('#btnHeal').disabled = !state.lastScan || state.lastScan.findings.length === 0;
  $('#btnImmunize').disabled = !state.mounted || protectedNow;
  $('#protectToggle').checked = protectedNow;
  $('#btnInfectAll').textContent = infected || state.stage > 0 ? 'Run kill chain again' : 'Run full kill chain';

  // scan / heal result summaries
  renderScanResult(state.lastScan);
  renderHealResult(state.lastHeal);

  // steps done styling
  $('#step-infect').classList.toggle('done', state.stage > 0);
  $('#step-mount').classList.toggle('done', state.mounted);
  $('#step-scan').classList.toggle('done', !!state.lastScan);
  $('#step-heal').classList.toggle('done', !!state.lastHeal && state.lastHeal.verification.clean);
  $('#step-immunize').classList.toggle('done', protectedNow);
}

function renderScanResult(report) {
  const box = $('#scanResult');
  box.innerHTML = '';
  if (!report) return;
  const rows = [
    ['Files scanned', report.filesScanned, ''],
    ['Infected', report.stats.infected, report.stats.infected ? 'bad' : 'good'],
    ['Suspicious', report.stats.suspicious, report.stats.suspicious ? 'bad' : 'good'],
  ];
  for (const [label, value, cls] of rows) {
    const line = el('div', 'res-line');
    line.appendChild(el('span', null, label));
    line.appendChild(el('strong', cls, String(value)));
    box.appendChild(line);
  }
}

function renderHealResult(heal) {
  const box = $('#healResult');
  box.innerHTML = '';
  if (!heal) return;
  const s = heal.summary;
  const rows = [
    ['Quarantined', s.quarantined],
    ['Disinfected', s.disinfected],
    ['Restored', s.restored],
    ['Persistence removed', s.persistenceRemoved],
    ['Unrecoverable', s.unrecoverable, s.unrecoverable ? 'bad' : ''],
    ['Verified clean', heal.verification.clean ? 'yes' : `${heal.verification.remaining} left`, heal.verification.clean ? 'good' : 'bad'],
  ];
  for (const [label, value, cls] of rows) {
    const line = el('div', 'res-line');
    line.appendChild(el('span', null, label));
    line.appendChild(el('strong', cls || '', String(value)));
    box.appendChild(line);
  }
}

// ------------------------------------------------------------------ actions --
async function refresh() {
  const state = await api('/api/state');
  render(state);
}

async function runInfect(stages) {
  const btn = $('#btnInfectAll');
  setBusy(btn, true, 'running…');
  try {
    await api('/api/infect', { stages });
    const list = stages === 'all' ? STAGES.map((s) => s.id) : stages;
    list.forEach((id) => firedStages.add(id));
    await refresh();
  } catch (err) {
    toast('error', String(err.message || err), 'danger');
  } finally {
    setBusy(btn, false);
  }
}

async function act(btn, path, body, label) {
  setBusy(btn, true, label);
  try {
    const out = await api(path, body || {});
    if (out.state) render(out.state);
    else await refresh();
    return out;
  } catch (err) {
    toast('blocked', String(err.message || err), 'danger');
    await refresh().catch(() => {});
    return null;
  } finally {
    setBusy(btn, false);
  }
}

// -------------------------------------------------------------------- boot --
function wire() {
  $('#btnInfectAll').addEventListener('click', () => {
    if (STATE?.protection) {
      toast('protection armed', 'The vaccine is on. Writes carrying known payload markers will be refused at write time.');
    }
    runInfect('all');
  });

  $('#btnMount').addEventListener('click', (e) => act(e.currentTarget, '/api/mount', {}, 'inserting…'));
  $('#btnUnmount').addEventListener('click', (e) => act(e.currentTarget, '/api/unmount', {}, 'ejecting…'));
  $('#btnScan').addEventListener('click', (e) => act(e.currentTarget, '/api/scan', {}, 'scanning…'));
  $('#btnHeal').addEventListener('click', (e) => act(e.currentTarget, '/api/heal', {}, 'healing…'));
  $('#btnImmunize').addEventListener('click', (e) => {
    act(e.currentTarget, '/api/immunize', {}, 'vaccinating…').then((out) => {
      if (out) toast('vaccinated', 'Real-time protection armed. Re-run the kill chain and watch it fail.');
    });
  });

  $('#protectToggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    const out = await api('/api/protect', { enabled }).catch((err) => {
      toast('error', String(err.message || err), 'danger');
      return null;
    });
    if (out?.state) render(out.state);
    else await refresh();
  });

  $('#btnReset').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    setBusy(btn, true, 'reimaging…');
    firedStages.clear();
    try {
      const state = await api('/api/reset', {});
      $('#console').innerHTML = '';
      seenLogs.clear();
      render(state);
    } catch (err) {
      toast('error', String(err.message || err), 'danger');
    } finally {
      setBusy(btn, false);
    }
  });

  $('#tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t === tab);
    if (STATE) render(STATE);
  });

  $('#btnClearLog').addEventListener('click', () => ($('#console').innerHTML = ''));
  $('#modalClose').addEventListener('click', () => $('#modal').classList.remove('open'));
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') $('#modal').classList.remove('open');
  });
  $('#btnAbout').addEventListener('click', () => $('#aboutModal').classList.add('open'));
  $('#aboutClose').addEventListener('click', () => $('#aboutModal').classList.remove('open'));
  $('#aboutModal').addEventListener('click', (e) => {
    if (e.target.id === 'aboutModal') $('#aboutModal').classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('#modal').classList.remove('open');
      $('#aboutModal').classList.remove('open');
    }
  });

  // live log stream
  const es = new EventSource('/api/events');
  es.addEventListener('log', (e) => {
    try {
      appendLog(JSON.parse(e.data));
    } catch { /* ignore malformed frame */ }
  });
  es.addEventListener('blocked', (e) => {
    try {
      const info = JSON.parse(e.data);
      toast('write blocked', `${info.path} — ${info.reason}`, '');
    } catch { /* ignore */ }
  });
  es.onerror = () => { /* EventSource reconnects on its own */ };
}

(async function boot() {
  wire();
  const state = await api('/api/state').catch(() => null);
  if (state) {
    $('#console').innerHTML = '';
    render(state);
  } else {
    toast('offline', 'Could not reach the lab server.', 'danger');
  }
})();
