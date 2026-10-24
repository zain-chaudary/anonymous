"""Guardrails. Nothing executes without passing through here first."""

from __future__ import annotations

import fnmatch
import json
import os
import shlex
from dataclasses import dataclass
from typing import Callable
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_POLICY = os.path.join(ROOT, "policy.json")

# Commands that mutate the machine irreversibly. Never auto-approved.
DESTRUCTIVE = {
    "rm", "rmdir", "mv", "dd", "mkfs", "fdisk", "shred", "truncate",
    "chmod", "chown", "kill", "pkill", "shutdown", "reboot",
}

# Patterns that are refused outright, in every mode including yolo.
NEVER = [
    "rm -rf /",
    "rm -rf /*",
    "rm -rf ~",
    ":(){ :|:& };:",
    "> /dev/sda",
    "mkfs.",
]

NET_SUBCOMMANDS = {"push", "reset", "clean", "checkout"}


@dataclass
class Decision:
    allowed: bool
    reason: str = ""
    needs_approval: bool = False


class Policy:
    def __init__(self, path: str | None = None, assume_yes: bool = False,
                 confirm: Callable[[str], bool] | None = None):
        self.path = path or DEFAULT_POLICY
        with open(self.path, "r", encoding="utf-8") as fh:
            self.cfg = json.load(fh)
        self.mode = self.cfg.get("mode", "careful")
        self.assume_yes = assume_yes
        self.confirm = confirm if confirm is not None else self._tty_confirm
        self.denials: list[str] = []

    # ---------- confirmation ----------

    @staticmethod
    def _tty_confirm(prompt: str) -> bool:
        import sys
        if not sys.stdin.isatty():
            return False
        try:
            return input(f"\n  {prompt} [y/N] ").strip().lower() in {"y", "yes"}
        except (EOFError, KeyboardInterrupt):
            return False

    def ask(self, prompt: str) -> Decision:
        if self.assume_yes or self.confirm(prompt):
            return Decision(True, "approved by operator", needs_approval=True)
        self.denials.append(prompt)
        return Decision(False, "operator declined", needs_approval=True)

    # ---------- individual checks ----------

    def check_shell(self, command: str) -> Decision:
        low = " ".join(command.split()).lower()
        for pat in NEVER:
            if pat in low:
                return Decision(False, f"refused in every mode: pattern {pat!r}")

        try:
            argv = shlex.split(command)
        except ValueError as exc:
            return Decision(False, f"unparseable command: {exc}")
        if not argv:
            return Decision(False, "empty command")

        base = os.path.basename(argv[0])
        blocked = [p for p in self.cfg.get("deny_patterns", []) if p in low]
        if blocked:
            return Decision(False, f"matches deny pattern {blocked[0]!r}")

        if self.mode == "yolo":
            return Decision(True, "yolo mode")

        if self.mode == "allowlist":
            allowed = self.cfg.get("allow_commands", [])
            if base not in allowed:
                return Decision(False, f"{base!r} is not in allow_commands")
            return Decision(True, "in allowlist")

        # careful mode: reads pass, mutations need a human
        if base in DESTRUCTIVE:
            return self.ask(f"Run destructive command: {command}")
        if base == "git" and len(argv) > 1 and argv[1] in NET_SUBCOMMANDS:
            return self.ask(f"Run git {argv[1]} (changes repo/branch state)?")
        return Decision(True, "read-only or routine in careful mode")

    def check_path(self, path: str, writing: bool) -> Decision:
        root = os.path.realpath(ROOT)
        target = os.path.realpath(os.path.join(root, path))
        if self.cfg.get("workspace_only", True) and not (
            target == root or target.startswith(root + os.sep)
        ):
            return Decision(False, f"{path!r} resolves outside the workspace")
        if writing:
            protected = self.cfg.get("protected_paths", [])
            rel = os.path.relpath(target, root).replace(os.sep, "/")
            for pat in protected:
                if (fnmatch.fnmatch(rel, pat)                 # exact / glob match
                        or rel == pat                          # literal file
                        or rel.startswith(pat.rstrip("/") + "/")  # inside a dir
                        or fnmatch.fnmatch(os.path.basename(target), pat)):
                    return Decision(False, f"{path!r} is protected by policy")
            if self.mode == "allowlist":
                return self.ask(f"Write to {path}?")
        return Decision(True)

    def check_host(self, url: str) -> Decision:
        host = (urlparse(url).hostname or "").lower()
        if not host:
            return Decision(False, f"not a valid URL: {url!r}")
        allowed = self.cfg.get("allow_hosts", [])
        if self.mode == "yolo":
            return Decision(True, "yolo mode")
        for pat in allowed:
            if fnmatch.fnmatch(host, pat) or host == pat:
                return Decision(True, f"{host} is allowlisted")
        return self.ask(f"Fetch from non-allowlisted host {host}?")
