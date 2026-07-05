// ─────────────────────────────────────────────────────────────────────────
// SERVER-ONLY — Auth.js v5 configuration. Never imported from a "use client"
// file. Read from process.env (SPOTIFY_CLIENT_ID/SECRET already exist from
// Phase 0 for the app-level client-credentials flow; we reuse them here so
// one Spotify app powers both flows).
//
// Session strategy: JWT (Auth.js default) — the Spotify access_token,
// expires_at, and refresh_token live inside the encrypted session cookie.
// Only server-side callers of `auth()` can read them. They never reach
// browser JS.
// ─────────────────────────────────────────────────────────────────────────
import NextAuth from "next-auth";
import Spotify from "next-auth/providers/spotify";

// Ask for exactly the two scopes the product needs — nothing more.
const SPOTIFY_SCOPES = "user-top-read user-read-email";

/**
 * Refresh an expired Spotify access token using the stored refresh_token.
 * Called from the JWT callback when expires_at has passed. Sets `error` on
 * the token if the refresh fails so the client can prompt re-sign-in.
 */
async function refreshSpotifyToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: number;
  refresh_token?: string;
} | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  return {
    access_token: j.access_token,
    expires_at: Math.floor(Date.now() / 1000) + j.expires_in - 60,
    // Spotify sometimes rotates the refresh token; keep the newest if given.
    refresh_token: j.refresh_token,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Spotify({
      // Reuse existing env vars from Phase 0 rather than requiring the
      // Auth.js-default AUTH_SPOTIFY_ID / AUTH_SPOTIFY_SECRET names.
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      // Provide the full authorization object — in v5 beta.31 the shallow
      // merge drops the provider's default `url` when we supply `params`.
      // On local dev, Next.js 16 hard-codes req.url's host to `localhost` even
      // when bound to 127.0.0.1, and Auth.js beta.31 uses req.url (NOT
      // AUTH_URL) for redirect_uri derivation. Spotify requires 127.0.0.1
      // for HTTP redirect URIs, so we override redirect_uri explicitly when
      // AUTH_URL is set (local dev only — never on Vercel).
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: SPOTIFY_SCOPES,
          ...(process.env.AUTH_URL
            ? {
                redirect_uri: `${process.env.AUTH_URL}/api/auth/callback/spotify`,
              }
            : {}),
        },
      },
    }),
  ],
  callbacks: {
    /**
     * Runs on sign-in and on every subsequent server-side session read.
     * On first sign-in `account` is populated — that's where the raw
     * Spotify tokens arrive. We stash them on the JWT. On later reads
     * we refresh if the access token has expired.
     */
    async jwt({ token, account }) {
      if (account) {
        // First sign-in — persist the Spotify tokens & profile bits on the JWT.
        token.accessToken = account.access_token as string | undefined;
        token.refreshToken = account.refresh_token as string | undefined;
        token.expiresAt = account.expires_at as number | undefined;
        return token;
      }
      // Subsequent calls: refresh if expired.
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = (token.expiresAt as number | undefined) ?? 0;
      if (expiresAt && now < expiresAt) {
        return token;
      }
      const refreshToken = token.refreshToken as string | undefined;
      if (!refreshToken) {
        return { ...token, error: "RefreshTokenMissing" as const };
      }
      const refreshed = await refreshSpotifyToken(refreshToken);
      if (!refreshed) {
        return { ...token, error: "RefreshAccessTokenError" as const };
      }
      return {
        ...token,
        accessToken: refreshed.access_token,
        expiresAt: refreshed.expires_at,
        refreshToken: refreshed.refresh_token ?? refreshToken,
        error: undefined,
      };
    },
    /**
     * Runs whenever `auth()` (server) or `useSession` (client) reads the
     * session. We expose the access token and error onto the session shape
     * — but note the SESSION is only ever produced server-side; if the
     * client calls useSession, Next-Auth returns a redacted view to the
     * browser. In our app we only read session server-side.
     */
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.expiresAt = token.expiresAt as number | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
