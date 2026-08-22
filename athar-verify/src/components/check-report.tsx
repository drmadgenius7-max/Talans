'use client';

import * as React from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VerificationBadge } from '@/components/verification-badge';
import { shortHash } from '@/lib/utils';
import type { CheckStatusDto, Tone } from '@/lib/types';

const AI_LEVEL_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  NO_STRONG_SIGNALS: 'success',
  SOME_SIGNALS: 'warning',
  INCONCLUSIVE: 'muted',
};

/**
 * The verification report a customer sees after uploading their own copy.
 *
 * The confidence score is always shown next to the factors that produced it —
 * a bare "98%" invites more distrust than it settles.
 */
export function CheckReport({
  check,
  originalSha256,
}: {
  check: CheckStatusDto;
  originalSha256?: string;
}) {
  const report = check.report;
  const verdict = report?.verdict;

  if (check.status === 'FAILED' || check.result === 'ERROR') {
    return (
      <Alert variant="warning">
        <AlertDescription className="text-foreground">
          {check.error ?? 'تعذر إكمال الفحص. حاول مرة أخرى.'}
        </AlertDescription>
      </Alert>
    );
  }

  const tone: Tone = verdict?.tone ?? 'warning';
  const confidence = check.confidenceScore ?? verdict?.confidence ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <VerificationBadge
        result={check.result}
        title={verdict?.titleAr ?? 'نتيجة الفحص'}
        message={verdict?.messageAr ?? ''}
        hint={verdict?.hintAr ?? null}
      />

      <div className="rounded-[calc(var(--radius)-0.2rem)] border border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">درجة التحقق</span>
          <span className="ltr-nums text-2xl font-bold text-foreground">
            {confidence.toFixed(0)}%
          </span>
        </div>

        <Progress value={confidence} tone={tone === 'danger' ? 'danger' : tone} className="mt-3" />

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {check.confidenceExplanationAr}
        </p>

        {report?.factors && report.factors.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            {report.factors.map((factor) => (
              <li key={factor.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{factor.labelAr}</span>
                  {factor.unavailable ? (
                    <Badge variant="muted">غير متاح</Badge>
                  ) : (
                    <span className="ltr-nums text-xs font-semibold text-muted-foreground">
                      {factor.score.toFixed(0)}%
                    </span>
                  )}
                </div>
                {!factor.unavailable && (
                  <Progress
                    value={factor.score}
                    tone={factor.score >= 80 ? 'success' : factor.score >= 50 ? 'warning' : 'danger'}
                    className="h-1.5"
                  />
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">{factor.detailAr}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {check.hashMatch && (
        <div className="rounded-[calc(var(--radius)-0.2rem)] border border-success/25 bg-success/8 p-4 text-sm">
          <p className="font-semibold text-foreground">File Integrity: Verified</p>
          {originalSha256 && (
            <p className="ltr-nums mt-1.5 font-mono text-xs text-muted-foreground">
              SHA-256: {shortHash(originalSha256)}
            </p>
          )}
        </div>
      )}

      {report?.ai && (
        <div className="rounded-[calc(var(--radius)-0.2rem)] border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold">مؤشرات الذكاء الاصطناعي</h4>
            <Badge variant={AI_LEVEL_VARIANT[report.ai.level] ?? 'muted'}>
              {report.ai.level === 'NO_STRONG_SIGNALS'
                ? 'لا توجد مؤشرات قوية'
                : report.ai.level === 'SOME_SIGNALS'
                  ? 'مؤشرات تستحق المراجعة'
                  : 'غير حاسم'}
            </Badge>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {report.ai.summaryAr}
          </p>

          {report.ai.signals.length > 0 && (
            <Collapsible label="عرض المؤشرات التفصيلية">
              <ul className="mt-3 flex flex-col gap-2.5">
                {report.ai.signals.map((signal) => (
                  <li key={signal.key} className="text-xs leading-relaxed">
                    <span className="font-semibold text-foreground">{signal.labelAr}: </span>
                    <span className="text-muted-foreground">{signal.noteAr}</span>
                  </li>
                ))}
              </ul>
            </Collapsible>
          )}
        </div>
      )}

      <Alert variant="info">
        <AlertDescription className="flex gap-2.5 text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="text-xs leading-relaxed">{check.disclaimerAr}</span>
        </AlertDescription>
      </Alert>

      {report?.similarity && !report.similarity.insufficientData && (
        <Collapsible label="تفاصيل تقنية عن المقارنة">
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <Detail label="درجة تشابه المحتوى" value={`${report.similarity.score.toFixed(1)}%`} />
            <Detail
              label="التطابق التسلسلي"
              value={`${report.similarity.sequenceScore.toFixed(1)}%`}
            />
            <Detail
              label="تغطية الإطارات"
              value={`${report.similarity.coverageScore.toFixed(1)}%`}
            />
            <Detail
              label="الإطارات المتطابقة"
              value={`${report.similarity.matchedFrames} / ${report.similarity.candidateFrameCount}`}
            />
            {report.audioSimilarity != null && (
              <Detail
                label="تشابه الصوت"
                value={`${(report.audioSimilarity * 100).toFixed(1)}%`}
              />
            )}
            {report.durationDelta != null && (
              <Detail label="فرق المدة" value={`${(report.durationDelta * 100).toFixed(1)}%`} />
            )}
          </dl>
        </Collapsible>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="ltr-nums mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {label}
      </button>
      {open && children}
    </div>
  );
}
