// SERVER COMPONENT — no "use client". Renders the static header and mounts
// the interactive <DiscoverApp /> client island, which does the browser-side
// fetch to our /api/discover route.
import DiscoverApp from "./DiscoverApp";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16 text-center">
      <div className="mb-10 max-w-xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-green-600 dark:text-green-400">
          Spotify Growth · Discovery Agent
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Taste-Trip
        </h1>
        <p className="mt-4 text-lg text-black/60 dark:text-white/60">
          Break out of the familiarity trap. Real, playable Spotify tracks you
          probably haven&apos;t heard — each with a reason.
        </p>
      </div>

      <DiscoverApp />
    </main>
  );
}
