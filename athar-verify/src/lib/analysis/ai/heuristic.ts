import { hammingDistance } from '@/lib/media/phash';
import {
  buildResult,
  type AiAnalysisInput,
  type AiAnalysisProvider,
  type AiAnalysisResult,
  type AiSignal,
} from './provider';

/**
 * Local heuristic provider — the default.
 *
 * It runs entirely on signals we already extracted (frame fingerprints, luma
 * statistics, container metadata, audio statistics) and costs nothing per
 * check. It cannot detect a modern deepfake, and it does not claim to: what it
 * catches is coarse manipulation evidence — frozen or duplicated segments,
 * abnormal transition density, missing capture provenance, machine-perfect
 * audio.
 *
 * Every signal below is a *weak* indicator with an innocent explanation, which
 * is why the weights are modest and the summary wording is fixed.
 */
export class HeuristicAiProvider implements AiAnalysisProvider {
  readonly name = 'athar-heuristic-v1';

  async analyze(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const signals: AiSignal[] = [];
    const { frames, frameSignals, metadata, audio, durationSeconds } = input;

    const degraded = frames.length < 4 && !metadata;

    // --- Temporal consistency ------------------------------------------------
    if (frameSignals && frameSignals.frameCount >= 6) {
      const distances: number[] = [];
      for (let i = 1; i < frames.length; i += 1) {
        distances.push(hammingDistance(frames[i - 1].h, frames[i].h));
      }
      const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
      const variance =
        distances.reduce((acc, d) => acc + (d - mean) ** 2, 0) / distances.length;
      const stdDev = Math.sqrt(variance);

      // Erratic scene change rate: long still stretches punctuated by jumps.
      const erratic = mean > 0 ? Math.min(1, stdDev / (mean + 4)) : 0;
      signals.push({
        key: 'temporal_inconsistency',
        labelAr: 'اتساق التسلسل الزمني',
        strength: Number(Math.max(0, (erratic - 0.55) / 0.45).toFixed(3)),
        weight: 0.9,
        noteAr:
          erratic > 0.75
            ? 'تفاوت كبير في معدل تغير المشهد بين الإطارات المستخرجة.'
            : 'معدل تغير المشهد بين الإطارات ضمن النطاق المعتاد.',
      });

      // Duplicated / frozen frames.
      const duplicateStrength = Math.max(
        0,
        Math.min(1, (frameSignals.duplicateFrameRatio - 0.35) / 0.5),
      );
      signals.push({
        key: 'duplicated_frames',
        labelAr: 'الإطارات المكررة',
        strength: Number(duplicateStrength.toFixed(3)),
        weight: 0.6,
        noteAr:
          duplicateStrength > 0.4
            ? `نسبة عالية من الإطارات شبه المتطابقة (${Math.round(frameSignals.duplicateFrameRatio * 100)}%).`
            : 'لا توجد نسبة غير معتادة من الإطارات المكررة.',
      });

      // Abnormal transition density relative to duration.
      const cutsPerMinute =
        durationSeconds && durationSeconds > 0
          ? (frameSignals.hardCutCount / durationSeconds) * 60
          : 0;
      const transitionStrength = Math.max(0, Math.min(1, (cutsPerMinute - 25) / 45));
      signals.push({
        key: 'abnormal_transitions',
        labelAr: 'كثافة الانتقالات',
        strength: Number(transitionStrength.toFixed(3)),
        weight: 0.5,
        noteAr:
          transitionStrength > 0.4
            ? `عدد انتقالات مرتفع نسبيًا (${Math.round(cutsPerMinute)} لكل دقيقة).`
            : 'كثافة الانتقالات طبيعية لفيديو توثيق ميداني.',
      });

      // A flat luma histogram across the whole clip is unusual for handheld
      // field footage shot outdoors.
      const flatStrength = Math.max(0, Math.min(1, (6 - frameSignals.lumaStdDev) / 6));
      signals.push({
        key: 'luma_uniformity',
        labelAr: 'تباين الإضاءة',
        strength: Number((flatStrength * 0.7).toFixed(3)),
        weight: 0.35,
        noteAr:
          flatStrength > 0.6
            ? 'تباين إضاءة منخفض جدًا عبر الفيديو بالكامل.'
            : 'تباين الإضاءة عبر الفيديو ضمن المعتاد.',
      });
    }

    // --- Container provenance -------------------------------------------------
    if (metadata) {
      const hasCreationTime = Boolean(metadata.creationTime);
      const hasHandler = Boolean(metadata.handlerName);
      const encoder = (metadata.encoder ?? '').toLowerCase();

      // Absent capture metadata is extremely common after any messenger
      // transfer, so this carries little weight on its own.
      signals.push({
        key: 'missing_capture_metadata',
        labelAr: 'بيانات التقاط الملف',
        strength: hasCreationTime || hasHandler ? 0 : 0.55,
        weight: 0.3,
        noteAr: hasCreationTime
          ? `الملف يحمل تاريخ إنشاء: ${metadata.creationTime}.`
          : 'لا يحمل الملف بيانات تاريخ الإنشاء — أمر شائع بعد إعادة الترميز أو النقل عبر تطبيقات المراسلة.',
      });

      const renderEncoders = ['lavf', 'ffmpeg', 'adobe', 'premiere', 'after effects', 'davinci'];
      const editorHit = renderEncoders.find((needle) => encoder.includes(needle));
      signals.push({
        key: 'render_encoder',
        labelAr: 'أداة الترميز',
        strength: editorHit ? 0.4 : 0,
        weight: 0.35,
        noteAr: editorHit
          ? `تمت إعادة ترميز الملف بواسطة "${metadata.encoder}" — قد يكون ضغطًا عاديًا أو تحريرًا.`
          : metadata.encoder
            ? `أداة الترميز: ${metadata.encoder}.`
            : 'أداة الترميز غير مذكورة في الملف.',
      });

      // Resolution/fps combinations typical of generated or upscaled output.
      const fps = metadata.video?.fps ?? null;
      const unusualFps = fps != null && (fps < 12 || Math.abs(fps - Math.round(fps)) > 0.4);
      signals.push({
        key: 'compression_anomaly',
        labelAr: 'شذوذ في الترميز',
        strength: unusualFps ? 0.45 : 0,
        weight: 0.4,
        noteAr: unusualFps
          ? `معدل إطارات غير معتاد (${fps}).`
          : 'معدل الإطارات وخصائص الترميز ضمن النطاق المعتاد.',
      });
    }

    // --- Audio ----------------------------------------------------------------
    if (audio) {
      if (!audio.present) {
        signals.push({
          key: 'missing_audio',
          labelAr: 'المسار الصوتي',
          strength: 0.35,
          weight: 0.3,
          noteAr: 'لا يحتوي الملف على مسار صوتي.',
        });
      } else {
        // Field recordings have room tone. Near-perfect silence between speech
        // and an unnaturally low crest factor both suggest studio synthesis.
        const tooClean = audio.stats.silenceRatio > 0.6 && audio.stats.rms > 0.02;
        const compressedDynamics =
          audio.stats.crestFactorDb > 0 && audio.stats.crestFactorDb < 6;
        signals.push({
          key: 'audio_dynamics',
          labelAr: 'ديناميكية الصوت',
          strength: Number(((tooClean ? 0.4 : 0) + (compressedDynamics ? 0.35 : 0)).toFixed(3)),
          weight: 0.45,
          noteAr: compressedDynamics
            ? 'المدى الديناميكي للصوت ضيق بشكل غير معتاد.'
            : 'خصائص الصوت ضمن النطاق المعتاد للتسجيل الميداني.',
        });
      }
    }

    return buildResult({ provider: this.name, signals, degraded });
  }
}
