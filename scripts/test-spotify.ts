// Dev-only CLI test for lib/spotify.ts. NOT part of the app bundle.
// Run: npx tsx scripts/test-spotify.ts
// It loads .env.local manually (Next does this automatically at runtime,
// but a plain tsx process does not).
import { readFileSync } from "node:fs";
import { searchTracks } from "../lib/spotify";

// --- tiny .env.local loader (no dotenv dependency) ---
function loadEnvLocal() {
  let raw = "";
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error("Could not read .env.local — is it present at repo root?");
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();

  const queries = [
    "melancholic indie folk",
    "modern bollywood pop",
    "underground boom bap hip hop",
  ];

  for (const q of queries) {
    console.log(`\n──────── query: "${q}" ────────`);
    try {
      const tracks = await searchTracks(q, 3);
      if (tracks.length === 0) {
        console.log("  (no results)");
        continue;
      }
      for (const t of tracks) {
        console.log(
          `  • ${t.name} — ${t.artist}  [pop ${t.popularity}]\n` +
            `    ${t.spotifyUrl}\n` +
            `    art: ${t.albumImageUrl ?? "none"}  preview: ${t.previewUrl ? "yes" : "none"}`
        );
      }
    } catch (err) {
      console.error("  ERROR:", err instanceof Error ? err.message : err);
    }
  }
}

main();
