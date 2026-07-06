# Taste-Trip — Fellowship Deck Source Material

**Prepared by:** Dhaval Parmar, PM candidate — Spotify Growth Team fellowship project
**Purpose:** Raw material for building a slide deck explaining the product thinking behind an AI-native discovery agent MVP. Hand this file to an LLM with the instruction: "Build a slide-by-slide deck from this markdown, one slide per `##` section unless noted otherwise."

**Live product:** https://taste-trip-three.vercel.app/
**Code:** github.com/DhavalkumarParmar/taste-trip (branch `main`)

---

## 1. The problem (growth thesis)

**Observation:** Long-tenure Spotify Premium subscribers hit a "familiarity trap." Spotify's own recommendation systems (Discover Weekly, Release Radar, autoplay) are tuned to reinforce what a listener already plays — that's good for retention of *existing* taste, but it means the algorithm systematically under-exposes listeners to adjacent music they'd probably love but haven't sampled.

**Behavioral symptom:** These users increasingly discover new music on TikTok / YouTube / Instagram Reels *first*, then come back to Spotify only to **search and replay** what they found elsewhere. Spotify becomes a jukebox, not a discovery engine, for its most loyal cohort.

**Why this matters for Growth:** Discovery is a top driver of engagement depth and session frequency. If long-tenure users stop discovering *inside* Spotify, their engagement growth flattens even though churn stays low — a slow bleed of engagement upside, not a retention problem. Growth needs a wedge that gets discovery to happen on-platform again.

**The bet:** An AI-native "discovery agent" that (a) explicitly analyzes what a listener already likes, (b) explicitly names the *gap* — what they're structurally not being shown — and (c) lets them ask for exactly what they want in plain language, resolved against real, playable Spotify tracks. Make the mechanism of discovery visible and controllable, instead of hoping a black-box algorithm surprises them.

---

## 2. Product framing — what makes this "AI-native," not just "another playlist"

Three design commitments that separate this from a typical recommendation feature:

1. **Name the gap, don't just serve results.** Most discovery UIs (Discover Weekly, radio) show you songs with no explanation of *why you haven't heard them* or *what hole they're filling*. This product's taste-analysis step produces one sentence that explicitly diagnoses the structural blind spot — "you're rich in mainstream Hindi film ballads but missing the 1970s–80s golden-era playback singers" — before it ever shows a track. The insight IS the product, not a side effect.
2. **Prompt-driven, not swipe-driven.** The user can type exactly what they want ("something for a rainy commute, unlike what I already listen to") instead of thumbs-up/down-ing a black box. This treats the user as someone with taste and intent, not a training signal.
3. **Every result is real and playable — zero hallucination tolerance.** An LLM proposes candidate songs; every single one is verified against the live Spotify catalog via search before it's shown. If a "song" the LLM imagined doesn't resolve to a real Spotify track, it's silently dropped. This was a hard product requirement, not a nice-to-have — a discovery agent that recommends fake songs destroys trust in one session.

---

## 3. Scope decisions — what's IN and OUT of this MVP, and why

| In scope | Why |
|---|---|
| 3 demo personas (Bollywood Romantic, Soulful Purist, Indie Dreamer) with hardcoded top artists | Lets anyone — evaluators, stakeholders — experience the full product without needing a Spotify account or waiting on app-review allowlisting |
| Real Spotify OAuth (opt-in, 4th card on landing) | Proves the mechanism works on *real* listening history, not just curated demo data — the actual product thesis |
| Taste analysis + gap-naming + suggested prompts | The intellectual core — this is the "AI-native" differentiator vs. a plain search box |
| Free-text prompt + refinement | Lets a user course-correct without restarting ("no, more acoustic, less English") |
| **NOT in scope:** saving playlists, following artists, any write-back to Spotify | MVP is discovery-only; write actions are a distinct, larger scope (permissions, undo, etc.) that would dilute the core validation |
| **NOT in scope:** general "type any artist" free-seed input | Would let anyone bypass the persona/OAuth model — kept scope tight to prove the discovery mechanism, not build a full account system |
| **NOT in scope:** long-term taste history / trend tracking over time | This is a point-in-time analysis; tracking taste evolution is a v2 feature requiring persistence (a database), deliberately deferred |

**Why personas at all, if real OAuth exists?** Spotify's Developer Dashboard requires new apps to explicitly allowlist test users during development mode — you can't demo to an arbitrary evaluator with real OAuth day one. Building three sharp, internally-coherent personas let the demo be reviewable by *anyone*, immediately, while the OAuth path proves the mechanism generalizes to real data.

---

## 4. Architecture at a glance

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, deployed on Vercel.

**External APIs, each behind our own server route — never called from the browser:**
- **Spotify Web API** — Client Credentials flow (app-level, no user login) for persona-based search; **Authorization Code + PKCE via Auth.js v5** for real-user OAuth. Track resolution exclusively through `/v1/search` (Spotify deprecated `/recommendations`, `/audio-features`, and related-artists for all new apps in Nov 2024 — a real, current platform constraint the product had to design around).
- **Google Gemini** (`gemini-3.1-flash-lite`) — two distinct calls: (1) taste analysis → paragraph + gap + suggested prompts, (2) discovery pipeline → search-query planning, then ranking + one-line reasons for surviving tracks.

**The non-negotiable security rule, enforced throughout:** every external API key (Spotify client secret, Google API key, Auth secret) is read only inside server-side route handlers (`app/api/*`) via `process.env`. The browser only ever calls our own `/api/*` endpoints. This was treated as a hard architectural constraint from the first line of code, not a later hardening pass.

**Core pipeline (`/api/discover`):**
1. Gemini interprets the user's request + their seed taste → produces 4–6 concrete Spotify search queries AND a list of specific candidate {song, artist} pairs. Explicitly instructed to favor novelty over blockbusters and to **stay within the listener's own language(s)** (see decision log below).
2. Every query and candidate is resolved against live Spotify search, results are merged and deduplicated (including near-duplicate re-releases), and anything not marked `is_playable` is dropped.
3. Gemini ranks the surviving real tracks, picks the best 6–8, and writes one specific, non-generic reason per track tied to the user's actual request.
4. Response returns real track metadata (art, artist, Spotify deep link) + reasons as structured JSON — with a "never blank-500" guarantee: every failure mode (Gemini timeout, empty search results, Spotify rate-limit) returns a structured, user-facing error instead.

---

## 5. Key product/engineering decisions and tradeoffs (the interesting PM material)

### Decision: constrain discovery to the listener's own language(s) by default
**What happened:** Early builds let the AI cross languages freely in the name of "novelty" — a listener seeded on Nusrat Fateh Ali Khan (Urdu/Punjabi Sufi qawwali) was once recommended 1970s Iranian Persian folk-pop. Aesthetically it was a striking "wow" moment (a genuinely surprising, well-reasoned cross-cultural parallel), but as a product decision it was wrong: a real user wants deeper cuts in music they can understand and connect with emotionally, not a language they don't speak.
**The fix:** Constrained both the taste-gap analysis and the discovery engine to stay within the listener's detected language(s) by default. Cross-language exploration becomes something the *user* opts into explicitly by typing it into the free-text box ("give me Bengali love ballads"), rather than something the algorithm decides for them.
**The lesson for the deck:** This is a "delight vs. usefulness" tradeoff a PM has to make consciously. The novel, delightful demo moment was NOT the right default behavior for a real growth product — a discovery agent that ignores an implicit constraint (language) as basic as "the language I actually speak" would erode trust fast, however clever the individual result. Ship the useful default; let the user unlock the delightful edge case.

### Decision: treat "novelty" as a genre/scene constraint problem, not just a prompt-engineering nice-to-have
**What happened:** An earlier version of the query-planning prompt let Gemini invent Spotify search filters that don't exist (`genre:`, `mood:`) — Spotify's search API only supports plain keywords plus `artist:`, `track:`, `album:`, `year:`. Invented filters silently returned garbage/irrelevant results (random stock-music tracks) with no visible error, because the search still "succeeded" technically.
**The fix:** The prompt now explicitly teaches the model Spotify's real search syntax and forces it to name real (if lesser-known) artists in the target style — candidates are then verified with precise `track:"…" artist:"…"` filters rather than loose keyword search. This is the highest-precision resolution path and became the *primary* discovery signal, not a fallback.
**The lesson for the deck:** LLM-driven query generation against a real, constrained external API is a distinct engineering problem from "make the LLM write good prose" — the model needs a grounded, explicit spec of what the downstream system actually understands, or its outputs look plausible while being silently wrong.

### Decision: default Gemini model chosen for free-tier availability, not just quality
**What happened:** During build/testing, `gemini-2.5-flash`'s free tier allows only ~20 requests/day (each discovery call uses 2), and `gemini-2.0-flash` was unavailable on the free tier entirely for this API key. This would have made even internal dogfooding impossible.
**The fix:** Evaluated multiple models against the real production pipeline (not synthetic benchmarks) — `gemini-3.1-flash-lite` won on a combination of speed (~5s for the full two-call pipeline), output quality, and free-tier headroom. Also evaluated a higher-quota Gemma model as an alternative; it was faster on paper but produced lower-quality, occasionally malformed structured output and was flaky under load — rejected despite the higher quota.
**The lesson for the deck:** Model selection for a real product is a multi-dimensional tradeoff (quality × latency × cost/quota × reliability under load), decided empirically against the actual task, not by picking whatever's newest or cheapest on paper.

### Decision: Spotify's Nov 2024 API restrictions shaped the entire recommendation design
**What happened:** Spotify cut off new developer apps from `/recommendations`, `/audio-features`, `/audio-analysis`, and related-artists endpoints in November 2024, citing platform security concerns. These were the endpoints almost every "recommendation engine" tutorial assumes exists.
**The fix:** All discovery logic had to be built on `/v1/search` plus LLM reasoning alone — there's no first-party "similar artists" or audio-feature signal available to new apps at all. The entire novelty/relevance judgment is delegated to the LLM's world knowledge, verified only by whether a track resolves in search.
**The lesson for the deck:** A real platform's API surface is a moving constraint, not a fixed one — this product's core technical approach exists *because of*, not despite, a mid-2024 platform policy change. Worth a slide on "how platform API decisions upstream shape what's buildable downstream," since that's a genuinely PM-relevant insight for anyone building on Spotify's ecosystem.

### Decision: reuse the identical discovery engine for personas AND real OAuth users
**What happened:** Once real Spotify OAuth was added (Phase 4), the tempting shortcut was to build a separate, simpler path for "real users." Instead, the real user's top artists (merged across Spotify's three time-range windows: last 4 weeks, last 6 months, all-time) are fed into the *exact same* `/api/taste` and `/api/discover` routes that already power the three personas — the only difference is where `seedArtists` comes from.
**The lesson for the deck:** This is a proof of the underlying thesis, not just a code-reuse convenience — if personas and real accounts need materially different logic to produce good discovery, that's a sign the "demo" doesn't actually represent the real product. Making them share one pipeline was itself a validation step.

### Decision: never let a discovery request fail silently or with a raw error
**What happened:** Every failure mode — Gemini timeout, Gemini rate-limit (hit repeatedly during heavy testing), Spotify 429, empty search results, a non-allowlisted Spotify account trying to sign in — was designed to produce a structured, human-readable message and a recovery action (retry button, "try a persona instead," etc.), never a blank screen or a raw stack trace.
**The lesson for the deck:** For a growth-facing feature specifically, error-state design is a retention lever, not just polish — a first-time user who hits an unexplained blank screen churns immediately; a user who sees "Spotify's rate-limiting us right now, try again shortly" stays.

---

## 6. Design philosophy (for a "craft" slide)

**Direction: "Cartography of taste."** The product is framed as a mapmaker — it sketches the shape of a listener's known territory and marks the uncharted edges. Executed through:
- A restrained palette: cool ink on warm paper (not Spotify green, not a generic dark-mode AI aesthetic) with one accent color (a dusty cobalt blue) reserved for the single most important visual moment per screen.
- Editorial typography (a serif display face + a humanist sans body face) so the taste analysis reads like a piece of writing someone would want to read, not a UI label.
- **The signature interaction:** the exact phrase in the taste paragraph that names the discovery gap is visually underlined with a hand-drawn-style dashed line that "inks itself in" a beat after the paragraph loads — turning an abstract insight into something that feels annotated, noticed, deliberate.
- Deliberately avoided the three visual patterns that read as "generic AI-generated UI" (warm-cream-and-terracotta, near-black-with-neon-accent, dense hairline-rule broadsheet) in favor of a direction chosen specifically for this subject.

**Why this matters for a PM deck:** design restraint was itself a product decision — a flashier UI would have been easy to default to, but the goal was for the *taste insight* to be the thing users remember, not the interface chrome around it.

---

## 7. What a live demo shows (for a "proof" slide — screenshots exist, describe the flow)

1. **Landing:** three named personas (each with a first-person "self-quote" so they read as real listeners, not category labels) + a fourth card offering real Spotify sign-in.
2. **Pick a listener** → smooth transition into a **taste view**: one paragraph analyzing their taste, with the specific discovery gap visually annotated, followed by 3–4 concrete suggested prompts phrased the way a person would actually ask ("Underrated Hindi indie love songs I probably haven't heard" — not "Recommend me some songs").
3. **Click a prompt (or type a free-text request)** → staged loading state (never a static spinner — messages like "Interpreting your request… → Searching Spotify… → Picking the best…") → a results grid of 6–8 real, playable tracks, each with album art, a one-line reason, and "Open in Spotify" as the primary call to action.
4. **Refine** ("not quite right? — slower, more acoustic") re-runs discovery with the refinement appended server-side, no client-side chat-state complexity.
5. **Real accounts:** the identical flow, seeded from the user's actual Spotify top artists via OAuth — same taste-gap analysis, same discovery engine, same UI.

---

## 8. Metrics this would validate in a real experiment (forward-looking slide)

Suggested framing for "how would Growth measure this if shipped":
- **Primary:** session-level on-platform discovery actions (tracks opened from a *non-algorithmic* recommendation surface) for long-tenure users exposed to the discovery agent vs. control.
- **Secondary:** does exposure to a named "gap" increase the rate of a user trying a genuinely novel genre/artist cluster in the following 7/30 days (vs. just replaying familiar tracks)?
- **Guardrail:** does the discovery agent cannibalize existing Discover Weekly / Radio engagement, or is it additive? (I.e., are these newly-surfaced sessions incremental, or just moved from one surface to another?)
- **Qualitative:** does naming the discovery gap explicitly (vs. a black-box "you might also like") change trust/perceived-value in exit surveys?

---

## 9. What's explicitly NOT built yet (honest "next steps" slide)

- No playlist save-back / no writes to the user's Spotify library (discovery-only MVP)
- No persistent taste history — each analysis is a point-in-time snapshot, not tracked over time
- No mobile app — responsive web only
- Free-tier Gemini quota means the current deployment isn't resilient to high concurrent demo traffic without enabling billing
- Spotify's Nov 2024 API restrictions mean there's no first-party popularity/audio-feature signal at all for new apps — the product leans entirely on LLM judgment + real-time search verification, which is a deliberate scope constraint worth naming honestly in a "how would this scale" discussion

---

## 10. One-paragraph elevator pitch (for a title/summary slide)

Taste-Trip is an AI-native discovery agent that treats Spotify Growth's "familiarity trap" as a diagnosis problem before it's a recommendation problem: it names the specific structural gap in a listener's exposure — a subgenre, era, or scene their own favorite artists belong to but the algorithm never surfaces — and lets the listener ask for exactly what would fill it, in their own words. Every suggestion is a real, playable Spotify track, verified in real time, never a hallucinated title. Built end-to-end (Next.js, real Spotify Client-Credentials + OAuth, Google Gemini) as a working MVP, with three demo personas for instant evaluation and a real-account path proving the mechanism generalizes beyond the demo.

---

*End of source material. Suggested slide count: 10–14 slides, roughly one per numbered section above, splitting section 5 (decision log) across 3–4 slides since it's the richest PM-thinking material.*
