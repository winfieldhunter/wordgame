/**
 * Daily puzzle catalog. Three puzzles per date (easy, medium, hard).
 * Each day of the week has a theme; easy/medium/hard are different words within that theme (not synonyms).
 * Words are intentionally challenging—easy = known but not trivial, hard = obscure or specialized.
 * Hints are written to sound human and natural—short, specific.
 */

import type { PuzzleLevel } from "./puzzleId";

export type PuzzleDifficulty = "normal" | "hard";

export interface DailyPuzzleDef {
  date: string; // YYYY-MM-DD
  level: PuzzleLevel;
  hints: [string, string, string]; // three hints; user can reveal by guess count or click
  target: string;
  /** Optional: affects display; hard = vaguer hints / tougher word. */
  difficulty?: PuzzleDifficulty;
}

/**
 * Seed list: three entries per date (easy, medium, hard).
 * Theme is derived from day of week at runtime.
 */
export const dailyPuzzles: DailyPuzzleDef[] = [
  // Sun 2/22: Time
  { date: "2026-02-22", level: "easy", hints: ["When the sun first appears.", "Before the workday begins.", "The sky is pink and gold."], target: "dawn" },
  { date: "2026-02-22", level: "medium", hints: ["When daylight fades.", "The hour between day and night.", "Scottish poets might call it gloaming."], target: "dusk" },
  { date: "2026-02-22", level: "hard", hints: ["When day and night are equal length.", "Twice a year, the sun crosses the line.", "Spring or fall, depending."], target: "equinox" },
  // Mon 2/23: Emotions
  { date: "2026-02-23", level: "easy", hints: ["When they have what you want.", "The green-eyed feeling.", "Wanting what someone else got."], target: "envy" },
  { date: "2026-02-23", level: "medium", hints: ["A listless boredom with everything.", "French has a word for it.", "When nothing interests you."], target: "ennui" },
  { date: "2026-02-23", level: "hard", hints: ["Joy at someone else's misfortune.", "German has a word for it.", "When their failure feels good."], target: "schadenfreude" },
  // Tue 2/24: Nature
  { date: "2026-02-24", level: "easy", hints: ["A deep gap in the earth.", "The Grand one is famous.", "Rivers carve them over time."], target: "canyon" },
  { date: "2026-02-24", level: "medium", hints: ["A narrow, steep-sided valley.", "Often dry except after rain.", "Gold rushers panned in them."], target: "ravine" },
  { date: "2026-02-24", level: "hard", hints: ["Not the rain itself—what the rain releases.", "Named for stone and the fluid of the gods.", "The smell that says storm has passed."], target: "petrichor" },
  // Wed 2/25: Places
  { date: "2026-02-25", level: "easy", hints: ["A big church with tall ceilings.", "Where bishops preach.", "Gothic architecture, often."], target: "cathedral" },
  { date: "2026-02-25", level: "medium", hints: ["A safe place, often sacred.", "Where refugees might go.", "Not just shelter—protection."], target: "sanctuary" },
  { date: "2026-02-25", level: "hard", hints: ["A building for the dead.", "Grander than a tomb.", "The Taj Mahal is one."], target: "mausoleum" },
  // Thu 2/26: Actions
  { date: "2026-02-26", level: "easy", hints: ["To pause before acting.", "Not sure whether to go through with it.", "The moment before you commit."], target: "hesitate" },
  { date: "2026-02-26", level: "medium", hints: ["To put off until later.", "The art of avoiding what you should do.", "When tomorrow always seems better."], target: "procrastinate" },
  { date: "2026-02-26", level: "hard", hints: ["To avoid giving a straight answer.", "To speak evasively or misleadingly.", "Politicians are accused of it."], target: "prevaricate" },
  // Fri 2/27: People
  { date: "2026-02-27", level: "easy", hints: ["Someone who guides you.", "A teacher, but more personal.", "They've been where you're going."], target: "mentor" },
  { date: "2026-02-27", level: "medium", hints: ["Someone you tell secrets to.", "More than a friend—they hold your trust.", "The one who knows everything."], target: "confidant" },
  { date: "2026-02-27", level: "hard", hints: ["Someone who tells stories well.", "French for a skilled narrator.", "The life of the dinner party."], target: "raconteur" },
  // Sat 2/28: Senses
  { date: "2026-02-28", level: "easy", hints: ["Strong and sharp to smell.", "Like onions or garlic.", "Makes your nose wrinkle."], target: "pungent" },
  { date: "2026-02-28", level: "medium", hints: ["The fifth taste, besides sweet and sour.", "Savory, meaty, brothy.", "Japanese for 'deliciousness.'"], target: "umami" },
  { date: "2026-02-28", level: "hard", hints: ["A harsh, bitter smell or taste.", "Burning or corrosive.", "What bleach leaves in the air."], target: "acrid" },
  // Sun 3/1: Time
  { date: "2026-03-01", level: "easy", hints: ["The dim light after sunset.", "Vampires come out in it.", "Between day and full dark."], target: "twilight" },
  { date: "2026-03-01", level: "medium", hints: ["When the sun is farthest north or south.", "Longest or shortest day of the year.", "Summer or winter, astronomically."], target: "solstice" },
  { date: "2026-03-01", level: "hard", hints: ["When Earth is farthest from the sun.", "Opposite of perihelion.", "Happens in July."], target: "aphelion" },
  // Mon 3/2: Emotions
  { date: "2026-03-02", level: "easy", hints: ["Longing for the past.", "When old memories ache a little.", "Missing how things used to be."], target: "nostalgia" },
  { date: "2026-03-02", level: "medium", hints: ["A deep, thoughtful sadness.", "Not quite depression—more poetic.", "The mood of a rainy afternoon."], target: "melancholy" },
  { date: "2026-03-02", level: "hard", hints: ["A feeling of guilt or moral unease.", "A prick of conscience.", "What stops you from doing wrong."], target: "compunction" },
  // Tue 3/3: Nature
  { date: "2026-03-03", level: "easy", hints: ["Sand and heat, little water.", "Camels cross it.", "The Sahara is one."], target: "desert" },
  { date: "2026-03-03", level: "medium", hints: ["Frozen, treeless plains.", "Where reindeer roam.", "Northern Canada has it."], target: "tundra" },
  { date: "2026-03-03", level: "hard", hints: ["Rich soil of clay, sand, and organic matter.", "Good for growing crops.", "Farmers prize it."], target: "loam" },
  // Wed 3/4: Places
  { date: "2026-03-04", level: "easy", hints: ["A huge city.", "New York is one.", "Skyscrapers and millions."], target: "metropolis" },
  { date: "2026-03-04", level: "medium", hints: ["A tiny village.", "Smaller than a town.", "Shakespeare's birthplace was one."], target: "hamlet" },
  { date: "2026-03-04", level: "hard", hints: ["A secluded place for religious retreat.", "Monks live in one.", "Often has a courtyard."], target: "cloister" },
];
