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
- [ ] Docker sandbox image for `yolo` mode
- [ ] Scheduled/unattended runs (cron + local model)

## Constraints

- Stdlib only. No dependencies, no lockfile, no install step.
- The brain is swappable; never hardcode a provider into the loop.
- Guardrails are declarative (`policy.json`), not scattered through code.

## Next

Decide whether unattended runs are worth it. If yes, the cheapest path is a
cron job driving `agent.py` against Ollama with `mode: allowlist`.
