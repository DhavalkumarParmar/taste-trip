"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Persona } from "@/lib/personas";
import { StagedLoader } from "./StagedLoader";
import { TrackCard, TrackCardSkeleton, type Track } from "./TrackCard";

const ease = [0.22, 0.61, 0.36, 1] as const;

const DISCOVER_LOADING = [
  "Interpreting your request…",
  "Searching Spotify…",
  "Picking the best…",
];

export function ResultsView({
  persona,
  prompt,
  loading,
  tracks,
  error,
  note,
  onBack,
  onRefine,
  onRetry,
}: {
  persona: Persona;
  prompt: string;
  loading: boolean;
  tracks: Track[] | null;
  error: string;
  note: string;
  onBack: () => void;
  onRefine: (refinement: string) => void;
  onRetry: () => void;
}) {
  const [refinement, setRefinement] = useState("");

  function submitRefine(e: React.FormEvent) {
    e.preventDefault();
    const r = refinement.trim();
    if (r) {
      onRefine(r);
      setRefinement("");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
      {/* Recap header */}
      <div className="mb-10">
        <button type="button" onClick={onBack} className="link-back mb-4">
          ← ask something else
        </button>
        <p className="eyebrow mb-2">Results for {persona.name}</p>
        <p
          className="font-display text-2xl sm:text-3xl leading-snug text-ink"
          style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30, "WONK" 0' }}
        >
          &ldquo;{prompt}&rdquo;
        </p>
      </div>

      <hr className="hairline mb-10" />

      {loading ? (
        <>
          <div className="min-h-[140px] flex items-center justify-center mb-8">
            <StagedLoader messages={DISCOVER_LOADING} />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <TrackCardSkeleton key={i} />
            ))}
          </div>
        </>
      ) : error ? (
        <div className="border border-rule bg-paper-2 px-5 py-4 max-w-xl">
          <p className="eyebrow mb-2 text-ochre">The discovery hit a snag</p>
          <p className="text-sm text-ink-2 leading-relaxed mb-4">{error}</p>
          <div className="flex gap-3">
            <button type="button" onClick={onRetry} className="btn-primary text-sm">
              Try again
            </button>
            <button type="button" onClick={onBack} className="link-back">
              Or ask something else
            </button>
          </div>
        </div>
      ) : tracks && tracks.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {tracks.map((t) => (
            <motion.div
              key={t.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
              }}
            >
              <TrackCard t={t} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="border border-rule bg-paper-2 px-5 py-6 max-w-xl">
          <p className="eyebrow mb-2">Nothing came back</p>
          <p className="text-sm text-ink-2 leading-relaxed mb-4">
            {note ||
              "Spotify didn't return anything that matched. Try refining the request below — a genre, a language, or a mood usually helps."}
          </p>
          <button type="button" onClick={onBack} className="link-back">
            ← ask something else
          </button>
        </div>
      )}

      {/* Refinement input — only shown once results have arrived */}
      {!loading && tracks && tracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease }}
          className="mt-16"
        >
          <hr className="hairline mb-6" />
          <p className="eyebrow mb-3">Not quite right?</p>
          <form onSubmit={submitRefine} className="flex gap-2">
            <input
              type="text"
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder="Refine — e.g. slower, more acoustic, less English"
              className="text-input flex-1"
              aria-label="Refine your request"
            />
            <button
              type="submit"
              disabled={!refinement.trim()}
              className="btn-primary whitespace-nowrap"
            >
              Refine →
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
