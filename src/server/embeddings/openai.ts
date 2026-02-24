import OpenAI from "openai";
import type { EmbeddingsProvider } from "./provider";

const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 500;

export class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY is required for OpenAIEmbeddingsProvider");
    }
    this.client = new OpenAI({ apiKey: key });
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: MODEL,
      input: text.trim(),
    });
    return res.data[0]?.embedding ?? [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const chunk = texts.slice(i, i + BATCH_SIZE);
      const res = await this.client.embeddings.create({
        model: MODEL,
        input: chunk.map((t) => t.trim()),
      });
      const ordered = chunk.map((_, idx) => res.data[idx]?.embedding ?? []);
      results.push(...ordered);
    }
    return results;
  }
}

export function createEmbeddingsProvider(): EmbeddingsProvider {
  return new OpenAIEmbeddingsProvider();
}
