# MISSION

Living document. The first thing any session reads.

**Last updated:** 2026-10-24

## Goal

A repo-scoped agent where the reasoning comes from a frontier brain and the
memory, tools, and rules live in version control. Free where it can be, gated
where it must be.

## Current state

- [x] Agent loop with pluggable brain (`brain/loop.py`)
- [x] Three providers: local Ollama, OpenAI-compatible, offline mock
- [x] Tool registry: 6 tools (`list_dir`, `read_file`, `write_file`, `search_text`, `run_shell`, `http_get`)
- [x] Policy gate with three modes and hard refusals
- [x] Offline smoke test via mock provider
- [x] Test suite (`tests/`, 21 tests, stdlib `unittest`)
- [ ] Persistent memory writing back automatically at session end
- [x] ZAISEN AI chat app: streaming, memory, mobile UI, Dockerfile
- [x] Relay: ZAISEN chat → mailbox → Arena session → back to the browser
- [x] Wake protocol: `bin/check` triage + phone notification workflow
- [ ] Docker sandbox image for `yolo` mode
- [ ] Scheduled/unattended runs (cron + local model)

## Constraints

- Stdlib only. No dependencies, no lockfile, no install step.
- The brain is swappable; never hardcode a provider into the loop.
- Guardrails are declarative (`policy.json`), not scattered through code.

## Next

Trigger options are exhausted and documented in `docs/TRIGGERS.md`: no inbound
path to a session exists, so the design wakes the human instead. The notification
workflow is untested against a real webhook (no secrets in the sandbox).

Relay v1 works with both the file and GitHub backends; GitHub was verified only
up to the 403 from a read-only token, so a run with a real PAT is still untested.

ZAISEN v1 is shippable. The gap between it and a public product is auth and
persistent sessions — both deliberately omitted until there are real users.
Unattended `agent.py` runs remain unbuilt; the honest question is whether a local
model is good enough to be trusted with them.
