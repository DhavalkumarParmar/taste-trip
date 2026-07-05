"use client";
// CLIENT — state machine orchestrating three views:
//   'landing' -> 'taste' -> 'results'
// All external work happens in our own /api/* routes (server-side); no API
// keys ever cross into this file or the browser bundle.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { PERSONAS } from "@/lib/personas";
import { Landing } from "./components/Landing";
import { TasteView, type TasteData } from "./components/TasteView";
import { ResultsView } from "./components/ResultsView";
import type { Track } from "./components/TrackCard";

type View = "landing" | "taste" | "results";
const ease = [0.22, 0.61, 0.36, 1] as const;

export default function DiscoverApp() {
  const [view, setView] = useState<View>("landing");
  const [personaId, setPersonaId] = useState<string | null>(null);
  const persona = personaId ? PERSONAS.find((p) => p.id === personaId) : null;

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

  // Fetch taste analysis whenever a persona is chosen (or retry).
  useEffect(() => {
    if (!personaId) return;
    let alive = true;
    setTasteLoading(true);
    setTasteError("");
    setTasteData(null);
    fetch(`/api/taste?personaId=${encodeURIComponent(personaId)}`)
      .then((r) => r.json())
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
  }, [personaId, tasteReloadKey]);

  const runDiscover = useCallback(
    async (prompt: string, refinement?: string) => {
      if (!persona) return;
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
            seedArtists: persona.seedArtists,
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
    [persona]
  );

  function pickPersona(id: string) {
    setPersonaId(id);
    setView("taste");
  }
  function backToLanding() {
    setView("landing");
  }
  function backToTaste() {
    setView("taste");
  }
  function refine(refinement: string) {
    // Re-run discovery with previous prompt + refinement; concatenation happens
    // server-side in /api/discover (no multi-turn chat state on the client).
    runDiscover(currentPrompt, refinement);
  }
  function retryTaste() {
    setTasteReloadKey((k) => k + 1);
  }
  function retryDiscover() {
    if (currentPrompt) runDiscover(currentPrompt);
  }

  // View animation config — cross-fade with a small upward drift.
  const enter = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.45, ease },
  };

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen">
      <AnimatePresence mode="wait" initial={false}>
        {view === "landing" && (
          <motion.div key="landing" {...enter}>
            <Landing personas={PERSONAS} onPick={pickPersona} />
          </motion.div>
        )}
        {view === "taste" && persona && (
          <motion.div key="taste" {...enter}>
            <TasteView
              persona={persona}
              loading={tasteLoading}
              data={tasteData}
              error={tasteError}
              onSubmit={(p) => runDiscover(p)}
              onBack={backToLanding}
              onRetry={retryTaste}
            />
          </motion.div>
        )}
        {view === "results" && persona && (
          <motion.div key="results" {...enter}>
            <ResultsView
              persona={persona}
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
