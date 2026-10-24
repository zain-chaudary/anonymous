# POLICY

Why the gate exists, and what to change when it's in your way.

## The threat model

An LLM with a shell is a program that generates its own next command. That's the
whole appeal and the whole risk:

1. **Prompt injection.** Any text the agent reads — a file, a web page, a commit
   message — can contain instructions. If reads and writes are equally free, a
   poisoned `README` becomes code execution.
2. **Loops.** Agents retry. An agent that retried `rm` on the wrong variable last
   year deleted a home directory. Gates catch what reasoning doesn't.
3. **Blast radius.** `workspace_only: true` means the worst case is a dirty git
   tree, which is recoverable. Without it, the worst case is your machine.

## The three modes

| Mode | Reads | Writes | Shell | Network | Use for |
|---|---|---|---|---|---|
| `careful` | free | prompts on protected paths | prompts on destructive | allowlist + prompt | daily driving, your laptop |
| `allowlist` | free | prompts | only `allow_commands` | allowlist | unattended/cron runs |
| `yolo` | free | free | free | free | **containers only** |

## Always refused, all modes

- `rm -rf /`, `rm -rf ~`, `mkfs`, `dd if=`, disk writes, fork bombs
- Writes resolving outside the workspace (symlinks included — paths are realpath'd)
- Writes to `.git/`, `policy.json`, `AGENTS.md`, `.env`, `*.pem`, `*.key`

Self-modification of the guardrails is the one thing that must not be delegated,
because every other restriction becomes advisory the moment it is.

## Legitimate ways past a refusal

Not: editing `policy.json`, adding `--yes`, or shelling out to a wrapper that
evades the pattern match.

Yes: asking the human, using a narrower tool, or running the risky step in a
container where the blast radius is already zero.

## Running `yolo` safely

```bash
docker run --rm -it -v "$PWD:/work" -w /work python:3.11-slim \
  python3 agent.py "refactor this repo" --provider ollama --yes
```

The volume is the only thing that survives. That's how you get full autonomy
without betting your machine on a language model's judgment.
