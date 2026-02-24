/**
 * Download a common English word list and write to data/vocabulary.txt.
 * Run: npm run fetch-vocabulary
 *
 * Uses: https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt
 * (alphabetic words only). We take 50k words spread across the whole list so common
 * words like "spin", "water", "sit" (later in the alphabet) are included.
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";
const MAX_WORDS = 50_000;
const MIN_LEN = 2;
const MAX_LEN = 20;

async function main() {
  console.log("Fetching word list...");
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  const allValid: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const w = line.trim().toLowerCase();
    if (w.length < MIN_LEN || w.length > MAX_LEN) continue;
    if (!/^[a-z'-]+$/.test(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    allValid.push(w);
  }
  // Sample 50k evenly across the full list for precompute (embeddings + percentile distribution)
  const words: string[] = [];
  if (allValid.length <= MAX_WORDS) {
    words.push(...allValid);
  } else {
    const step = allValid.length / MAX_WORDS;
    for (let i = 0; i < MAX_WORDS; i++) {
      words.push(allValid[Math.floor(i * step)]!);
    }
  }
  const dataDir = join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });

  const vocabPath = join(dataDir, "vocabulary.txt");
  await writeFile(vocabPath, words.join("\n"), "utf-8");
  console.log(`Wrote ${words.length} words to ${vocabPath} (sampled from ${allValid.length} valid)`);

  // Full list for validation: allow any real word, reject non-words (faint, fall, etc. included)
  const validWordsPath = join(dataDir, "valid-words.txt");
  await writeFile(validWordsPath, allValid.join("\n"), "utf-8");
  console.log(`Wrote ${allValid.length} words to ${validWordsPath} (full dictionary for validation)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
