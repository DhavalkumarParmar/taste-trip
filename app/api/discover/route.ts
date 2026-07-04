// ─────────────────────────────────────────────────────────────────────────
// SERVER ROUTE HANDLER — POST /api/discover — the core discovery engine.
// Runs entirely server-side; imports lib/spotify + lib/gemini (which read
// secret keys from process.env). The browser only ever POSTs here and gets
// JSON back — no keys cross the boundary.
//
// Pipeline:
//   1. Gemini PLANS: prompt + seed taste -> 4-6 Spotify search queries + song
//      candidate ideas, favoring novelty and respecting explicit constraints.
//   2. Spotify SEARCHES those, merges + dedupes, drops non-playable tracks.
//   3. Gemini RANKS the survivors, picks 6-8, writes one reason each.
//   4. Returns final tracks + reasons as JSON.
// Every failure path returns a structured JSON error — never a blank 500.
// ─────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import {
  searchTracks,
  SpotifyRateLimitError,
  type Track,
} from "@/lib/spotify";
import { generateJSON } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30; // allow time for 2 Gemini calls + searches

// ---- request / response shapes ----
interface DiscoverRequest {
  prompt?: string;
  seedArtists?: string[];
}
interface PlanResult {
  queries: string[];
  candidates: { title: string; artist: string }[];
}
interface RankResult {
  picks: { id: string; reason: string }[];
}
export interface DiscoveredTrack extends Track {
  reason: string;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function errorJSON(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

/** Reject a promise if it doesn't settle within `ms`. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

// ── STAGE 1: Gemini turns taste + prompt into search queries + candidates ──
async function planQueries(
  prompt: string,
  seedArtists: string[]
): Promise<PlanResult> {
  const schema = {
    type: "object",
    properties: {
      queries: {
        type: "array",
        items: { type: "string" },
        minItems: 4,
        maxItems: 6,
      },
      candidates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            artist: { type: "string" },
          },
          required: ["title", "artist"],
        },
      },
    },
    required: ["queries", "candidates"],
  };

  const systemInstruction =
    "You are an expert music-discovery curator for Spotify. Your goal is to " +
    "pull listeners OUT of their familiarity trap: surface real, lesser-known " +
    "tracks they likely haven't heard, not blockbusters and not the artists " +
    "they already know.";

  const userPrompt =
    `The listener already knows these artists: ${seedArtists.join(", ")}.\n` +
    `Their request: ${
      prompt ||
      "(no specific request — surprise me with fresh discoveries that expand my taste)"
    }.\n\n` +
    `Produce two things.\n\n` +
    `"candidates" (PRIMARY — 10-15 items): specific, REAL {title, artist} songs ` +
    `that fit the request and taste, by artists OTHER than the seed artists. ` +
    `Favor genuine discoveries the listener likely hasn't heard over obvious ` +
    `hits. Name real songs by real artists in the target style/language — these ` +
    `are verified against Spotify, so accuracy matters (only real songs survive).\n\n` +
    `"queries" (4-6 items): plain Spotify search strings that back up the ` +
    `candidates and widen the net.\n` +
    `CRITICAL: Spotify search understands ONLY plain keywords and the field ` +
    `filters artist:, track:, album:, year:. It does NOT understand genre:, ` +
    `mood:, tempo:, or playlist filters — never use those; they return garbage. ` +
    `Good queries name a REAL, lesser-known artist in the target style, ` +
    `optionally with one keyword — e.g. "Prateek Kuhad", "The Local Train ` +
    `acoustic", 'artist:"When Chai Met Toast"', 'artist:"Peter Cat Recording Co"'. ` +
    `Target real artists/songs in the right style and language, not the seed ` +
    `artists. Respect explicit constraints (language, mood, tempo).`;

  return generateJSON<PlanResult>(userPrompt, {
    schema,
    systemInstruction,
    temperature: 1.0,
  });
}

// ── STAGE 2: run all searches, merge, dedupe, drop non-playable ──
async function runSearches(
  queries: string[],
  candidates: { title: string; artist: string }[]
): Promise<Track[]> {
  const jobs: Promise<Track[]>[] = [];
  // Candidates are the primary, high-precision source: exact field filters
  // resolve the specific real song (or nothing) rather than keyword noise.
  for (const c of candidates.slice(0, 15)) {
    if (!c?.title || !c?.artist) continue;
    jobs.push(searchTracks(`track:"${c.title}" artist:"${c.artist}"`, 2));
  }
  // Queries widen the net; keep the per-query limit modest to limit noise.
  for (const q of queries) jobs.push(searchTracks(q, 5));

  const results = await Promise.allSettled(jobs);

  // If Spotify rate-limited us anywhere, surface that specifically.
  for (const r of results) {
    if (r.status === "rejected" && r.reason instanceof SpotifyRateLimitError) {
      throw r.reason;
    }
  }

  const byId = new Map<string, Track>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const t of r.value) {
      if (!t.isPlayable) continue; // drop unplayable
      if (!byId.has(t.id)) byId.set(t.id, t);
    }
  }
  return Array.from(byId.values());
}

// ── STAGE 3: Gemini ranks survivors, picks 6-8, writes one reason each ──
async function rankTracks(
  prompt: string,
  seedArtists: string[],
  pool: Track[]
): Promise<DiscoveredTrack[]> {
  const list = pool.slice(0, 40).map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artist,
    album: t.album,
  }));

  const schema = {
    type: "object",
    properties: {
      picks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            reason: { type: "string" },
          },
          required: ["id", "reason"],
        },
        minItems: 1,
        maxItems: 8,
      },
    },
    required: ["picks"],
  };

  const systemInstruction =
    "You are a music-discovery curator. Pick genuine discoveries and justify " +
    "each in one concise, specific sentence tied to the listener's request.";

  const userPrompt =
    `The listener already knows: ${seedArtists.join(", ")}.\n` +
    `Their request: ${prompt || "(surprise me with fresh discoveries)"}.\n\n` +
    `Below are REAL Spotify tracks as JSON. Choose the 6-8 BEST that:\n` +
    `(a) match the request,\n` +
    `(b) are genuine DISCOVERIES — favor tracks NOT by the artists the listener ` +
    `already knows, and less-obvious picks,\n` +
    `(c) are varied across artists.\n` +
    `For each pick, write ONE concise sentence (max ~20 words) on why it fits ` +
    `THIS listener's request — reference the mood/reason, not generic praise.\n` +
    `Only pick tracks that appear below, referenced by their exact "id".\n\n` +
    `TRACKS:\n${JSON.stringify(list)}`;

  const res = await generateJSON<RankResult>(userPrompt, {
    schema,
    systemInstruction,
    temperature: 0.7,
  });

  const byId = new Map(pool.map((t) => [t.id, t]));
  const out: DiscoveredTrack[] = [];
  for (const pick of res.picks ?? []) {
    const t = byId.get(pick.id);
    if (t && !out.some((o) => o.id === t.id)) {
      out.push({
        ...t,
        reason: pick.reason?.trim() || "A fresh pick for your taste.",
      });
    }
  }
  return out.slice(0, 8);
}

// ── handler ──
export async function POST(req: Request) {
  // Parse + validate input.
  let body: DiscoverRequest;
  try {
    body = (await req.json()) as DiscoverRequest;
  } catch {
    return errorJSON("bad_request", "Request body must be valid JSON.", 400);
  }
  const prompt = (body.prompt ?? "").toString().trim().slice(0, 500);
  const seedArtists = Array.isArray(body.seedArtists)
    ? body.seedArtists
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .slice(0, 20)
    : [];
  if (seedArtists.length === 0) {
    return errorJSON(
      "bad_request",
      "seedArtists is required — choose a persona first.",
      400
    );
  }

  // STAGE 1: plan.
  let plan: PlanResult;
  try {
    plan = await withTimeout(
      planQueries(prompt, seedArtists),
      25000,
      "Gemini planning"
    );
  } catch (err) {
    return errorJSON(
      "gemini_error",
      `Couldn't interpret your request. ${msg(err)}`,
      502
    );
  }
  const queries = (plan.queries ?? []).filter(Boolean).slice(0, 6);
  if (queries.length === 0) {
    return errorJSON("gemini_error", "No search queries were produced.", 502);
  }

  // STAGE 2: search Spotify.
  let pool: Track[];
  try {
    pool = await runSearches(queries, plan.candidates ?? []);
  } catch (err) {
    if (err instanceof SpotifyRateLimitError) {
      return errorJSON(
        "spotify_rate_limited",
        "Spotify is rate-limiting requests right now — please try again shortly.",
        429
      );
    }
    return errorJSON("spotify_error", `Spotify search failed. ${msg(err)}`, 502);
  }
  if (pool.length === 0) {
    // Not an error — just nothing matched. Return an empty, structured success.
    return NextResponse.json({
      ok: true,
      tracks: [],
      meta: {
        queries,
        candidateCount: 0,
        note: "No matching tracks found. Try a different prompt.",
      },
    });
  }

  // STAGE 3: rank + reason. If this fails, degrade gracefully rather than 500.
  let tracks: DiscoveredTrack[];
  try {
    tracks = await withTimeout(
      rankTracks(prompt, seedArtists, pool),
      25000,
      "Gemini ranking"
    );
    if (tracks.length === 0) throw new Error("ranker returned no valid picks");
  } catch {
    tracks = pool
      .slice(0, 8)
      .map((t) => ({ ...t, reason: "Surfaced from your taste-based search." }));
  }

  return NextResponse.json({
    ok: true,
    tracks,
    meta: { queries, candidateCount: pool.length },
  });
}
