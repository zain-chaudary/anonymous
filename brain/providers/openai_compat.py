"""Any OpenAI-compatible endpoint: Groq, OpenRouter, vLLM, LM Studio, OpenAI.

Examples:
  Groq      --base-url https://api.groq.com/openai/v1 --model llama-3.3-70b-versatile
  OpenRouter--base-url https://openrouter.ai/api/v1 --model meta-llama/llama-3.3-70b-instruct:free
  LM Studio --base-url http://127.0.0.1:1234/v1 --model local-model
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from .base import Message, Provider, ToolCall, coerce_arguments


class OpenAICompatProvider(Provider):
    name = "openai"

    def __init__(self, model: str, base_url: str,
                 api_key: str | None = None, temperature: float = 0.2) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key or os.environ.get("AGENT_API_KEY", "")
        self.temperature = temperature

    def chat(self, messages: list[Message], tools: list[dict]) -> Message:
        payload = {
            "model": self.model,
            "temperature": self.temperature,
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
            payload["tool_choice"] = "auto"

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode(), headers=headers,
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:600]
            raise RuntimeError(f"provider returned {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"cannot reach {self.base_url}: {exc}") from exc

        choice = (data.get("choices") or [{}])[0]
        msg = choice.get("message", {}) or {}
        calls = []
        for raw in msg.get("tool_calls") or []:
            fn = raw.get("function", {})
            calls.append(ToolCall(
                id=raw.get("id") or "call_0",
                name=fn.get("name", ""),
                arguments=coerce_arguments(fn.get("arguments")),
            ))
        return Message("assistant", msg.get("content") or "", calls)
