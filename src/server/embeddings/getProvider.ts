import type { EmbeddingsProvider } from "./provider";
import { OpenAIEmbeddingsProvider } from "./openai";

let provider: EmbeddingsProvider | null = null;

export function getEmbeddingsProvider(): EmbeddingsProvider {
  if (!provider) {
    provider = new OpenAIEmbeddingsProvider();
  }
  return provider;
}
