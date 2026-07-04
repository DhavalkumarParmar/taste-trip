// ─────────────────────────────────────────────────────────────────────────
// SHARED DATA — no secrets, no process.env. Safe to import from BOTH server
// code (app/api/discover reads persona.seedArtists) and client code (the
// persona picker UI). This is the only lib/* file that is not server-only.
//
// Three demo personas with genuinely distinct, internally-coherent tastes.
// Each artist list is chosen so the taste is unambiguous — these seed the
// discovery engine (and, in a later phase, taste analysis).
// ─────────────────────────────────────────────────────────────────────────

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  /** One-line description of who this listener is. */
  description: string;
  /** Top artists that sharply define this taste. */
  seedArtists: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: "bollywood-romantic",
    name: "The Bollywood Romantic",
    emoji: "🌹",
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
    emoji: "🕊️",
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
    emoji: "🌙",
    description:
      "Intimate acoustic storytelling, contemporary Indian indie, bedroom pop, and soft English singer-songwriters. Values minimal instrumentation (mostly guitars and ukuleles), emotional vulnerability, and a cozy, late-night road trip or cafe vibe.",
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
