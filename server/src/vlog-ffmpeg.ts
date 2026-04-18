/**
 * 使用本机 ffmpeg 将多张图片合成横屏幻灯片 MP4（无云端视频 API 依赖）。
 * 部署环境需安装 ffmpeg 并在 PATH 中，或通过 FFMPEG_PATH 指定可执行文件。
 *
 * 配乐：默认使用仓库内 `server/assets/vlog-bgm-loop.m4a`（轻量正弦铺底，可循环）；
 * 可通过环境变量 `VOXORA_VLOG_BGM_PATH` 指向自定义 mp3/m4a/aac/wav。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FFMPEG = process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
const SLIDE_W = 1280;
const SLIDE_H = 720;
const SEC_PER_SLIDE = 3;
const MAX_SLIDES = 40;

function runFfmpeg(args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(DEFAULT_FFMPEG, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let err = '';
    child.stderr?.on('data', (c: Buffer) => {
      err += c.toString();
    });
    child.on('error', (e) => reject(e));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg 退出码 ${code}: ${err.slice(-800)}`));
    });
  });
}

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await runFfmpeg(['-hide_banner', '-version']);
    return true;
  } catch {
    return false;
  }
}

function extFromUrl(u: string): string {
  const base = u.split('?')[0]?.toLowerCase() || '';
  if (base.endsWith('.png')) return '.png';
  if (base.endsWith('.webp')) return '.webp';
  if (base.endsWith('.jpeg')) return '.jpeg';
  if (base.endsWith('.gif')) return '.gif';
  return '.jpg';
}

function isVideoLikeUrl(u: string): boolean {
  const s = u.split('?')[0]?.toLowerCase() || '';
  return /\.(mp4|webm|mov|m4v|mkv|avi)(\b|$)/i.test(s) || s.includes('.m3u8');
}

function isHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u.trim());
}

/** 从回忆行收集可下载的图片 URL（顺序：封面 + images，去重） */
export function collectMemoryImageUrls(row: {
  cover_image?: string | null;
  images?: unknown;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const t = u.trim();
    if (!t || !isHttpUrl(t) || isVideoLikeUrl(t)) return;
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  if (typeof row.cover_image === 'string') push(row.cover_image);
  if (Array.isArray(row.images)) {
    for (const x of row.images) {
      if (typeof x === 'string') push(x);
    }
  }
  return out;
}

/** 内置配乐路径（开发与打包后均相对于本文件解析到 `server/assets/`） */
export function resolveBundledBgmPath(): string {
  return path.resolve(MODULE_DIR, '..', 'assets', 'vlog-bgm-loop.m4a');
}

/**
 * 解析用于混流的配乐文件：优先 `VOXORA_VLOG_BGM_PATH`，否则使用内置资源（若存在）。
 */
export function resolveBgmPathForMux(): string | null {
  const fromEnv = process.env.VOXORA_VLOG_BGM_PATH?.trim();
  if (fromEnv) {
    if (fs.existsSync(fromEnv)) return fromEnv;
    console.warn('[vlog] VOXORA_VLOG_BGM_PATH 指向的文件不存在，将尝试内置配乐:', fromEnv);
  }
  const bundled = resolveBundledBgmPath();
  return fs.existsSync(bundled) ? bundled : null;
}

/** 将无音轨视频与循环 BGM 混流为最终 MP4（时长以视频为准） */
export async function muxLoopedBgmToVideo(
  videoNoAudioPath: string,
  bgmPath: string,
  outputPath: string
): Promise<void> {
  const raw = parseFloat(process.env.VOXORA_VLOG_BGM_VOLUME || '0.18');
  const vol = Number.isFinite(raw) ? Math.min(1.5, Math.max(0.01, raw)) : 0.18;
  await runFfmpeg([
    '-y',
    '-i',
    videoNoAudioPath,
    '-stream_loop',
    '-1',
    '-i',
    bgmPath,
    '-filter_complex',
    `[1:a]volume=${String(vol)}[aout]`,
    '-map',
    '0:v:0',
    '-map',
    '[aout]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-shortest',
    outputPath,
  ]);
}

async function downloadToFile(url: string, filePath: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`下载图片失败 ${res.status}: ${url.slice(0, 120)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 64) {
    throw new Error(`图片过小: ${url.slice(0, 120)}`);
  }
  fs.writeFileSync(filePath, buf);
}

/**
 * 将若干 HTTP(S) 图片合成为单个 MP4，写入 outputPath（父目录需已存在）。
 */
export async function buildSlideshowMp4FromUrls(
  imageUrls: string[],
  outputPath: string
): Promise<void> {
  const urls = imageUrls.slice(0, MAX_SLIDES);
  if (urls.length === 0) {
    throw new Error('没有可用的图片 URL');
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voxora-vlog-'));
  const segmentPaths: string[] = [];

  try {
    for (let i = 0; i < urls.length; i++) {
      const ext = extFromUrl(urls[i]);
      const rawPath = path.join(workDir, `in_${String(i).padStart(3, '0')}${ext}`);
      const segPath = path.join(workDir, `seg_${String(i).padStart(3, '0')}.mp4`);
      await downloadToFile(urls[i], rawPath);

      const vf = [
        `scale=${SLIDE_W}:${SLIDE_H}:force_original_aspect_ratio=decrease`,
        `pad=${SLIDE_W}:${SLIDE_H}:(ow-iw)/2:(oh-ih)/2`,
        'format=yuv420p',
      ].join(',');

      await runFfmpeg(
        [
          '-y',
          '-loop',
          '1',
          '-t',
          String(SEC_PER_SLIDE),
          '-i',
          rawPath,
          '-vf',
          vf,
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-r',
          '30',
          segPath,
        ],
        workDir
      );
      segmentPaths.push(segPath);
    }

    const listPath = path.join(workDir, 'concat.txt');
    const listBody = segmentPaths
      .map((p) => {
        const rel = path.relative(workDir, p).split(path.sep).join('/');
        return `file '${rel.replace(/'/g, "'\\''")}'`;
      })
      .join('\n');
    fs.writeFileSync(listPath, listBody, 'utf8');

    const slideOnly = path.join(workDir, '_slides_noaudio.mp4');
    await runFfmpeg(
      ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', slideOnly],
      workDir
    );

    const bgm = resolveBgmPathForMux();
    if (bgm) {
      try {
        await muxLoopedBgmToVideo(slideOnly, bgm, outputPath);
      } catch (e) {
        console.warn('[vlog] 配乐混流失败，输出无音轨视频:', e);
        fs.copyFileSync(slideOnly, outputPath);
      }
    } else {
      console.warn('[vlog] 未找到配乐文件，输出无音轨视频（可设置 VOXORA_VLOG_BGM_PATH 或放入 assets/vlog-bgm-loop.m4a）');
      fs.copyFileSync(slideOnly, outputPath);
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
