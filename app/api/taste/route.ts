// ─────────────────────────────────────────────────────────────────────────
// SERVER ROUTE HANDLER
//   GET  /api/taste?personaId=...[&fresh=1]     — persona-based (Phase 2)
//   POST /api/taste                             — signed-in user body:
//        { name, seedArtists: string[], fresh?: boolean }
//
// The POST path lets the real-Spotify flow reuse the same taste engine:
// the client hands us a name + the top artists it fetched from
// /api/me/top-artists, and we run the identical Gemini analysis. Cache
// key is a hash of the artist set so a returning user hits cache.
// ─────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getPersona, type Persona } from "@/lib/personas";
import { analyzeTaste, type TasteAnalysis } from "@/lib/taste";

export const runtime = "nodejs";
export const maxDuration = 30;

// Module-scope cache. Lives for the life of the server instance; on
// serverless this survives within a warm instance and rebuilds on cold
// start. Keys are either `persona:<id>` or `user:<sha256 of sorted artists>`.
const cache = new Map<string, TasteAnalysis>();

function errorJSON(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function artistsCacheKey(artists: string[]) {
  const sorted = [...artists].map((a) => a.toLowerCase()).sort();
  return "user:" + createHash("sha256").update(sorted.join("|")).digest("hex").slice(0, 16);
}

async function runOrCache(
  key: string,
  fresh: boolean,
  persona: Persona
) {
  if (!fresh) {
    const hit = cache.get(key);
    if (hit) return NextResponse.json({ ok: true, cached: true, ...hit });
  }
  try {
    const analysis = await analyzeTaste(persona);
    cache.set(key, analysis);
    return NextResponse.json({ ok: true, cached: false, ...analysis });
  } catch (err) {
    return errorJSON("gemini_error", `Taste analysis failed. ${msg(err)}`, 502);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const personaId = url.searchParams.get("personaId")?.trim();
  const fresh = url.searchParams.get("fresh") === "1";
  if (!personaId) return errorJSON("bad_request", "personaId is required.", 400);
  const persona = getPersona(personaId);
  if (!persona) return errorJSON("not_found", `No persona with id "${personaId}".`, 404);
  return runOrCache(`persona:${personaId}`, fresh, persona);
}

interface UserTasteBody {
  name?: string;
  seedArtists?: unknown;
  fresh?: boolean;
}

export async function POST(req: Request) {
  let body: UserTasteBody;
  try {
    body = (await req.json()) as UserTasteBody;
  } catch {
    return errorJSON("bad_request", "Request body must be valid JSON.", 400);
  }
  const artists = Array.isArray(body.seedArtists)
    ? body.seedArtists
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .slice(0, 20)
    : [];
  if (artists.length < 3) {
    return errorJSON(
      "bad_request",
      "seedArtists must include at least 3 real artist names.",
      400
    );
  }
  const name = typeof body.name === "string" && body.name.trim().length > 0
    ? body.name.trim().slice(0, 60)
    : "You";
  // Synthesize a Persona object so analyzeTaste() gets its expected shape.
  // Description is intentionally neutral — the analyst does the interpretation.
  const persona: Persona = {
    id: artistsCacheKey(artists),
    name,
    selfQuote: "",
    description: "A real Spotify listener's top artists over the last few months.",
    seedArtists: artists,
  };
  return runOrCache(persona.id, body.fresh === true, persona);
}
