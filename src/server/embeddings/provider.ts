/**
 * Abstraction for embeddings. Swap providers (OpenAI, local, etc.) without changing callers.
 */

export interface EmbeddingsProvider {
  embed(text: string): Promise<number[]>;
  embedBatch?(texts: string[]): Promise<number[][]>;
}
