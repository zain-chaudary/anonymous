# ZAISEN AI

A chat app you own: your domain, your brand, your model. Streaming responses,
conversation memory, mobile layout, no build step, no dependencies.

```bash
python3 zaisen/server.py          # http://localhost:8000
```

With nothing configured it runs in **demo mode** — the UI, streaming, and memory
all work, and it tells you how to connect a real brain.

---

## The thing that isn't possible

You asked for a site where messages go to *me* (this Arena agent) and my reply
comes back, without anyone knowing it's Arena.

That can't be built. Not a policy problem first — a plumbing problem:

- **There is no endpoint to send to.** Arena Agent Mode is a hosted product with
  a chat box. I'm instantiated when you open a session and I cease to exist when
  it closes. There's no URL, no key, no queue where a request for me could wait.
- **An "API" that claims otherwise is something else.** Any wrapper advertising
  "Arena as a backend" is either scraping a browser session (fragile, and against
  the terms of any provider) or quietly swapping in a different model while
  charging you for the name.
- **Masking the model you're serving is a licensing problem, not just optics.**
  Llama, Mistral, and most open weights carry attribution terms; commercial APIs
  forbid proxying their output under another brand. That's why every legitimate
  product has a "powered by" line.

So ZAISEN AI is built the honest way: **it talks to the model directly**, from
your server, with your key. You own the brand because you own the stack, not
because the origin is hidden.

If you want this same experience *with* a frontier brain, the path is a paid API
key from Anthropic / OpenAI / Google and pointing `ZAISEN_BASE_URL` at it. Roughly
$5–20/month for personal traffic. That's the real price of the thing you're asking
for, and it's cheaper than the alternatives.

---

## Connect a brain

### Local — free and unmetered

```bash
ollama serve
ollama pull qwen2.5:7b          # needs ~5 GB RAM; 14b if you have 16 GB+
ZAISEN_PROVIDER=ollama ZAISEN_MODEL=qwen2.5:7b python3 zaisen/server.py
```

No key, no bill, no rate limit, works offline. Weaker at long reasoning chains.

### Free API tier

```bash
ZAISEN_PROVIDER=openai \
ZAISEN_BASE_URL=https://api.groq.com/openai/v1 \
ZAISEN_MODEL=llama-3.3-70b-versatile \
ZAISEN_API_KEY=gsk_... \
python3 zaisen/server.py
```

OpenRouter works identically (`https://openrouter.ai/api/v1`) and has `:free`
models. Free tiers are rate-limited and change without notice — fine for a
personal app, not for a product with users.

### Paid, if you want the best answers

```bash
ZAISEN_PROVIDER=openai \
ZAISEN_BASE_URL=https://api.anthropic.com/v1 \
ZAISEN_MODEL=claude-sonnet-4-5 \
ZAISEN_API_KEY=sk-ant-...
```

Any endpoint that speaks the OpenAI chat-completions format works: OpenAI, Groq,
OpenRouter, Together, Fireworks, vLLM, LM Studio, llama.cpp server.

---

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `PORT` / `ZAISEN_PORT` | `8000` | listen port |
| `ZAISEN_PROVIDER` | `auto` | `auto` \| `ollama` \| `openai` |
| `ZAISEN_MODEL` | — | model id |
| `ZAISEN_BASE_URL` | — | OpenAI-compatible base, no trailing slash |
| `ZAISEN_API_KEY` | — | provider key, server-side only |
| `ZAISEN_OLLAMA_HOST` | `http://127.0.0.1:11434` | local Ollama |

`auto` probes Ollama on boot and falls back to demo. Nothing else is guessed.

---

## Deploy

Any host that runs a Python process. It's stdlib-only, so there's no install step.

```bash
# Docker
docker build -t zaisen -f zaisen/Dockerfile .
docker run -p 8000:8000 -e ZAISEN_PROVIDER=openai \
  -e ZAISEN_BASE_URL=... -e ZAISEN_MODEL=... -e ZAISEN_API_KEY=... zaisen
```

On Render / Railway / Fly: start command `python3 zaisen/server.py`, add the env
vars, and **bind to `0.0.0.0`** — already the default.

Put it behind HTTPS (all three platforms do this for you). The server has no TLS.

---

## Security notes

- **The API key never reaches the browser.** All provider calls happen in
  `server.py`; the page only talks to `/api/chat`.
- **Rate limiting is per-IP, in memory** — 30 messages per 5 minutes. Enough to
  stop a random crawler from burning your credits; not enough for a public
  product. For real traffic, add Cloudflare or a database-backed limiter.
- **Sessions are in memory**, capped at 20 messages each, and vanish on restart.
  That's deliberate for v1: a chat history is personal data, and "we didn't store
  it" is the cheapest privacy policy there is. Move it to SQLite when users ask
  for history across devices.
- **No auth.** Anyone with the URL can chat. Add a password or SSO before you
  share it, or your key pays for strangers' tokens.
- **The system prompt names the model honestly** if asked. If you rewrite it to
  claim ZAISEN is a proprietary model, you're back to the problem at the top of
  this file.

---

## Layout

```
zaisen/
  server.py           http server, SSE streaming, sessions, rate limit
  backend.py          providers (ollama / openai-compatible / demo)
  static/index.html   the whole UI: markup, styles, renderer, client
  Dockerfile
```

The UI is one file on purpose. Open it, edit it, reload. No bundler, no
`node_modules`, no build to break.
