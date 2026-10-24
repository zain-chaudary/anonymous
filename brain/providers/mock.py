"""Offline provider used to prove the loop works with no model and no key.

It replays a short scripted plan. Useful in CI and as a template when you
write your own provider.
"""

from __future__ import annotations

from .base import Message, Provider, ToolCall


class MockProvider(Provider):
    name = "mock"

    def __init__(self) -> None:
        self.step = 0

    def chat(self, messages: list[Message], tools: list[dict]) -> Message:
        self.step += 1
        if self.step == 1:
            return Message("assistant", "Let me see what's in the workspace.",
                           [ToolCall("c1", "list_dir", {"path": "."})])
        if self.step == 2:
            return Message("assistant", "Checking the policy file.",
                           [ToolCall("c2", "read_file", {"path": "policy.json",
                                                         "max_lines": 25})])
        if self.step == 3:
            return Message("assistant", "Trying something the policy should stop.",
                           [ToolCall("c3", "run_shell",
                                     {"command": "rm -rf /tmp/should-be-blocked"})])
        available = ", ".join(t["name"] for t in tools)
        return Message(
            "assistant",
            "Loop verified end to end: I listed files, read the policy, and my "
            f"destructive command was refused.\n\nTools wired: {available}\n\n"
            "Connect a real brain with --provider ollama or --provider openai.",
        )
