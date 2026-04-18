import { getBackendBaseUrl } from '@/utils/backend';

export type VoiceMemoryRow = { id: string; title: string };

function normalize(s: string): string {
  return s.normalize('NFKC').trim().toLowerCase();
}

function scoreTitleMatch(title: string, query: string): number {
  const t = normalize(title);
  const q = normalize(query);
  if (!q || !t) return 0;
  if (t === q) return 10_000;
  if (t.includes(q)) return 5000 + Math.min(q.length, 20) * 50;
  if (q.length >= 2 && q.includes(t) && t.length >= 2) return 3500 + t.length * 30;
  if (/[\u4e00-\u9fff]/.test(q)) {
    const chars = [...q].filter((c) => /\S/.test(c) && !/[的了和与在是]/.test(c));
    if (chars.length === 0) return 0;
    let last = -1;
    let ok = 0;
    for (const ch of chars) {
      const idx = t.indexOf(ch, last + 1);
      if (idx === -1) return 0;
      ok += 1;
      last = idx;
    }
    return 200 + ok * 120;
  }
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return 0;
  let hits = 0;
  for (const w of words) {
    if (t.includes(w)) hits += 1;
  }
  return hits > 0 ? 400 + hits * 200 : 0;
}

/**
 * 按语音里抽出的关键词在标题中匹配一条回忆；无匹配或难分胜负时返回 none / ambiguous。
 */
export function pickMemoryByVoiceQuery(
  memories: VoiceMemoryRow[],
  query: string
): { id: string } | 'none' | 'ambiguous' {
  const q = normalize(query);
  if (!q) return 'none';

  const scored = memories.map((m) => ({
    id: m.id,
    score: scoreTitleMatch(m.title, query),
  }));
  const sorted = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  if (sorted.length === 0) return 'none';

  const best = sorted[0];
  const second = sorted[1];
  if (second && second.score >= best.score * 0.96 && best.score < 9000) {
    return 'ambiguous';
  }
  if (best.score < 180) return 'none';
  return { id: best.id };
}

export async function fetchMemoriesForVoiceMatch(limit = 80): Promise<VoiceMemoryRow[]> {
  const response = await fetch(`${getBackendBaseUrl()}/api/v1/memories?limit=${limit}`);
  const result = (await response.json()) as { data?: unknown[] };
  if (!response.ok) {
    throw new Error('load memories failed');
  }
  const rows: VoiceMemoryRow[] = (result.data || []).map((item: unknown) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id ?? ''),
      title: String(row.title ?? ''),
    };
  });
  return rows.filter((r) => r.id);
}
