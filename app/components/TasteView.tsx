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
  labelPrefix,
  labelSuffix,
  onRefreshTaste,
}: {
  persona: Persona;
  loading: boolean;
  data: TasteData | null;
  error: string;
  onSubmit: (prompt: string) => void;
  onBack: () => void;
  onRetry: () => void;
  /** Header eyebrow — e.g. "You picked" (persona) or "Reading" (real user) */
  labelPrefix?: string;
  /** Suffix on the name line — e.g. "'s taste" for the real-user path */
  labelSuffix?: string;
  /** Only defined on the real-user path — shows the "Refresh my taste" button */
  onRefreshTaste?: () => void;
}) {
  const [freeText, setFreeText] = useState("");

  function submitFree(e: React.FormEvent) {
    e.preventDefault();
    const t = freeText.trim();
    if (t) onSubmit(t);
  }

  const prefix = labelPrefix ?? "You picked";
  const suffix = labelSuffix ?? "";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      {/* Persona label + back link + optional Refresh button */}
      <div className="flex items-baseline justify-between gap-4 mb-12">
        <div>
          <p className="eyebrow mb-2">{prefix}</p>
          <p
            className="font-display text-xl sm:text-2xl text-ink"
            style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30, "WONK" 0' }}
          >
            {persona.name}
            {suffix}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {onRefreshTaste && (
            <button
              type="button"
              onClick={onRefreshTaste}
              className="link-back inline-flex items-center gap-1.5"
              aria-label="Refresh my taste"
            >
              <RefreshIcon /> Refresh my taste
            </button>
          )}
          <button type="button" onClick={onBack} className="link-back">
            ← try another
          </button>
        </div>
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

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10a7 7 0 0 1 12-4.95L17 7" />
      <path d="M17 3v4h-4" />
      <path d="M17 10a7 7 0 0 1-12 4.95L3 13" />
      <path d="M3 17v-4h4" />
    </svg>
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
