# Taste-Trip

An AI-native music **discovery agent** for Spotify. It analyzes a listener's
taste, offers AI-suggested prompts (plus a free-text box), and returns **real,
playable Spotify tracks** they likely haven't heard — each with a one-line
reason.

Built as an MVP for a Product Management fellowship (Spotify Growth Team context).

## Architecture rule (important)

**API keys never reach the browser.** Every call to Gemini or Spotify goes
through a server-side route handler under `app/api/*`. The client only ever
fetches our own `/api/*` endpoints. Secrets are read via `process.env` inside
route handlers only — never in a `"use client"` file, never prefixed with
`NEXT_PUBLIC_`.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Google Gemini via `@google/genai` (server-side reasoning)
- Spotify Web API — **Client Credentials** flow only (no user login yet);
  track resolution via `/v1/search`
- Node built-in `fetch`; deploy target Vercel

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill in values (Phase 1)
npm run dev                        # http://localhost:3000
```

Env vars are documented in `.env.local.example`. `.env.local` is git-ignored.

## Status

- **Phase 0** — setup + deployed hello-world (`/api/health`). ✅
- **Phase 1** — discovery engine + demo personas (in progress).
