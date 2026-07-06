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

  // Spotify's top-artists is per-time-range; some accounts have thin data
  // in one window but rich data in another. Query all three, merge in a
  // stable priority order (medium > long > short — medium reflects the
  // user's current groove best), dedupe, cap at 20.
  const ranges = ["medium_term", "long_term", "short_term"] as const;
  const perRange: Record<string, string[]> = {};
  const statuses: Record<string, number> = {};
  let sawForbidden = false;
  let sawUnauthorized = false;

  await Promise.all(
    ranges.map(async (r) => {
      const res = await fetch(
        `https://api.spotify.com/v1/me/top/artists?limit=20&time_range=${r}`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      statuses[r] = res.status;
      if (res.status === 401) sawUnauthorized = true;
      if (res.status === 403) sawForbidden = true;
      if (!res.ok) {
        perRange[r] = [];
        return;
      }
      const data = (await res.json()) as SpotifyTopArtistsResponse;
      perRange[r] = (data.items ?? [])
        .map((a) => a?.name)
        .filter((n): n is string => typeof n === "string" && n.length > 0);
    })
  );

  if (sawUnauthorized) {
    return errorJSON(
      "spotify_unauthorized",
      "Spotify rejected the token. Please sign in again.",
      401
    );
  }
  if (sawForbidden) {
    return errorJSON(
      "spotify_forbidden",
      "This Spotify account isn't allowlisted for the demo. Try a persona instead.",
      403
    );
  }

  const seen = new Set<string>();
  const artists: string[] = [];
  for (const r of ranges) {
    for (const name of perRange[r] ?? []) {
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      artists.push(name);
      if (artists.length >= 20) break;
    }
    if (artists.length >= 20) break;
  }

  if (artists.length === 0) {
    // Return structured info so the client can render a specific message
    // AND we can eyeball which time_ranges came back empty during testing.
    return errorJSON(
      "no_top_artists",
      `Spotify returned no top artists across any time range. ` +
        `Statuses: medium=${statuses.medium_term}, long=${statuses.long_term}, ` +
        `short=${statuses.short_term}.`,
      404
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
    },
    artists,
    // Debug info (safe to expose — no secrets): tells the caller how many
    // artists each time_range yielded. Useful during MVP dogfooding.
    _diagnostics: {
      counts: {
        medium_term: perRange.medium_term?.length ?? 0,
        long_term: perRange.long_term?.length ?? 0,
        short_term: perRange.short_term?.length ?? 0,
      },
      statuses,
    },
  });
}
