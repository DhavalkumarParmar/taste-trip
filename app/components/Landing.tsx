"use client";
// CLIENT — the landing screen. Big product name in Fraunces, one confident
// tagline, three persona cards + one real-Spotify card. No marketing copy.
import { motion } from "framer-motion";
import type { Persona } from "@/lib/personas";

const ease = [0.22, 0.61, 0.36, 1] as const;

function SpotifyGlyph() {
  // Simplified Spotify wordmark glyph — three sound-wave arcs in a filled circle.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path
        d="M17.9 10.7c-3.2-1.9-8.4-2-11.5-1.1-.5.1-1-.1-1.1-.6-.1-.5.2-1 .6-1.1 3.5-1.1 9.3-.9 12.9 1.3.4.3.6.9.3 1.3-.2.4-.7.5-1.2.2zm-.1 2.7c-.2.4-.7.5-1 .3-2.7-1.6-6.7-2.1-9.9-1.2-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 3.6-1.1 8-.5 11 1.3.4.2.5.7.3 1zm-1.2 2.6c-.2.3-.5.4-.8.2-2.3-1.4-5.3-1.7-8.8-.9-.3.1-.7-.1-.7-.5-.1-.3.1-.7.5-.7 3.8-.9 7.1-.5 9.7 1.1.3.2.4.6.1.8z"
        fill="#000"
      />
    </svg>
  );
}

export function Landing({
  personas,
  onPick,
  onSpotifySignIn,
}: {
  personas: Persona[];
  onPick: (id: string) => void;
  onSpotifySignIn: () => void;
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
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
          {/* Real-Spotify sign-in card — visually part of the set but with a
              Spotify-green accent making it obviously "the real thing." */}
          <motion.button
            type="button"
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
            }}
            onClick={onSpotifySignIn}
            className="group relative text-left bg-paper border border-rule px-6 pt-6 pb-5 transition-all duration-300 hover:-translate-y-1 hover:bg-paper-2 hover:border-[#1DB954] focus-visible:outline-none focus-visible:border-[#1DB954] focus-visible:ring-4 focus-visible:ring-[#1DB954]/20"
          >
            <span
              aria-hidden
              className="absolute left-0 top-6 bottom-5 w-[3px] bg-[#1DB954] scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100 origin-top transition-transform duration-300"
            />
            <p
              className="font-display-italic text-[#1DB954] text-lg leading-snug pr-4"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 80, "WONK" 1' }}
            >
              &ldquo;Let it read my actual library.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-2">
              <SpotifyGlyph />
              <h2
                className="font-display text-2xl md:text-[1.6rem] text-ink"
                style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30, "WONK" 0' }}
              >
                Use my real Spotify
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-2 leading-relaxed">
              Sign in and we&apos;ll analyze your actual top artists.
            </p>
            <div className="mt-5 pt-4 border-t border-rule/70">
              <p className="eyebrow text-[0.65rem] mb-2">Access</p>
              <p className="text-xs text-muted leading-relaxed">
                Allowlisted accounts only during this MVP demo.
              </p>
            </div>
          </motion.button>
        </div>
      </motion.section>
    </div>
  );
}
