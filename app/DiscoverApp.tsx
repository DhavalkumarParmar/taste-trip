"use client";
// CLIENT COMPONENT — runs in the browser (state, clicks, fetch).
// It calls ONLY our own "/api/discover" route and sends the chosen persona's
// public seed-artist list. No Spotify/Gemini calls, no API keys here — those
// live behind the server route. This is the client/server boundary in action.
import { useEffect, useRef, useState } from "react";
import { PERSONAS } from "@/lib/personas";

// Local copy of the track shape the API returns (kept here so this client
// file never imports the server route module).
interface DiscoveredTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumImageUrl: string | null;
  spotifyUrl: string;
  reason: string;
}

type Status = "idle" | "loading" | "done" | "error";

const LOADING_STAGES = [
  "Reading your taste…",
  "Dreaming up fresh directions…",
  "Searching Spotify for real tracks…",
  "Curating the best picks…",
];

export default function DiscoverApp() {
  const [personaId, setPersonaId] = useState<string>(PERSONAS[0].id);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [tracks, setTracks] = useState<DiscoveredTrack[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState(0);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];

  // Advance the staged loading message while a request is in flight.
  useEffect(() => {
    if (status === "loading") {
      setStage(0);
      stageTimer.current = setInterval(() => {
        setStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1));
      }, 1800);
    } else if (stageTimer.current) {
      clearInterval(stageTimer.current);
      stageTimer.current = null;
    }
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
  }, [status]);

  async function findMusic() {
    setStatus("loading");
    setTracks([]);
    setErrorMsg("");
    setNote("");
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          seedArtists: persona.seedArtists,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(
          data?.error?.message ??
            `Something went wrong (HTTP ${res.status}). Please try again.`
        );
        setStatus("error");
        return;
      }
      setTracks(data.tracks ?? []);
      setNote(data.meta?.note ?? "");
      setStatus("done");
    } catch {
      setErrorMsg("Network error — could not reach the discovery engine.");
      setStatus("error");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="w-full max-w-3xl">
      {/* 1. Persona picker */}
      <label className="mb-2 block text-left text-sm font-medium text-black/50 dark:text-white/50">
        1 · Pick a listener
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {PERSONAS.map((p) => {
          const active = p.id === personaId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersonaId(p.id)}
              disabled={isLoading}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-green-500 bg-green-500/10"
                  : "border-black/10 hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
              } disabled:opacity-50`}
            >
              <div className="text-2xl">{p.emoji}</div>
              <div className="mt-1 font-semibold">{p.name}</div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                {p.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Show the selected persona's seed artists for context */}
      <div className="mt-2 text-left text-xs text-black/40 dark:text-white/40">
        Knows: {persona.seedArtists.join(" · ")}
      </div>

      {/* 2. Prompt */}
      <label className="mt-6 mb-2 block text-left text-sm font-medium text-black/50 dark:text-white/50">
        2 · What are you in the mood for?{" "}
        <span className="font-normal">(optional)</span>
      </label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isLoading}
        rows={2}
        placeholder='e.g. "upbeat for a road trip, nothing I already know" — or leave blank to be surprised'
        className="w-full resize-none rounded-xl border border-black/10 bg-transparent p-3 text-sm outline-none focus:border-green-500 disabled:opacity-50 dark:border-white/15"
      />

      {/* 3. Action */}
      <button
        type="button"
        onClick={findMusic}
        disabled={isLoading}
        className="mt-4 w-full rounded-full bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Finding music…" : "Find music"}
      </button>

      {/* Staged loading state */}
      {isLoading && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <p className="text-sm text-black/60 dark:text-white/60">
            {LOADING_STAGES[stage]}
          </p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Empty (successful but no matches) */}
      {status === "done" && tracks.length === 0 && (
        <div className="mt-6 text-sm text-black/60 dark:text-white/60">
          {note || "No tracks found. Try a different prompt."}
        </div>
      )}

      {/* Results */}
      {status === "done" && tracks.length > 0 && (
        <div className="mt-8 text-left">
          <p className="mb-3 text-sm font-medium text-black/50 dark:text-white/50">
            {tracks.length} fresh picks for {persona.name}
          </p>
          <div className="grid gap-3">
            {tracks.map((t) => (
              <div
                key={t.id}
                className="flex gap-4 rounded-xl border border-black/10 p-3 dark:border-white/15"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.albumImageUrl ?? ""}
                  alt={t.album}
                  className="h-20 w-20 flex-shrink-0 rounded-lg bg-black/5 object-cover dark:bg-white/10"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="truncate font-semibold">{t.name}</div>
                  <div className="truncate text-sm text-black/60 dark:text-white/60">
                    {t.artist}
                  </div>
                  <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                    {t.reason}
                  </div>
                  <a
                    href={t.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-green-700"
                  >
                    ▶ Open in Spotify
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
