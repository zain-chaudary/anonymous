# Can anything wake the agent? — every mechanism, checked

Short answer: **no.** Nothing outside a session can start one, message one, or
resume one. That is true of connectors, Actions, webhooks, branches, cron, email,
and every service on the connector list.

But the practical problem — *"I want to send a message and get an answer without
babysitting a tab"* — is solvable, by waking **you** instead of me.

---

## Why every inbound path fails

| Mechanism | Why it can't reach a session |
|---|---|
| **GitHub / Drive / Notion / Gmail connectors** | Tools I call *during* a session. They only execute while I'm already running. Inbound-only: no listener on their side. |
| **GitHub Actions** (`issue_comment`, `workflow_dispatch`, `schedule`, `repository_dispatch`) | Actions run on GitHub's runners. To deliver a message they'd need to POST somewhere — and there's no endpoint for Arena sessions. Verified: Agent Mode has no webhook, no API, no callback. |
| **GitHub webhooks** | Same. A webhook with no receiver is just a log line. |
| **Branch push / PR opened / review requested** | Events, not deliveries. A push changes a repo; it doesn't run anything that can talk to me. |
| **`schedule:` cron in Actions** | Can run arbitrary code on a timer — cannot inject a message into a session. |
| **Email / Calendar / Slack** | Same class as connectors: readable only in-session. |
| **Supabase / Vercel / Linear** | Same. |
| **MCP or a public Arena API** | Doesn't exist. Arena's own help docs describe Agent Mode as a chat surface with built-in tools; no programmatic entry point is documented. |
| **Cron on your own machine** | Can run `agent.py` with a local model, 24/7. Cannot reach Arena. |
| **Arena scheduled tasks / automations** | No such feature. |

The rule behind all of them: **an agent session is a client, not a server.** No
inbound socket, no queue, no identity to address. Anything that "sends a message
to the agent" has to be handed over by a human in the session.

---

## What this repo does instead

Three things, in order of how close they get:

### 1. Wake the human — signal without polling

`.github/workflows/mailbox-notify.yml` posts a push notification the moment a
question lands in the GitHub mailbox. On your phone, in seconds.

```bash
# one-time: pick a private ntfy topic (or Slack/Telegram/generic webhook)
gh secret set NOTIFY_URL --body "https://ntfy.sh/zaisen-your-random-string"
gh variable set NOTIFY_FORMAT --body "ntfy"      # or slack | telegram | generic
```

Now the loop is: someone asks in ZAISEN → **your phone buzzes** → you open Arena
→ say *"CHECK AND ANSWER"*. Still a human in the loop, but you no longer have to
remember to look.

Test it locally without sending anything:

```bash
python3 relay/notify.py --body-file /tmp/comment.txt --url https://ntfy.sh/x --dry-run
```

### 2. One command for full triage — `bin/check`

Whatever the wake was, this is the first thing to run:

```bash
bin/check
# branch  arena/...  (clean)
# mailbox file · 1 awaiting reply · 3 total
#   [m_1a16d8f3bb84828]  waiting 2m · 26j8q60o
#     Hello GGG
#     → python3 relay/mailbox.py reply m_1a16d8f3bb84828 "..."
```

`--json` for scripting. It never mutates anything, so it's safe as a reflex.

### 3. Instant answers without any of this

If the latency in "wakes a human" is unacceptable — and for a real chat product it
is — the answer isn't a cleverer pipe, it's a brain that runs on your own box:

```bash
ZAISEN_PROVIDER=ollama python3 zaisen/server.py     # ~1s, free, no relay
```

That path has no wake problem at all, because nothing is asleep.

---

## The honest scoreboard

| Want | Possible? |
|---|---|
| Chat app with your brand | ✅ |
| Messages reach an Arena agent | ✅ via mailbox, when a session is open |
| Answers come back to the browser | ✅ polling, ~8s after posted |
| Agent starts itself when a message arrives | ❌ no inbound endpoint exists |
| Notification when a message arrives | ✅ `mailbox-notify.yml` |
| Sub-second replies | ✅ with a local/paid model in ZAISEN |
| Free and instant and always-on | ❌ pick two |

---

## If Arena ships a trigger later

The mailbox protocol is deliberately backend-agnostic. If Arena ever exposes
scheduled runs or a webhook receiver, the change is one function: have the trigger
call `Store.post_ask` instead of the chat UI, or have the session receive a URL
instead of polling `.relay/`. Everything above it — triage, protocol, threading,
tests — stays.
