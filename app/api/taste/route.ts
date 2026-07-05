// ─────────────────────────────────────────────────────────────────────────
// SERVER ROUTE HANDLER — GET /api/taste?personaId=...[&fresh=1]
// Runs entirely server-side. Uses lib/taste.ts which uses lib/gemini.ts
// (reads GOOGLE_API_KEY). No secrets cross to the browser.
//
// Caches taste analysis per persona in-memory (module scope) so the same
// static persona doesn't re-invoke Gemini on every visit. Pass ?fresh=1 to
// bypass the cache — useful while iterating on the prompt.
// ─────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";
import { analyzeTaste, type TasteAnalysis } from "@/lib/taste";

export const runtime = "nodejs";
export const maxDuration = 30;

// Module-scope cache. Lives for the life of the server instance; on serverless
// this survives within a warm instance and rebuilds on cold start (fine, since
// personas are stable and each rebuild is ~1 Gemini call).
const cache = new Map<string, TasteAnalysis>();

function errorJSON(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function GET(req: Request) {
  const url = new URL(req.url);
  const personaId = url.searchParams.get("personaId")?.trim();
  const fresh = url.searchParams.get("fresh") === "1";
  if (!personaId) {
    return errorJSON("bad_request", "personaId is required.", 400);
  }
  const persona = getPersona(personaId);
  if (!persona) {
    return errorJSON("not_found", `No persona with id "${personaId}".`, 404);
  }

  if (!fresh) {
    const hit = cache.get(personaId);
    if (hit) {
      return NextResponse.json({ ok: true, cached: true, ...hit });
    }
  }

  try {
    const analysis = await analyzeTaste(persona);
    cache.set(personaId, analysis);
    return NextResponse.json({ ok: true, cached: false, ...analysis });
  } catch (err) {
    return errorJSON(
      "gemini_error",
      `Taste analysis failed. ${msg(err)}`,
      502
    );
  }
}
