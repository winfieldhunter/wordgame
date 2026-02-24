/**
 * Daily puzzle catalog. Three puzzles per date (easy, medium, hard).
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
 */
export const dailyPuzzles: DailyPuzzleDef[] = [
  { date: "2026-02-22", level: "easy", hints: ["What's left when the last car pulls away.", "When the house is quiet and you can hear yourself think.", "The opposite of chaos or war."], target: "peace" },
  { date: "2026-02-22", level: "medium", hints: ["What's left when the last car pulls away and the door closes.", "When the house is quiet and you can finally hear yourself think.", "A feeling of calm when everyone has left."], target: "peace" },
  { date: "2026-02-22", level: "hard", hints: ["It lives in the space after the door closes.", "You notice it most when the house is empty.", "Not silence—the feeling that goes with it."], target: "peace" },
  { date: "2026-02-23", level: "easy", hints: ["When your stomach feels wrong.", "That moment before you might get sick.", "Something that makes you feel queasy."], target: "nausea" },
  { date: "2026-02-23", level: "medium", hints: ["When the world won't hold still.", "That moment right before you're sure you're gonna be sick.", "The feeling that makes you want to lie down."], target: "nausea" },
  { date: "2026-02-23", level: "hard", hints: ["The body's revolt against motion.", "Not quite sickness but the promise of it.", "What spins when you close your eyes."], target: "nausea" },
  { date: "2026-02-24", level: "easy", hints: ["Someone who takes up a lot of space.", "They don't know when to leave.", "A person who's too much."], target: "overbearing" },
  { date: "2026-02-24", level: "medium", hints: ["Someone who fills the room before they've said a word.", "They mean well but never know when to leave.", "Too much presence, too little boundary."], target: "overbearing" },
  { date: "2026-02-24", level: "hard", hints: ["They enter and the air changes.", "Good intentions that crowd everyone out.", "The weight of their attention."], target: "overbearing" },
  { date: "2026-02-25", level: "easy", hints: ["When you can't get what you want.", "When they still don't get it after you explained.", "That feeling when something is stuck."], target: "frustration" },
  { date: "2026-02-25", level: "medium", hints: ["When you're waiting and it's not coming.", "That feeling when the line won't move.", "Wanting things to hurry up."], target: "impatience" },
  { date: "2026-02-25", level: "hard", hints: ["It lives in the gap between what you want and what you get.", "The tighter you hold it, the more it grows.", "Not anger yet—the build before it."], target: "exasperation" },
  { date: "2026-02-26", level: "easy", hints: ["A smell in the air.", "What you notice after rain on hot ground.", "That earthy scent when rain first falls."], target: "petrichor" },
  { date: "2026-02-26", level: "medium", hints: ["The smell of rain on hot pavement.", "That first drop and the way the air changes.", "The scent of wet earth after a dry spell."], target: "petrichor" },
  { date: "2026-02-26", level: "hard", hints: ["Not the rain itself—what the rain releases.", "Named for stone and the fluid of the gods.", "The smell that says storm has passed."], target: "petrichor" },
  { date: "2026-02-27", level: "easy", hints: ["When you're out of energy.", "When your body says stop.", "Too tired to keep going."], target: "exhaustion" },
  { date: "2026-02-27", level: "medium", hints: ["When your body says stop but your brain says replay.", "So tired you can't sleep, mind still running.", "Drained past the point of rest."], target: "exhaustion" },
  { date: "2026-02-27", level: "hard", hints: ["The tank is empty but the engine won't quit.", "Sleep would help if you could reach it.", "What's left when you've given everything."], target: "exhaustion" },
  { date: "2026-02-28", level: "easy", hints: ["When something finally makes sense.", "The look when they get it.", "When the puzzle piece fits."], target: "understanding" },
  { date: "2026-02-28", level: "medium", hints: ["The look on their face when it finally clicks.", "That moment the puzzle piece slides into place.", "When explanation turns into recognition."], target: "understanding" },
  { date: "2026-02-28", level: "hard", hints: ["Not knowledge—the moment knowledge lands.", "The face they make when the penny drops.", "What passes between two people when they align."], target: "understanding" },
  { date: "2026-03-01", level: "easy", hints: ["When nobody listens.", "When you're right but they don't care.", "That stuck feeling when you're ignored."], target: "frustration" },
  { date: "2026-03-01", level: "medium", hints: ["When they don't take you seriously.", "When you're brushed off or overlooked.", "The feeling of being dismissed."], target: "dismissal" },
  { date: "2026-03-01", level: "hard", hints: ["They have the answer and still don't hear you.", "The wall is not brick—it's attention.", "What grows when clarity is refused."], target: "resentment" },
  { date: "2026-03-02", level: "easy", hints: ["Letting go of a wrong.", "Making room for someone who hurt you.", "When you choose not to hold a grudge."], target: "forgiveness" },
  { date: "2026-03-02", level: "medium", hints: ["Making room for someone who used up all of it.", "Letting it go even when they don't deserve it.", "The choice to release the debt."], target: "forgiveness" },
  { date: "2026-03-02", level: "hard", hints: ["You don't forget; you stop making them pay.", "The gift that costs the giver most.", "What remains when resentment leaves."], target: "forgiveness" },
  { date: "2026-03-03", level: "easy", hints: ["When you can't stop doing something.", "One more video, one more scroll.", "When 'one more' never means one."], target: "addiction" },
  { date: "2026-03-03", level: "medium", hints: ["When 'one more' never means one more.", "One more post, one more video, just a few more minutes.", "The loop that feels like choice until it doesn't."], target: "addiction" },
  { date: "2026-03-03", level: "hard", hints: ["The brain learns to want what hurts it.", "Not habit—when habit becomes need.", "What keeps you coming back after the high fades."], target: "addiction" },
  { date: "2026-03-04", level: "easy", hints: ["When there's no sound.", "What's left when the noise stops.", "The opposite of noise."], target: "silence" },
  { date: "2026-03-04", level: "medium", hints: ["What's left when the noise fades.", "Not the moment it starts, but the one right after.", "The space between sounds."], target: "silence" },
  { date: "2026-03-04", level: "hard", hints: ["Not the absence of sound—the space it leaves behind.", "You notice it most when it breaks.", "What fills the room when everyone stops talking."], target: "silence" },
];
