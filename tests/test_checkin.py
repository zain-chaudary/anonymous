"""Tests for session triage and the notification payloads."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from relay import checkin, notify  # noqa: E402
from relay.mailbox import FileStore, render  # noqa: E402


class Render(unittest.TestCase):
    def test_render_shows_pending_with_reply_hint(self):
        report = {
            "worktree": {"branch": "b", "dirty_files": 0, "unpushed": 0,
                         "last_commit": "abc msg"},
            "mail": {"backend": "file", "total": 1, "pending": [
                {"id": "m_1", "text": "hello there", "session": "s",
                 "waiting": "3m"}]},
            "errors": [],
        }
        out = checkin.render(report)
        self.assertIn("m_1", out)
        self.assertIn("hello there", out)
        self.assertIn("reply m_1", out)
        self.assertIn("untrusted", out)

    def test_render_handles_empty_mailbox(self):
        report = {
            "worktree": {"branch": "b", "dirty_files": 2, "unpushed": 1,
                         "last_commit": "abc"},
            "mail": {"backend": "file", "total": 0, "pending": []},
            "errors": ["mailbox: boom"],
        }
        out = checkin.render(report)
        self.assertIn("nothing to answer", out)
        self.assertIn("2 uncommitted", out)
        self.assertIn("1 unpushed", out)
        self.assertIn("boom", out)

    def test_age_buckets(self):
        import time
        now = time.time()
        self.assertTrue(checkin.age(now - 10).endswith("s"))
        self.assertTrue(checkin.age(now - 600).endswith("m"))
        self.assertTrue(checkin.age(now - 7200).endswith("h"))
        self.assertTrue(checkin.age(now - 200000).endswith("d"))


class Collect(unittest.TestCase):
    def test_collect_survives_missing_mailbox(self):
        os.environ["ZAISEN_MAILBOX"] = "/proc/definitely-not-writable/mailbox.jsonl"
        try:
            report = checkin.collect()
        finally:
            os.environ.pop("ZAISEN_MAILBOX", None)
        self.assertIn("worktree", report)
        self.assertIn("mail", report)
        self.assertIsInstance(report["errors"], list)


class Notify(unittest.TestCase):
    def test_ntfy_payload_is_the_message(self):
        req, desc = notify.build_request("ntfy", "https://ntfy.sh/t", "ping")
        self.assertTrue(desc.startswith("ntfy"))
        self.assertEqual(req.data, b"ping")
        self.assertEqual(req.get_header("Title"), notify.TITLE)

    def test_slack_payload_is_json(self):
        import json
        req, _ = notify.build_request("slack", "https://hooks.slack.com/x", "ping")
        self.assertEqual(json.loads(req.data)["text"].count("ping"), 1)

    def test_telegram_requires_token(self):
        with self.assertRaises(SystemExit):
            notify.build_request("telegram", "12345", "ping")

    def test_cli_ignores_non_ask_bodies(self):
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
            fh.write(render("reply", "m_2", "an answer", reply_to="m_1"))
            path = fh.name
        try:
            result = subprocess.run(
                [sys.executable, "relay/notify.py", "--body-file", path,
                 "--url", "https://ntfy.sh/x", "--dry-run"],
                cwd=ROOT, capture_output=True, text=True,
            )
        finally:
            os.unlink(path)
        self.assertEqual(result.returncode, 0)
        self.assertIn("not a question", result.stdout)

    def test_cli_dry_run_stops_before_sending(self):
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
            fh.write(render("ask", "m_3", "real question"))
            path = fh.name
        try:
            result = subprocess.run(
                [sys.executable, "relay/notify.py", "--body-file", path,
                 "--url", "https://ntfy.sh/x", "--dry-run"],
                cwd=ROOT, capture_output=True, text=True,
            )
        finally:
            os.unlink(path)
        self.assertEqual(result.returncode, 2)
        self.assertIn("real question", result.stdout)


class Workflow(unittest.TestCase):
    def test_workflow_exists_and_is_inert_by_default(self):
        path = Path(ROOT) / ".github" / "workflows" / "mailbox-notify.yml"
        text = path.read_text(encoding="utf-8")
        self.assertIn("issue_comment", text)
        self.assertIn("permissions: {}", text, "notifier must not need write access")
        self.assertIn("NOTIFY_URL", text)
        self.assertNotIn("\t", text, "YAML forbids tabs")


if __name__ == "__main__":
    unittest.main(verbosity=2)
