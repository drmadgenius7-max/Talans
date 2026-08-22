import { runFfprobe } from './ffmpeg';

/**
 * The technical facts we extract from every media file.
 *
 * Admins see all of it; customers see it only behind "تفاصيل تقنية". Metadata
 * is evidence, not proof — a missing `creationTime` is normal for a re-encoded
 * file and never on its own means the video was manipulated.
 */
export type VideoTechnicalMetadata = {
  container: string | null;
  formatLongName: string | null;
  durationSeconds: number | null;
  bitrate: number | null;
  sizeBytes: number | null;

  video: {
    codec: string | null;
    codecLongName: string | null;
    profile: string | null;
    width: number | null;
    height: number | null;
    fps: number | null;
    pixelFormat: string | null;
    bitrate: number | null;
    frameCount: number | null;
    rotation: number | null;
  } | null;

  audio: {
    codec: string | null;
    codecLongName: string | null;
    sampleRate: number | null;
    channels: number | null;
    channelLayout: string | null;
    bitrate: number | null;
  } | null;

  creationTime: string | null;
  encoder: string | null;
  handlerName: string | null;
  majorBrand: string | null;
  /** All container-level tags, verbatim. */
  tags: Record<string, string>;
  streamCount: number;
};

type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  codec_long_name?: string;
  profile?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  pix_fmt?: string;
  bit_rate?: string;
  nb_frames?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<{ rotation?: number }>;
};

type FfprobeOutput = {
  format?: {
    format_name?: string;
    format_long_name?: string;
    duration?: string;
    bit_rate?: string;
    size?: string;
    tags?: Record<string, string>;
  };
  streams?: FfprobeStream[];
};

function parseRational(value: string | undefined): number | null {
  if (!value) return null;
  const [numRaw, denRaw] = value.split('/');
  const num = Number(numRaw);
  const den = denRaw === undefined ? 1 : Number(denRaw);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  const result = num / den;
  return Number.isFinite(result) ? Number(result.toFixed(3)) : null;
}

function num(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Reads container + stream metadata for a local file path. */
export async function probeFile(filePath: string): Promise<VideoTechnicalMetadata> {
  const { stdout } = await runFfprobe([
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);

  const parsed = JSON.parse(stdout.toString('utf8')) as FfprobeOutput;
  return normalizeProbe(parsed);
}

export function normalizeProbe(parsed: FfprobeOutput): VideoTechnicalMetadata {
  const streams = parsed.streams ?? [];
  const v = streams.find((s) => s.codec_type === 'video');
  const a = streams.find((s) => s.codec_type === 'audio');
  const formatTags = parsed.format?.tags ?? {};

  const rotation =
    v?.side_data_list?.find((sd) => typeof sd.rotation === 'number')?.rotation ??
    num(v?.tags?.rotate) ??
    null;

  return {
    container: parsed.format?.format_name ?? null,
    formatLongName: parsed.format?.format_long_name ?? null,
    durationSeconds: num(parsed.format?.duration),
    bitrate: num(parsed.format?.bit_rate),
    sizeBytes: num(parsed.format?.size),

    video: v
      ? {
          codec: v.codec_name ?? null,
          codecLongName: v.codec_long_name ?? null,
          profile: v.profile ?? null,
          width: num(v.width),
          height: num(v.height),
          fps: parseRational(v.avg_frame_rate) ?? parseRational(v.r_frame_rate),
          pixelFormat: v.pix_fmt ?? null,
          bitrate: num(v.bit_rate),
          frameCount: num(v.nb_frames),
          rotation,
        }
      : null,

    audio: a
      ? {
          codec: a.codec_name ?? null,
          codecLongName: a.codec_long_name ?? null,
          sampleRate: num(a.sample_rate),
          channels: num(a.channels),
          channelLayout: a.channel_layout ?? null,
          bitrate: num(a.bit_rate),
        }
      : null,

    creationTime: formatTags.creation_time ?? v?.tags?.creation_time ?? null,
    encoder: formatTags.encoder ?? formatTags.ENCODER ?? null,
    handlerName: v?.tags?.handler_name ?? null,
    majorBrand: formatTags.major_brand ?? null,
    tags: formatTags,
    streamCount: streams.length,
  };
}

/** A compact, customer-safe subset shown under "تفاصيل تقنية". */
export function publicTechnicalSummary(meta: VideoTechnicalMetadata) {
  return {
    container: meta.container,
    durationSeconds: meta.durationSeconds,
    resolution:
      meta.video?.width && meta.video?.height ? `${meta.video.width}×${meta.video.height}` : null,
    fps: meta.video?.fps ?? null,
    videoCodec: meta.video?.codec ?? null,
    audioCodec: meta.audio?.codec ?? null,
    audioSampleRate: meta.audio?.sampleRate ?? null,
    bitrate: meta.bitrate,
  };
}
