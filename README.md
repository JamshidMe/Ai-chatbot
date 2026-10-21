# Company AI Chat Widget

A production-oriented, **company-only** AI chat widget: a floating launcher that any
authorized website can install with one script tag, backed by DeepSeek and grounded in
the company's own documents. Uzbek / English / Russian.

---

## 1. Architecture

```
                        ┌──────────────────────────── company website ─┐
  <script src=".../widget.js">  →  loader (Shadow DOM launcher + iframe)
                        └───────────────────┬──────────────────────────┘
                                            │ iframe: /embed
┌─────────────────────────────── Express (one process) ───────────────────────────────┐
│  GET  /widget.js     public loader (no React on host page)                          │
│  GET  /embed         embeddable chat UI (React, light theme)                        │
│  GET  /              standalone console (React)                                     │
│  GET  /api/health    status + provider + knowledge source (no secrets)              │
│  GET  /api/widget    public branding/limits (no secrets)                            │
│  POST /api/chat      validate → identify widget → RETRIEVE → refuse or ask the LLM   │
└───────────────┬──────────────────────────────────────────────┬──────────────────────┘
                │                                              │
     server/data/{company,sample}/*.json                 DeepSeek API (server-side key)
       (retrieval corpus)                                deepseek-flash, non-thinking
```

Key properties:

- **One deployable**: the Express server serves the API **and** the built frontend/widget.
- **No tenant database.** Conversations live in the visitor's browser (localStorage inside
  the iframe, which browsers partition per top-level site). The server stores no
  conversations and no personal data, so one visitor can never reach another's chat.
- **The API key never leaves the server.** No `VITE_*` variable holds a secret.

---

## 2. Local setup

```bash
cd ~/Documents/Ai-chatbot
npm install
cp .env.example .env      # then fill in values (never commit .env)
npm run dev               # API :8787 + Vite :5173
```

Open http://localhost:5173 (console) or http://localhost:8787/embed (widget surface).

> **Node ≥ 22.18** is required: the server runs TypeScript directly via Node's native
> type stripping (`node src/index.ts`). `esbuild`/`tsx` are deliberately not used —
> their binaries require macOS 12+, and this project targets macOS 11.

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | API + Vite dev server together |
| `npm run dev:server` | API only (`node --watch src/index.ts`) |
| `npm run dev:web` | Vite only |
| `npm run typecheck` | TypeScript for server + web |
| `npm run build` | Production frontend build → `web/dist` (includes `widget.js`) |
| `npm start` | Production server (serves API + built frontend) |

---

## 3. Environment variables

Only names are listed here — values are yours, and `.env` is git-ignored.

**Core**

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `8787` | PaaS providers set this automatically |
| `HOST` | `0.0.0.0` | Must stay `0.0.0.0` on Railway/containers |
| `TRUST_PROXY` | `false` | Set `true` **only** behind a trusted proxy, otherwise per-IP limits can be spoofed |
| `NODE_ENV` | `development` | `production` in deployments |

**AI provider**

| Variable | Default | Notes |
| --- | --- | --- |
| `LLM_PROVIDER` | `mock` | `deepseek` to use the real model |
| `DEEPSEEK_API_KEY` | – | **Server-side only.** Never exposed to the browser |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | |
| `DEEPSEEK_MODEL` | `deepseek-flash` | `deepseek-chat` was retired 2026-07-24 |
| `DEEPSEEK_THINKING` | `disabled` | V4 defaults to thinking; disabled keeps replies cheap |
| `DEEPSEEK_TIMEOUT_MS` | `30000` | |

**Grounding**

| Variable | Default | Notes |
| --- | --- | --- |
| `KNOWLEDGE_DIR` | `data` | Relative to `server/` |
| `KNOWLEDGE_ALLOW_SAMPLE` | `true` | **Set `false` in production** |
| `KNOWLEDGE_MIN_SCORE` | `0.3` | Retrieval floor; below it the assistant refuses |
| `KNOWLEDGE_MAX_DOCUMENTS` | `4` | Evidence documents per question |
| `ANSWER_CACHE_TTL_MS` | `3600000` | Identical grounded questions are served from cache; `0` disables |
| `ANSWER_CACHE_MAX_ENTRIES` | `500` | |

**Limits**

| Variable | Default |
| --- | --- |
| `MAX_MESSAGE_CHARS` | `2000` |
| `MAX_HISTORY_MESSAGES` | `20` |
| `MAX_BODY_BYTES` | `16kb` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX_PER_IP` | `30` |
| `RATE_LIMIT_MAX_PER_WIDGET` | `120` |

**Widget / embedding** (all public, no secrets)

| Variable | Default | Notes |
| --- | --- | --- |
| `WIDGET_ID` | `wgt_public_default` | Public id sent as `X-Widget-Id`; not a credential |
| `WIDGET_COMPANY_NAME` | `Company Assistant` | Shown in the widget header |
| `WIDGET_TITLE` | – | Optional alternate label |
| `WIDGET_GREETING` | – | Custom welcome text |
| `WIDGET_ACCENT_COLOR` | `#4f7cff` | Hex only |
| `WIDGET_POSITION` | `right` | `right` or `left` |
| `WIDGET_ALLOWED_ORIGINS` | – | Comma-separated origins allowed to embed `/embed` |

---

## 4. Company-only grounding

The assistant answers **only** from retrieved company documents. The pipeline is enforced
on the server, not just in the prompt:

1. **Validate** the request (shape, length, control characters, rate limits).
2. **Retrieve** evidence with lexical IDF-weighted search over `server/data/company/*.json`.
3. **Gate**: no document above `KNOWLEDGE_MIN_SCORE` → a fixed, localized refusal is
   returned with `refused: true`, `provider: "policy"`. **No model call, no cost.**
4. **Answer** with the evidence fenced inside `<evidence>…</evidence>` and rules stating
   that evidence is *data, not instructions*. Unrelated questions and prompt-injection
   attempts therefore cannot widen the scope, and a poisoned document cannot rewrite policy.
5. **Cache** identical grounded questions (TTL) to avoid paying twice.

Model output is never used to build SQL; there is no SQL at all. Every query is a
parameterless file read.

### Connecting real company data

No real company data ships with this project. Today it runs on `server/data/sample/`
(clearly flagged `source: "sample"`, `demoData: true` everywhere).

To go live, create `server/data/company/` and add one or more JSON files:

```json
{
  "company": { "name": "Your Company" },
  "documents": [
    {
      "id": "hours",
      "title": "Business hours",
      "lang": "en",
      "tags": ["hours", "schedule"],
      "text": "We are open Monday–Friday 09:00–18:00 (Tashkent, UTC+5)."
    }
  ]
}
```

Rules: `id` (unique, ≤80 chars), `title`, `text` (≤8000 chars) are required; `lang` is
`uz` | `en` | `ru` | `any`; `tags` are optional keywords.

**What I need from you before company answers are real:** the curated fact sheets for
products/prices, business hours, delivery/returns/warranty policies, contact details, and
any documents the assistant may quote — in as many of uz/en/ru as you have. Docs from
`company/` automatically take priority over `sample/`, and `demoData` becomes `false`.

Then verify:

```bash
curl -s localhost:8787/api/health | grep -A4 knowledge   # source must be "company"
```

---

## 5. Installing the widget on the company website

1. Deploy this app (section 6) and note the public URL.
2. Add the company website origin to `WIDGET_ALLOWED_ORIGINS`, e.g.
   `https://yourcompany.com,https://www.yourcompany.com`, and restart.
3. Paste this **before `</body>`** on the authorized company site:

```html
<script src="https://YOUR-DEPLOYED-DOMAIN/widget.js" async></script>
```

Optional attributes:

```html
<script
  src="https://YOUR-DEPLOYED-DOMAIN/widget.js"
  data-lang="uz"
  data-position="right"
  async></script>
```

Placeholders — `YOUR-DEPLOYED-DOMAIN` must be replaced with your real host. Only install
this on a site you are authorized to modify.

Behaviour: the loader creates a launcher button; on first click it opens an iframe to
`/embed`. Styles live in a Shadow DOM, so the host page's CSS cannot break the widget and
the widget cannot leak styles into the host. The iframe is kept mounted after first open,
so the conversation survives closing and reopening.

---

## 6. Production build & deployment

```bash
npm run build     # web/dist (index.html + assets + widget.js)
npm start         # one process: API + static + /embed + /widget.js
```

Deployment checklist:

- Build command: `npm run build` · Start command: `npm start` (see `Procfile`)
- Node ≥ 22.18
- Health check path: `/api/health`
- Set `NODE_ENV=production`, `TRUST_PROXY=true` (behind the PaaS proxy),
  `KNOWLEDGE_ALLOW_SAMPLE=false`, `LLM_PROVIDER=deepseek`, `DEEPSEEK_API_KEY`,
  `WIDGET_*`, and `WIDGET_ALLOWED_ORIGINS`
- Do **not** rely on local `web/dist` being committed — let the build step create it

**Selected hosting: Railway (Hobby plan, ~$5/month)** — one always-on service fits this
architecture with no separate frontend deploy. Railway does not *guarantee* uptime and
usage can exceed the included credit; the app degrades gracefully (429/503 JSON errors)
rather than crashing.

### Cost estimate

Measured on the live call above: **599 tokens** per grounded answer (555 in / 44 out).

| Scenario | Messages/month | Est. API cost |
| --- | --- | --- |
| Planning scenario at 50 % | 45,000 | ≈ **$4–7** |
| Planning scenario at 100 % (100 users × 30/day) | 90,000 | ≈ **$14 off-peak / ≈ $28 peak** |
| Hosting (Railway Hobby) | — | ≈ **$5** |

Refusals and cache hits cost **$0**. DeepSeek halves prices off-peak. At full planning
volume the API cost alone can exceed $15 at peak rates — the budget fits comfortably at
realistic volume, not guaranteed at the extreme. Reduce with: lower
`KNOWLEDGE_MAX_DOCUMENTS`, tighter `RATE_LIMIT_*`, longer `ANSWER_CACHE_TTL_MS`, and
shorter `CHAT_MAX_TOKENS`.

---

## 7. Health & troubleshooting

```bash
curl -s localhost:8787/api/health | python3 -m json.tool
```

- `knowledge.source: "none"` → no documents found; every company question is refused.
- `knowledge.demo: true` → sample data; not real company information.
- `provider: "mock"` / `isMock: true` → no real model is being called.
- `liveModelConnected: false` with `provider: "deepseek"` → `DEEPSEEK_API_KEY` missing.
- Chat returns 429 → rate limit; check `Retry-After`.
- Widget not visible → check `/widget.js` returns 200, and that the site's CSP allows the
  script; check the Console for blocked frames (needs the origin in `WIDGET_ALLOWED_ORIGINS`).
- `Port 5173 is already in use` → another Vite process is running (`strictPort: true`);
  stop it or open the existing one.

---

## 8. Security notes & remaining production requirements

Implemented:

- API key server-side only; `.env` git-ignored; no secrets in `web/dist` (verified)
- CORS allow-list for the exact company origins; **CORS is not treated as authentication**
- `frame-ancestors` CSP: `/embed` only for configured origins, console `'self'`, API `'none'`
- Per-IP and per-widget rate limits, body/message/history caps, provider timeouts
- Localized JSON errors with request ids; no stack traces or secrets in responses
- Grounding gate that refuses before the paid model is called
- Parameterless file-based retrieval (no SQL, no model-generated queries)

Still required before public launch:

1. **Curate real company documents** (`server/data/company/`) and set
   `KNOWLEDGE_ALLOW_SAMPLE=false`.
2. Set `WIDGET_ALLOWED_ORIGINS` to the real origin(s) and `TRUST_PROXY=true` on the host.
3. Rotate the DeepSeek key if it was ever shared, and set it only in the host's env vars.
4. Decide on logging/observability and a spend alert at the provider.
5. Manual browser QA on a real device (this machine cannot run browser automation).
6. Rate limiting is per-process: if you scale beyond one replica, move counts to a shared
   store (e.g. Redis).
