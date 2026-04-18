import { getBackendBaseUrl } from '@/utils/backend';

export async function deleteMemoryById(id: string): Promise<{ ok: boolean; error?: string }> {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/v1/memories/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${res.status}` };
  }
  return { ok: true };
}

export async function deleteVlogById(id: string): Promise<{ ok: boolean; error?: string }> {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/v1/vlogs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${res.status}` };
  }
  return { ok: true };
}

/** 从回忆中移除一张图/视频；若删空则删除整条回忆 */
export async function removeMediaUrlFromMemory(
  memoryId: string,
  mediaUrl: string
): Promise<'removed' | 'memory_deleted' | 'error'> {
  const base = getBackendBaseUrl();
  const detailRes = await fetch(`${base}/api/v1/memories/${encodeURIComponent(memoryId)}`);
  if (!detailRes.ok) return 'error';
  const d = (await detailRes.json()) as Record<string, unknown>;
  const existingRaw = d.images;
  const existing = Array.isArray(existingRaw)
    ? existingRaw.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    : [];
  const nextImages = existing.filter((u) => u !== mediaUrl);
  if (nextImages.length === 0) {
    const del = await deleteMemoryById(memoryId);
    return del.ok ? 'memory_deleted' : 'error';
  }
  const putBody = {
    title: String(d.title ?? ''),
    date: String(d.date ?? new Date().toISOString().split('T')[0]),
    location: String(d.location ?? ''),
    weather: String(d.weather ?? 'sunny'),
    mood: String(d.mood ?? 'happy'),
    images: nextImages,
    userId: typeof d.user_id === 'string' ? d.user_id : 'user_1',
    familyId: typeof d.family_id === 'string' ? d.family_id : 'family_1',
    isSealed: Boolean(d.is_sealed),
    unlockDate: d.unlock_date ?? null,
    coverImage: String(nextImages[0] || ''),
  };
  const putRes = await fetch(`${base}/api/v1/memories/${encodeURIComponent(memoryId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody),
  });
  return putRes.ok ? 'removed' : 'error';
}
