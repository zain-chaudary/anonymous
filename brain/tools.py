"""The tool registry. Every capability the brain can reach is declared here."""

from __future__ import annotations

import json
import os
import subprocess
import urllib.request
from typing import Any, Callable

from .policy import ROOT, Policy

MAX_OUTPUT = 8000


class ToolError(Exception):
    pass


REGISTRY: dict[str, dict[str, Any]] = {}


def tool(name: str, description: str, parameters: dict[str, Any]):
    """Register a callable as an agent tool, with a JSON-schema signature."""

    def wrap(fn: Callable[..., Any]):
        REGISTRY[name] = {
            "name": name,
            "description": description,
            "parameters": parameters,
            "fn": fn,
        }
        return fn

    return wrap


def schemas() -> list[dict[str, Any]]:
    """Tool descriptions in the shape every provider wants."""
    return [
        {"name": t["name"], "description": t["description"],
         "parameters": t["parameters"]}
        for t in REGISTRY.values()
    ]


def _clip(text: str) -> str:
    if len(text) <= MAX_OUTPUT:
        return text
    return text[:MAX_OUTPUT] + f"\n... [truncated {len(text) - MAX_OUTPUT} chars]"


def dispatch(policy: Policy, name: str, args: dict[str, Any]) -> str:
    """Run one tool call through policy, then return a string for the model."""
    if name not in REGISTRY:
        return json.dumps({"error": f"unknown tool {name!r}"})
    try:
        result = REGISTRY[name]["fn"](policy, **args)
        return _clip(result if isinstance(result, str) else json.dumps(result, indent=2))
    except ToolError as exc:
        return json.dumps({"error": str(exc)})
    except TypeError as exc:
        return json.dumps({"error": f"bad arguments for {name}: {exc}"})
    except Exception as exc:  # noqa: BLE001 - surface anything to the brain
        return json.dumps({"error": f"{type(exc).__name__}: {exc}"})


# ---------------------------------------------------------------- files

@tool("list_dir", "List files under a directory in the workspace.",
      {"type": "object",
       "properties": {"path": {"type": "string", "default": "."}},
       "required": []})
def list_dir(policy: Policy, path: str = ".") -> str:
    decision = policy.check_path(path, writing=False)
    if not decision.allowed:
        raise ToolError(decision.reason)
    root = os.path.realpath(ROOT)
    base = os.path.realpath(os.path.join(root, path))
    if not os.path.isdir(base):
        raise ToolError(f"{path!r} is not a directory")
    rows = []
    for parent, dirs, files in os.walk(base):
        dirs[:] = sorted(d for d in dirs if d not in {".git", "__pycache__", "node_modules"})
        rel = os.path.relpath(parent, root)
        for f in sorted(files):
            rows.append(os.path.join(rel, f) if rel != "." else f)
        if len(rows) > 400:
            rows.append("... [listing capped]")
            break
    return "\n".join(rows) or "(empty)"


@tool("read_file", "Read a UTF-8 text file from the workspace.",
      {"type": "object",
       "properties": {"path": {"type": "string"},
                      "max_lines": {"type": "integer", "default": 400}},
       "required": ["path"]})
def read_file(policy: Policy, path: str, max_lines: int = 400) -> str:
    decision = policy.check_path(path, writing=False)
    if not decision.allowed:
        raise ToolError(decision.reason)
    full = os.path.join(ROOT, path)
    if not os.path.isfile(full):
        raise ToolError(f"{path!r} does not exist")
    with open(full, "r", encoding="utf-8", errors="replace") as fh:
        lines = fh.readlines()
    head = "".join(lines[:max_lines])
    if len(lines) > max_lines:
        head += f"\n... [{len(lines) - max_lines} more lines]"
    return head


@tool("write_file", "Create or overwrite a text file in the workspace.",
      {"type": "object",
       "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
       "required": ["path", "content"]})
def write_file(policy: Policy, path: str, content: str) -> str:
    decision = policy.check_path(path, writing=True)
    if not decision.allowed:
        raise ToolError(decision.reason)
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full) or full, exist_ok=True)
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(content)
    return f"wrote {len(content)} chars to {path}"


@tool("search_text", "Regex search across workspace files. Returns path:line:text.",
      {"type": "object",
       "properties": {"pattern": {"type": "string"},
                      "glob": {"type": "string", "default": "*.py"},
                      "limit": {"type": "integer", "default": 60}},
       "required": ["pattern"]})
def search_text(policy: Policy, pattern: str, glob: str = "*.py", limit: int = 60) -> str:
    import fnmatch
    import re

    try:
        rx = re.compile(pattern)
    except re.error as exc:
        raise ToolError(f"bad regex: {exc}")
    hits: list[str] = []
    for parent, dirs, files in os.walk(os.path.realpath(ROOT)):
        dirs[:] = [d for d in dirs if d not in {".git", "__pycache__", "node_modules"}]
        for f in files:
            if not fnmatch.fnmatch(f, glob):
                continue
            fp = os.path.join(parent, f)
            try:
                with open(fp, "r", encoding="utf-8", errors="replace") as fh:
                    for n, line in enumerate(fh, 1):
                        if rx.search(line):
                            hits.append(f"{os.path.relpath(fp, ROOT)}:{n}:{line.rstrip()}")
                            if len(hits) >= limit:
                                return "\n".join(hits)
            except OSError:
                continue
    return "\n".join(hits) or "(no matches)"


# ---------------------------------------------------------------- execution

@tool("run_shell", "Run a shell command in the workspace and return stdout/stderr.",
      {"type": "object",
       "properties": {"command": {"type": "string"},
                      "timeout": {"type": "integer", "default": 120}},
       "required": ["command"]})
def run_shell(policy: Policy, command: str, timeout: int = 120) -> str:
    decision = policy.check_shell(command)
    if not decision.allowed:
        raise ToolError(f"blocked by policy: {decision.reason}")
    proc = subprocess.run(
        command, shell=True, cwd=ROOT, capture_output=True,
        text=True, timeout=min(timeout, 600),
    )
    return (
        f"exit={proc.returncode}\n"
        f"--- stdout ---\n{proc.stdout}\n"
        f"--- stderr ---\n{proc.stderr}"
    )


@tool("http_get", "Fetch a URL. Subject to the host allowlist in policy.json.",
      {"type": "object",
       "properties": {"url": {"type": "string"}},
       "required": ["url"]})
def http_get(policy: Policy, url: str) -> str:
    decision = policy.check_host(url)
    if not decision.allowed:
        raise ToolError(f"blocked by policy: {decision.reason}")
    req = urllib.request.Request(url, headers={"User-Agent": "arena-agent/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read(MAX_OUTPUT).decode("utf-8", errors="replace")
        return f"status={resp.status}\n{body}"
