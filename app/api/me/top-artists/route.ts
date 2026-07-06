// ─────────────────────────────────────────────────────────────────────────
// SERVER route handler — GET /api/me/top-artists
// Reads the current Auth.js session server-side (never touches the client),
// grabs the Spotify access token from the encrypted JWT cookie, and calls
// Spotify's /v1/me/top/artists. Returns a shape parallel to Persona:
//   { ok: true, user: { name, image }, artists: string[] }
// so the rest of the app can seed taste analysis + discovery identically
// to how it seeds them from lib/personas.ts.
//
// 401 if not signed in or the session has a refresh error.
// 502 if Spotify itself returned an error we couldn't recover from.
// ─────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 15;

interface SpotifyTopArtistsResponse {
  items?: { name?: string }[];
}

function errorJSON(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return errorJSON("not_authenticated", "Sign in with Spotify first.", 401);
  }
  if (session.error) {
    // Token refresh failed earlier — force a re-sign-in.
    return errorJSON(
      "session_error",
      "Your Spotify session expired. Please sign in again.",
      401
    );
  }

  // Support ?time_range=short_term|medium_term|long_term (default medium).
  const url = new URL(req.url);
  const timeRange = url.searchParams.get("time_range") ?? "medium_term";
  const validRanges = new Set(["short_term", "medium_term", "long_term"]);
  const safeRange = validRanges.has(timeRange) ? timeRange : "medium_term";

  const spotifyRes = await fetch(
    `https://api.spotify.com/v1/me/top/artists?limit=20&time_range=${safeRange}`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  if (spotifyRes.status === 401) {
    return errorJSON(
      "spotify_unauthorized",
      "Spotify rejected the token. Please sign in again.",
      401
    );
  }
  if (spotifyRes.status === 403) {
    // Development-mode Spotify apps reject non-allowlisted accounts here.
    return errorJSON(
      "spotify_forbidden",
      "This Spotify account isn't allowlisted for the demo. Try a persona instead.",
      403
    );
  }
  if (!spotifyRes.ok) {
    const detail = await spotifyRes.text().catch(() => "");
    return errorJSON(
      "spotify_error",
      `Spotify returned HTTP ${spotifyRes.status}. ${detail}`.trim(),
      502
    );
  }

  const data = (await spotifyRes.json()) as SpotifyTopArtistsResponse;
  const artists = (data.items ?? [])
    .map((a) => a?.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);

  return NextResponse.json({
    ok: true,
    user: {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
    },
    artists,
  });
}
