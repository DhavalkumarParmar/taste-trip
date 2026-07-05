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
  "listener, but to describe their taste with the precision of a critic and " +
  "then name — with equal precision — the STRUCTURAL discovery gap that a " +
  "familiarity-driven algorithm would systematically fail to surface to them. " +
  "CRUCIAL CONSTRAINT: stay WITHIN the listener's own language(s). Your job " +
  "is to widen their taste inside the languages they already listen to, not " +
  "to push them across a language barrier. Cross-language exploration is " +
  "something the listener can opt into themselves via the free-text box, not " +
  "something you suggest by default. A useful gap here is a specific missing " +
  "era, subgenre, sub-tradition, scene, or generation — all inside the " +
  "listener's own language(s).";

function buildUserPrompt(persona: Persona): string {
  return (
    `Listener profile:\n` +
    `  Name: ${persona.name}\n` +
    `  Description: ${persona.description}\n` +
    `  Top artists: ${persona.seedArtists.join(", ")}\n\n` +
    `Produce THREE things.\n\n` +
    `First, INTERNALLY identify the language(s) the seed artists sing in ` +
    `(e.g. Arijit Singh/Pritam/A.R. Rahman => Hindi; Nusrat/Wadali Brothers ` +
    `=> Urdu + Punjabi; Anuv Jain + Bon Iver => Hindi + English). Everything ` +
    `you produce below must stay WITHIN those languages. Do NOT suggest, ` +
    `imply, or point toward music in a language the listener does not ` +
    `already sample. That is a hard rule.\n\n` +
    `1) "tasteParagraph" — ONE plain-English paragraph, 60-90 words. First, ` +
    `describe this taste concretely: name the genre(s), subgenre(s), moods, ` +
    `emotional register, and reference 1-2 of the listener's own artists to ` +
    `ground it. Then, IN THE SAME PARAGRAPH, explicitly name the discovery ` +
    `gap — what a familiarity-driven algorithm trapped in this listener's ` +
    `playback history would systematically fail to show them. The gap MUST ` +
    `be structural, specific, AND within the listener's own language(s): a ` +
    `specific era or generation they haven't explored (e.g. 1970s vs. today); ` +
    `a subgenre their favorites belong to but they've never explored; a ` +
    `stylistic cousin scene inside the same language; a sub-tradition, a ` +
    `non-mainstream lineage. Do NOT name a gap in a different language or ` +
    `region than the listener already listens to. Write as an insight, not ` +
    `marketing. Do NOT flatter. Do NOT use "sophisticated", "curated", ` +
    `"eclectic", "diverse".\n\n` +
    `2) "gapPhrase" — the exact substring inside tasteParagraph (verbatim, ` +
    `character-for-character, 10-25 words) that names the discovery gap. It ` +
    `MUST appear inside tasteParagraph exactly. This is used to visually ` +
    `annotate the gap in the UI.\n\n` +
    `3) "suggestedPrompts" — exactly 4 short prompts (each max ~12 words) ` +
    `phrased AS THE LISTENER TALKING to a discovery agent, in the FIRST ` +
    `PERSON. Each must offer a concrete PATH OUT of the named gap, ENTIRELY ` +
    `WITHIN the listener's own language(s). Reference a specific subgenre, ` +
    `era, generation, sub-tradition, or emotional target — never a language ` +
    `the listener doesn't already listen to.\n\n` +
    `VOICE RULES:\n` +
    `- Use casual first-person phrasing like "I probably haven't heard", ` +
    `"I don't already know", "that would surprise me", "with X-level Y" — ` +
    `so they read like a person's ask, not a search-engine query.\n` +
    `- One prompt may reference a specific artist the listener DOES know ` +
    `as a comparison point (e.g. "with Arijit-level emotion" or "unlike ` +
    `Bon Iver but as intimate"), used sparingly.\n` +
    `- Vary the angle across the 4: one per era, one per subgenre or ` +
    `sub-tradition, one per emotional target, one per stylistic-cousin scene ` +
    `— all inside the listener's own language(s).\n` +
    `- Do NOT use hollow words like "something", "new", "fresh" without a ` +
    `concrete anchor. Do NOT write "Recommend me...", "Show me some...".\n` +
    `- Do NOT name any of the listener's own top artists as the target of ` +
    `the search (they can appear only as a comparison "like X but...").\n` +
    `- HARD RULE: Do NOT reference a language, region, or country the ` +
    `listener does not already listen to. No Bengali prompts for a Hindi ` +
    `listener; no Tamil prompts for a Hindi-only listener; no Persian, ` +
    `Spanish, French, Korean prompts unless the seed artists already sample ` +
    `that language. Cross-language discovery is something the listener types ` +
    `into the free-text box themselves.\n\n` +
    `Quality bar for prompts — study these carefully:\n` +
    `  GOOD (Hindi-film listener): "Underrated 1990s Hindi film songs I've probably missed"\n` +
    `  GOOD (Hindi-film listener): "Non-film Hindi indie ballads with Arijit-level emotion"\n` +
    `  GOOD (Urdu/Punjabi Sufi listener): "Modern ghazals from artists outside Jagjit Singh's generation"\n` +
    `  GOOD (English + Hindi indie): "Late-night acoustic English indie that would sit next to Anuv Jain"\n` +
    `  BAD — CROSSES LANGUAGE (Hindi listener suggested Bengali): "Bengali folk ballads I'd fall for"\n` +
    `  BAD — CROSSES LANGUAGE (Urdu listener suggested Persian): "1970s Iranian folk-pop that predates my collection"\n` +
    `  BAD — TOO GENERIC: "Something new for me"\n` +
    `  BAD — SEARCH-QUERY VOICE: "Contemporary Hindi folk-pop tracks with minimalist arrangements"`
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
