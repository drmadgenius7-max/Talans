import { env } from '@/lib/config/env';
import { HeuristicAiProvider } from './heuristic';
import { HttpAiProvider } from './http';
import { MockAiProvider } from './mock';
import type { AiAnalysisProvider } from './provider';

export * from './provider';
export { HeuristicAiProvider } from './heuristic';
export { HttpAiProvider } from './http';
export { MockAiProvider } from './mock';

const globalForAi = globalThis as unknown as { atharAiProvider?: AiAnalysisProvider };

/** Resolves the configured AI Media Analysis provider. */
export function aiProvider(): AiAnalysisProvider {
  if (globalForAi.atharAiProvider) return globalForAi.atharAiProvider;

  const configured = env().AI_ANALYSIS_PROVIDER;
  const instance: AiAnalysisProvider =
    configured === 'http'
      ? new HttpAiProvider()
      : configured === 'mock'
        ? new MockAiProvider()
        : new HeuristicAiProvider();

  globalForAi.atharAiProvider = instance;
  return instance;
}

/** Test seam — lets a suite install a stub provider. */
export function setAiProvider(provider: AiAnalysisProvider | undefined): void {
  globalForAi.atharAiProvider = provider;
}
