"""A mailbox between ZAISEN AI and an Arena session.

Two backends, one protocol:
  file   - .relay/mailbox.jsonl, local, zero setup (default)
  github - comments on a single issue in your repo, works across machines

The protocol is a marker comment so a message is machine-parseable but still
readable if you open the issue in a browser.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "zaisen:"
META_RE = re.compile(r"<!--\s*zaisen:(\{.*?\})\s*-->", re.S)
API = "https://api.github.com"
LABEL = "zaisen-mailbox"
ISSUE_TITLE = "ZAISEN mailbox"


def new_id() -> str:
    return f"m_{int(time.time() * 1000):x}{os.urandom(2).hex()}"


def render(kind: str, mid: str, text: str, session: str = "",
           reply_to: str = "") -> str:
    payload = {"id": mid, "kind": kind, "ts": time.time(), "session": session}
    if reply_to:
        payload["reply_to"] = reply_to
    meta = json.dumps(payload, separators=(",", ":"))
    header = "**ZAISEN → Arena**" if kind == "ask" else "**Arena → ZAISEN**"
    return f"<!-- {MARKER}{meta} -->\n{header}\n\n{text.strip()}\n"


def parse(body: str) -> dict | None:
    """Pull a message out of a comment. Returns None for human chatter."""
    match = META_RE.search(body or "")
    if not match:
        return None
    try:
        meta = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    rest = META_RE.sub("", body).strip().splitlines()
    if rest and rest[0].startswith("**"):
        rest = rest[1:]
    return {
        "id": meta.get("id", ""),
        "kind": meta.get("kind", "ask"),
        "ts": meta.get("ts", 0),
        "session": meta.get("session", ""),
        "reply_to": meta.get("reply_to", ""),
        "text": "\n".join(rest).strip(),
    }


class Store:
    backend = "base"

    def messages(self) -> list[dict]:
        raise NotImplementedError

    def post_ask(self, text: str, session: str = "") -> dict:
        raise NotImplementedError

    def post_reply(self, reply_to: str, text: str, session: str = "") -> dict:
        raise NotImplementedError

    # ---- shared derivations ----

    def pending(self) -> list[dict]:
        """Asks nobody has answered yet."""
        msgs = self.messages()
        answered = {m["reply_to"] for m in msgs if m["kind"] == "reply" and m.get("reply_to")}
        return [m for m in msgs if m["kind"] == "ask" and m["id"] not in answered]

    def unanswered_count(self) -> int:
        return len(self.pending())


class FileStore(Store):
    """Local JSONL. Perfect for a single machine and for tests."""

    backend = "file"

    def __init__(self, path: str | Path | None = None) -> None:
        self.path = Path(path or os.environ.get("ZAISEN_MAILBOX")
                         or ROOT / ".relay" / "mailbox.jsonl")

    def _append(self, record: dict) -> dict:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, separators=(",", ":")) + "\n")
        return record

    def messages(self) -> list[dict]:
        if not self.path.is_file():
            return []
        out = []
        with self.path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return out

    def post_ask(self, text: str, session: str = "") -> dict:
        return self._append({"id": new_id(), "kind": "ask", "ts": time.time(),
                             "session": session, "text": text.strip()})

    def post_reply(self, reply_to: str, text: str, session: str = "") -> dict:
        if not session:
            session = next((m["session"] for m in self.messages()
                            if m["id"] == reply_to and m.get("session")), "")
        return self._append({"id": new_id(), "kind": "reply", "ts": time.time(),
                             "session": session, "reply_to": reply_to,
                             "text": text.strip()})


class GitHubStore(Store):
    """Comments on one issue. Survives restarts and works across machines."""

    backend = "github"

    def __init__(self, repo: str, token: str, issue: int | None = None) -> None:
        self.repo = repo
        self.token = token
        self._issue = issue

    # ---- transport ----

    def _api(self, method: str, path: str, body: dict | None = None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            f"{API}{path}", data=data, method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "zaisen-mailbox/1.0",
                **({"Content-Type": "application/json"} if data else {}),
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:400]
            raise RuntimeError(f"GitHub {exc.code} on {method} {path}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"cannot reach GitHub: {exc}") from exc

    def issue_number(self) -> int:
        if self._issue:
            return self._issue
        # Match by title first: tokens without label permissions silently drop
        # labels on create, which used to make every boot create a new issue.
        found = self._api("GET", f"/repos/{self.repo}/issues"
                                 f"?state=all&per_page=50")
        candidates = [i for i in (found if isinstance(found, list) else [])
                      if i.get("title") == ISSUE_TITLE
                      or LABEL in [l.get("name") for l in i.get("labels", [])]]
        if candidates:
            self._issue = int(min(candidates, key=lambda i: i["number"])["number"])
        else:
            created = self._api("POST", f"/repos/{self.repo}/issues", {
                "title": ISSUE_TITLE,
                "body": ("Messages between ZAISEN AI and an Arena agent.\n\n"
                         "Do not delete. Pinned by the relay protocol."),
                "labels": [LABEL],
            })
            self._issue = int(created["number"])
        return self._issue

    # ---- store interface ----

    def messages(self) -> list[dict]:
        number = self.issue_number()
        raw = self._api("GET", f"/repos/{self.repo}/issues/{number}"
                               f"/comments?per_page=100")
        out = []
        for comment in raw if isinstance(raw, list) else []:
            parsed = parse(comment.get("body", ""))
            if parsed:
                out.append(parsed)
        out.sort(key=lambda m: m["ts"])
        return out

    def _comment(self, body: str) -> dict:
        number = self.issue_number()
        created = self._api("POST", f"/repos/{self.repo}/issues/{number}/comments",
                            {"body": body})
        return created if isinstance(created, dict) else {}

    def post_ask(self, text: str, session: str = "") -> dict:
        mid = new_id()
        self._comment(render("ask", mid, text, session))
        return {"id": mid, "kind": "ask", "ts": time.time(),
                "session": session, "text": text.strip()}

    def post_reply(self, reply_to: str, text: str, session: str = "") -> dict:
        if not session:
            session = next((m["session"] for m in self.messages()
                            if m["id"] == reply_to and m.get("session")), "")
        mid = new_id()
        self._comment(render("reply", mid, text, session, reply_to=reply_to))
        return {"id": mid, "kind": "reply", "ts": time.time(),
                "session": session, "reply_to": reply_to, "text": text.strip()}


class FallbackStore(Store):
    """Try GitHub, degrade to the file store if the token can't write.

    A relay that dead-ends on a permissions error is worse than one that keeps
    working locally and tells you why.
    """

    def __init__(self, primary: Store, fallback: Store) -> None:
        self.primary = primary
        self.fallback = fallback
        self.active: Store = primary
        self.backend = primary.backend
        self.last_error = ""

    def _switch(self, exc: Exception) -> None:
        if self.active is not self.primary:
            return
        self.last_error = f"{type(exc).__name__}: {exc}"
        self.active = self.fallback
        self.backend = f"{self.fallback.backend} (fell back from {self.primary.backend})"
        record_backend("file")
        print(f"relay: {self.last_error} -> using {self.fallback.backend} store",
              file=sys.stderr)

    def messages(self) -> list[dict]:
        try:
            return self.active.messages()
        except RuntimeError as exc:
            self._switch(exc)
            return self.active.messages()

    def post_ask(self, text: str, session: str = "") -> dict:
        try:
            return self.active.post_ask(text, session)
        except RuntimeError as exc:
            self._switch(exc)
            return self.active.post_ask(text, session)

    def post_reply(self, reply_to: str, text: str, session: str = "") -> dict:
        try:
            return self.active.post_reply(reply_to, text, session)
        except RuntimeError as exc:
            self._switch(exc)
            return self.active.post_reply(reply_to, text, session)


# ---------------------------------------------------------------- factory

def detect_repo() -> str:
    try:
        url = subprocess.run(
            ["git", "-C", str(ROOT), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""
    match = re.search(r"github\.com[:/]([^/]+/[^/.]+)", url)
    return match.group(1) if match else ""


MARKER_FILE = ROOT / ".relay" / "backend"


def record_backend(name: str) -> None:
    try:
        MARKER_FILE.parent.mkdir(parents=True, exist_ok=True)
        MARKER_FILE.write_text(name + "\n", encoding="utf-8")
    except OSError:
        pass


def recorded_backend() -> str:
    try:
        return MARKER_FILE.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def open_store() -> Store:
    """Pick a backend from the environment, degrading to the file store.

    The choice is sticky across processes: if one of them discovers the GitHub
    token can't write, every local process uses the same store next time. A
    server and a CLI reading different mailboxes lose messages.
    """
    want = os.environ.get("ZAISEN_RELAY", "auto").lower()
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""
    repo = os.environ.get("ZAISEN_REPO") or detect_repo()
    issue = os.environ.get("ZAISEN_MAILBOX_ISSUE")

    if want == "file":
        record_backend("file")
        return FileStore()
    if want == "auto" and recorded_backend() == "file":
        return FileStore()
    if token and repo and want in ("auto", "github"):
        return FallbackStore(
            GitHubStore(repo, token, int(issue) if issue else None), FileStore())
    if want == "github":
        print("relay: falling back to the file store "
              "(set GITHUB_TOKEN and ZAISEN_REPO to use GitHub)", file=sys.stderr)
    return FileStore()


# ---------------------------------------------------------------- cli

def _print_messages(msgs: list[dict], limit: int = 20) -> None:
    if not msgs:
        print("(no messages)")
        return
    for m in msgs[-limit:]:
        arrow = "→ arena" if m["kind"] == "ask" else "← arena"
        print(f"[{m['id']}] {arrow}  {time.strftime('%H:%M', time.localtime(m['ts']))}")
        for line in m["text"].splitlines():
            print(f"    {line}")
        print()


def main(argv: list[str] | None = None) -> int:
    import argparse

    ap = argparse.ArgumentParser(
        prog="mailbox", description="ZAISEN ↔ Arena message relay.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("post", help="send a message to the agent")
    p.add_argument("text", nargs="+")
    p.add_argument("--session", default="")

    p = sub.add_parser("reply", help="answer a queued message")
    p.add_argument("message_id")
    p.add_argument("text", nargs="+")
    p.add_argument("--session", default="")

    sub.add_parser("pending", help="messages with no answer yet")
    sub.add_parser("thread", help="full history")
    sub.add_parser("doctor", help="show backend, repo, and counts")

    p = sub.add_parser("watch", help="print new messages as they arrive")
    p.add_argument("--interval", type=float, default=5.0)

    args = ap.parse_args(argv)
    store = open_store()

    if args.cmd == "post":
        rec = store.post_ask(" ".join(args.text), args.session)
        print(f"queued as {rec['id']}")
    elif args.cmd == "reply":
        store.post_reply(args.message_id, " ".join(args.text), args.session)
        print(f"replied to {args.message_id}")
    elif args.cmd == "pending":
        _print_messages(store.pending())
    elif args.cmd == "thread":
        _print_messages(store.messages(), limit=200)
    elif args.cmd == "doctor":
        print(f"backend : {store.backend}")
        if store.backend == "github":
            print(f"repo    : {store.repo}")
            print(f"issue   : #{store.issue_number()}")
        else:
            print(f"file    : {store.path}")
        msgs = store.messages()
        print(f"messages: {len(msgs)}  ({store.unanswered_count()} awaiting reply)")
    elif args.cmd == "watch":
        seen = {m["id"] for m in store.messages()}
        print(f"watching ({store.backend}) — ctrl-c to stop")
        try:
            while True:
                for m in store.messages():
                    if m["id"] not in seen:
                        seen.add(m["id"])
                        _print_messages([m])
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nstopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
