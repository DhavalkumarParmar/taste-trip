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
  /** ~8-12 top artists that sharply define this taste. */
  seedArtists: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: "midnight-indie",
    name: "The Midnight Melancholic",
    emoji: "🌧️",
    description:
      "Hushed, introspective indie-folk for headphones and rainy windows. Lives in slow builds, cracked vocals, and lyrics that ache.",
    seedArtists: [
      "Bon Iver",
      "Phoebe Bridgers",
      "Sufjan Stevens",
      "The National",
      "Fleet Foxes",
      "Big Thief",
      "Elliott Smith",
      "Julien Baker",
      "Iron & Wine",
      "Nick Drake",
    ],
  },
  {
    id: "bollywood-romantic",
    name: "The Bollywood Romantic",
    emoji: "🌹",
    description:
      "Lives for sweeping Hindi film love songs and modern Bollywood pop — soaring melodies, playback legends, and a good monsoon ballad.",
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
    id: "latenight-hiphop",
    name: "The Late-Night Hip-Hop Head",
    emoji: "🎧",
    description:
      "Moody, lyric-forward hip-hop and alt-R&B — smoky late-night production, sharp bars, and singers who blur rap and soul.",
    seedArtists: [
      "Kendrick Lamar",
      "SZA",
      "J. Cole",
      "Frank Ocean",
      "Tyler, The Creator",
      "Mac Miller",
      "Anderson .Paak",
      "Brent Faiyaz",
      "Daniel Caesar",
      "Metro Boomin",
    ],
  },
];

/** Look up a persona by id (returns undefined if not found). */
export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
