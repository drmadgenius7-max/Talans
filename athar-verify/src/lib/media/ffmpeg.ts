import { spawn } from 'node:child_process';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

export class FfmpegUnavailableError extends Error {
  constructor(readonly binary: string) {
    super(`الأداة "${binary}" غير متاحة على الخادم.`);
    this.name = 'FfmpegUnavailableError';
  }
}

export class FfmpegFailedError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
    readonly exitCode: number | null,
  ) {
    super(message);
    this.name = 'FfmpegFailedError';
  }
}

export type RunResult = {
  stdout: Buffer;
  stderr: string;
  exitCode: number;
};

/**
 * Runs an ffmpeg/ffprobe command with a hard timeout and a bounded stderr
 * buffer.
 *
 * The whole media pipeline funnels through here so that a hostile or corrupt
 * input file can never hang a worker or exhaust memory through log spam.
 */
export function runBinary(
  binary: string,
  args: string[],
  options: { timeoutMs?: number; maxStdoutBytes?: number; input?: Buffer } = {},
): Promise<RunResult> {
  const timeoutMs = options.timeoutMs ?? env().FFMPEG_TIMEOUT_MS;
  const maxStdoutBytes = options.maxStdoutBytes ?? 256 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(binary, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      reject(new FfmpegUnavailableError(binary));
      return;
    }

    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderr = '';
    let settled = false;
    let killedForSize = false;

    const timer = setTimeout(() => {
      if (settled) return;
      child.kill('SIGKILL');
      settled = true;
      reject(new FfmpegFailedError(`انتهت المهلة أثناء معالجة الملف (${timeoutMs}ms).`, stderr, null));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxStdoutBytes) {
        killedForSize = true;
        child.kill('SIGKILL');
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      // ffmpeg is chatty; keep only the tail, which is where errors land.
      stderr = (stderr + chunk.toString('utf8')).slice(-8000);
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err.code === 'ENOENT') reject(new FfmpegUnavailableError(binary));
      else reject(err);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (killedForSize) {
        reject(new FfmpegFailedError('حجم المخرجات تجاوز الحد المسموح.', stderr, code));
        return;
      }
      if (code !== 0) {
        reject(new FfmpegFailedError(`فشل تنفيذ ${binary} (رمز ${code}).`, stderr, code));
        return;
      }
      resolve({ stdout: Buffer.concat(stdoutChunks), stderr, exitCode: code ?? 0 });
    });

    if (options.input) {
      child.stdin.end(options.input);
    } else {
      child.stdin.end();
    }
  });
}

export const runFfmpeg = (args: string[], options?: Parameters<typeof runBinary>[2]) =>
  runBinary(env().FFMPEG_PATH, args, options);

export const runFfprobe = (args: string[], options?: Parameters<typeof runBinary>[2]) =>
  runBinary(env().FFPROBE_PATH, args, options);

let availabilityCache: { checkedAt: number; ffmpeg: boolean; ffprobe: boolean } | null = null;
const AVAILABILITY_TTL_MS = 60_000;

/**
 * Whether the media toolchain is usable.
 *
 * The application is designed to stay *correct* without ffmpeg — hash matching
 * still works, and content-similarity results downgrade to "تعذر التأكد" rather
 * than reporting a false negative.
 */
export async function ffmpegAvailability(): Promise<{ ffmpeg: boolean; ffprobe: boolean }> {
  if (availabilityCache && Date.now() - availabilityCache.checkedAt < AVAILABILITY_TTL_MS) {
    return { ffmpeg: availabilityCache.ffmpeg, ffprobe: availabilityCache.ffprobe };
  }

  const probe = async (run: typeof runFfmpeg) => {
    try {
      await run(['-version'], { timeoutMs: 8000 });
      return true;
    } catch {
      return false;
    }
  };

  const [ffmpeg, ffprobe] = await Promise.all([probe(runFfmpeg), probe(runFfprobe)]);
  availabilityCache = { checkedAt: Date.now(), ffmpeg, ffprobe };
  if (!ffmpeg || !ffprobe) {
    logger.warn('ffmpeg_unavailable', { ffmpeg, ffprobe });
  }
  return { ffmpeg, ffprobe };
}
