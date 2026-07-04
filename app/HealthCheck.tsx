"use client";
// CLIENT CODE — the "use client" directive above means this component runs in
// the browser. It may use hooks (useState/useEffect) and browser APIs.
// It fetches ONLY our own "/api/health" endpoint — never Spotify/Gemini or any
// key directly. That server round-trip is exactly the boundary we protect:
// secrets live behind /api/*, the browser just calls our routes.
import { useEffect, useState } from "react";

type Status = "loading" | "ok" | "error";

export default function HealthCheck() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    // Runs in the browser on mount -> hits our server route handler.
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data?.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  const label =
    status === "loading"
      ? "Checking /api/health…"
      : status === "ok"
        ? "API healthy — client → server route works"
        : "API unreachable";

  const dot =
    status === "loading"
      ? "bg-yellow-400"
      : status === "ok"
        ? "bg-green-500"
        : "bg-red-500";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/15 px-3 py-1.5 text-sm text-black/70 dark:text-white/70">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}
