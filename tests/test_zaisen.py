"""Tests for the ZAISEN backend parsers and demo brain. No network needed."""

from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)                                  # repo root -> brain/
sys.path.insert(0, os.path.join(HERE, "..", "zaisen"))    # -> backend

from backend import Backend, parse_ollama_line, parse_openai_line  # noqa: E402


class OllamaParsing(unittest.TestCase):
    def test_content_chunk(self):
        line = b'{"message":{"content":"Hel"},"done":false}'
        self.assertEqual(parse_ollama_line(line), ("Hel", False))

    def test_final_chunk(self):
        line = b'{"message":{"content":"lo"},"done":true}'
        self.assertEqual(parse_ollama_line(line), ("lo", True))

    def test_garbage_is_ignored(self):
        for junk in (b"", b"   ", b"not json", b'{"unexpected":1}'):
            self.assertEqual(parse_ollama_line(junk), ("", False))


class OpenAIParsing(unittest.TestCase):
    def test_delta(self):
        line = b'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}'
        self.assertEqual(parse_openai_line(line), ("Hi", False))

    def test_done_sentinel(self):
        self.assertEqual(parse_openai_line(b"data: [DONE]"), ("", True))

    def test_role_only_chunk(self):
        line = b'data: {"choices":[{"delta":{"role":"assistant"}}]}'
        self.assertEqual(parse_openai_line(line), ("", False))

    def test_non_data_lines(self):
        for junk in (b"", b": keep-alive", b"event: ping"):
            self.assertEqual(parse_openai_line(junk), ("", False))


class DemoMode(unittest.TestCase):
    def setUp(self):
        for var in ("ZAISEN_PROVIDER", "ZAISEN_BASE_URL", "ZAISEN_MODEL"):
            os.environ.pop(var, None)
        self.b = Backend()
        self.b.effective = "demo"

    def test_describe_reports_unconfigured(self):
        info = self.b.describe()
        self.assertEqual(info["mode"], "demo")
        self.assertFalse(info["configured"])

    def test_demo_reply_explains_setup(self):
        text = "".join(self.b.stream([]))
        self.assertIn("no model is connected", text)
        self.assertIn("ollama", text.lower())

    def test_history_is_passed_through(self):
        # demo ignores history, but must not raise on a populated conversation
        history = [{"role": "user", "content": "a"},
                   {"role": "assistant", "content": "b"}]
        self.assertTrue("".join(self.b.stream(history)))


class StaticAsset(unittest.TestCase):
    def test_ui_exists_and_brands_zaisen(self):
        path = os.path.join(HERE, "..", "zaisen", "static", "index.html")
        with open(path, encoding="utf-8") as fh:
            html = fh.read()
        self.assertIn("ZAISEN AI", html)
        self.assertIn("/api/chat", html)
        self.assertNotIn("api.arena.ai", html.lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
