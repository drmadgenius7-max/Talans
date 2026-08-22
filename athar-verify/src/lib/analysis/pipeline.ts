import type { Documentation } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { storage, buildStorageKey } from '@/lib/storage';
import { ffmpegAvailability } from '@/lib/media/ffmpeg';
import { probeFile, type VideoTechnicalMetadata } from '@/lib/media/ffprobe';
import {
  analyzeFrameSignals,
  extractFrameFingerprints,
  generateThumbnail,
  type FrameFingerprint,
  type FrameSignals,
} from '@/lib/media/frames';
import { compareAudioFingerprints, fingerprintAudio, type AudioFingerprint } from '@/lib/media/audio';
import { withStoredObject, withTempDir } from '@/lib/media/tempfile';
import { aiProvider, type AiAnalysisResult } from './ai';
import { compareFrameSequences, durationDelta, type SimilarityReport } from './similarity';
import { decideVerdict, type Verdict } from './verdict';

/**
 * The two long-running operations in the system.
 *
 * `processDocumentation` runs once per uploaded original and builds the
 * reference fingerprints. `runVerificationCheck` runs each time a customer
 * submits a file for comparison.
 *
 * Both are written to be safely retryable: they read their inputs from the
 * database and storage, and write results in a single terminal update.
 */

export type MediaAnalysis = {
  metadata: VideoTechnicalMetadata | null;
  frames: FrameFingerprint[];
  frameSignals: FrameSignals | null;
  audio: AudioFingerprint | null;
  durationSeconds: number | null;
  degraded: boolean;
  degradedReason?: string;
  /** Frames-per-second the fingerprints were sampled at. */
  sampleFps: number | null;
};

/**
 * Full local analysis of one media file. Never throws for missing ffmpeg.
 *
 * `fixedFps` pins the frame sampling rate to the one a registered original was
 * fingerprinted at, so a comparison always happens on a shared time grid.
 */
export async function analyzeMediaFile(
  filePath: string,
  fixedFps?: number | null,
): Promise<MediaAnalysis> {
  const availability = await ffmpegAvailability();

  if (!availability.ffprobe && !availability.ffmpeg) {
    return {
      metadata: null,
      frames: [],
      frameSignals: null,
      audio: null,
      durationSeconds: null,
      degraded: true,
      degradedReason: 'أدوات المعالجة (ffmpeg/ffprobe) غير متاحة على الخادم.',
      sampleFps: null,
    };
  }

  let metadata: VideoTechnicalMetadata | null = null;
  if (availability.ffprobe) {
    try {
      metadata = await probeFile(filePath);
    } catch (err) {
      logger.warn('probe_failed', { err });
    }
  }

  const durationSeconds = metadata?.durationSeconds ?? null;

  let frames: FrameFingerprint[] = [];
  let frameSignals: FrameSignals | null = null;
  let audio: AudioFingerprint | null = null;
  let sampleFps: number | null = null;

  if (availability.ffmpeg) {
    try {
      const extraction = await extractFrameFingerprints(
        filePath,
        durationSeconds,
        undefined,
        fixedFps,
      );
      frames = extraction.frames;
      sampleFps = extraction.sampleFps;
      frameSignals = analyzeFrameSignals(frames);
    } catch (err) {
      logger.warn('frame_extraction_failed', { err });
    }

    try {
      audio = await fingerprintAudio(filePath);
    } catch (err) {
      logger.warn('audio_fingerprint_failed', { err });
    }
  }

  const degraded = frames.length < 3;
  return {
    metadata,
    frames,
    frameSignals,
    audio,
    durationSeconds,
    degraded,
    degradedReason: degraded ? 'تعذر استخراج عدد كافٍ من الإطارات للمقارنة.' : undefined,
    sampleFps,
  };
}

// ---------------------------------------------------------------------------
// Original documentation processing
// ---------------------------------------------------------------------------

export async function processDocumentation(documentationId: string): Promise<void> {
  const log = logger.child({ documentationId });

  const doc = await prisma.documentation.findUnique({ where: { id: documentationId } });
  if (!doc) {
    log.warn('process_documentation_missing');
    return;
  }

  await prisma.documentation.update({
    where: { id: doc.id },
    data: { processingStatus: 'PROCESSING', processingError: null },
  });

  try {
    await withStoredObject(doc.storageKey, async (filePath) => {
      const analysis = await analyzeMediaFile(filePath);
      const ai = await safeAiAnalyze(filePath, analysis);

      let thumbnailKey: string | null = doc.thumbnailKey;
      if (doc.kind === 'VIDEO' && analysis.metadata) {
        thumbnailKey = await tryGenerateThumbnail(filePath, analysis.durationSeconds, doc, log);
      }

      await prisma.documentation.update({
        where: { id: doc.id },
        data: {
          durationSeconds: analysis.durationSeconds,
          metadataJson: {
            technical: analysis.metadata,
            frameSignals: analysis.frameSignals,
            frameSampling: { fps: analysis.sampleFps, count: analysis.frames.length },
            audioStats: analysis.audio?.stats ?? null,
            audioPresent: analysis.audio?.present ?? false,
            ai,
            analyzedAt: new Date().toISOString(),
            degraded: analysis.degraded,
            degradedReason: analysis.degradedReason ?? null,
          } as never,
          frameHashes: analysis.frames as never,
          audioFingerprint: analysis.audio
            ? ({ hashes: analysis.audio.hashes, stats: analysis.audio.stats, present: analysis.audio.present } as never)
            : undefined,
          thumbnailKey,
          processingStatus: analysis.degraded && !analysis.metadata ? 'FAILED' : 'READY',
          processingError: analysis.degraded ? (analysis.degradedReason ?? null) : null,
          processedAt: new Date(),
        },
      });

      log.info('documentation_processed', {
        frames: analysis.frames.length,
        hasAudio: analysis.audio?.present ?? false,
        degraded: analysis.degraded,
      });
    });
  } catch (err) {
    log.error('documentation_processing_failed', { err });
    await prisma.documentation
      .update({
        where: { id: doc.id },
        data: {
          processingStatus: 'FAILED',
          processingError: err instanceof Error ? err.message.slice(0, 500) : 'خطأ غير معروف',
          processedAt: new Date(),
        },
      })
      .catch(() => undefined);
    throw err;
  }
}

async function tryGenerateThumbnail(
  filePath: string,
  duration: number | null,
  doc: Documentation,
  log: ReturnType<typeof logger.child>,
): Promise<string | null> {
  try {
    const jpeg = await generateThumbnail(filePath, duration);
    if (jpeg.length === 0) return doc.thumbnailKey;
    const key = buildStorageKey({ scope: 'thumbnails', originalFilename: `${doc.id}.jpg` });
    await storage().put({ key, body: jpeg, contentType: 'image/jpeg', contentLength: jpeg.length });
    return key;
  } catch (err) {
    log.warn('thumbnail_failed', { err });
    return doc.thumbnailKey;
  }
}

async function safeAiAnalyze(
  filePath: string,
  analysis: MediaAnalysis,
): Promise<AiAnalysisResult | null> {
  try {
    return await aiProvider().analyze({
      filePath,
      metadata: analysis.metadata,
      frames: analysis.frames,
      frameSignals: analysis.frameSignals,
      audio: analysis.audio,
      durationSeconds: analysis.durationSeconds,
      filesize: analysis.metadata?.sizeBytes ?? null,
    });
  } catch (err) {
    logger.warn('ai_analysis_failed', { err });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Customer verification check
// ---------------------------------------------------------------------------

export type VerificationOutcome = {
  verdict: Verdict;
  similarity: SimilarityReport | null;
  audioSimilarity: number | null;
  ai: AiAnalysisResult | null;
  candidate: MediaAnalysis;
};

/**
 * Compares a candidate file against the registered original.
 *
 * `candidateStorageKey` points at the customer's uploaded copy, which is
 * deleted by the caller once the check completes — we keep the report, not the
 * customer's file.
 */
export async function runVerificationCheck(checkId: string): Promise<VerificationOutcome | null> {
  const log = logger.child({ checkId });

  const check = await prisma.verificationCheck.findUnique({
    where: { id: checkId },
    include: { documentation: true },
  });

  if (!check) {
    log.warn('verification_check_missing');
    return null;
  }

  const doc = check.documentation;
  const candidateKey = (check.reportJson as { candidateKey?: string } | null)?.candidateKey;

  await prisma.verificationCheck.update({
    where: { id: check.id },
    data: { processingStatus: 'PROCESSING' },
  });

  try {
    // A hash match is decisive and needs no media processing at all.
    const hashMatch = Boolean(
      doc && check.uploadedFileHash && doc.sha256.toLowerCase() === check.uploadedFileHash.toLowerCase(),
    );

    if (hashMatch) {
      const verdict = decideVerdict({
        hashMatch: true,
        similarity: null,
        audioSimilarity: null,
        durationDelta: null,
        ai: null,
        analysisDegraded: false,
        originalNotProcessed: false,
      });
      await persist(check.id, verdict, null, null, null, null);
      log.info('verification_hash_match');
      return {
        verdict,
        similarity: null,
        audioSimilarity: null,
        ai: null,
        candidate: emptyAnalysis(),
      };
    }

    if (!doc || !candidateKey) {
      const verdict = decideVerdict({
        hashMatch: false,
        similarity: null,
        audioSimilarity: null,
        durationDelta: null,
        ai: null,
        analysisDegraded: true,
        originalNotProcessed: true,
      });
      await persist(check.id, verdict, null, null, null, null);
      return { verdict, similarity: null, audioSimilarity: null, ai: null, candidate: emptyAnalysis() };
    }

    const originalFrames = (doc.frameHashes as FrameFingerprint[] | null) ?? [];
    const originalAudio =
      (doc.audioFingerprint as { hashes?: string[]; present?: boolean } | null) ?? null;
    const originalNotProcessed = doc.processingStatus !== 'READY' || originalFrames.length < 3;

    const outcome = await withTempDir(async (dir) => {
      const { materializeObject } = await import('@/lib/media/tempfile');
      const candidatePath = await materializeObject(candidateKey, dir);

      // Fingerprint the candidate on the original's time grid.
      const originalSampling = (doc.metadataJson as { frameSampling?: { fps?: number } } | null)
        ?.frameSampling;
      const candidate = await analyzeMediaFile(candidatePath, originalSampling?.fps ?? null);

      const similarity = originalNotProcessed
        ? null
        : compareFrameSequences(originalFrames, candidate.frames);

      const audioSimilarity =
        originalAudio?.hashes?.length && candidate.audio?.hashes.length
          ? compareAudioFingerprints(originalAudio.hashes, candidate.audio.hashes)
          : null;

      const delta = durationDelta(doc.durationSeconds, candidate.durationSeconds);
      const ai = await safeAiAnalyze(candidatePath, candidate);

      const verdict = decideVerdict({
        hashMatch: false,
        similarity,
        audioSimilarity,
        durationDelta: delta,
        ai,
        analysisDegraded: candidate.degraded,
        originalNotProcessed,
      });

      return { verdict, similarity, audioSimilarity, ai, candidate, delta };
    });

    await persist(
      check.id,
      outcome.verdict,
      outcome.similarity,
      outcome.audioSimilarity,
      outcome.delta,
      outcome.ai,
      outcome.candidate,
    );

    log.info('verification_completed', {
      result: outcome.verdict.result,
      similarity: outcome.similarity?.score ?? null,
    });

    return {
      verdict: outcome.verdict,
      similarity: outcome.similarity,
      audioSimilarity: outcome.audioSimilarity,
      ai: outcome.ai,
      candidate: outcome.candidate,
    };
  } catch (err) {
    log.error('verification_failed', { err });
    await prisma.verificationCheck
      .update({
        where: { id: check.id },
        data: {
          processingStatus: 'FAILED',
          result: 'ERROR',
          processingError: err instanceof Error ? err.message.slice(0, 500) : 'خطأ غير معروف',
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
    return null;
  } finally {
    // The customer's copy is never retained beyond the check itself.
    if (candidateKey) {
      await storage()
        .delete(candidateKey)
        .catch((err) => log.warn('candidate_cleanup_failed', { err }));
    }
  }
}

async function persist(
  checkId: string,
  verdict: Verdict,
  similarity: SimilarityReport | null,
  audioSimilarity: number | null,
  delta: number | null,
  ai: AiAnalysisResult | null,
  candidate?: MediaAnalysis,
): Promise<void> {
  await prisma.verificationCheck.update({
    where: { id: checkId },
    data: {
      hashMatch: verdict.result === 'VERIFIED_ORIGINAL',
      similarityScore: similarity?.score ?? null,
      audioSimilarity: audioSimilarity != null ? Number((audioSimilarity * 100).toFixed(2)) : null,
      durationDelta: delta,
      aiSignalScore: ai?.score ?? null,
      aiRiskLevel: ai?.level ?? null,
      aiProvider: ai?.provider ?? null,
      confidenceScore: verdict.confidence,
      result: verdict.result,
      processingStatus: 'READY',
      processingError: null,
      completedAt: new Date(),
      reportJson: {
        verdict: {
          result: verdict.result,
          confidence: verdict.confidence,
          titleAr: verdict.titleAr,
          messageAr: verdict.messageAr,
          badgeAr: verdict.badgeAr,
          tone: verdict.tone,
          hintAr: verdict.hintAr ?? null,
        },
        factors: verdict.factors,
        similarity,
        audioSimilarity,
        durationDelta: delta,
        ai,
        candidate: candidate
          ? {
              technical: candidate.metadata,
              frameSignals: candidate.frameSignals,
              audioStats: candidate.audio?.stats ?? null,
              audioPresent: candidate.audio?.present ?? false,
              degraded: candidate.degraded,
            }
          : null,
        // The temp key is intentionally dropped now that the object is deleted.
        candidateKey: null,
      } as never,
    },
  });
}

function emptyAnalysis(): MediaAnalysis {
  return {
    metadata: null,
    frames: [],
    frameSignals: null,
    audio: null,
    durationSeconds: null,
    degraded: false,
    sampleFps: null,
  };
}
