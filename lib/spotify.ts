// ─────────────────────────────────────────────────────────────────────────
// SERVER-ONLY MODULE. Do NOT import this from any "use client" file.
// It reads SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET from process.env; those
// secrets must never reach the browser. Import this only from server code
// (route handlers under app/api/* or server components).
//
// Spotify auth: Client Credentials flow (app-level token, NO user login).
//   Token endpoint: POST https://accounts.spotify.com/api/token
//   Search:         GET  https://api.spotify.com/v1/search
// NOTE: /recommendations, /audio-features, and related-artists are deprecated
// for new apps (Spotify, Nov 2024) — we deliberately use ONLY /v1/search.
// ─────────────────────────────────────────────────────────────────────────

/** A track normalized down to just what the UI needs. */
export interface Track {
  id: string;
  name: string;
  artist: string; // comma-joined artist names
  album: string;
  albumImageUrl: string | null;
  spotifyUrl: string;
  isPlayable: boolean; // Spotify is_playable; defaults true when field absent
  // NOTE: new Spotify apps no longer receive `popularity` or `preview_url`
  // from /v1/search (Nov-2024 restrictions). We keep these fields for shape
  // stability, but `popularity` is effectively always 0 and `previewUrl`
  // effectively always null — do NOT build ranking logic on them.
  popularity: number; // 0-100 (unavailable for new apps -> 0)
  previewUrl: string | null; // 30s preview (unavailable for new apps -> null)
}

/** Thrown when Spotify returns 429 so callers can surface a friendly message. */
export class SpotifyRateLimitError extends Error {
  retryAfterSeconds?: number;
  constructor(retryAfterSeconds?: number) {
    super("Spotify rate limit (429)");
    this.name = "SpotifyRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// --- minimal shapes of the Spotify JSON we actually read (avoids `any`) ---
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
interface SpotifyApiTrack {
  id?: string;
  name?: string;
  is_playable?: boolean;
  popularity?: number;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
  artists?: { name?: string }[];
  album?: { name?: string; images?: { url?: string }[] };
}
interface SpotifySearchResponse {
  tracks?: { items?: SpotifyApiTrack[] };
}

// --- app-level token cache (module scope; lives for the server process) ---
let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Returns a valid app-level access token, fetching a new one only when the
 * cache is empty or expired. We refresh 60s early to avoid edge-of-expiry 401s.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in the environment."
    );
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    // token responses are tiny; no caching layer needed here
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Spotify token request failed: ${res.status} ${res.statusText} ${detail}`.trim()
    );
  }

  const json = (await res.json()) as SpotifyTokenResponse;
  cachedToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

/** Convert a raw Spotify track into our normalized Track, or null if unusable. */
function normalizeTrack(t: SpotifyApiTrack): Track | null {
  if (!t.id || !t.name) return null;
  const artist =
    (t.artists ?? [])
      .map((a) => a.name)
      .filter((n): n is string => Boolean(n))
      .join(", ") || "Unknown artist";
  const albumImageUrl = t.album?.images?.[0]?.url ?? null;
  return {
    id: t.id,
    name: t.name,
    artist,
    album: t.album?.name ?? "",
    albumImageUrl,
    spotifyUrl:
      t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
    isPlayable: t.is_playable !== false, // treat absent as playable
    popularity: typeof t.popularity === "number" ? t.popularity : 0,
    previewUrl: t.preview_url ?? null,
  };
}

/**
 * Search Spotify for tracks matching `query`.
 * @param query free-text search (supports field filters like `artist:` / `year:`)
 * @param limit 1-50 (Spotify max is 50); defaults to 10
 * @returns normalized, real, playable tracks (empty array if none)
 * @throws SpotifyRateLimitError on 429; Error on other failures
 */
export async function searchTracks(
  query: string,
  limit = 10
): Promise<Track[]> {
  const q = query.trim();
  if (!q) return [];

  const token = await getAccessToken();
  const params = new URLSearchParams({
    q,
    type: "track",
    limit: String(Math.min(Math.max(Math.trunc(limit), 1), 50)),
  });

  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    throw new SpotifyRateLimitError(
      retryAfter ? Number(retryAfter) : undefined
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Spotify search failed: ${res.status} ${res.statusText} ${detail}`.trim()
    );
  }

  const data = (await res.json()) as SpotifySearchResponse;
  const items = data.tracks?.items ?? [];
  return items
    .map(normalizeTrack)
    .filter((t): t is Track => t !== null);
}
