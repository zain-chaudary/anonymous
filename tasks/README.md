# tasks/

A dead-simple queue so work survives between sessions.

```
tasks/
  inbox/    one .md file per task, unfiled
  active/   the one being worked (gitignored)
  done/     finished, with a one-line outcome appended
```

**A task file:**

```markdown
# Add retry-with-backoff to the ollama provider

Why: local models occasionally return 500 under load.
Done when: a transient error is retried 3x with backoff, and a test covers it.
```

Drop a file in `inbox/` and the next session will find it. No tracker, no labels.
If the queue gets long enough to need tooling, that's a signal to say no more
often — not to build a tracker.
