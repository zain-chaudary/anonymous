"""The brain interface. Swap providers without touching the loop."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class Message:
    role: str                      # system | user | assistant | tool
    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    tool_call_id: str | None = None
    name: str | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"role": self.role, "content": self.content}
        if self.tool_calls:
            out["tool_calls"] = [
                {"id": c.id, "type": "function",
                 "function": {"name": c.name, "arguments": c.arguments}}
                for c in self.tool_calls
            ]
        if self.tool_call_id:
            out["tool_call_id"] = self.tool_call_id
        if self.name:
            out["name"] = self.name
        return out


class Provider:
    """A brain. Implement `chat` and the loop handles everything else."""

    name = "base"

    def chat(self, messages: list[Message], tools: list[dict]) -> Message:
        raise NotImplementedError


def coerce_arguments(raw: Any) -> dict[str, Any]:
    """Models emit tool args as a dict, a JSON string, or garbage."""
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        import json
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}
