import { z } from 'zod';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import {
  buildResult,
  levelFromScore,
  AI_SUMMARY_AR,
  type AiAnalysisInput,
  type AiAnalysisProvider,
  type AiAnalysisResult,
  type AiSignal,
} from './provider';

/**
 * Adapter for an external, paid deepfake-detection API.
 *
 * Connecting a real vendor is a configuration change:
 *
 *   AI_ANALYSIS_PROVIDER=http
 *   AI_ANALYSIS_API_URL=https://vendor.example/v1/analyze
 *   AI_ANALYSIS_API_KEY=...
 *
 * The adapter posts the signals we already computed (never the raw video, so
 * customer documentation does not leave our infrastructure by default) and
 * expects a small, vendor-neutral JSON shape back. If a particular vendor needs
 * the file itself or a different payload, this is the single file to change.
 *
 * Any failure downgrades to INCONCLUSIVE rather than failing the verification:
 * a vendor outage must never turn a genuine documentation video into a warning.
 */

const responseSchema = z.object({
  /** 0..100, higher = more indicators of synthetic/manipulated media. */
  score: z.number().min(0).max(100),
  signals: z
    .array(
      z.object({
        key: z.string(),
        label: z.string().optional(),
        strength: z.number().min(0).max(1),
        weight: z.number().min(0).max(1).optional(),
        note: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

export class HttpAiProvider implements AiAnalysisProvider {
  readonly name: string;

  constructor(private readonly url = env().AI_ANALYSIS_API_URL!) {
    this.name = `http:${safeHost(url)}`;
  }

  async analyze(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env().AI_ANALYSIS_TIMEOUT_MS);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(env().AI_ANALYSIS_API_KEY
            ? { authorization: `Bearer ${env().AI_ANALYSIS_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          durationSeconds: input.durationSeconds,
          filesize: input.filesize,
          metadata: input.metadata,
          frameSignals: input.frameSignals,
          framePerceptualHashes: input.frames.map((f) => f.h),
          audioStats: input.audio?.stats ?? null,
          audioPresent: input.audio?.present ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(`استجابة غير ناجحة من مزود التحليل: ${response.status}`);
      }

      const parsed = responseSchema.parse(await response.json());

      const signals: AiSignal[] = parsed.signals.map((s) => ({
        key: s.key,
        labelAr: s.label ?? s.key,
        strength: s.strength,
        weight: s.weight ?? 1,
        noteAr: s.note ?? '',
      }));

      const level = levelFromScore(parsed.score, false);
      return {
        provider: this.name,
        score: Number(parsed.score.toFixed(2)),
        level,
        signals,
        summaryAr: AI_SUMMARY_AR[level],
        degraded: false,
        analyzedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn('ai_provider_failed', { provider: this.name, err });
      return buildResult({
        provider: this.name,
        degraded: true,
        signals: [
          {
            key: 'provider_unavailable',
            labelAr: 'مزود التحليل',
            strength: 0,
            weight: 1,
            noteAr: 'تعذر الوصول إلى مزود تحليل الذكاء الاصطناعي أثناء هذا الفحص.',
          },
        ],
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}
