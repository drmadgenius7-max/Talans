import type { VerificationResult } from '@prisma/client';
import type { AiAnalysisResult } from './ai/provider';
import { SimilarityThresholds, type SimilarityReport } from './similarity';

/**
 * The verdict engine.
 *
 * This is where the system's core principle is enforced in code: **authenticity
 * is proven by matching the file against the original registered with Athar,
 * not by AI detection.**
 *
 * Consequences encoded below:
 *
 *  - A SHA-256 match is decisive and short-circuits everything else. No AI
 *    signal, no metadata oddity, and no similarity score can downgrade it.
 *  - AI signals never *create* a negative verdict. At most they can hold a
 *    borderline case back from CONTENT_MATCH into "تعذر التأكد".
 *  - Missing or degraded analysis resolves to "تعذر التأكد", never to a
 *    negative result. Not knowing is not the same as not matching.
 *  - The word "مزيف" appears nowhere in any customer-facing string.
 */

export type VerdictInput = {
  hashMatch: boolean;
  similarity: SimilarityReport | null;
  audioSimilarity: number | null;
  durationDelta: number | null;
  ai: AiAnalysisResult | null;
  /** True when ffmpeg/analysis could not run at all. */
  analysisDegraded: boolean;
  /** Set when the original documentation has no stored fingerprints yet. */
  originalNotProcessed: boolean;
};

export type ConfidenceFactor = {
  key: string;
  labelAr: string;
  /** 0..100 contribution score for this factor. */
  score: number;
  /** Relative importance. */
  weight: number;
  /** True when the factor could not be evaluated. */
  unavailable: boolean;
  detailAr: string;
};

export type Verdict = {
  result: VerificationResult;
  /** 0..100 */
  confidence: number;
  titleAr: string;
  messageAr: string;
  /** Traffic-light colour for the UI. */
  tone: 'success' | 'warning' | 'danger';
  badgeAr: string;
  factors: ConfidenceFactor[];
  /** Extra guidance shown under the headline, e.g. the WhatsApp explanation. */
  hintAr?: string;
};

const COPY: Record<
  VerificationResult,
  { title: string; message: string; badge: string; tone: Verdict['tone'] }
> = {
  VERIFIED_ORIGINAL: {
    title: 'مطابق 100% للملف الأصلي',
    message:
      'البصمة الرقمية للملف الذي رفعته مطابقة تمامًا للنسخة الأصلية المسجلة لدى متجر أثر.',
    badge: 'توثيق أصلي مسجل لدى متجر أثر',
    tone: 'success',
  },
  VERIFIED_CONTENT_MATCH: {
    title: 'الفيديو يبدو نسخة معاد ضغطها أو معالجتها من التوثيق الأصلي',
    message:
      'الملف ليس مطابقًا رقميًا للنسخة الأصلية، ولكنه يتطابق معها بدرجة عالية من حيث المحتوى.',
    badge: 'مطابقة في المحتوى',
    tone: 'success',
  },
  UNABLE_TO_VERIFY: {
    title: 'لم نتمكن من تأكيد مطابقة الملف بشكل كامل',
    message:
      'لم تكفِ المعطيات المتاحة لتأكيد أن هذا الملف هو نفسه التوثيق المسجل لدينا. قد يكون الملف مقصوصًا بشدة أو منخفض الجودة أو غير مكتمل.',
    badge: 'تعذر التأكد الكامل',
    tone: 'warning',
  },
  NO_MATCH: {
    title: 'الملف لا يتطابق مع التوثيق الأصلي المرتبط بهذا الطلب',
    message:
      'محتوى الملف الذي رفعته يختلف عن التوثيق المسجل لدى متجر أثر لهذا الطلب. تأكد من أنك رفعت الملف الصحيح المرتبط برقم الطلب.',
    badge: 'لا يتطابق مع التوثيق',
    tone: 'danger',
  },
  ERROR: {
    title: 'تعذر إكمال الفحص',
    message: 'حدث خطأ فني أثناء فحص الملف. حاول مرة أخرى، وإذا تكرر الأمر تواصل مع خدمة العملاء.',
    badge: 'خطأ في الفحص',
    tone: 'warning',
  },
};

const RECOMPRESSION_HINT =
  'قد تختلف البصمة الرقمية إذا تم إرسال الفيديو عبر واتساب أو تيليجرام أو إعادة حفظه من معرض الصور، ' +
  'لأن هذه التطبيقات تعيد ضغط الملف. لذلك يستخدم النظام تحليل التشابه بين المحتوى إضافةً إلى البصمة.';

export function decideVerdict(input: VerdictInput): Verdict {
  const factors = buildFactors(input);

  // ---- Rule 1: an exact fingerprint match is decisive. --------------------
  if (input.hashMatch) {
    return {
      result: 'VERIFIED_ORIGINAL',
      confidence: 100,
      ...text('VERIFIED_ORIGINAL'),
      factors,
    };
  }

  // ---- Rule 2: we cannot judge content without a processed original. ------
  if (input.originalNotProcessed || input.analysisDegraded || !input.similarity || input.similarity.insufficientData) {
    return {
      result: 'UNABLE_TO_VERIFY',
      confidence: clampScore(weightedConfidence(factors) * 0.6),
      ...text('UNABLE_TO_VERIFY'),
      factors,
      hintAr: RECOMPRESSION_HINT,
    };
  }

  const similarity = input.similarity.score;

  // ---- Rule 3: strong content match. --------------------------------------
  if (similarity >= SimilarityThresholds.CONTENT_MATCH) {
    // AI indicators can only hold a borderline case back — they never flip a
    // match into a negative result, and they cannot touch a picture match that
    // is strong on its own.
    const strongAiSignals =
      input.ai?.level === 'SOME_SIGNALS' &&
      (input.ai?.score ?? 0) >= 65 &&
      similarity < SimilarityThresholds.STRONG_CONTENT_MATCH;

    // Note there is deliberately no audio veto here. `compareAudioFingerprints`
    // only ever returns positive evidence — it reports `null` rather than a low
    // score when agreement is indistinguishable from chance — because a muted,
    // heavily re-encoded, or re-dubbed copy says nothing about whether the
    // footage is the registered documentation. Audio raises confidence; it
    // never overturns the picture.
    if (strongAiSignals) {
      return {
        result: 'UNABLE_TO_VERIFY',
        confidence: confidenceFor('UNABLE_TO_VERIFY', input, factors),
        ...text('UNABLE_TO_VERIFY'),
        factors,
        hintAr: RECOMPRESSION_HINT,
      };
    }

    return {
      result: 'VERIFIED_CONTENT_MATCH',
      confidence: confidenceFor('VERIFIED_CONTENT_MATCH', input, factors),
      ...text('VERIFIED_CONTENT_MATCH'),
      factors,
      hintAr: RECOMPRESSION_HINT,
    };
  }

  // ---- Rule 4: clearly different footage. ---------------------------------
  if (similarity < SimilarityThresholds.NO_MATCH) {
    return {
      result: 'NO_MATCH',
      confidence: confidenceFor('NO_MATCH', input, factors),
      ...text('NO_MATCH'),
      factors,
    };
  }

  // ---- Rule 5: the uncertain band in between. -----------------------------
  return {
    result: 'UNABLE_TO_VERIFY',
    confidence: confidenceFor('UNABLE_TO_VERIFY', input, factors),
    ...text('UNABLE_TO_VERIFY'),
    factors,
    hintAr: RECOMPRESSION_HINT,
  };
}

/**
 * How confident we are in *the result we just stated* — not how close the file
 * came to being byte-identical.
 *
 * The distinction matters. A WhatsApp re-compression has a different SHA-256 by
 * definition; counting that mismatch against the confidence of a
 * VERIFIED_CONTENT_MATCH verdict would report ~40% for a case we are actually
 * quite sure about, and the number would read as doubt to the customer. So the
 * hash factor is excluded wherever a mismatch is expected, and a NO_MATCH
 * verdict is scored on how *strongly* the content differs.
 */
function confidenceFor(
  result: VerificationResult,
  input: VerdictInput,
  factors: ConfidenceFactor[],
): number {
  const pick = (keys: string[]) => factors.filter((f) => keys.includes(f.key));

  switch (result) {
    case 'VERIFIED_ORIGINAL':
      return 100;

    case 'VERIFIED_CONTENT_MATCH': {
      // Content evidence only; a differing hash is the expected condition here.
      const base = weightedConfidence(
        pick(['video_similarity', 'frame_analysis', 'audio_similarity', 'duration']),
      );
      // Having decided the content matches, the floor reflects that decision.
      return clampScore(Math.max(70, base));
    }

    case 'NO_MATCH': {
      // Confidence that the file does NOT match: the further below the
      // no-match threshold the content sits, the surer we are.
      const similarity = input.similarity?.score ?? 0;
      const distance = (SimilarityThresholds.NO_MATCH - similarity) / SimilarityThresholds.NO_MATCH;
      return clampScore(60 + Math.max(0, Math.min(1, distance)) * 39);
    }

    default: {
      // "تعذر التأكد" is genuinely middling by construction; reporting a high
      // number next to an uncertain verdict would be self-contradictory.
      const base = weightedConfidence(
        pick(['video_similarity', 'frame_analysis', 'audio_similarity', 'duration']),
      );
      return clampScore(Math.min(65, Math.max(20, base)));
    }
  }
}

function text(result: VerificationResult) {
  const copy = COPY[result];
  return {
    titleAr: copy.title,
    messageAr: copy.message,
    badgeAr: copy.badge,
    tone: copy.tone,
  };
}

/**
 * The factors behind the displayed confidence score.
 *
 * Exposed to the customer so the number is explainable rather than magic:
 * "درجة التحقق مبنية على مطابقة البصمة، وتشابه الفيديو، وتشابه الصوت، والبيانات
 * التقنية، وتحليل الإطارات، ومؤشرات الذكاء الاصطناعي."
 */
function buildFactors(input: VerdictInput): ConfidenceFactor[] {
  const factors: ConfidenceFactor[] = [];

  factors.push({
    key: 'hash_match',
    labelAr: 'مطابقة البصمة الرقمية',
    score: input.hashMatch ? 100 : 0,
    weight: 5,
    unavailable: false,
    detailAr: input.hashMatch
      ? 'بصمة SHA-256 مطابقة تمامًا للنسخة الأصلية.'
      : 'بصمة SHA-256 مختلفة عن النسخة الأصلية — أمر متوقع بعد إعادة الضغط.',
  });

  const sim = input.similarity;
  factors.push({
    key: 'video_similarity',
    labelAr: 'تشابه محتوى الفيديو',
    score: sim && !sim.insufficientData ? sim.score : 0,
    weight: 3,
    unavailable: !sim || sim.insufficientData,
    detailAr:
      sim && !sim.insufficientData
        ? `تطابق ${sim.matchedFrames} من ${sim.candidateFrameCount} إطارًا مع التوثيق الأصلي.`
        : 'تعذر استخراج إطارات كافية للمقارنة.',
  });

  // Audio is corroborating evidence only, and the confidence score has to be
  // consistent with that: a weak-but-measurable audio score must not drag down
  // a verdict that audio was never allowed to influence in the first place. It
  // counts toward confidence when it agrees, and is reported as "غير متاح"
  // otherwise — which is the honest reading of a fingerprint that could not
  // establish a match.
  const audioCorroborates = input.audioSimilarity != null && input.audioSimilarity >= 0.5;
  factors.push({
    key: 'audio_similarity',
    labelAr: 'تشابه الصوت',
    score: audioCorroborates ? input.audioSimilarity! * 100 : 0,
    weight: 1.5,
    unavailable: !audioCorroborates,
    detailAr: audioCorroborates
      ? `البصمة الصوتية تطابق النسخة الأصلية بدرجة ${Math.round(input.audioSimilarity! * 100)}%.`
      : input.audioSimilarity != null
        ? 'لم تكفِ البصمة الصوتية لتأكيد التطابق — قد يكون الصوت أُعيد ترميزه بجودة منخفضة أو استُبدل.'
        : 'لا يوجد مسار صوتي قابل للمقارنة في أحد الملفين.',
  });

  factors.push({
    key: 'duration',
    labelAr: 'مطابقة المدة',
    score: input.durationDelta != null ? Math.max(0, 100 - input.durationDelta * 400) : 0,
    weight: 1,
    unavailable: input.durationDelta == null,
    detailAr:
      input.durationDelta != null
        ? `فرق المدة عن النسخة الأصلية ${(input.durationDelta * 100).toFixed(1)}%.`
        : 'مدة أحد الملفين غير معروفة.',
  });

  factors.push({
    key: 'frame_analysis',
    labelAr: 'تحليل الإطارات',
    score: sim && !sim.insufficientData ? Math.min(100, sim.sequenceScore) : 0,
    weight: 1,
    unavailable: !sim || sim.insufficientData,
    detailAr:
      sim && !sim.insufficientData
        ? `أفضل محاذاة زمنية بين الملفين عند إزاحة ${sim.bestOffsetSeconds} ثانية.`
        : 'تحليل الإطارات غير متاح.',
  });

  const ai = input.ai;
  factors.push({
    key: 'ai_signals',
    labelAr: 'مؤشرات الذكاء الاصطناعي',
    // Inverted: a high AI risk score lowers confidence.
    score: ai && !ai.degraded ? Math.max(0, 100 - ai.score) : 0,
    weight: 0.75,
    unavailable: !ai || ai.degraded,
    detailAr: ai ? ai.summaryAr : 'تحليل مؤشرات الذكاء الاصطناعي غير متاح لهذا الفحص.',
  });

  return factors;
}

function weightedConfidence(factors: ConfidenceFactor[]): number {
  const usable = factors.filter((f) => !f.unavailable);
  if (usable.length === 0) return 0;
  const totalWeight = usable.reduce((acc, f) => acc + f.weight, 0);
  const weighted = usable.reduce((acc, f) => acc + f.score * f.weight, 0);
  return weighted / totalWeight;
}

function clampScore(value: number): number {
  return Number(Math.min(100, Math.max(0, value)).toFixed(1));
}

/** Customer-facing label for a stored result, used by history views. */
export function resultCopy(result: VerificationResult) {
  return COPY[result];
}

export const CONFIDENCE_EXPLANATION_AR =
  'درجة التحقق محسوبة من عدة عوامل: مطابقة البصمة الرقمية، وتشابه محتوى الفيديو، ' +
  'وتشابه الصوت، ومطابقة المدة، وتحليل الإطارات، ومؤشرات الذكاء الاصطناعي.';
