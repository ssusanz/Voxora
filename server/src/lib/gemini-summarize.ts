/**
 * Google Gemini（AI Studio API Key）生成回忆总结。
 *
 * - GEMINI_API_KEY：必填（https://aistudio.google.com/apikey）
 *   未设置时可读 GOOGLE_GENERATIVE_AI_API_KEY（与部分官方示例一致）
 * - GEMINI_MODEL：可选，默认 gemini-2.0-flash（可按区域/配额改为 gemini-2.5-flash、gemini-1.5-flash 等）
 * - GEMINI_TIMEOUT_MS：可选，默认 90000
 */

import {
  MEMORY_SUMMARY_SYSTEM_INSTRUCTION,
  buildMemorySummaryUserPrompt,
} from './memory-summary-prompt';

/** 去掉首尾空白及成对引号（.env 里常见） */
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

export function isGeminiSummarizeConfigured(): boolean {
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

export async function summarizeMemoryWithGemini(memory: Record<string, unknown>): Promise<string> {
  const apiKey = readGeminiApiKey();
  if (!apiKey) {
    throw new Error('未配置 GEMINI_API_KEY（或 GOOGLE_GENERATIVE_AI_API_KEY）');
  }

  const model = trimEnvValue(process.env.GEMINI_MODEL) || 'gemini-2.0-flash';
  const timeoutRaw = trimEnvValue(process.env.GEMINI_TIMEOUT_MS);
  const timeoutMs = Math.min(
    Math.max(Number(timeoutRaw) || 90_000, 5_000),
    300_000
  );

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const userBlock = buildMemorySummaryUserPrompt(memory);
  /** 单条 user 文本，避免部分环境对 systemInstruction 的兼容问题 */
  const combinedPrompt = `${MEMORY_SUMMARY_SYSTEM_INSTRUCTION}\n\n---\n\n${userBlock}`;

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
            parts: [{ text: combinedPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1024,
        },
      }),
    });

    const rawText = await res.text();
    let json: GenerateContentResponse;
    try {
      json = JSON.parse(rawText) as GenerateContentResponse;
    } catch {
      throw new Error(`Gemini 返回非 JSON（HTTP ${res.status}）：${rawText.slice(0, 200)}`);
    }

    if (!res.ok) {
      const msg =
        (typeof json.error?.message === 'string' && json.error.message) ||
        rawText.slice(0, 400) ||
        `Gemini HTTP ${res.status}`;
      throw new Error(msg);
    }

    const candidate = json.candidates?.[0];
    const text = joinCandidateText(candidate);
    if (!text.trim()) {
      const reason = candidate?.finishReason;
      throw new Error(
        reason ? `Gemini 无有效输出（finishReason: ${reason}）` : 'Gemini 返回内容为空'
      );
    }
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}
