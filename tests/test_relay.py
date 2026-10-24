"""Relay tests. No network: GitHub is exercised through a fake transport."""

from __future__ import annotations

import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "zaisen"))

import relay.mailbox as mailbox  # noqa: E402
from relay.mailbox import (  # noqa: E402
    FallbackStore, FileStore, GitHubStore, parse, render,
)


class Protocol(unittest.TestCase):
    def test_ask_roundtrip(self):
        parsed = parse(render("ask", "m_1", "hello **world**", "s1"))
        self.assertEqual(parsed["id"], "m_1")
        self.assertEqual(parsed["kind"], "ask")
        self.assertEqual(parsed["session"], "s1")
        self.assertEqual(parsed["text"], "hello **world**")

    def test_reply_carries_reply_to(self):
        parsed = parse(render("reply", "m_9", "an answer", reply_to="m_1"))
        self.assertEqual(parsed["reply_to"], "m_1")

    def test_multiline_text_survives(self):
        text = "line one\n\n- bullet\n- bullet two"
        self.assertEqual(parse(render("ask", "m_2", text))["text"], text)

    def test_human_comments_ignored(self):
        self.assertIsNone(parse("just talking in the issue"))
        self.assertIsNone(parse(""))

    def test_malformed_metadata_ignored(self):
        self.assertIsNone(parse("<!-- zaisen:{not json} --> hello"))


class FileStoreBehaviour(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.store = FileStore(Path(self.dir) / "mailbox.jsonl")

    def test_pending_until_answered(self):
        ask = self.store.post_ask("q1", session="s")
        self.assertEqual(len(self.store.pending()), 1)
        self.store.post_reply(ask["id"], "a1")
        self.assertEqual(self.store.pending(), [])

    def test_answering_one_does_not_clear_another(self):
        first = self.store.post_ask("q1")
        second = self.store.post_ask("q2")
        self.store.post_reply(first["id"], "a1")
        pending = [m["id"] for m in self.store.pending()]
        self.assertEqual(pending, [second["id"]])

    def test_reply_inherits_session_from_ask(self):
        ask = self.store.post_ask("q", session="browser-42")
        self.store.post_reply(ask["id"], "a")
        reply = [m for m in self.store.messages() if m["kind"] == "reply"][0]
        self.assertEqual(reply["session"], "browser-42")

    def test_missing_file_reads_as_empty(self):
        self.assertEqual(FileStore(Path(self.dir) / "nope.jsonl").messages(), [])


class StickyFallback(unittest.TestCase):
    """A failed GitHub write must not split the mailbox across two stores."""

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self._orig_marker = mailbox.MARKER_FILE
        mailbox.MARKER_FILE = Path(self.dir) / "backend"

    def tearDown(self):
        mailbox.MARKER_FILE = self._orig_marker

    def test_write_failure_switches_and_is_recorded(self):
        class Broken(FileStore):
            backend = "github"

            def post_ask(self, text, session=""):
                raise RuntimeError("GitHub 403")

        store = FallbackStore(Broken(Path(self.dir) / "a.jsonl"),
                              FileStore(Path(self.dir) / "b.jsonl"))
        record = store.post_ask("hello")
        self.assertTrue(record["id"])
        self.assertIn("fell back", store.backend)
        self.assertEqual(mailbox.recorded_backend(), "file")

    def test_reading_after_switch_uses_fallback(self):
        class Broken(FileStore):
            backend = "github"

            def post_ask(self, text, session=""):
                raise RuntimeError("GitHub 403")

        store = FallbackStore(Broken(Path(self.dir) / "a.jsonl"),
                              FileStore(Path(self.dir) / "b.jsonl"))
        store.post_ask("hello")
        self.assertEqual(len(store.messages()), 1)


class IssueLookup(unittest.TestCase):
    """Regression: a token without label permissions dropped labels on create,
    so every boot made another 'ZAISEN mailbox' issue."""

    def _store(self, issues):
        store = GitHubStore("owner/repo", "token")
        store._api = lambda method, path, body=None: issues
        return store

    def test_matches_by_title_without_labels(self):
        store = self._store([
            {"number": 7, "title": "ZAISEN mailbox", "labels": []},
            {"number": 9, "title": "other", "labels": []},
        ])
        self.assertEqual(store.issue_number(), 7)

    def test_picks_the_oldest_of_duplicates(self):
        store = self._store([
            {"number": 12, "title": "ZAISEN mailbox", "labels": []},
            {"number": 4, "title": "ZAISEN mailbox", "labels": []},
        ])
        self.assertEqual(store.issue_number(), 4)

    def test_matches_by_label_too(self):
        store = self._store([
            {"number": 3, "title": "renamed", "labels": [{"name": "zaisen-mailbox"}]},
        ])
        self.assertEqual(store.issue_number(), 3)

    def test_creates_when_absent(self):
        calls = []

        def fake(method, path, body=None):
            calls.append(method)
            if method == "POST":
                return {"number": 21}
            return []

        store = GitHubStore("owner/repo", "token")
        store._api = fake
        self.assertEqual(store.issue_number(), 21)
        self.assertEqual(calls, ["GET", "POST"])


class RelayProvider(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.store = FileStore(Path(self.dir) / "mailbox.jsonl")
        self.backend_mod = importlib.import_module("backend")
        self._orig = self.backend_mod.open_store
        self.backend_mod.open_store = lambda: self.store

    def tearDown(self):
        self.backend_mod.open_store = self._orig

    def _relay_backend(self):
        b = self.backend_mod.Backend()
        b.effective = "relay"
        return b

    def test_message_is_queued_and_acknowledged(self):
        b = self._relay_backend()
        history = [{"role": "user", "content": "ping"}]
        text = "".join(b.stream(history, session_id="chat-1"))
        self.assertIn("Queued as", text)
        queued = self.store.messages()
        self.assertEqual(len(queued), 1)
        self.assertEqual(queued[0]["session"], "chat-1")
        self.assertIn(queued[0]["id"], text)

    def test_describe_flags_relay(self):
        info = self._relay_backend().describe()
        self.assertTrue(info["relay"])
        self.assertTrue(info["configured"])

    def test_answer_visible_to_browser(self):
        b = self._relay_backend()
        list(b.stream([{"role": "user", "content": "ping"}], session_id="chat-1"))
        ask = self.store.messages()[0]
        self.store.post_reply(ask["id"], "pong")
        replies = [m for m in self.store.messages() if m["kind"] == "reply"]
        self.assertEqual(replies[0]["text"], "pong")
        self.assertEqual(replies[0]["session"], "chat-1")


if __name__ == "__main__":
    unittest.main(verbosity=2)
