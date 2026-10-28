# Malware & Vaccine Lab

A simulated patient laptop, a simulated intruder, and a **fully real** detection and
remediation engine — in one zero-dependency Node app with a browser UI.

```
node server.js      →  http://localhost:3000        the lab
                    →  http://localhost:3000/prank  the fake incident (prank mode)
node --test         →  6/6 passing (containment + full infection/cleanup cycle)
```

---

## First, the honest answer to "what is the best virus we can create?"

**The best one is not the most destructive one — it is the one that teaches the most
defence per line of code.** Ranked on that axis, the winner is not ransomware. It is the
**file infector + USB worm**: it is the only family that exercises *every* defensive layer
at once (execution, persistence, replication, removable media, destruction), so you can
watch detection and cleanup actually fight it.

It is also the family that caused the real-world pain people remember: **ILOVEYOU** (2000)
spread through email and overwrote media files, **Conficker** (2008) infected ~9–15 million
Windows machines through a patched-and-forgotten SMB flaw plus infected USB sticks, and
**Stuxnet** (2010) proved the same self-replication techniques can jump an air gap. None of
them needed clever code. They needed *unguarded paths*.

So this repo builds that family — as a simulation — and then builds the vaccine that kills it.

**What I will not do, and why it matters practically:** I won't write real malware for you.
It's a criminal offence in most jurisdictions (including Pakistan, under PECA 2016 §3–4, and
the UK/US equivalents), it becomes someone else's weapon the moment it's written down, and —
the part people skip — **you cannot safely test a real worm on your own laptop.** The moment
it works, it's spreading on your machine, your USB sticks, and your network. There is no
"just testing" mode. A faithful simulation gives you the same lesson with a kill switch.

---

## Can a USB "vaccine" that fixes a laptop automatically actually work?

Short answer: **partly, and never as completely as people hope.** Here is the honest split,
because this repo demonstrates both halves.

| Claim | Reality |
|---|---|
| Detect known malware from a USB stick | **Yes.** Scanning from external, read-only media is a real technique. That is what this lab's vaccine does. |
| Remove a *known* infection automatically | **Yes, with care.** Kill persistence, disinfect files, quarantine the rest. Order matters — this lab does it in the same order real responders do. |
| Fix a *new/unknown* variant | **No.** Signature-based tools miss anything they haven't seen. This lab proves it: change one byte and the vaccine is blind. |
| Clean a machine while the malware is *running* | **Unreliable.** Modern malware watches for its own removal and re-infects. Real answer: boot from clean media, or reimage. |
| Recover encrypted files | **Only from a backup.** No vaccine decrypts ransomware. Two files in this simulation are lost on purpose. |
| Work on a locked/rootkitted PC | **No.** Userland tools lose to kernel-level threats; you need offline boot or reinstall. |

The thing that actually saves a laptop is boring and layered: **patch fast, don't run
`Invoice.pdf.exe`, keep an offline backup you have actually restored once, and have a
reimage path.** A "vaccine" is one layer, not a cure.


---

## Prank mode (`/prank`) — the fake incident

The thing you actually wanted: **a link that takes over the screen and looks like your laptop is
being destroyed.** It is pure theatre, it runs entirely in the browser, and it costs nothing.

```
http://localhost:3000/prank          normal speed (~45s)
http://localhost:3000/prank?speed=2  twice as fast — better for sharing
```

What happens: fullscreen takeover → boot log → `SYSTEM COMPROMISED` → "origin trace" with a radar
and a hop list → connections being terminated → security services disabled → files crossed out as
they are "overwritten" → 10-second `FACTORY RESET` countdown → black screen → **reveal screen
that admits every single thing was fake.** `ESC` exits at any moment, and leaving fullscreen
ends it too.

Tap **Copy this link** on the reveal screen or just send `/prank?speed=2`.

### What is fake (all of it)

| On screen | What actually happened |
|---|---|
| "Public IP 203.0.113.47" | A reserved documentation address. No lookup, no network request at all. |
| "Factory reset in 10…" | A CSS ring and a number. There is no countdown loop underneath. |
| "Files destroyed: 4,812 MB" | Invented filenames. A web page cannot read your disk. |
| "Connections terminated" | A page cannot close your network. Nothing was disconnected. |
| Fullscreen "takeover" | `requestFullscreen()` — the standard browser API, one ESC away. |

The smoke test asserts this: **zero network requests** during the run, and every IP on the page
must be in a private or documentation range ([RFC 1918](https://datatracker.ietf.org/doc/html/rfc1918)
/ [RFC 5737](https://datatracker.ietf.org/doc/html/rfc5737)). If someone later edits a real IP in,
the test fails.

### What a link genuinely cannot do

This is the part worth internalising, because it is also how you spot a real attack:

- **Cannot shut down, restart or freeze a machine.** Browsers have no access to power or boot.
- **Cannot factory reset, delete files, or touch the OS.** The sandbox forbids it, by design.
- **Cannot close your other connections.** No socket control outside its own origin.
- **Cannot see your real IP.** It could ask a third-party service — so this page never does.

To actually reboot someone's laptop from a link you would need either a browser 0-day (six figures,
and a crime) or for them to download and run an `.exe` (also a crime, plus they deserve better).
There is no third option.

### Using it responsibly

- **Opt-in only.** The gate screen says it is a simulation before anything starts. Do not remove it.
- **Own screens, or people in on the joke.** Never on a work laptop, never on someone who is
  anxious about losing data, never on a stranger.
- **`ESC` is sacred.** Do not disable the panic button or the fullscreen-exit handler.
- If you want a version for a **class or workshop**, that is the same page with the gate replaced
  by a spoken intro — the theatre itself does not change.

---

## What this app does

Three panes: the **patient disk**, a **control room** with the five-step incident, and the
**findings/vault/autoruns** view, plus a live event log.

1. **Infect** — run the whole kill chain or step through it:
   - delivery via a double-extension file (`Invoice_2026-04.pdf.exe`)
   - persistence: run key **and** scheduled task
   - file infection by marker append, plus self-replication into every writable folder
   - removable-media spread via `autorun.inf`
   - destructive stage: files replaced with `.locked` blobs and a ransom note
2. **Insert the vaccine** — mounts the definitions. Inserting it cures nothing.
3. **Scan** — SHA-256 sweep, behavioural scoring, autorun and scheduled-task enumeration.
   Detection only, no writes.
4. **Heal** — removes persistence *first*, disinfects documents surgically, restores from
   the clean image where a backup exists, quarantines the rest, then **rescans to verify**.
   It also reports, honestly, what it could not save.
5. **Vaccinate** — arms on-access protection. Writes carrying a known marker or hitting a
   known persistence path are refused **before they land**. Re-run the kill chain and watch
   stages 2–5 fail one by one.

The interesting part is the asymmetry: the intruder is fake, the **defender is real
software**. `lib/vaccine.js` is a working scanner/hunter/cleaner. Point it at a directory of
your own test files and it behaves identically.

---

## The safety design (read before you worry)

A "virus simulator" that can escape its pretend PC is just a virus. So containment is
enforced in **one chokepoint**, not by convention:

- **`lib/safeFs.js`** is the only module allowed to touch the filesystem. It rejects absolute
  paths, `..`, drive letters, `~`, and symlinks that resolve outside `./sandbox/pc`.
- **Nothing is executable.** Every `.exe` is a text file. There is no `eval`, no `child_process`,
  no network calls, no registry writes, no persistence.
- **Nothing self-starts.** Every stage runs on an explicit button click.
- **The guard is tested.** `test/lab.test.js` tries `/etc/passwd`, `../etc/passwd`, `C:/Windows/x`,
  and a symlink escape — all must be refused before any syscall.

- Everything the lab writes lives under `./sandbox/` (git-ignored) and is wiped on restart.

---

## Tests

```bash
node --test                              # 6 tests: containment, infection, detection, cleanup, blocking
npm i --no-save jsdom
node server.js &                         # in another shell
node scripts/ui-smoke.js                 # drives the lab: clicks all five steps, asserts the DOM
node scripts/prank-smoke.js              # runs the scare end to end, checks ESC and zero network I/O
```

The UI smoke test exists because a screenshot-free review of a browser app is guesswork.
It loads the actual page in jsdom, clicks the actual buttons, and fails if any panel stops
reflecting state.

## Architecture

```
server.js            zero-dep HTTP + SSE server, JSON API, static files
lib/
  safeFs.js          THE chokepoint — all disk I/O, quarantine vault, path guard
  image.js           builds the fake C:\ and D:\, plus the golden clean image
  virus.js           the five simulated stages (text files only)
  signatures.json    definition set: hashes, markers, filenames, heuristics
  vaccine.js         the real engine: scan → score → heal → verify, on-access filter
  lab.js             orchestration, state machine, write-time interception, snapshots
public/              the UI (no framework, no build step)
test/lab.test.js     containment + full infection/remediation/vaccine cycle
```

Request path for a malicious write while protection is armed:

```
virus stage → lab.patientWrite() → vaccine.inspectWrite() → BLOCKED (logged, UI toast)
                                      └─ allowed → safeFs.write() → path guard → disk
```

## The detection engine

Scoring is additive, and every finding explains itself in the UI — because a security tool
that says "threat found" without a reason is not auditable.

| Signal | Weight | Why it exists |
|---|---|---|
| exact SHA-256 match | 100 | precise, fast, defeated by one changed byte |
| content marker | 100 | survives repacking — behaviour beats hashes |
| known-bad filename | 35 | cheap, noisy on its own |
| double extension | 40 | `Invoice.pdf.exe` — Windows hides the real extension |
| ransomware extension | 55 | `.locked`, `.crypt`, … |
| `autorun.inf` on removable | 45 | how an infected USB executes on the next host |
| untrusted run key in user space | 50 | a *signed* publisher in AppData is normal; an unsigned one is not |
| mass clone in unrelated folders | 30 | replication is what replicators do |
| ransom note text | 100 | often appears before the damage is complete |

Repair is triaged per finding: `disinfect` (surgical, keeps the file), `restore` (from the
clean image), `quarantine` (vault with SHA-256 + chain-of-custody metadata), `delete`
(autorun), `remove-entry` / `remove-task` (persistence).

## Try this demo (60 seconds)

1. **Run full kill chain.** Watch 7 documents get infected, 4 clones dropped, the USB stick
   contaminated, then the payload stage. Note `holiday-2025.txt.locked`.
2. Open the **Vault** tab later — every removed file kept its hash and original path.
3. **Insert vaccine → Scan.** 13 infected, 3 suspicious. Open `thesis-draft.txt.locked`.
4. **Remediate & verify.** Persistence goes first, documents are disinfected, the thesis is
   restored from backup — and one file is reported **unrecoverable**. That is the honest bit:
   there was no backup, so it's gone.
5. **Vaccinate → Run the kill chain again.** Stage 1 still "succeeds" (a text file lands);
   stages 2–5 are refused at write time and the log shows each block with its rule. Scan is
   clean, disk is clean.
6. **Eject the vaccine** and run it again — infection succeeds. Protection without
   definitions isn't protection.

## Where this stops being a simulation

The simulation covers threats that behave like files. Real attacks increasingly don't:
they live in memory, abuse signed binaries (`rundll32`, PowerShell), hijack the bootloader,
or never touch disk at all. Against those, a signature vaccine is close to useless and only
behavioural EDR plus least privilege plus fast patching helps. That limitation is built into
the design on purpose — the vaccine panel says so in the UI, and the lab proves it the moment
you change one byte of the payload.

## Licence

MIT. Use it for teaching, CTFs, or training new analysts.
