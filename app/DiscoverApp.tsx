"use client";
// CLIENT — state machine orchestrating three views (landing / taste / results).
// Seed source is either a demo persona OR the logged-in user's real Spotify
// top artists — both flow through the same taste + discover engine.
// All external work happens in our own /api/* routes (server-side); no API
// keys ever cross into this file or the browser bundle.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { signIn, signOut, useSession } from "next-auth/react";
import { PERSONAS } from "@/lib/personas";
import { Landing } from "./components/Landing";
import { TasteView, type TasteData } from "./components/TasteView";
import { ResultsView } from "./components/ResultsView";
import type { Track } from "./components/TrackCard";

type View = "landing" | "taste" | "results";
const ease = [0.22, 0.61, 0.36, 1] as const;

interface SeedSource {
  kind: "persona" | "user";
  id: string; // persona id or a stable id for the user (their name)
  name: string;
  seedArtists: string[];
}

export default function DiscoverApp() {
  const { data: session, status: sessionStatus } = useSession();
  const [view, setView] = useState<View>("landing");
  const [seed, setSeed] = useState<SeedSource | null>(null);
  const [oauthError, setOauthError] = useState<string>("");
  const [oauthErrorDetail, setOauthErrorDetail] = useState<string>("");

  // Taste state
  const [tasteData, setTasteData] = useState<TasteData | null>(null);
  const [tasteLoading, setTasteLoading] = useState(false);
  const [tasteError, setTasteError] = useState("");
  const [tasteReloadKey, setTasteReloadKey] = useState(0);

  // Discover state
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [note, setNote] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState("");

  // Fetch taste analysis whenever a seed source is chosen (or retry).
  useEffect(() => {
    if (!seed) return;
    let alive = true;
    setTasteLoading(true);
    setTasteError("");
    setTasteData(null);
    const p =
      seed.kind === "persona"
        ? fetch(`/api/taste?personaId=${encodeURIComponent(seed.id)}`)
        : fetch("/api/taste", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: seed.name,
              seedArtists: seed.seedArtists,
              fresh: tasteReloadKey > 0, // Refresh My Taste bypasses cache
            }),
          });
    p.then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (!d.ok) throw new Error(d?.error?.message ?? "Failed to read taste");
        setTasteData({
          tasteParagraph: d.tasteParagraph,
          gapPhrase: d.gapPhrase ?? "",
          suggestedPrompts: d.suggestedPrompts ?? [],
        });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setTasteError(e instanceof Error ? e.message : "Something went wrong.");
      })
      .finally(() => alive && setTasteLoading(false));
    return () => {
      alive = false;
    };
  }, [seed, tasteReloadKey]);

  // After a Spotify sign-in, if the URL carries ?connected=1, fetch top
  // artists and seed the taste view automatically.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("connected") !== "1") return;
    url.searchParams.delete("connected");
    window.history.replaceState({}, "", url.toString());
    void loadUserSeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  // Also catch OAuth errors delivered as ?error=... on the URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    const err = url.searchParams.get("error");
    if (err) {
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
      setOauthError(
        err === "AccessDenied" || err === "OAuthCallback"
          ? "not_allowlisted"
          : "generic"
      );
    }
  }, []);

  async function loadUserSeed() {
    setOauthError("");
    setOauthErrorDetail("");
    try {
      const res = await fetch("/api/me/top-artists");
      const d = await res.json();
      if (!res.ok || !d.ok) {
        if (res.status === 403 || d?.error?.code === "spotify_forbidden") {
          setOauthError("not_allowlisted");
          return;
        }
        if (d?.error?.code === "no_top_artists") {
          setOauthError("not_enough_data");
          setOauthErrorDetail(d.error.message ?? "");
          return;
        }
        throw new Error(d?.error?.message ?? "Couldn't read your library.");
      }
      const artists: string[] = Array.isArray(d.artists) ? d.artists : [];
      if (artists.length < 1) {
        setOauthError("not_enough_data");
        return;
      }
      setSeed({
        kind: "user",
        id: "user",
        name: d?.user?.name ?? session?.user?.name ?? "You",
        seedArtists: artists,
      });
      setView("taste");
    } catch (e) {
      setOauthError(e instanceof Error ? e.message : "Sign-in failed.");
    }
  }

  const runDiscover = useCallback(
    async (prompt: string, refinement?: string) => {
      if (!seed) return;
      setCurrentPrompt(prompt);
      setView("results");
      setDiscoverLoading(true);
      setDiscoverError("");
      setTracks(null);
      setNote("");
      try {
        const res = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            refinement,
            seedArtists: seed.seedArtists,
          }),
        });
        const d = await res.json();
        if (!res.ok || !d.ok) {
          throw new Error(
            d?.error?.message ?? `The engine returned HTTP ${res.status}.`
          );
        }
        setTracks(d.tracks ?? []);
        setNote(d?.meta?.note ?? "");
      } catch (e: unknown) {
        setDiscoverError(
          e instanceof Error
            ? e.message
            : "Couldn't reach the discovery engine. Please try again."
        );
      } finally {
        setDiscoverLoading(false);
      }
    },
    [seed]
  );

  function pickPersona(id: string) {
    const p = PERSONAS.find((x) => x.id === id);
    if (!p) return;
    setSeed({ kind: "persona", id, name: p.name, seedArtists: p.seedArtists });
    setView("taste");
  }
  function startSpotifySignIn() {
    setOauthError("");
    // After successful auth we come back to /?connected=1 which triggers
    // the loadUserSeed effect above.
    void signIn("spotify", { callbackUrl: "/?connected=1" });
  }
  function backToLanding() {
    setView("landing");
  }
  function backToTaste() {
    setView("taste");
  }
  function refine(refinement: string) {
    runDiscover(currentPrompt, refinement);
  }
  function retryTaste() {
    setTasteReloadKey((k) => k + 1);
  }
  function retryDiscover() {
    if (currentPrompt) runDiscover(currentPrompt);
  }
  function refreshMyTaste() {
    // Only meaningful for the user path; fetch fresh top-artists and re-run.
    if (seed?.kind !== "user") return;
    setTasteReloadKey((k) => k + 1);
    void loadUserSeed();
  }
  async function handleSignOut() {
    await signOut({ redirect: false });
    setSeed(null);
    setTasteData(null);
    setView("landing");
  }

  const enter = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.45, ease },
  };

  const isSpotifyUser = seed?.kind === "user";

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen">
        {/* Signed-in badge — top right, all screens */}
        {sessionStatus === "authenticated" && session?.user && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-3 text-sm">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="w-7 h-7 rounded-full border border-rule"
              />
            ) : null}
            <span className="hidden sm:inline text-muted">
              {session.user.name}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="link-back text-xs"
            >
              Sign out
            </button>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {view === "landing" && (
            <motion.div key="landing" {...enter}>
              <Landing
                personas={PERSONAS}
                onPick={pickPersona}
                onSpotifySignIn={startSpotifySignIn}
              />
              {oauthError && (
                <OauthErrorPanel
                  kind={oauthError}
                  detail={oauthErrorDetail}
                  onDismiss={() => {
                    setOauthError("");
                    setOauthErrorDetail("");
                  }}
                />
              )}
            </motion.div>
          )}
          {view === "taste" && seed && (
            <motion.div key="taste" {...enter}>
              <TasteView
                persona={{
                  id: seed.id,
                  name: seed.name,
                  selfQuote: "",
                  description: "",
                  seedArtists: seed.seedArtists,
                }}
                loading={tasteLoading}
                data={tasteData}
                error={tasteError}
                onSubmit={(p) => runDiscover(p)}
                onBack={backToLanding}
                onRetry={retryTaste}
                labelPrefix={isSpotifyUser ? "Reading" : "You picked"}
                labelSuffix={isSpotifyUser ? "'s taste" : ""}
                onRefreshTaste={isSpotifyUser ? refreshMyTaste : undefined}
              />
            </motion.div>
          )}
          {view === "results" && seed && (
            <motion.div key="results" {...enter}>
              <ResultsView
                persona={{
                  id: seed.id,
                  name: seed.name,
                  selfQuote: "",
                  description: "",
                  seedArtists: seed.seedArtists,
                }}
                prompt={currentPrompt}
                loading={discoverLoading}
                tracks={tracks}
                error={discoverError}
                note={note}
                onBack={backToTaste}
                onRefine={refine}
                onRetry={retryDiscover}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}

function OauthErrorPanel({
  kind,
  detail,
  onDismiss,
}: {
  kind: string;
  detail?: string;
  onDismiss: () => void;
}) {
  const notAllowlisted = kind === "not_allowlisted";
  const notEnough = kind === "not_enough_data";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-6">
      <div className="max-w-md bg-paper border border-rule p-6 sm:p-8 shadow-xl">
        <p className="eyebrow text-ochre mb-3">
          {notAllowlisted
            ? "Not allowlisted"
            : notEnough
              ? "Not enough listening history"
              : "Sign-in didn't complete"}
        </p>
        <h3
          className="font-display text-2xl leading-snug text-ink mb-3"
          style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30, "WONK" 0' }}
        >
          {notAllowlisted
            ? "Spotify only lets us access pre-approved accounts during this demo."
            : notEnough
              ? "This Spotify account doesn't have enough top-artist history yet."
              : "Something went wrong finishing your Spotify sign-in."}
        </h3>
        <p className="text-sm text-ink-2 leading-relaxed mb-4">
          {notAllowlisted
            ? "Try one of the three personas instead — they use the identical discovery engine, just with hardcoded seed artists."
            : notEnough
              ? "Listen to a bit more music on that account, or try a persona in the meantime."
              : "Please try again, or start with a persona to see the discovery engine."}
        </p>
        {detail && (
          <p className="text-xs text-muted font-mono leading-relaxed mb-6 border-l-2 border-rule pl-3">
            {detail}
          </p>
        )}
        <button type="button" onClick={onDismiss} className="btn-primary">
          Back to listeners
        </button>
      </div>
    </div>
  );
}
