"""End-to-end loop test with the offline provider. No model, no network."""

from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from brain.loop import Agent, load_memory  # noqa: E402
from brain.policy import Policy  # noqa: E402
from brain.providers.mock import MockProvider  # noqa: E402
from brain.tools import REGISTRY, dispatch, schemas  # noqa: E402


class Loop(unittest.TestCase):
    def test_mock_run_completes_and_records_trace(self):
        agent = Agent(MockProvider(), policy=Policy(confirm=lambda _: False),
                      verbose=False)
        answer = agent.run("smoke test")
        self.assertIn("Loop verified", answer)
        kinds = {e["kind"] for e in agent.trace.entries}
        self.assertIn("tool_call", kinds)
        self.assertIn("tool_result", kinds)

    def test_blocked_command_is_reported_to_brain_not_executed(self):
        agent = Agent(MockProvider(), policy=Policy(confirm=lambda _: False),
                      verbose=False)
        agent.run("smoke test")
        results = [e for e in agent.trace.entries if e["kind"] == "tool_result"]
        blocked = [r for r in results if "blocked by policy" in r["result"]]
        self.assertTrue(blocked, "the destructive call should have been refused")

    def test_memory_includes_constitution(self):
        self.assertIn("AGENTS.md", load_memory())


class Tools(unittest.TestCase):
    def setUp(self):
        self.p = Policy(confirm=lambda _: False)

    def test_every_tool_has_a_schema(self):
        names = {t["name"] for t in schemas()}
        self.assertEqual(names, set(REGISTRY))
        for schema in schemas():
            self.assertIn("description", schema)
            self.assertEqual(schema["parameters"]["type"], "object")

    def test_unknown_tool_returns_error_json(self):
        self.assertIn("unknown tool", dispatch(self.p, "nope", {}))

    def test_shell_goes_through_policy(self):
        out = dispatch(self.p, "run_shell", {"command": "rm -rf /"})
        self.assertIn("blocked by policy", out)

    def test_write_tool_refuses_protected_file(self):
        out = dispatch(self.p, "write_file",
                       {"path": "policy.json", "content": "{}"})
        self.assertIn("protected", out)


if __name__ == "__main__":
    unittest.main(verbosity=2)
