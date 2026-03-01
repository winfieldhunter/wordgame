/**
 * Daily puzzle catalog. Three puzzles per date (easy, medium, hard).
 * Each day of the week has a theme; easy/medium/hard are different words within that theme (not synonyms).
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
  { date: "2026-02-22", level: "easy", hints: ["When the sun comes up.", "Coffee time for most.", "The start of the workday."], target: "morning" },
  { date: "2026-02-22", level: "medium", hints: ["When daylight fades.", "The hour between day and night.", "When the sky turns orange."], target: "dusk" },
  { date: "2026-02-22", level: "hard", hints: ["When day and night are equal length.", "Twice a year, the sun crosses the line.", "Spring or fall, depending."], target: "equinox" },
  // Mon 2/23: Emotions
  { date: "2026-02-23", level: "easy", hints: ["When things go your way.", "The opposite of sad.", "What a good surprise brings."], target: "happy" },
  { date: "2026-02-23", level: "medium", hints: ["When they have what you want.", "The green-eyed feeling.", "Wanting what someone else got."], target: "envy" },
  { date: "2026-02-23", level: "hard", hints: ["Joy at someone else's misfortune.", "German has a word for it.", "When their failure feels good."], target: "schadenfreude" },
  // Tue 2/24: Nature
  { date: "2026-02-24", level: "easy", hints: ["Falls from the sky.", "What clouds are made of.", "You need an umbrella for it."], target: "rain" },
  { date: "2026-02-24", level: "medium", hints: ["A deep gap in the earth.", "The Grand one is famous.", "Rivers carve them over time."], target: "canyon" },
  { date: "2026-02-24", level: "hard", hints: ["Not the rain itself—what the rain releases.", "Named for stone and the fluid of the gods.", "The smell that says storm has passed."], target: "petrichor" },
  // Wed 2/25: Places
  { date: "2026-02-25", level: "easy", hints: ["Where you live.", "Where the heart is.", "Not work, not school—this."], target: "home" },
  { date: "2026-02-25", level: "medium", hints: ["A big church with tall ceilings.", "Where bishops preach.", "Gothic architecture, often."], target: "cathedral" },
  { date: "2026-02-25", level: "hard", hints: ["A safe place, often sacred.", "Where refugees might go.", "Not just shelter—protection."], target: "sanctuary" },
  // Thu 2/26: Actions
  { date: "2026-02-26", level: "easy", hints: ["Faster than walking.", "What athletes do on a track.", "Feet moving quickly."], target: "run" },
  { date: "2026-02-26", level: "medium", hints: ["To pause before acting.", "Not sure whether to go through with it.", "The moment before you commit."], target: "hesitate" },
  { date: "2026-02-26", level: "hard", hints: ["To put off until later.", "The art of avoiding what you should do.", "When tomorrow always seems better."], target: "procrastinate" },
  // Fri 2/27: People
  { date: "2026-02-27", level: "easy", hints: ["Someone you like and trust.", "Not family, but close.", "You hang out with them."], target: "friend" },
  { date: "2026-02-27", level: "medium", hints: ["Someone who guides you.", "A teacher, but more personal.", "They've been where you're going."], target: "mentor" },
  { date: "2026-02-27", level: "hard", hints: ["Someone you tell secrets to.", "More than a friend—they hold your trust.", "The one who knows everything."], target: "confidant" },
  // Sat 2/28: Senses
  { date: "2026-02-28", level: "easy", hints: ["Like sugar or honey.", "The opposite of sour.", "What candy tastes like."], target: "sweet" },
  { date: "2026-02-28", level: "medium", hints: ["Strong and sharp to smell.", "Like onions or garlic.", "Makes your nose wrinkle."], target: "pungent" },
  { date: "2026-02-28", level: "hard", hints: ["The fifth taste, besides sweet and sour.", "Savory, meaty, brothy.", "Japanese for 'deliciousness.'"], target: "umami" },
  // Sun 3/1: Time
  { date: "2026-03-01", level: "easy", hints: ["When the sun first appears.", "Before morning.", "The sky is pink and gold."], target: "dawn" },
  { date: "2026-03-01", level: "medium", hints: ["The dim light after sunset.", "Vampires come out in it.", "Between day and full dark."], target: "twilight" },
  { date: "2026-03-01", level: "hard", hints: ["When the sun is farthest north or south.", "Longest or shortest day of the year.", "Summer or winter, astronomically."], target: "solstice" },
  // Mon 3/2: Emotions
  { date: "2026-03-02", level: "easy", hints: ["The opposite of happy.", "When something bad happens.", "Down in the dumps."], target: "sad" },
  { date: "2026-03-02", level: "medium", hints: ["Longing for the past.", "When old memories ache a little.", "Missing how things used to be."], target: "nostalgia" },
  { date: "2026-03-02", level: "hard", hints: ["A deep, thoughtful sadness.", "Not quite depression—more poetic.", "The mood of a rainy afternoon."], target: "melancholy" },
  // Tue 3/3: Nature
  { date: "2026-03-03", level: "easy", hints: ["Lots of trees together.", "Where deer and birds live.", "You might get lost in one."], target: "forest" },
  { date: "2026-03-03", level: "medium", hints: ["Sand and heat, little water.", "Camels cross it.", "The Sahara is one."], target: "desert" },
  { date: "2026-03-03", level: "hard", hints: ["Frozen, treeless plains.", "Where reindeer roam.", "Northern Canada has it."], target: "tundra" },
  // Wed 3/4: Places
  { date: "2026-03-04", level: "easy", hints: ["Bigger than a village.", "Where you might have a main street.", "A small city."], target: "town" },
  { date: "2026-03-04", level: "medium", hints: ["A huge city.", "New York is one.", "Skyscrapers and millions."], target: "metropolis" },
  { date: "2026-03-04", level: "hard", hints: ["A tiny village.", "Smaller than a town.", "Shakespeare's birthplace was one."], target: "hamlet" },
];
