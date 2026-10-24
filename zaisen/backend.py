"""Brains for ZAISEN AI. Streaming, stdlib only.

Providers:
  ollama  - local, free, unmetered
  openai  - any OpenAI-compatible endpoint (Groq, OpenRouter, LM Studio, vLLM)
  demo    - no model configured; answers with setup instructions
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Iterator

SYSTEM_PROMPT = """You are ZAISEN AI, a helpful assistant in a web chat.

Be direct and useful. Prefer concrete answers over hedging. Use short
paragraphs, and fenced code blocks for code. If you do not know something,
say so instead of guessing. Never claim to be a different product; if asked
which model powers you, answer honestly."""


def parse_ollama_line(line: bytes) -> tuple[str, bool]:
    """Ollama emits newline-delimited JSON."""
    if not line.strip():
        return "", False
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return "", False
    piece = (data.get("message") or {}).get("content") or ""
    return piece, bool(data.get("done"))


def parse_openai_line(line: bytes) -> tuple[str, bool]:
    """OpenAI-compatible endpoints emit SSE `data: {...}` lines."""
    text = line.decode("utf-8", errors="replace").strip()
    if not text.startswith("data:"):
        return "", False
    payload = text[5:].strip()
    if payload == "[DONE]":
        return "", True
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return "", False
    choices = data.get("choices") or []
    if not choices:
        return "", False
    delta = choices[0].get("delta") or {}
    return delta.get("content") or "", bool(choices[0].get("finish_reason"))


class Backend:
    def __init__(self) -> None:
        self.provider = os.environ.get("ZAISEN_PROVIDER", "auto").lower()
        self.model = os.environ.get("ZAISEN_MODEL", "")
        self.base_url = os.environ.get("ZAISEN_BASE_URL", "").rstrip("/")
        self.api_key = os.environ.get("ZAISEN_API_KEY", "")
        self.ollama_host = os.environ.get(
            "ZAISEN_OLLAMA_HOST", "http://127.0.0.1:11434"
        ).rstrip("/")
        self.effective = self._resolve()

    # ---------- setup ----------

    def _ollama_up(self) -> bool:
        try:
            with urllib.request.urlopen(
                f"{self.ollama_host}/api/tags", timeout=1.5
            ) as resp:
                return resp.status == 200
        except (urllib.error.URLError, OSError):
            return False

    def _resolve(self) -> str:
        if self.provider == "auto":
            return "ollama" if self._ollama_up() else "demo"
        if self.provider == "ollama" and not self._ollama_up():
            return "demo"
        if self.provider == "openai" and not (self.base_url and self.model):
            return "demo"
        return self.provider

    def describe(self) -> dict:
        return {
            "mode": self.effective,
            "model": self.model or (
                "qwen2.5:7b" if self.effective == "ollama" else "not configured"
            ),
            "configured": self.effective != "demo",
        }

    # ---------- streaming ----------

    def stream(self, history: list[dict]) -> Iterator[str]:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history
        if self.effective == "ollama":
            yield from self._stream_ollama(messages)
        elif self.effective == "openai":
            yield from self._stream_openai(messages)
        else:
            yield from self._stream_demo()

    def _stream_ollama(self, messages: list[dict]) -> Iterator[str]:
        payload = {
            "model": self.model or "qwen2.5:7b",
            "messages": messages,
            "stream": True,
        }
        req = urllib.request.Request(
            f"{self.ollama_host}/api/chat",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                for line in resp:
                    piece, done = parse_ollama_line(line)
                    if piece:
                        yield piece
                    if done:
                        return
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            yield f"\n\n**Model error ({exc.code}):** {detail}"
        except (urllib.error.URLError, OSError) as exc:
            yield (
                f"\n\n**Cannot reach Ollama at {self.ollama_host}.** "
                f"Start it with `ollama serve`, then retry. ({exc})"
            )

    def _stream_openai(self, messages: list[dict]) -> Iterator[str]:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "temperature": 0.7,
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode(),
            headers=headers,
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                for line in resp:
                    piece, done = parse_openai_line(line)
                    if piece:
                        yield piece
                    if done:
                        return
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            yield f"\n\n**Provider error ({exc.code}):** {detail}"
        except (urllib.error.URLError, OSError) as exc:
            yield f"\n\n**Cannot reach {self.base_url}.** ({exc})"

    def _stream_demo(self) -> Iterator[str]:
        yield (
            "**ZAISEN AI is running, but no model is connected yet.**\n\n"
            "The chat, streaming, memory, and UI all work — this reply comes from "
            "the offline demo brain.\n\n"
            "To connect a real brain, pick one:\n\n"
            "**Local, free, unmetered**\n\n"
            "```bash\nollama serve\nollama pull qwen2.5:7b\n"
            "ZAISEN_PROVIDER=ollama python3 zaisen/server.py\n```\n\n"
            "**Free API tier**\n\n"
            "```bash\nZAISEN_PROVIDER=openai \\\n"
            "ZAISEN_BASE_URL=https://api.groq.com/openai/v1 \\\n"
            "ZAISEN_MODEL=llama-3.3-70b-versatile \\\n"
            "ZAISEN_API_KEY=gsk_... \\\n"
            "python3 zaisen/server.py\n```\n\n"
            "Then reload this page and send a message."
        )
