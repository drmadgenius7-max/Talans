import type { VideoTechnicalMetadata } from '@/lib/media/ffprobe';
import type { FrameFingerprint, FrameSignals } from '@/lib/media/frames';
import type { AudioFingerprint } from '@/lib/media/audio';

/**
 * AI Media Analysis — provider contract.
 *
 * Deliberately isolated behind an interface so that a commercial deepfake
 * detection API can be connected later by adding one adapter, without touching
 * the verification pipeline, the database, or the UI.
 *
 * A hard rule holds across every implementation: this module produces
 * *indicators*, never verdicts. Athar's proof of authenticity is the SHA-256
 * match against the original registered file. AI analysis only ever adds
 * context to that, and its output must never be phrased as certainty.
 */

export type AiRiskLevel = 'NO_STRONG_SIGNALS' | 'SOME_SIGNALS' | 'INCONCLUSIVE';

export type AiSignal = {
  /** Stable machine key, e.g. "temporal_inconsistency". */
  key: string;
  /** Arabic label shown in the technical report. */
  labelAr: string;
  /** 0..1 — how strongly this particular signal fired. */
  strength: number;
  /** 0..1 — how much this signal should influence the total. */
  weight: number;
  /** Short Arabic explanation of what was observed. */
  noteAr: string;
};

export type AiAnalysisInput = {
  /** Local path to the media file, when the provider needs the bytes. */
  filePath?: string;
  metadata: VideoTechnicalMetadata | null;
  frames: FrameFingerprint[];
  frameSignals: FrameSignals | null;
  audio: AudioFingerprint | null;
  durationSeconds: number | null;
  filesize: number | null;
};

export type AiAnalysisResult = {
  provider: string;
  /** 0..100 — higher means MORE indicators of synthetic or manipulated media. */
  score: number;
  level: AiRiskLevel;
  signals: AiSignal[];
  /** Arabic summary, always phrased as an indication and never as proof. */
  summaryAr: string;
  /** True when analysis could not run (missing ffmpeg, provider down, …). */
  degraded: boolean;
  analyzedAt: string;
};

export interface AiAnalysisProvider {
  readonly name: string;
  analyze(input: AiAnalysisInput): Promise<AiAnalysisResult>;
}

/** Score → level. The bands are wide on purpose; we do not want fine claims. */
export function levelFromScore(score: number, degraded: boolean): AiRiskLevel {
  if (degraded) return 'INCONCLUSIVE';
  return score >= 45 ? 'SOME_SIGNALS' : 'NO_STRONG_SIGNALS';
}

/**
 * The only three sentences this system is allowed to say about AI detection.
 *
 * Centralised so no future provider can introduce wording that overclaims.
 */
export const AI_SUMMARY_AR: Record<AiRiskLevel, string> = {
  NO_STRONG_SIGNALS:
    'لم تظهر مؤشرات قوية على التوليد الاصطناعي أو التلاعب في هذا الملف.',
  SOME_SIGNALS:
    'ظهرت بعض المؤشرات التي تستحق المراجعة. هذه المؤشرات ليست إثباتًا على التوليد الاصطناعي.',
  INCONCLUSIVE:
    'لم يكتمل تحليل مؤشرات الذكاء الاصطناعي لهذا الملف، لذلك لا يمكن الاعتماد على نتيجته.',
};

export const AI_DISCLAIMER_AR =
  'تحليل مؤشرات الذكاء الاصطناعي هو أداة مساعدة ولا يمثل إثباتًا قطعيًا بمفرده. ' +
  'يعتمد نظام أثر للتحقق بشكل أساسي على مطابقة الملفات مع التوثيقات الأصلية المسجلة لدينا.';

export function buildResult(input: {
  provider: string;
  signals: AiSignal[];
  degraded: boolean;
}): AiAnalysisResult {
  const totalWeight = input.signals.reduce((acc, s) => acc + s.weight, 0);
  const weighted = input.signals.reduce((acc, s) => acc + s.strength * s.weight, 0);
  const score = totalWeight > 0 ? Number(((weighted / totalWeight) * 100).toFixed(2)) : 0;
  const level = levelFromScore(score, input.degraded);

  return {
    provider: input.provider,
    score,
    level,
    signals: input.signals,
    summaryAr: AI_SUMMARY_AR[level],
    degraded: input.degraded,
    analyzedAt: new Date().toISOString(),
  };
}
