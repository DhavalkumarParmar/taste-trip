// ─────────────────────────────────────────────────────────────────────────
// SERVER-ONLY MODULE. Do NOT import from any "use client" file.
// Uses lib/gemini.ts (which reads GOOGLE_API_KEY) — secrets stay server-side.
//
// Taste analysis: given a persona's known artists, produce
//   - a taste paragraph (~60-90 words) that names the taste AND names the
//     structural discovery gap a familiarity-trap algorithm wouldn't surface
//   - the verbatim substring inside the paragraph that names the gap
//     (so the UI can annotate it — see the "dashed underline" design signature)
//   - 3-4 concrete, evocative prompts, each a path OUT of the named gap
// ─────────────────────────────────────────────────────────────────────────
import { generateJSON } from "@/lib/gemini";
import type { Persona } from "@/lib/personas";

export interface TasteAnalysis {
  tasteParagraph: string;
  /** Verbatim substring of tasteParagraph naming the discovery gap. */
  gapPhrase: string;
  suggestedPrompts: string[];
}

const SCHEMA = {
  type: "object",
  properties: {
    tasteParagraph: { type: "string" },
    gapPhrase: { type: "string" },
    suggestedPrompts: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 4,
    },
  },
  required: ["tasteParagraph", "gapPhrase", "suggestedPrompts"],
};

const SYSTEM_INSTRUCTION =
  "You are a music-discovery analyst. Your job is not to praise or flatter a " +
  "listener, but to describe their taste with the precision of a critic and then " +
  "name — with equal precision — the STRUCTURAL discovery gap that a " +
  "familiarity-driven algorithm would systematically fail to surface to them. " +
  "The gap-naming is the whole point of your analysis. A gap is not 'you might " +
  "like other music'; it is a specific missing region, language, subgenre, " +
  "era, or stylistic cousin scene.";

function buildUserPrompt(persona: Persona): string {
  return (
    `Listener profile:\n` +
    `  Name: ${persona.name}\n` +
    `  Description: ${persona.description}\n` +
    `  Top artists: ${persona.seedArtists.join(", ")}\n\n` +
    `Produce THREE things.\n\n` +
    `1) "tasteParagraph" — ONE plain-English paragraph, 60-90 words. First, ` +
    `describe this taste concretely: name the genre(s), subgenre(s), moods, ` +
    `emotional register, and reference 1-2 of the listener's own artists to ` +
    `ground it. Then, IN THE SAME PARAGRAPH, explicitly name the discovery ` +
    `gap — what a familiarity-driven algorithm trapped in this listener's ` +
    `playback history would systematically fail to show them. The gap MUST ` +
    `be structural and specific: an entire region or language they've never ` +
    `sampled; a subgenre their favorites belong to but they've never explored; ` +
    `a generation older or younger than what they know; a stylistic cousin ` +
    `scene they've never crossed into; a specific era, sub-tradition, or ` +
    `international parallel. Write as an insight, not marketing. Do NOT ` +
    `flatter the listener. Do NOT use words like "sophisticated", "curated", ` +
    `"eclectic", "diverse".\n\n` +
    `2) "gapPhrase" — the exact substring inside tasteParagraph (verbatim, ` +
    `character-for-character, 10-25 words) that names the discovery gap. It ` +
    `MUST appear inside tasteParagraph exactly. This is used to visually ` +
    `annotate the gap in the UI.\n\n` +
    `3) "suggestedPrompts" — exactly 4 short prompts (each max ~12 words) ` +
    `phrased AS THE LISTENER TALKING to a discovery agent, in the FIRST ` +
    `PERSON. Each must offer a concrete PATH OUT of the named gap: reference ` +
    `a specific subgenre, region, language, era, or emotional target.\n\n` +
    `VOICE RULES:\n` +
    `- Use casual first-person phrasing like "I probably haven't heard", ` +
    `"I don't already know", "that would surprise me", "with X-level Y" — ` +
    `so they read like a person's ask, not a search-engine query or a ` +
    `taxonomy description.\n` +
    `- One prompt may reference a specific artist the listener DOES know ` +
    `as a comparison point (e.g. "with Arijit-level emotion" or ` +
    `"unlike Bon Iver but as intimate"), used sparingly.\n` +
    `- Vary the angle across the 4: one per region/language, one per era or ` +
    `generation, one per emotional target, one per stylistic-cousin scene.\n` +
    `- Do NOT use hollow words like "something", "new", "fresh" without a ` +
    `concrete anchor. Do NOT write "Recommend me...", "Show me some...".\n` +
    `- Do NOT name any of the listener's own top artists as the target of ` +
    `the search (they can appear only as a comparison "like X but...").\n\n` +
    `Quality bar for prompts — study these:\n` +
    `  GOOD: "Underrated Hindi indie love songs I probably haven't heard"\n` +
    `  GOOD: "Regional love ballads with Arijit-level emotion — Bengali, Tamil, Punjabi"\n` +
    `  GOOD: "Modern ghazals from artists outside Jagjit Singh's generation"\n` +
    `  GOOD: "Late-night acoustic songs in Tamil that would sit next to Anuv Jain"\n` +
    `  BAD: "Contemporary Bengali folk-pop tracks with minimalist arrangements" (search-query voice, not a person)\n` +
    `  BAD: "Something new for me" (too generic)\n` +
    `  BAD: "Music like what I already listen to" (defeats discovery)`
  );
}

/** Best-effort: if the model returned a gapPhrase that isn't a verbatim
 *  substring of the paragraph, drop it rather than lying to the UI. */
function verifyGap(a: TasteAnalysis): TasteAnalysis {
  if (a.gapPhrase && a.tasteParagraph.includes(a.gapPhrase)) return a;
  return { ...a, gapPhrase: "" };
}

export async function analyzeTaste(persona: Persona): Promise<TasteAnalysis> {
  const out = await generateJSON<TasteAnalysis>(buildUserPrompt(persona), {
    schema: SCHEMA,
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.85,
  });
  return verifyGap({
    tasteParagraph: out.tasteParagraph?.trim() ?? "",
    gapPhrase: out.gapPhrase?.trim() ?? "",
    suggestedPrompts: (out.suggestedPrompts ?? [])
      .map((s) => s?.trim())
      .filter((s): s is string => !!s)
      .slice(0, 4),
  });
}
