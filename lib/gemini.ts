// ─────────────────────────────────────────────────────────────────────────
// SERVER-ONLY MODULE. Do NOT import from any "use client" file.
// Reads GOOGLE_API_KEY from process.env — must never reach the browser.
// Thin wrapper over the @google/genai SDK (v2.x) for structured JSON output.
// ─────────────────────────────────────────────────────────────────────────
import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY in the environment.");
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

function modelName(): string {
  // Default chosen for free-tier headroom + quality; override via GEMINI_MODEL.
  return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Heuristic: is this error worth retrying (rate limit / 5xx / network)? */
function isTransient(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset")
  );
}

/** Strip ```json ... ``` fences the model sometimes adds despite JSON mode. */
function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

/** One raw call to Gemini, with transient-error retries (exp backoff). */
async function callGemini(
  contents: string,
  config: GenerateContentConfig,
  retries = 3
): Promise<string> {
  const ai = getClient();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: modelName(),
        contents,
        config,
      });
      const text = res.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt < retries && isTransient(err)) {
        await sleep(1000 * 2 ** attempt); // 1s, 2s
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export interface GenerateJSONOptions {
  /** Standard JSON Schema object; constrains the model's output shape. */
  schema?: unknown;
  /** Optional system instruction (persona / rules for the model). */
  systemInstruction?: string;
  /** 0 = deterministic, higher = more varied. Defaults to SDK default. */
  temperature?: number;
}

/**
 * Send `prompt` to Gemini and return parsed JSON of type T.
 * - Requests JSON output (responseMimeType) and, if given, constrains it with
 *   a JSON Schema (responseJsonSchema).
 * - Retries transient errors inside callGemini.
 * - If the returned text fails to JSON.parse, does ONE repair pass: asks the
 *   model to fix its own output into valid JSON, then parses that.
 * @throws Error if the response is unparseable even after the repair pass.
 */
export async function generateJSON<T = unknown>(
  prompt: string,
  options: GenerateJSONOptions = {}
): Promise<T> {
  const config: GenerateContentConfig = { responseMimeType: "application/json" };
  if (options.schema) config.responseJsonSchema = options.schema;
  if (options.systemInstruction)
    config.systemInstruction = options.systemInstruction;
  if (typeof options.temperature === "number")
    config.temperature = options.temperature;

  const raw = await callGemini(prompt, config);
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    // JSON-repair retry: hand the bad text back and ask for valid JSON only.
    const repairPrompt =
      "The text below was supposed to be valid JSON but could not be parsed. " +
      "Return ONLY the corrected, valid JSON — no commentary, no code fences.\n\n" +
      raw;
    const repaired = await callGemini(repairPrompt, {
      responseMimeType: "application/json",
    });
    try {
      return JSON.parse(stripFences(repaired)) as T;
    } catch (err) {
      throw new Error(
        `Gemini returned unparseable JSON even after repair: ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }
}
