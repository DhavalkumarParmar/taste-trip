"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Persona } from "@/lib/personas";
import { GapAnnotatedParagraph } from "./GapAnnotatedParagraph";
import { StagedLoader } from "./StagedLoader";

const ease = [0.22, 0.61, 0.36, 1] as const;

const TASTE_LOADING = [
  "Reading your taste…",
  "Finding what's missing…",
  "Suggesting directions…",
];

export interface TasteData {
  tasteParagraph: string;
  gapPhrase: string;
  suggestedPrompts: string[];
}

export function TasteView({
  persona,
  loading,
  data,
  error,
  onSubmit,
  onBack,
  onRetry,
}: {
  persona: Persona;
  loading: boolean;
  data: TasteData | null;
  error: string;
  onSubmit: (prompt: string) => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  const [freeText, setFreeText] = useState("");

  function submitFree(e: React.FormEvent) {
    e.preventDefault();
    const t = freeText.trim();
    if (t) onSubmit(t);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      {/* Persona label + back link */}
      <div className="flex items-baseline justify-between gap-4 mb-12">
        <div>
          <p className="eyebrow mb-2">You picked</p>
          <p
            className="font-display text-xl sm:text-2xl text-ink"
            style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30, "WONK" 0' }}
          >
            {persona.name}
          </p>
        </div>
        <button type="button" onClick={onBack} className="link-back">
          ← try another
        </button>
      </div>

      {/* Loading, error, or paragraph */}
      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <StagedLoader messages={TASTE_LOADING} />
        </div>
      ) : error ? (
        <ErrorPanel message={error} onRetry={onRetry} />
      ) : data ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <GapAnnotatedParagraph
            paragraph={data.tasteParagraph}
            gapPhrase={data.gapPhrase}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9, ease }}
            className="mt-16"
          >
            <hr className="hairline mb-6" />
            <p className="eyebrow mb-6">Try one of these directions</p>
            <div className="grid gap-3">
              {data.suggestedPrompts.map((p, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.0 + idx * 0.08, ease }}
                  onClick={() => onSubmit(p)}
                  className="prompt-card"
                >
                  {p}
                </motion.button>
              ))}
            </div>

            <div className="mt-10">
              <p className="eyebrow mb-3">Or ask for anything</p>
              <form onSubmit={submitFree} className="flex gap-2">
                <input
                  type="text"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Songs that feel like a long train ride at dusk…"
                  className="text-input flex-1"
                  aria-label="Your discovery request"
                />
                <button
                  type="submit"
                  disabled={!freeText.trim()}
                  className="btn-ochre whitespace-nowrap"
                >
                  Find →
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="border border-rule bg-paper-2 px-5 py-4 max-w-xl">
      <p className="eyebrow mb-2 text-ochre">Couldn&apos;t read the taste</p>
      <p className="text-sm text-ink-2 leading-relaxed mb-4">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary text-sm">
        Try again
      </button>
    </div>
  );
}
