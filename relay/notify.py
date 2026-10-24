#!/usr/bin/env python3
"""Sends a phone/chat notification when the mailbox receives a question.

This cannot wake the agent — nothing can. It wakes *you*, which is the closest
honest substitute: a ping means "open a session and say CHECK AND ANSWER".

    python3 relay/notify.py --body-file comment.txt --format ntfy \\
        --url https://ntfy.sh/your-secret-topic

Formats: ntfy | slack | telegram | generic
Reads NOTIFY_URL / NOTIFY_FORMAT / NOTIFY_TOKEN from the env as fallbacks.
Exit codes: 0 always (a notifier must never fail a workflow), 2 on --dry-run.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from relay.mailbox import parse  # noqa: E402

TITLE = "ZAISEN: new message"


def build_request(fmt: str, url: str, text: str,
                  token: str = "") -> tuple[urllib.request.Request, str]:
    """Return (request, human description). Pure enough to test offline."""
    body = (text or "").strip()[:1200]

    if fmt == "ntfy":
        req = urllib.request.Request(
            url, data=body.encode(),
            headers={"Title": TITLE, "Tags": "inbox_tray", "Priority": "default"},
            method="POST",
        )
        return req, f"ntfy -> {url}"

    if fmt == "slack":
        payload = {"text": f"*{TITLE}*\n{body}"}
        return urllib.request.Request(
            url, data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}, method="POST",
        ), f"slack -> {url.split('?')[0]}"

    if fmt == "telegram":
        if not token:
            raise SystemExit("telegram needs --token (bot token)")
        payload = {"chat_id": url, "text": f"{TITLE}\n\n{body}"}
        return urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}, method="POST",
        ), f"telegram -> chat {url}"

    payload = {"title": TITLE, "text": body, "source": "zaisen-mailbox"}
    return urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}, method="POST",
    ), f"generic -> {url.split('?')[0]}"


def main(argv: list[str]) -> int:
    import argparse

    ap = argparse.ArgumentParser(prog="notify", description=__doc__)
    ap.add_argument("--body-file", default=None,
                    help="file holding the raw comment/issue body")
    ap.add_argument("--body", default=None, help="raw body inline")
    ap.add_argument("--format", default=os.environ.get("NOTIFY_FORMAT", "ntfy"),
                    choices=["ntfy", "slack", "telegram", "generic"])
    ap.add_argument("--url", default=os.environ.get("NOTIFY_URL", ""))
    ap.add_argument("--token", default=os.environ.get("NOTIFY_TOKEN", ""))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    raw = args.body or ""
    if args.body_file:
        try:
            raw = Path(args.body_file).read_text(encoding="utf-8")
        except OSError as exc:
            print(f"notify: cannot read body: {exc}", file=sys.stderr)
            return 0

    message = parse(raw)
    if not message:
        print("notify: not a relay message, ignoring")
        return 0
    if message["kind"] != "ask":
        print(f"notify: {message['kind']} (not a question), ignoring")
        return 0

    text = f"{message['text']}\n\nid: {message['id']}"
    if not args.url:
        print("notify: no --url / NOTIFY_URL set", file=sys.stderr)
        return 0

    req, description = build_request(args.format, args.url, text, args.token)

    if args.dry_run:
        print(f"would send via {description}")
        print(f"body: {req.data.decode()}")
        return 2

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"notified via {description} ({resp.status})")
    except urllib.error.HTTPError as exc:
        print(f"notify: HTTP {exc.code} from {description}", file=sys.stderr)
    except urllib.error.URLError as exc:
        print(f"notify: cannot reach {description}: {exc}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
