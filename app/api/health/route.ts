// SERVER CODE — this is a Next.js App Router "route handler".
// Any app/**/route.ts runs ONLY on the server; it is never bundled into the
// browser. This is the layer where (in later phases) we read process.env
// secrets and call Spotify/Gemini. The browser only ever fetches "/api/*".
import { NextResponse } from "next/server";

// GET /api/health  ->  { ok: true }
export async function GET() {
  return NextResponse.json({ ok: true });
}
