import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decideVerdict, type VerdictInput } from '../src/lib/analysis/verdict';
import type { SimilarityReport } from '../src/lib/analysis/similarity';
import type { AiAnalysisResult } from '../src/lib/analysis/ai/provider';

const similarity = (score: number): SimilarityReport => ({
  score,
  sequenceScore: score,
  coverageScore: score,
  bestOffsetSeconds: 0,
  alignedFrames: 32,
  matchedFrames: score > 80 ? 32 : 0,
  candidateFrameCount: 32,
  originalFrameCount: 32,
  insufficientData: false,
});

const ai = (score: number, level: AiAnalysisResult['level']): AiAnalysisResult => ({
  provider: 'test',
  score,
  level,
  signals: [],
  summaryAr: '',
  degraded: false,
  analyzedAt: new Date().toISOString(),
});

const base: VerdictInput = {
  hashMatch: false,
  similarity: similarity(95),
  audioSimilarity: 0.8,
  durationDelta: 0.01,
  ai: ai(10, 'NO_STRONG_SIGNALS'),
  analysisDegraded: false,
  originalNotProcessed: false,
};

describe('verdict engine', () => {
  it('treats a hash match as decisive at full confidence', () => {
    const verdict = decideVerdict({ ...base, hashMatch: true });
    assert.equal(verdict.result, 'VERIFIED_ORIGINAL');
    assert.equal(verdict.confidence, 100);
  });

  it('never lets AI signals override a hash match', () => {
    const verdict = decideVerdict({
      ...base,
      hashMatch: true,
      ai: ai(99, 'SOME_SIGNALS'),
      similarity: similarity(0),
      audioSimilarity: 0,
    });
    assert.equal(verdict.result, 'VERIFIED_ORIGINAL');
    assert.equal(verdict.confidence, 100);
  });

  it('calls a re-compressed copy a content match', () => {
    const verdict = decideVerdict(base);
    assert.equal(verdict.result, 'VERIFIED_CONTENT_MATCH');
    assert.equal(verdict.tone, 'success');
    assert.ok(verdict.confidence >= 70, `content match confidence too low: ${verdict.confidence}`);
    assert.ok(verdict.hintAr?.includes('واتساب'), 'must explain why the fingerprint differs');
  });

  it('does not let absent or weak audio overturn a strong picture match', () => {
    for (const audioSimilarity of [null, 0, 0.05]) {
      const verdict = decideVerdict({ ...base, audioSimilarity });
      assert.equal(
        verdict.result,
        'VERIFIED_CONTENT_MATCH',
        `audio=${audioSimilarity} must not overturn a 95% picture match`,
      );
    }
  });

  it('reports no match for unrelated footage, with high confidence in that answer', () => {
    const verdict = decideVerdict({ ...base, similarity: similarity(20), audioSimilarity: null });
    assert.equal(verdict.result, 'NO_MATCH');
    assert.equal(verdict.tone, 'danger');
    assert.ok(verdict.confidence >= 60, `no-match confidence too low: ${verdict.confidence}`);
  });

  it('falls back to "unable to verify" when analysis could not run', () => {
    const verdict = decideVerdict({ ...base, analysisDegraded: true, similarity: null });
    assert.equal(verdict.result, 'UNABLE_TO_VERIFY');
    assert.equal(verdict.tone, 'warning');
  });

  it('falls back to "unable to verify" when the original has no fingerprints yet', () => {
    const verdict = decideVerdict({ ...base, originalNotProcessed: true });
    assert.equal(verdict.result, 'UNABLE_TO_VERIFY');
  });

  it('lands mid-band similarity in the uncertain state, never in no-match', () => {
    const verdict = decideVerdict({ ...base, similarity: similarity(70) });
    assert.equal(verdict.result, 'UNABLE_TO_VERIFY');
  });

  it('never uses the word "مزيف" in any customer-facing copy', () => {
    const inputs: VerdictInput[] = [
      { ...base, hashMatch: true },
      base,
      { ...base, similarity: similarity(70) },
      { ...base, similarity: similarity(10) },
      { ...base, analysisDegraded: true, similarity: null },
    ];
    for (const input of inputs) {
      const verdict = decideVerdict(input);
      const copy = [verdict.titleAr, verdict.messageAr, verdict.badgeAr, verdict.hintAr ?? ''].join(' ');
      assert.ok(!copy.includes('مزيف'), `verdict ${verdict.result} used the word "مزيف"`);
    }
  });

  it('exposes every confidence factor the customer is told about', () => {
    const keys = decideVerdict(base).factors.map((f) => f.key);
    for (const expected of [
      'hash_match',
      'video_similarity',
      'audio_similarity',
      'duration',
      'frame_analysis',
      'ai_signals',
    ]) {
      assert.ok(keys.includes(expected), `missing confidence factor: ${expected}`);
    }
  });
});
