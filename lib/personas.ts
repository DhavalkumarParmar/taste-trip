// ─────────────────────────────────────────────────────────────────────────
// SHARED DATA — no secrets, no process.env. Safe on server AND client.
// Three demo personas with genuinely distinct, internally-coherent tastes.
// ─────────────────────────────────────────────────────────────────────────

export interface Persona {
  id: string;
  name: string;
  /** First-person self-description shown as the epigraph on each persona card. */
  selfQuote: string;
  /** Short catalog-style description. */
  description: string;
  /** Top artists that sharply define this taste. */
  seedArtists: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: "bollywood-romantic",
    name: "The Bollywood Romantic",
    selfQuote: "I want the song to feel like the whole movie.",
    description: "Sweeping Hindi film love songs and modern Bollywood pop.",
    seedArtists: [
      "Arijit Singh",
      "Pritam",
      "A.R. Rahman",
      "Shreya Ghoshal",
      "Jubin Nautiyal",
      "Amit Trivedi",
      "Vishal-Shekhar",
      "Sonu Nigam",
      "Darshan Raval",
      "Neha Kakkar",
    ],
  },
  {
    id: "soulful-purist",
    name: "The Soulful Purist",
    selfQuote: "Give me the voice, unadorned, and the poem inside it.",
    description:
      "Poetic ghazals, Sufi devotionals, Hindustani classical, and slow, lyrically rich acoustic melodies. Values vocal depth, instrumentation, and poetry over electronic beats.",
    seedArtists: [
      "Jagjit Singh",
      "Nusrat Fateh Ali Khan",
      "Rekha Bhardwaj",
      "Wadali Brothers",
      "Papon",
    ],
  },
  {
    id: "indie-dreamer",
    name: "The Indie Dreamer",
    selfQuote: "I like the songs that sound like they were sung for one person.",
    description:
      "Intimate acoustic storytelling, contemporary Indian indie, bedroom pop, and soft English singer-songwriters. Values minimal instrumentation, emotional vulnerability, and a cozy late-night or cafe vibe.",
    seedArtists: [
      "Anuv Jain",
      "Prateek Kuhad",
      "When Chai Met Toast",
      "The Local Train",
      "Osho Jain",
      "Vance Joy",
      "Hozier",
      "Passenger",
      "Phoebe Bridgers",
      "Bon Iver",
    ],
  },
];

/** Look up a persona by id (returns undefined if not found). */
export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
