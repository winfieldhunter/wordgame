/**
 * Precompute embeddings for vocabulary and per-puzzle similarity distributions.
 * Not run during Vercel build; run locally or in CI, then use committed cache or blob storage.
 *
 * Run: npm run precompute [-- --today | --from YYYY-MM-DD --to YYYY-MM-DD] [--output-dir <dir>]
 *
 * Writes:
 *   .cache/embeddings.jsonl  — one JSON object per line: { "word": string, "embedding": number[] }
 *   .cache/puzzles/<puzzleId>.json — { sortedBySimilarity, targetEmbedding }
 *   If --output-dir is set (e.g. data/puzzle-cache), also writes puzzle JSONs there for committing.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { readFileSync } from "fs";
import { join } from "path";
import { createReadStream } from "fs";

// Load .env.local so OPENAI_API_KEY is available
try {
  const envPath = join(process.cwd(), ".env.local");
  const env = readFileSync(envPath, "utf-8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // .env.local optional for other env sources
}
import { createInterface } from "readline";
import { OpenAIEmbeddingsProvider } from "../src/server/embeddings/openai";
import { cosineSimilarity } from "../src/server/scoring/scoring";
import type { SortedSimilarityEntry } from "../src/server/scoring/scoring";
import { getPuzzleForDate, getPuzzleById } from "../src/server/puzzles/catalog";
import { getTodayPuzzleIds } from "../src/server/puzzles/puzzleId";

const LEVELS = ["easy", "medium", "hard"] as const;

const CACHE_DIR = join(process.cwd(), ".cache");
const EMBEDDINGS_PATH = join(CACHE_DIR, "embeddings.jsonl");
const PUZZLES_DIR = join(CACHE_DIR, "puzzles");

async function loadVocabulary(path: string): Promise<string[]> {
  const raw = await readFile(path, "utf-8");
  const words = raw
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0 && /^[a-z'-]+$/.test(w));
  return [...new Set(words)];
}

async function loadCachedEmbeddings(): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  try {
    const stream = createReadStream(EMBEDDINGS_PATH, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as { word?: string; embedding?: number[] };
        if (obj.word && Array.isArray(obj.embedding)) map.set(obj.word, obj.embedding);
      } catch {
        // skip bad lines
      }
    }
  } catch {
    // file missing
  }
  return map;
}

async function appendEmbedding(word: string, embedding: number[]): Promise<void> {
  await writeFile(EMBEDDINGS_PATH, JSON.stringify({ word, embedding }) + "\n", {
    flag: "a",
  });
}

async function main() {
  const args = process.argv.slice(2);
  let todayOnly = false;
  let fromDate: string | null = null;
  let toDate: string | null = null;
  let vocabPath = join(process.cwd(), "data", "vocabulary.txt");
  let outputDir: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--today") todayOnly = true;
    if (args[i] === "--from" && args[i + 1]) fromDate = args[++i];
    if (args[i] === "--to" && args[i + 1]) toDate = args[++i];
    if (args[i] === "--output-dir" && args[i + 1]) {
      const v = args[++i]!;
      outputDir = v.startsWith("/") || /^[A-Za-z]:/.test(v) ? v : join(process.cwd(), v);
    }
    if ((args[i] === "--vocab" || args[i] === "-v") && args[i + 1]) {
      const v = args[++i];
      vocabPath = v.startsWith("/") || /^[A-Za-z]:/.test(v) ? v : join(process.cwd(), v);
    }
  }
  let words: string[] = [];
  try {
    words = await loadVocabulary(vocabPath);
    console.log(`Loaded ${words.length} words from ${vocabPath}`);
  } catch (e) {
    console.warn("No vocabulary.txt found. Run with a small vocab for testing.");
    words = ["peace", "calm", "quiet", "serenity", "tranquil", "relax", "stress", "chaos", "noise"];
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(PUZZLES_DIR, { recursive: true });

  const provider = new OpenAIEmbeddingsProvider();
  const cached = await loadCachedEmbeddings();
  const toEmbed = words.filter((w) => !cached.has(w));
  if (toEmbed.length > 0) {
    console.log(`Embedding ${toEmbed.length} new words...`);
    const batchSize = 500;
    for (let i = 0; i < toEmbed.length; i += batchSize) {
      const chunk = toEmbed.slice(i, i + batchSize);
      const embeddings = await provider.embedBatch!(chunk);
      for (let j = 0; j < chunk.length; j++) {
        await appendEmbedding(chunk[j], embeddings[j] ?? []);
        cached.set(chunk[j], embeddings[j] ?? []);
      }
      console.log(`  ${Math.min(i + batchSize, toEmbed.length)} / ${toEmbed.length}`);
    }
  }

  const puzzleIds: string[] = [];
  if (todayOnly) {
    const ids = getTodayPuzzleIds();
    for (const level of LEVELS) {
      const id = ids[level];
      if (getPuzzleById(id)) puzzleIds.push(id);
    }
  } else if (fromDate && toDate) {
    const [fy, fm, fd] = fromDate.split("-").map(Number);
    const [ty, tm, td] = toDate.split("-").map(Number);
    const start = new Date(Date.UTC(fy, fm - 1, fd));
    const end = new Date(Date.UTC(ty, tm - 1, td));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      for (const level of LEVELS) {
        const p = getPuzzleForDate(new Date(d), level);
        if (p) puzzleIds.push(p.puzzleId);
      }
    }
  } else {
    puzzleIds.push("dev-0001");
    const ids = getTodayPuzzleIds();
    for (const level of LEVELS) {
      if (getPuzzleById(ids[level])) puzzleIds.push(ids[level]);
    }
  }

  for (const puzzleId of puzzleIds) {
    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle) continue;
    console.log(`Precomputing puzzle ${puzzleId} (target: ${puzzle.target})...`);

    let targetEmbedding = cached.get(puzzle.target);
    if (!targetEmbedding) {
      targetEmbedding = await provider.embed(puzzle.target);
      await appendEmbedding(puzzle.target, targetEmbedding);
      cached.set(puzzle.target, targetEmbedding);
    }

    const sorted: SortedSimilarityEntry[] = [];
    for (const word of words) {
      const vec = cached.get(word);
      if (!vec || vec.length === 0) continue;
      const cosine = cosineSimilarity(vec, targetEmbedding);
      sorted.push({ word, cosine });
    }
    sorted.sort((a, b) => b.cosine - a.cosine);

    const payload = JSON.stringify({
      sortedBySimilarity: sorted,
      targetEmbedding,
    });
    const outPath = join(PUZZLES_DIR, `${puzzleId}.json`);
    await writeFile(outPath, payload);
    console.log(`  Wrote ${outPath} (${sorted.length} entries)`);
    if (outputDir) {
      await mkdir(outputDir, { recursive: true });
      const exportPath = join(outputDir, `${puzzleId}.json`);
      await writeFile(exportPath, payload);
      console.log(`  Exported ${exportPath}`);
    }
  }

  console.log("Precompute done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
