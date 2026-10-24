"""ZAISEN AI chat server. Standard library only.

    python3 zaisen/server.py            # http://0.0.0.0:8000

Endpoints
    GET  /                 chat UI
    GET  /api/health       provider + model
    GET  /api/relay/thread mailbox history (asks + replies)
    POST /api/chat         {session_id, message} -> text/event-stream
    POST /api/reset        {session_id} -> clear that conversation
"""

from __future__ import annotations

import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from backend import Backend
from relay.mailbox import open_store

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ROOT, "static")

MAX_BODY = 32_000
MAX_TURNS = 20            # messages kept per session
RATE_LIMIT = 30           # requests
RATE_WINDOW = 300         # seconds

backend = Backend()

_sessions: dict[str, list[dict]] = {}
_lock = threading.Lock()
_hits: dict[str, list[float]] = {}


def history_for(session_id: str) -> list[dict]:
    with _lock:
        return list(_sessions.get(session_id, []))


def remember(session_id: str, role: str, content: str) -> None:
    with _lock:
        convo = _sessions.setdefault(session_id, [])
        convo.append({"role": role, "content": content})
        del convo[:-MAX_TURNS * 2]


def clear(session_id: str) -> None:
    with _lock:
        _sessions.pop(session_id, None)


def rate_ok(ip: str) -> bool:
    now = time.time()
    with _lock:
        hits = [t for t in _hits.get(ip, []) if now - t < RATE_WINDOW]
        if len(hits) >= RATE_LIMIT:
            _hits[ip] = hits
            return False
        hits.append(now)
        _hits[ip] = hits
        return True


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "ZAISEN"

    def log_message(self, fmt: str, *args) -> None:  # quieter logs
        print(f"{self.address_string()} {fmt % args}", flush=True)

    # ---------- helpers ----------

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path: str, ctype: str) -> None:
        try:
            with open(path, "rb") as fh:
                body = fh.read()
        except OSError:
            self._json(404, {"error": "not found"})
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, ValueError):
            return {}

    # ---------- routes ----------

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/index.html"):
            self._file(os.path.join(STATIC, "index.html"), "text/html; charset=utf-8")
        elif self.path == "/api/health":
            self._json(200, backend.describe())
        elif self.path == "/api/relay/thread":
            try:
                store = open_store()
                self._json(200, {"backend": store.backend,
                                 "messages": store.messages()})
            except Exception as exc:  # noqa: BLE001
                self._json(502, {"error": f"{type(exc).__name__}: {exc}"})
        elif self.path.startswith("/static/"):
            name = os.path.basename(self.path)
            ctype = "text/css" if name.endswith(".css") else (
                "application/javascript" if name.endswith(".js") else "text/plain")
            self._file(os.path.join(STATIC, name), ctype)
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/reset":
            clear((self._body() or {}).get("session_id", "default"))
            self._json(200, {"ok": True})
            return
        if self.path != "/api/chat":
            self._json(404, {"error": "not found"})
            return

        if not rate_ok(self.client_address[0]):
            self._json(429, {"error": "too many messages, slow down"})
            return

        data = self._body()
        message = (data.get("message") or "").strip()
        session_id = (data.get("session_id") or "default")[:80]
        if not message:
            self._json(400, {"error": "empty message"})
            return

        history = history_for(session_id)
        history.append({"role": "user", "content": message})

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Connection", "close")
        self.end_headers()

        collected: list[str] = []

        def emit(obj) -> None:
            chunk = obj if isinstance(obj, str) else json.dumps({"delta": obj})
            self.wfile.write(f"data: {chunk}\n\n".encode())
            self.wfile.flush()

        try:
            for piece in backend.stream(history, session_id=session_id):
                collected.append(piece)
                emit(piece)
            emit("[DONE]")
            remember(session_id, "user", message)
            remember(session_id, "assistant", "".join(collected))
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            self.close_connection = True


def main() -> None:
    port = int(os.environ.get("PORT") or os.environ.get("ZAISEN_PORT") or 8000)
    info = backend.describe()
    print(f"ZAISEN AI  ->  http://0.0.0.0:{port}", flush=True)
    print(f"brain      ->  {info['mode']} / {info['model']}", flush=True)
    if not info["configured"]:
        print("note       ->  no model connected, serving demo replies", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
