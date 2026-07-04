// Dev-only CLI test for lib/gemini.ts. Run: npx tsx scripts/test-gemini.ts
import { readFileSync } from "node:fs";
import { generateJSON } from "../lib/gemini";

function loadEnvLocal() {
  let raw = "";
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error("Could not read .env.local");
    return;
  }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

async function main() {
  loadEnvLocal();
  console.log("model:", process.env.GEMINI_MODEL || "gemini-2.5-flash (default)");

  // 1) schema-constrained structured output
  console.log("\n── test 1: schema-constrained search queries ──");
  const schema = {
    type: "object",
    properties: {
      queries: {
        type: "array",
        items: { type: "string" },
        description: "Spotify search query strings",
      },
    },
    required: ["queries"],
  };
  const out = await generateJSON<{ queries: string[] }>(
    "A user likes melancholic indie folk (Bon Iver, Phoebe Bridgers) but wants " +
      "something NEW and more upbeat, in Hindi. Produce 4 concrete Spotify " +
      "search query strings that favor novelty over blockbusters.",
    { schema, temperature: 0.9 }
  );
  console.log(JSON.stringify(out, null, 2));

  // 2) plain JSON (no schema) — proves parsing/repair path works too
  console.log("\n── test 2: plain JSON, no schema ──");
  const out2 = await generateJSON<{ mood: string; oneLiner: string }>(
    'Return a JSON object with keys "mood" and "oneLiner" describing the vibe ' +
      "of late-night city driving music."
  );
  console.log(JSON.stringify(out2, null, 2));
}

main().catch((e) => {
  console.error("TEST FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
