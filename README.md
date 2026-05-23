# Scribe — AI Writing Assistant

Scribe helps you write better, faster. Draft in a clean editor, ask the AI for ideas or rewrites, get suggestions to polish your text, and export when you’re done—all in one place. Add your [OpenRouter](https://openrouter.ai) API key to get started.

![Stack](https://img.shields.io/badge/React-18-61dafb) ![Node](https://img.shields.io/badge/Express-4-339933) ![Python](https://img.shields.io/badge/Python-3.9+-3776ab)

## Features

| Area | What you get |
|------|----------------|
| **Editor** | Plain-text workspace, word count & read time, “Sounds AI-ish” lint, undo/redo |
| **Draft safety** | Autosave to `localStorage`, restore banner on reload |
| **Documents** | Save/load drafts in-session (title, tone, model, temperature) |
| **AI chat** | Streaming replies; insert at cursor, append, or replace selection |
| **AI assist** | Review draft, rewrite for clarity, improve selection with before/after compare |
| **Suggestions** | Parsed apply with preview; safe find/replace when the model gives quoted fixes |
| **Models** | Three free OpenRouter models by task (general, business, academic); refresh catalog; custom models |
| **API key** | Set in UI (dev) or server `.env` (production) |
| **Reliability** | Cancel in-flight requests, retry on failure, real token usage stats |
| **Export** | Markdown, PDF, DOCX (HTML fallback if PDF/DOCX fails) |
| **UI** | Writing Studio layout, resizable panels, mobile bottom nav |

**Writing voice:** All AI paths use rules from [`Skills.txt`](Skills.txt) (also [`shared/writing_skills.txt`](shared/writing_skills.txt)), loaded by `backend/scripts/writing_skills.py`. Edit either file to change tone app-wide.

**Storage:** Documents and edit history live in browser memory for the session (plus optional `localStorage` for drafts and dev API key). There is no database—refresh clears unsaved work unless you saved or restored a draft.

## Stack

```
Browser (React 18 + Tailwind)
    ↓  /api/*
Express (Node.js) — apiErrors, OpenRouter model cache
    ↓  spawn python3
Python scripts → OpenRouter API
```

| Layer | Tech |
|-------|------|
| Frontend | React 18, Tailwind, Axios, Lucide, jsPDF, docx |
| Backend | Express 4, CORS, dotenv, `pythonRunner.js`, `openRouterModels.js` |
| AI | Python 3.9+, `requests`, NLTK (optional) |

## Requirements

- **Node.js** 18+
- **npm** 8+
- **Python** 3.9+
- **OpenRouter API key** — [openrouter.ai/keys](https://openrouter.ai/keys) (`sk-or-...`)

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ai-writing-assistant

npm run install-all
pip install -r requirements.txt
npm run setup:nltk
```

`nltk_data/` is not in git; `npm run setup:nltk` downloads tokenizers locally.

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` at the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-...
PORT=5001
PYTHON_PATH=python3
DEFAULT_MODEL=openrouter/free
TEMPERATURE=0.7
MAX_TOKENS=1000
```

> **Port:** macOS often uses **5000** for AirPlay. This project defaults to **5001**. The CRA dev proxy in `frontend/package.json` forwards `/api` to `http://localhost:5001`.

### 3. Run

From the **repository root**:

```bash
npm start
```

| Service | URL |
|---------|-----|
| App (UI) | http://localhost:3000 |
| API | http://localhost:5001 |

Health check: `GET http://localhost:5001/api/health`

**Backend with auto-reload:**

```bash
cd backend && npm run dev
```

In another terminal: `cd frontend && npm start`

## Project structure

```
ai-writing-assistant/
├── frontend/
│   ├── public/
│   │   ├── logo.svg              # Header logo
│   │   └── favicon.svg           # Browser tab icon
│   └── src/
│       ├── api/index.js          # Axios + error interceptor
│       ├── components/
│       │   ├── AIWritingAssistant.jsx
│       │   ├── ErrorBoundary.jsx
│       │   └── studio/           # Editor, Assist, Settings, modals
│       ├── hooks/                # Chat, suggestions, autosave, history, …
│       ├── lib/                  # errors, streamChat, tokenUsage, editorUtils
│       └── constants/            # models, branding, conversationStarters
├── backend/
│   ├── server.js
│   ├── apiErrors.js
│   ├── openRouterModels.js       # Cached free model catalog
│   ├── pythonRunner.js
│   ├── sanitizeKey.js
│   └── scripts/
│       ├── generate_response.py
│       ├── generate_suggestions.py
│       ├── improve_readability.py
│       └── writing_skills.py
├── logos/                        # Source assets (copied to frontend/public)
├── Skills.txt                    # App-wide writing voice rules
├── scripts/smoke-test.js
├── Dockerfile                  # Production image (Node + Python + NLTK)
├── render.yaml                 # Render Blueprint (single Docker web service)
├── .env.example
└── package.json
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes* | OpenRouter bearer token |
| `PORT` | No | Backend port (use `5001` locally) |
| `PYTHON_PATH` | No | Python binary (default `python3`) |
| `DEFAULT_MODEL` | No | Fallback model id |
| `TEMPERATURE` | No | Default sampling temperature |
| `MAX_TOKENS` | No | Default max tokens per request |
| `NODE_ENV` | No | `production` serves `frontend/build` from Express |
| `ALLOW_UI_API_KEY` | No | Allow UI key save in production (default: blocked) |
| `FRONTEND_URL` | No | `HTTP-Referer` to OpenRouter; on Render, `RENDER_EXTERNAL_URL` is used if unset |
| `RENDER_EXTERNAL_URL` | No | Set automatically by Render — used for Referer and CORS when `FRONTEND_URL` is unset |
| `REACT_APP_API_URL` | No | Frontend API base when not using CRA proxy |
| `DEBUG` | No | Log Python stderr when `True` |

\* **Development:** set the key in **Settings → API key** (stored in server memory for the process; optional “Remember in browser”). **Production:** set `OPENROUTER_API_KEY` in `.env` only—the UI save endpoint returns `403` unless `ALLOW_UI_API_KEY=true`.

## API reference

Base URL: `http://localhost:5001` (development).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Status, Python path, `apiKeyConfigured` |
| `GET` | `/api/models` | Task-specific free models (cached ~6h) |
| `POST` | `/api/models/refresh` | Invalidate cache and refetch from OpenRouter |
| `POST` | `/api/generate` | Non-streaming chat completion |
| `POST` | `/api/generate/stream` | SSE stream (chat UI) |
| `POST` | `/api/suggestions` | Writing suggestions for draft content |
| `POST` | `/api/improve` | Readability rewrite (`selectedText` optional) |
| `POST` | `/api/verify-apikey` | Validate OpenRouter key |
| `POST` | `/api/verify-model` | Probe a custom model id |
| `GET` | `/api/settings/apikey` | Whether a key is set (masked preview optional) |
| `POST` | `/api/settings/apikey` | Set in-memory server key (dev / `ALLOW_UI_API_KEY`) |

Errors return JSON `{ error, details?, code? }` with appropriate HTTP status (401, 429, 502, etc.).

**Example — streaming is used by the UI; non-stream fallback:**

```bash
curl -s http://localhost:5001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"Outline a blog post about remote work."}],
    "documentType": "general",
    "tone": "professional",
    "model": "openrouter/free"
  }'
```

## How it works

1. React calls `/api/*` (CRA proxy in dev, or same-origin on production when API and UI share one host).
2. Express validates input, maps Python/OpenRouter errors via `apiErrors.js`, and spawns scripts with `pythonRunner.js`.
3. Python builds prompts (document type, tone, `Skills.txt`), calls OpenRouter, returns JSON on stdout.
4. Chat prefers `/api/generate/stream`; on failure it falls back to `/api/generate`.
5. Frontend normalizes errors in `lib/errors.js` and shows toasts / inline chat errors.

See `backend/scripts/RESPONSE_QUALITY.md` for response enrichment on generate.

## UI overview

| Panel | Actions |
|-------|---------|
| **Editor** | Write, undo/redo, save, export, improve selection |
| **Chat** | Streamed conversation; per-message **At cursor** / **Append** / **Replace selection** |
| **Assist** | Review draft, rewrite for clarity (compare modal), apply suggestions |
| **Style** (sidebar) | Document type, tone, model, temperature, API key, token usage |

Logo size: edit `frontend/src/constants/branding.js`.

## Production build

### Local (single host)

Express serves the React build:

```bash
cd frontend && npm run build
cd ..
NODE_ENV=production PORT=5001 node backend/server.js
```

Open http://localhost:5001

### Deploy on Render (recommended)

The repo includes a **Docker** image (`Dockerfile`) and **`render.yaml`** Blueprint so one **Web Service** runs Node, Python (OpenRouter scripts), and NLTK.

1. Push this repository to GitHub (or GitLab / Bitbucket).
2. In the [Render dashboard](https://dashboard.render.com), **New → Blueprint**, select the repo, and confirm it picks up `render.yaml`.
3. In the service **Environment**, add **`OPENROUTER_API_KEY`** (your `sk-or-...` key). Other vars in the Blueprint are optional defaults.
4. Deploy. When the build finishes, open your service URL (e.g. `https://scribe-xxxx.onrender.com`).

**Notes:**

- **Free** instances spin down after idle; first request after sleep can take ~30–60s.
- The UI talks to the API on the **same origin** — you do **not** need `REACT_APP_API_URL` for this layout.
- **`OPENROUTER_API_KEY`** must be set on the server in production (the app blocks pasting keys in the UI unless `ALLOW_UI_API_KEY=true`).
- **`FRONTEND_URL`** is optional; Render sets **`RENDER_EXTERNAL_URL`**, which the server uses for OpenRouter `HTTP-Referer` and CORS when `FRONTEND_URL` is unset.

**Smoke test** against production (replace the URL):

```bash
curl -s https://your-service.onrender.com/api/health
```

**Local Docker check** (optional):

```bash
docker build -t scribe .
docker run --rm -p 10000:10000 -e PORT=10000 -e OPENROUTER_API_KEY=sk-or-v1-... scribe
```

## npm scripts

| Command | Description |
|---------|-------------|
| `npm start` | Backend + frontend (concurrently) |
| `npm run backend` | Express API only |
| `npm run frontend` | React dev server only |
| `npm run install-all` | Install root, frontend, and backend deps |
| `npm run build` | Production React build |
| `npm run setup:nltk` | Download NLTK data |
| `npm test` | Smoke tests (backend must be running on `PORT`) |

## Smoke tests

With the API running:

```bash
npm test
```

Checks `/api/health`, `/api/models` shape, Python imports, `writing_skills` load, and a suggestion JSON fixture.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cannot reach the backend | Run `npm start` from repo root; confirm `PORT=5001` and proxy in `frontend/package.json` |
| Python not found | Install Python 3.9+; set `PYTHON_PATH=python3` in `.env` |
| API key errors | Use `sk-or-...` from [openrouter.ai/keys](https://openrouter.ai/keys); paste without extra spaces |
| Invalid model / 400 from OpenRouter | **Style → Refresh free models** or pick another model |
| Suggestions fail | `pip install -r requirements.txt`; check backend terminal for Python errors |
| NLTK warnings | Run `npm run setup:nltk` |
| Key save blocked in production | Set `OPENROUTER_API_KEY` in `.env`, not the UI |

## Contributing

Issues and pull requests are welcome. Match patterns in `server.js`, `pythonRunner.js`, hooks under `frontend/src/hooks/`, and `studio/` components.

## License

MIT

## Acknowledgments

- [OpenRouter](https://openrouter.ai) for unified LLM access
