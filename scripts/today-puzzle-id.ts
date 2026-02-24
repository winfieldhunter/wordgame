/**
 * Print today's puzzle ID (same logic as getTodayPuzzleId). Used by CI to know which file was built.
 * Run: npx tsx scripts/today-puzzle-id.ts
 */
import { getTodayPuzzleId } from "../src/server/puzzles/puzzleId";
console.log(getTodayPuzzleId());
