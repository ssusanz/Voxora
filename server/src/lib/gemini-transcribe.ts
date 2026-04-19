/**
 * 使用 Gemini 对短音频做语音转文字（与回忆总结共用 API Key）。
 * 用于 Expo Go / 无本机识别模块时的 /api/v1/voice/transcribe。
 */

function trimEnvValue(raw: string | undefined): string {
  if (typeof raw !== 'string') return '';
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function readGeminiApiKey(): string {
  return trimEnvValue(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

export function isGeminiTranscribeConfigured(): boolean {
  return readGeminiApiKey().length > 0;
}

type GenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number; status?: string };
};

function joinCandidateText(
  candidate:
    | {
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }
    | undefined
): string {
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('');
}

const ALLOWED_TRANSCRIBE_MIMES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/x-aac',
]);

/**
 * @param mimeType 客户端上报的 MIME
 * @param base64Padded 标准 base64（可含 data URL 前缀剥离后）
 */
export async function geminiTranscribeAudioBase64(
  mimeType: string,
  base64Padded: string
): Promise<string> {
  const apiKey = readGeminiApiKey();
  if (!apiKey) {
    throw new Error('未配置 GEMINI_API_KEY');
  }

  const mt = trimEnvValue(mimeType).toLowerCase() || 'audio/m4a';
  if (!ALLOWED_TRANSCRIBE_MIMES.has(mt)) {
    throw new Error(`不支持的音频类型: ${mimeType}`);
  }

  const raw = base64Padded.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
  if (raw.length < 80) {
    throw new Error('音频数据过短');
  }
  /** ~12MB raw limit */
  if (raw.length > 16_000_000) {
    throw new Error('音频过大，请缩短录音');
  }

  const model = trimEnvValue(process.env.GEMINI_MODEL) || 'gemini-2.0-flash';
  const timeoutRaw = trimEnvValue(process.env.GEMINI_TIMEOUT_MS);
  const timeoutMs = Math.min(Math.max(Number(timeoutRaw) || 120_000, 10_000), 300_000);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mt,
                  data: raw,
                },
              },
              {
                text: 'Transcribe the speech in this audio. Output only the spoken words in their original language. No translation, no labels, no commentary.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    const rawText = await res.text();
    let json: GenerateContentResponse;
    try {
      json = JSON.parse(rawText) as GenerateContentResponse;
    } catch {
      throw new Error(`Gemini 响应非 JSON: ${rawText.slice(0, 200)}`);
    }

    if (!res.ok) {
      const msg = json.error?.message || rawText.slice(0, 300);
      throw new Error(`Gemini 请求失败: ${msg}`);
    }

    const text = joinCandidateText(json.candidates?.[0]).trim();
    if (!text) {
      throw new Error('未从模型获得转写文本');
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}
