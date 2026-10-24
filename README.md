# anonymous

A repo-scoped agent. **I'm the brain when you talk to me here; this repo is the
memory, the rules, and the hands that keep working when I'm not around.**

---

## The honest answer to "can we use you as the brain?"

Partly, and the part that works is the useful part.

Arena Agent Mode is a hosted product. There's no API endpoint that hands my
orchestrator to your code, so nothing here can `import` me into a daemon. What
*does* work:

**I run when you message me.** Same tools, same judgment, working directly in
this checkout, pushing to this branch. No API key, no per-token bill.

**The repo remembers.** `AGENTS.md` is the constitution, `MISSION.md` is current
state, `journal/` is the decision log. A fresh session reads all three and picks
up mid-stride instead of starting from zero. This is what turns a stateless chat
into something that feels like one continuous agent.

**The runtime covers the gap.** `agent.py` is a working agent loop with a
swappable brain — local Ollama, any OpenAI-compatible endpoint, or a scripted
mock. Point it at a free local model and it runs unattended, forever, at zero
cost, exercising exactly the same tools and the same policy gate.

| Want | Reality |
|---|---|
| Me as the brain | ✅ When you're here, in this session |
| Always on, 24/7 | ⚠️ Only via `agent.py` with a local model |
| Free, no limits | ✅ Local Ollama is genuinely unmetered. Me-in-Arena is free but session-bounded |
| Reach anywhere on the net | ❌ My sandbox sees github/npm/pypi only. `agent.py` is allowlist-scoped |
| No guardrails at all | ❌ Won't build an ungated RCE loop. `mode: yolo` inside Docker is as far as it goes |

---

## Quickstart

```bash
# Prove the loop works, no model, no key, ~0.3s
python3 agent.py "check the workspace" --provider mock

# Free and local: start Ollama, pull a tool-capable model
ollama serve
ollama pull qwen2.5:7b
python3 agent.py "find the TODO comments and summarize them" --provider ollama

# Free API tier (Groq shown; OpenRouter free models work too)
export AGENT_API_KEY=gsk_...
python3 agent.py "add a test for path traversal" \
  --provider openai \
  --base-url https://api.groq.com/openai/v1 \
  --model llama-3.3-70b-versatile
```

Or the wrapper: `bin/agent "your task" --provider ollama`

Flags: `--yes` (auto-approve; sandbox only) · `--max-steps N` ·
`--policy path.json` · `--no-memory` · `--quiet` · `--trace out.json`

---

## ZAISEN AI — the chat app

`zaisen/` is a complete, deployable chat product: streaming replies, conversation
memory, mobile layout, one HTML file, zero dependencies.

```bash
python3 zaisen/server.py        # http://localhost:8000
```

Runs in **demo mode** until you point it at a brain:

```bash
# free + local
ollama serve && ollama pull qwen2.5:7b
ZAISEN_PROVIDER=ollama ZAISEN_MODEL=qwen2.5:7b python3 zaisen/server.py

# or any OpenAI-compatible endpoint
ZAISEN_PROVIDER=openai ZAISEN_BASE_URL=https://api.groq.com/openai/v1 \
ZAISEN_MODEL=llama-3.3-70b-versatile ZAISEN_API_KEY=gsk_... \
python3 zaisen/server.py
```

Full setup, deployment, and security notes: **[docs/ZAISEN.md](docs/ZAISEN.md)**.

### Wake protocol

Nothing outside a session can start one — not GitHub, not a webhook, not a cron
job. Verified against every mechanism in **[docs/TRIGGERS.md](docs/TRIGGERS.md)**.
So the trigger is a human sending one line:

> **CHECK AND ANSWER**

and the repo does the rest: `bin/check` triages mail, tree state, and nothing else
needs remembering. `.github/workflows/mailbox-notify.yml` pings your phone when a
question lands, so you know when to send it.

```bash
bin/check                  # everything awaiting attention
bin/check --json           # same, machine-readable
```

### Relay — routing chat messages to an Arena session

```bash
python3 relay/mailbox.py doctor       # which mailbox backend is live
python3 relay/mailbox.py pending      # unanswered questions from the chat
python3 relay/mailbox.py reply <id> "answer"
```

With `ZAISEN_PROVIDER=relay`, chat messages queue in a mailbox (local JSONL, or
comments on a GitHub issue if you set `GITHUB_TOKEN`) and the browser polls for
answers every 8 seconds. Works end to end — [docs/RELAY.md](docs/RELAY.md)
covers the setup, and the one limitation that matters: **nothing can wake the
agent up**, so replies arrive when a session next checks the mailbox, not on
demand.

> **Why it doesn't relay to Arena.** There is no API that accepts messages for
> me — I exist only inside a session you open. ZAISEN talks to the model directly
> from your server, and the footer names which model, because most model licences
> require attribution and hiding the origin is how "AI wrappers" get shut down.

---

## Architecture

```
agent.py              CLI
brain/
  loop.py             think → tool → observe → repeat
  tools.py            registry: list_dir, read_file, write_file,
                      search_text, run_shell, http_get
  policy.py           every call is checked here first
  providers/
    ollama.py         local, free, unlimited
    openai_compat.py  Groq / OpenRouter / vLLM / LM Studio / OpenAI
    mock.py           offline, deterministic, for CI
policy.json           the dials
AGENTS.md             how I behave across sessions  (protected: read-only)
MISSION.md            current goal and state
journal/              append-only decisions
tasks/                inbox → active → done
```

Adding a tool is one decorator:

```python
@tool("git_log", "Recent commits.", {"type":"object","properties":{"n":{"type":"integer"}}})
def git_log(policy, n=10):
    ...
```

Adding a brain is one method: implement `Provider.chat()` and return a `Message`.

---

## The policy gate

Nothing executes without passing `Policy` first. `policy.json` ships as:

```json
{
  "mode": "careful",
  "workspace_only": true,
  "allow_commands": ["ls","cat","grep","find","python3","git","diff"],
  "protected_paths": [".git", ".env", "policy.json", "AGENTS.md", "*.pem", "*.key"],
  "allow_hosts": ["github.com", "*.github.com", "pypi.org", "..."]
}
```

Three modes:

- **`careful`** (default) — reads run free; `rm`, `mv`, `chmod`, `git push` prompt you
- **`allowlist`** — only `allow_commands` run unattended, everything else prompts
- **`yolo`** — zero prompts. **Run this in a container, not on your laptop.**

Refused in *every* mode, including yolo: fork bombs, `rm -rf /`, `mkfs`,
`dd if=`, write-outside-workspace, and any write to `.git`, `policy.json`, or
`AGENTS.md`. An agent that can rewrite its own guardrails doesn't have guardrails.

This isn't decoration. An ungated agent with a shell is remote code execution
pointed at your filesystem — and one bad loop from `rm -rf`. The gate costs you
one `y` keypress and saves you the rest of your day.

---

## Why the repo-shaped design

Most "unrestricted agent" projects fail the same way: full autonomy, no memory,
so it solves the same problems every run and can't be trusted with anything
durable. Inverting that works better — a narrow blast radius and a growing memory
beats infinite reach and amnesia.
