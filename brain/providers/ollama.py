"""Local, free, unlimited. Requires `ollama serve` on the default port."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from .base import Message, Provider, ToolCall, coerce_arguments


class OllamaProvider(Provider):
    name = "ollama"

    def __init__(self, model: str = "qwen2.5:7b",
                 host: str = "http://127.0.0.1:11434") -> None:
        self.model = model
        self.host = host.rstrip("/")

    def chat(self, messages: list[Message], tools: list[dict]) -> Message:
        payload = {
            "model": self.model,
            "stream": False,
            "messages": [m.to_dict() for m in messages],
        }
        if tools:
            payload["tools"] = [
                {"type": "function",
                 "function": {"name": t["name"],
                              "description": t["description"],
                              "parameters": t["parameters"]}}
                for t in tools
            ]
        req = urllib.request.Request(
            f"{self.host}/api/chat",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.loads(resp.read())
        except urllib.error.URLError as exc:
            raise RuntimeError(
                f"cannot reach Ollama at {self.host}. Start it with `ollama serve` "
                f"and pull a tool-capable model: `ollama pull {self.model}`. ({exc})"
            ) from exc

        msg = data.get("message", {})
        calls = []
        for i, raw in enumerate(msg.get("tool_calls") or []):
            fn = raw.get("function", {})
            calls.append(ToolCall(
                id=raw.get("id") or f"call_{i}",
                name=fn.get("name", ""),
                arguments=coerce_arguments(fn.get("arguments")),
            ))
        return Message("assistant", msg.get("content", "") or "", calls)
