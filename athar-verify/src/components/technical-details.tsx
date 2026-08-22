'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { formatBytes, formatDuration } from '@/lib/utils';
import type { PublicDocumentationDto } from '@/lib/types';

/**
 * "تفاصيل تقنية"
 *
 * Collapsed by default. Most customers want the verdict, not the codec; the
 * ones who want the codec are exactly the ones who will look for this button.
 */
export function TechnicalDetails({ documentation }: { documentation: PublicDocumentationDto }) {
  const [open, setOpen] = React.useState(false);
  const tech = documentation.technical;

  const rows: Array<[string, string]> = [
    ['اسم الملف', documentation.originalFilename],
    ['نوع الملف', documentation.mimeType],
    ['حجم الملف', formatBytes(Number(documentation.filesize))],
    ['المدة', formatDuration(documentation.durationSeconds)],
  ];

  if (tech) {
    if (tech.container) rows.push(['الحاوية', tech.container]);
    if (tech.resolution) rows.push(['الدقة', tech.resolution]);
    if (tech.fps) rows.push(['معدل الإطارات', `${tech.fps} fps`]);
    if (tech.videoCodec) rows.push(['ترميز الفيديو', tech.videoCodec]);
    if (tech.audioCodec) rows.push(['ترميز الصوت', tech.audioCodec]);
    if (tech.audioSampleRate) rows.push(['تردد العينة', `${tech.audioSampleRate} Hz`]);
    if (tech.bitrate) rows.push(['معدل البت', `${Math.round(tech.bitrate / 1000)} kbps`]);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        تفاصيل تقنية
      </button>

      {open && (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl bg-secondary/40 p-4 text-xs sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1 last:border-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="ltr-nums truncate font-medium" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
