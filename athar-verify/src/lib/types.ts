/**
 * Client-safe shapes.
 *
 * Declared independently of the server modules so client components never pull
 * `@/lib/config/env`, Prisma, or the storage SDK into the browser bundle
 * through a type import.
 */

export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export type VerificationResultCode =
  | 'VERIFIED_ORIGINAL'
  | 'VERIFIED_CONTENT_MATCH'
  | 'UNABLE_TO_VERIFY'
  | 'NO_MATCH'
  | 'ERROR';

export type Tone = 'success' | 'warning' | 'danger';

export type TechnicalSummary = {
  container: string | null;
  durationSeconds: number | null;
  resolution: string | null;
  fps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  audioSampleRate: number | null;
  bitrate: number | null;
};

export type PublicDocumentationDto = {
  id: string;
  kind: 'VIDEO' | 'IMAGE' | 'DOCUMENT';
  streamPath: string;
  thumbnailPath: string | null;
  downloadPath: string | null;
  originalFilename: string;
  sha256: string;
  sha256Short: string;
  filesize: string;
  mimeType: string;
  durationSeconds: number | null;
  processingStatus: ProcessingStatus;
  registeredAt: string;
  technical: TechnicalSummary | null;
};

export type PublicOrderDto = {
  orderNumber: string;
  customerName: string | null;
  country: string;
  countryCode: string;
  executionDate: string;
  status: string;
  statusAr: string;
  serviceType: string | null;
  documentation: PublicDocumentationDto[];
  verification: {
    verificationId: string;
    url: string;
    displayUrl: string;
    qrPath: string;
    whatsappShareUrl: string;
  } | null;
};

export type PublicOrderViewDto = {
  primaryDocumentationId: string | null;
  order: PublicOrderDto;
  comparisonAvailable: boolean;
};

export type ConfidenceFactorDto = {
  key: string;
  labelAr: string;
  score: number;
  weight: number;
  unavailable: boolean;
  detailAr: string;
};

export type AiSignalDto = {
  key: string;
  labelAr: string;
  strength: number;
  weight: number;
  noteAr: string;
};

export type CheckReportDto = {
  verdict: {
    result: VerificationResultCode;
    confidence: number;
    titleAr: string;
    messageAr: string;
    badgeAr: string;
    tone: Tone;
    hintAr: string | null;
  };
  factors: ConfidenceFactorDto[];
  similarity: {
    score: number;
    sequenceScore: number;
    coverageScore: number;
    matchedFrames: number;
    candidateFrameCount: number;
    originalFrameCount: number;
    bestOffsetSeconds: number;
    insufficientData: boolean;
  } | null;
  audioSimilarity: number | null;
  durationDelta: number | null;
  ai: {
    provider: string;
    score: number;
    level: 'NO_STRONG_SIGNALS' | 'SOME_SIGNALS' | 'INCONCLUSIVE';
    signals: AiSignalDto[];
    summaryAr: string;
    degraded: boolean;
  } | null;
  candidate: {
    technical: Record<string, unknown> | null;
    frameSignals: Record<string, unknown> | null;
    audioStats: Record<string, unknown> | null;
    audioPresent: boolean;
    degraded: boolean;
  } | null;
};

export type CheckStatusDto = {
  id: string;
  status: ProcessingStatus;
  result: VerificationResultCode;
  hashMatch: boolean;
  confidenceScore: number | null;
  similarityScore: number | null;
  audioSimilarity: number | null;
  aiSignalScore: number | null;
  aiRiskLevel: string | null;
  report: CheckReportDto | null;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  disclaimerAr: string;
  confidenceExplanationAr: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
