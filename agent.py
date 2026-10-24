#!/usr/bin/env python3
"""CLI entry point. `python3 agent.py run "your task"`"""

from __future__ import annotations

import argparse
import os
import sys

from brain.loop import Agent, load_memory
from brain.policy import Policy


def build_provider(args):
    if args.provider == "mock":
        from brain.providers.mock import MockProvider
        return MockProvider()

    if args.provider == "ollama":
        from brain.providers.ollama import OllamaProvider
        return OllamaProvider(model=args.model or "qwen2.5:7b")

    if args.provider == "openai":
        from brain.providers.openai_compat import OpenAICompatProvider
        base = args.base_url or os.environ.get("AGENT_BASE_URL", "")
        model = args.model or os.environ.get("AGENT_MODEL", "")
        if not base or not model:
            sys.exit(
                "openai provider needs --base-url and --model "
                "(or AGENT_BASE_URL / AGENT_MODEL / AGENT_API_KEY)."
            )
        return OpenAICompatProvider(model=model, base_url=base)

    sys.exit(f"unknown provider {args.provider!r}")


def main() -> None:
    ap = argparse.ArgumentParser(
        prog="agent", description="Repo-scoped agent with a swappable brain.")
    ap.add_argument("task", nargs="*", help="what you want done")
    ap.add_argument("--provider", default="mock",
                    choices=["mock", "ollama", "openai"])
    ap.add_argument("--model", default=None)
    ap.add_argument("--base-url", dest="base_url", default=None)
    ap.add_argument("--policy", default=None, help="path to policy.json")
    ap.add_argument("--max-steps", type=int, default=None)
    ap.add_argument("--yes", action="store_true",
                    help="auto-approve prompts (use only in a sandbox)")
    ap.add_argument("--no-memory", action="store_true",
                    help="skip AGENTS.md / MISSION.md / journal in context")
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--trace", default=None, help="write JSON trace to this path")
    args = ap.parse_args()

    task = " ".join(args.task).strip()
    if not task:
        ap.print_help()
        sys.exit(2)

    policy = Policy(args.policy, assume_yes=args.yes)
    agent = Agent(build_provider(args), policy=policy,
                  max_steps=args.max_steps or policy.cfg.get("max_steps", 25),
                  verbose=not args.quiet)

    memory = "" if args.no_memory else load_memory()
    answer = agent.run(task, memory=memory)

    print("\n" + "=" * 60)
    print(answer)
    if policy.denials:
        print(f"\n[{len(policy.denials)} action(s) blocked by policy]")

    if args.trace:
        with open(args.trace, "w", encoding="utf-8") as fh:
            fh.write(agent.trace.to_json())
        print(f"\ntrace -> {args.trace}")


if __name__ == "__main__":
    main()
