/**
 * Daily puzzle catalog. Hints are written to sound human and natural—
 * short, specific, like how you'd describe a word to a friend. No robotic or AI phrasing.
 */

export type PuzzleDifficulty = "normal" | "hard";

export interface DailyPuzzleDef {
  date: string; // YYYY-MM-DD
  hints: [string, string]; // first hint, second hint (progressive)
  /** Optional riddle-style, harder hints for hard days. When set, used instead of hints. */
  hintsRiddle?: [string, string];
  target: string;
  /** Hard days (e.g. Wednesdays) use harder words and vaguer hints. */
  difficulty?: PuzzleDifficulty;
}

/**
 * Seed list for daily puzzles. Add more entries or generate from a seed for production.
 * Hint style: straightforward, concrete. How you'd say it to a friend—no extra flourish or AI-ish phrasing.
 */
export const dailyPuzzles: DailyPuzzleDef[] = [
  {
    date: "2026-02-22",
    hints: [
      "What's left when the last car pulls away and the door closes.",
      "When the house is quiet and you can finally hear yourself think.",
    ],
    target: "peace",
  },
  {
    date: "2026-02-23",
    hints: [
      "When the world won't hold still.",
      "That moment right before you're sure you're gonna be sick.",
    ],
    target: "nausea",
  },
  {
    date: "2026-02-24",
    hints: [
      "Someone who fills the room before they've said a word.",
      "They mean well but never know when to leave.",
    ],
    target: "overbearing",
  },
  {
    date: "2026-02-25",
    hints: [
      "When the thing you need is hiding in plain sight.",
      "You've said it three different ways and they still don't get it.",
    ],
    hintsRiddle: [
      "It lives in the gap between what you want and what you get.",
      "The tighter you hold it, the more it grows.",
    ],
    target: "frustration",
    difficulty: "hard",
  },
  {
    date: "2026-02-26",
    hints: [
      "The smell of rain on hot pavement.",
      "That first drop and the way the air changes.",
    ],
    target: "petrichor",
  },
  {
    date: "2026-02-27",
    hints: [
      "When your body says stop but your brain says replay.",
      "So tired you can't sleep, mind still running.",
    ],
    target: "exhaustion",
  },
  {
    date: "2026-02-28",
    hints: [
      "The look on their face when it finally clicks.",
      "That moment the puzzle piece slides into place.",
    ],
    target: "understanding",
  },
  {
    date: "2026-03-01",
    hints: [
      "When you know you're right but nobody's listening.",
      "When the thing you need is hiding in plain sight.",
    ],
    target: "frustration",
  },
  {
    date: "2026-03-02",
    hints: [
      "Making room for someone who used up all of it.",
      "Letting it go even when they don't deserve it.",
    ],
    target: "forgiveness",
  },
  {
    date: "2026-03-03",
    hints: [
      "When 'one more' never means one more.",
      "One more post, one more video, just a few more minutes.",
    ],
    target: "addiction",
  },
  {
    date: "2026-03-04",
    hints: [
      "What's left when the noise fades.",
      "Not the moment it starts, but the one right after.",
    ],
    hintsRiddle: [
      "Not the absence of sound—the space it leaves behind.",
      "You notice it most when it breaks.",
    ],
    target: "silence",
    difficulty: "hard",
  },
];
