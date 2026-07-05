"use client";
// CLIENT — the landing screen. Big product name in Fraunces, one confident
// tagline, three persona cards. No marketing copy, no filler.
import { motion } from "framer-motion";
import type { Persona } from "@/lib/personas";

const ease = [0.22, 0.61, 0.36, 1] as const;

export function Landing({
  personas,
  onPick,
}: {
  personas: Persona[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="max-w-3xl"
      >
        <p className="eyebrow mb-6">Taste-Trip · Discovery agent</p>
        <h1
          className="font-display text-5xl sm:text-6xl md:text-7xl leading-[1.02] text-ink"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 0' }}
        >
          Reads your taste.
          <br />
          <span className="text-cobalt">Marks the gaps.</span>
          <br />
          Finds what&apos;s missing.
        </h1>
        <p className="mt-8 max-w-xl text-base sm:text-lg text-ink-2 leading-relaxed">
          A discovery agent for Spotify listeners the algorithm has stopped
          surprising. Pick a listener to begin.
        </p>
      </motion.header>

      <motion.section
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
        }}
        className="mt-16 sm:mt-24"
      >
        <hr className="hairline mb-6" />
        <p className="eyebrow mb-8">Choose a listener</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
              }}
              onClick={() => onPick(p.id)}
              className="group relative text-left bg-paper border border-rule px-6 pt-6 pb-5 transition-all duration-300 hover:-translate-y-1 hover:bg-paper-2 hover:border-cobalt focus-visible:outline-none focus-visible:border-cobalt focus-visible:ring-4 focus-visible:ring-cobalt/15"
            >
              {/* left-hand cobalt rule appears on hover */}
              <span
                aria-hidden
                className="absolute left-0 top-6 bottom-5 w-[3px] bg-cobalt scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100 origin-top transition-transform duration-300"
              />
              <p
                className="font-display-italic text-cobalt text-lg leading-snug pr-4"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 80, "WONK" 1' }}
              >
                &ldquo;{p.selfQuote}&rdquo;
              </p>
              <h2
                className="font-display text-2xl md:text-[1.6rem] mt-4 text-ink"
                style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30, "WONK" 0' }}
              >
                {p.name}
              </h2>
              <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                {p.description}
              </p>
              <div className="mt-5 pt-4 border-t border-rule/70">
                <p className="eyebrow text-[0.65rem] mb-2">Known for</p>
                <p className="text-xs text-muted leading-relaxed">
                  {p.seedArtists.slice(0, 4).join(" · ")}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
