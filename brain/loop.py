"""The agent loop: think, call a tool, observe, repeat."""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from . import tools as tool_mod
from .policy import ROOT, Policy
from .providers.base import Message, Provider


SYSTEM = """You are a repo-scoped coding agent working inside {root}.

You act by calling tools, then reading their output before deciding the next
step. Rules:
- Read before you write. Look at the real file, don't guess its contents.
- Prefer small, verifiable steps over one giant script.
- When a tool returns an error, read it and change approach. Do not retry the
  same call unchanged.
- The policy layer may refuse a command. That is final; find another way or
  stop and report.
- Finish with a short report: what you did, what you verified, what is left.

Keep tool calls minimal and purposeful."""


@dataclass
class Trace:
    entries: list[dict] = field(default_factory=list)

    def add(self, kind: str, **data) -> None:
        self.entries.append({"kind": kind, **data})

    def to_json(self) -> str:
        return json.dumps(self.entries, indent=2)


class Agent:
    def __init__(self, provider: Provider, policy: Policy | None = None,
                 max_steps: int = 25, verbose: bool = True):
        self.provider = provider
        self.policy = policy or Policy()
        self.max_steps = max_steps
        self.verbose = verbose
        self.trace = Trace()

    def _log(self, kind: str, text: str) -> None:
        if self.verbose:
            print(text, flush=True)
        self.trace.add(kind, text=text)

    def run(self, task: str, memory: str = "") -> str:
        messages: list[Message] = [
            Message("system", SYSTEM.format(root=ROOT)),
            Message("user", (memory + "\n\n" if memory else "") + "TASK: " + task),
        ]

        for step in range(1, self.max_steps + 1):
            reply = self.provider.chat(messages, tool_mod.schemas())
            messages.append(reply)

            if reply.content:
                self._log("thought", f"\n[{step}] {reply.content}")

            if not reply.tool_calls:
                return reply.content

            for call in reply.tool_calls:
                arg_preview = json.dumps(call.arguments)[:160]
                self._log("tool_call", f"  -> {call.name}({arg_preview})")
                result = tool_mod.dispatch(self.policy, call.name, call.arguments)
                self.trace.add("tool_result", tool=call.name, result=result[:500])
                if self.verbose:
                    first = result.strip().splitlines()[:6]
                    print("     " + "\n     ".join(first), flush=True)
                messages.append(Message("tool", result, tool_call_id=call.id,
                                        name=call.name))

        return f"Stopped after {self.max_steps} steps without a final answer."


def load_memory() -> str:
    """Persistent context: what previous sessions decided."""
    import os
    parts = []
    for name in ("AGENTS.md", "MISSION.md"):
        path = os.path.join(ROOT, name)
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as fh:
                parts.append(f"--- {name} ---\n{fh.read()}")
    journal = os.path.join(ROOT, "journal")
    if os.path.isdir(journal):
        recent = sorted(f for f in os.listdir(journal) if f.endswith(".md"))[-3:]
        for fname in recent:
            with open(os.path.join(journal, fname), "r", encoding="utf-8") as fh:
                parts.append(f"--- journal/{fname} ---\n{fh.read()}")
    return "\n\n".join(parts)
