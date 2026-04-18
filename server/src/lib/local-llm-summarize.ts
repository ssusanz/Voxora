/**
 * 调用局域网内 OpenAI 兼容接口（如 Jetson 上 `serve_qwen_vl.py`）生成回忆总结。
 *
 * 环境变量（优先 `LOCAL_LLM_*`，未设置时回退 `VLLM_*` 以兼容旧配置）：
 * - LOCAL_LLM_BASE_URL / VLLM_BASE_URL：如 http://192.168.1.105:8000/v1
 * - LOCAL_LLM_MODEL / VLLM_MODEL：须与服务端注册的 model 名一致
 * - LOCAL_LLM_API_KEY / VLLM_API_KEY：可选
 * - LOCAL_LLM_TIMEOUT_MS / VLLM_TIMEOUT_MS：可选，默认 120000，上限 600000
 */

import {
  MEMORY_SUMMARY_SYSTEM_INSTRUCTION,
  buildMemorySummaryUserPrompt,
} from './memory-summary-prompt';

function firstEnv(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return '';
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/v1')) return trimmed;
  return `${trimmed}/v1`;
}

export function isLocalLlmSummarizeConfigured(): boolean {
  const base = firstEnv('LOCAL_LLM_BASE_URL', 'VLLM_BASE_URL');
  const model = firstEnv('LOCAL_LLM_MODEL', 'VLLM_MODEL');
  return base.length > 0 && model.length > 0;
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function summarizeMemoryWithLocalLlm(memory: Record<string, unknown>): Promise<string> {
  const baseRaw = firstEnv('LOCAL_LLM_BASE_URL', 'VLLM_BASE_URL');
  const model = firstEnv('LOCAL_LLM_MODEL', 'VLLM_MODEL');
  const apiKey = firstEnv('LOCAL_LLM_API_KEY', 'VLLM_API_KEY');
  const timeoutRaw = firstEnv('LOCAL_LLM_TIMEOUT_MS', 'VLLM_TIMEOUT_MS');
  const timeoutMs = Math.min(
    Math.max(Number(timeoutRaw) || 120_000, 5_000),
    600_000
  );

  const baseUrl = normalizeBaseUrl(baseRaw);
  const url = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: MEMORY_SUMMARY_SYSTEM_INSTRUCTION,
          },
          { role: 'user', content: buildMemorySummaryUserPrompt(memory) },
        ],
        temperature: 0.6,
        max_tokens: 512,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as ChatCompletionResponse;

    if (!res.ok) {
      const msg =
        (typeof json.error?.message === 'string' && json.error.message) ||
        `本地 LLM HTTP ${res.status}`;
      throw new Error(msg);
    }

    const text = json.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('本地 LLM 返回内容为空');
    }
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}
