// SERVER COMPONENT — no "use client" here, so this renders on the server.
// It ships no component JS of its own; it just composes the page and drops in
// the small <HealthCheck /> client island that does the browser-side fetch.
import HealthCheck from "./HealthCheck";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-green-600 dark:text-green-400">
          Spotify Growth · Discovery Agent
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Taste-Trip
        </h1>

        <p className="mt-4 text-lg text-black/60 dark:text-white/60">
          An AI discovery agent that breaks you out of the familiarity trap —
          real, playable Spotify tracks you probably haven&apos;t heard, each with
          a reason.
        </p>

        {/* Placeholder for the Phase 1 discovery UI (persona picker + prompt). */}
        <div className="mt-10 rounded-xl border border-dashed border-black/15 dark:border-white/20 px-6 py-12 text-black/40 dark:text-white/40">
          Discovery engine coming next…
        </div>

        <div className="mt-8">
          <HealthCheck />
        </div>
      </div>
    </main>
  );
}
