# Malware & Vaccine Lab

A simulated patient laptop, a simulated intruder, and a **fully real** detection and
remediation engine — in one zero-dependency Node app with a browser UI.

```
node server.js      →  http://localhost:3000        the lab
                    →  http://localhost:3000/system-check  the incident simulation
node --test         →  6/6 passing (containment + full infection/cleanup cycle)
```

**`public/system-check.html` is fully self-contained** — one file, no assets, no network calls. Drop it
on any static host (Netlify Drop, GitHub Pages, Cloudflare Pages) and the link works
anywhere. Nothing else from this repo needs to be deployed with it.

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

## Incident simulation (`/system-check`)

**A link that takes over the screen and looks like the machine is being destroyed.** Two minutes,
full-screen, no start button — it begins the moment it loads. All theatre, all in the browser.

```
https://zain-chaudary.github.io/anonymous/system-check.html      2 minutes
https://zain-chaudary.github.io/anonymous/system-check.html?speed=2    twice as fast
```

The timeline:

| Time | Beat |
|---|---|
| 0:00 | power-on, kernel log, remote session established, SYSTEM token escalation |
| 0:19 | **SYSTEM COMPROMISED** — impact, klaxon, flashing incident lines |
| 0:23 | origin trace: fake IP typed out, hop chain, radar sweep |
| 0:29 | connections terminated one by one |
| 0:35 | security services disabled: firewall, Defender, BitLocker, restore points |
| 0:41 | **SECURITY DISABLED** in 10cm letters |
| 0:47 | **DESTROYING FILES** — 18 files crossed out, MB counter climbing, 12MB/s |
| 1:11 | **ENCRYPTION COMPLETE** |
| 1:16 | ransom note: files encrypted, key on remote server, clock ticking down |
| 1:40 | **FACTORY RESET** — 15-second ring countdown, screen shake |
| 1:57 | blackout, then the reveal that admits everything was fake |

`ESC` exits instantly, `M` mutes, and there is a mute button in the footer. Nothing to install.

### Two things a browser will not let any page do

These are hard browser rules, not choices in this code:

1. **No automatic sound.** Audio needs a click. The page starts silently and the *first click,
   key or tap anywhere* starts the sound. There is a small `🔊 click for sound` button in the
   corner that disappears once you interact.
2. **No automatic fullscreen.** `requestFullscreen()` also needs a gesture. The page fills the
   viewport regardless, and the first interaction promotes it to real fullscreen.

That is also why the first click is worth spending deliberately: click anywhere once when you
send it to someone, and both switch on.

### What is still honest

The gate is gone — it starts on its own, as asked. Two disclosures remain, and they are not
negotiable:

- a permanent `Simulation · nothing real` badge in the header, and
  `simulated · this device is untouched` in the footer;
- the reveal screen at the end, which names every lie it told.

Those keep it a prank rather than a deception. Anyone who panics mid-run has `ESC`.

### Sound

Every noise is **synthesised with WebAudio** — there are no audio files, so the page stays one
self-contained HTML file and still makes zero network requests. Roughly:

| Moment | Sound |
|---|---|
| Start | power-on whoosh, low thump, disk spin-up chatter |
| Boot log | keystroke ticks, error blips, a rising tension bed |
| Compromise | sub-bass impact + two-tone klaxon + siren bed |
| Trace | sonar pings, per-hop blips, a hard hit on the command server |
| Connections | filter-swept "cut" for each kill, then a power-down |
| Security | mechanical clunks, descending as each service dies |
| File wipe | continuous shredding noise that rises in pitch and speeds up |
| Countdown | ticks that get higher and double-beep in the last three |
| Blackout | sawtooth sweep down + fan winding out |
| Reveal | a warm major chord — the joke lands kind, not cruel |

Peak level is deliberately capped and faded in: this plays in someone's ears. **`M` mutes**,
and there's a mute button in the footer. Test it at low volume first.

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

### Publishing it on a real URL

The sandbox preview (`…e2b.app`) dies with the session, so it is useless for sending to anyone.
`public/system-check.html` is completely self-contained, so any static host works.

**This repo is already wired for GitHub Pages.** Pages is set to this branch, folder `/`, so the
published copy lives at the repo root (`index.html`, `system-check.html`, `.nojekyll` — all
generated, all disposable):

```
https://zain-chaudary.github.io/anonymous/system-check.html
https://zain-chaudary.github.io/anonymous/            (same page)
```

After editing the page: `node scripts/build-pages.js`, commit, push. Pages redeploys in ~30s.
Do not hand-edit the root copies — they are overwritten.

Other options, if you would rather not use Pages: drag `public/system-check.html` onto
[Netlify Drop](https://app.netlify.com/drop), or use Cloudflare Pages. One file, no build.

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
node scripts/system-check-smoke.js       # runs the sequence end to end, checks ESC, sound graph, zero network I/O
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
