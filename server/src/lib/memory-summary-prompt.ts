/** 回忆总结：系统指令与用户提示（Gemini / OpenAI 兼容本地服务共用） */

export const MEMORY_SUMMARY_SYSTEM_INSTRUCTION =
  '你是家庭回忆录应用里的中文写作助手，只输出总结正文，不要标题、不要 Markdown 代码块、不要列表符号堆砌。';

/** 依次尝试多个键名（兼容 snake_case / camelCase） */
function pickString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v == null || v === '') continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

function pickBool(row: Record<string, unknown>, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = row[k];
    if (v === true) return true;
    if (v === false || v == null) continue;
    if (typeof v === 'string' && (v === 'true' || v === '1')) return true;
  }
  return false;
}

function pickNumber(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/** 解析 memories.images / cover（可能是 jsonb 数组或 JSON 字符串） */
function normalizeImageUrls(row: Record<string, unknown>): string[] {
  const raw = row.images ?? row.image_urls;
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t) as unknown;
      if (Array.isArray(p)) {
        return p.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      /* 非 JSON 则忽略 */
    }
  }
  return [];
}

/** App 内英文枚举 → 中文，便于模型理解与卡片文案一致 */
const WEATHER_ZH: Record<string, string> = {
  sunny: '晴',
  cloudy: '多云',
  rainy: '雨',
  snowy: '雪',
  foggy: '雾',
  windy: '风',
};

const MOOD_ZH: Record<string, string> = {
  happy: '开心',
  joy: '幸福',
  calm: '平静',
  love: '充满爱',
  gratitude: '感恩',
  excitement: '兴奋',
  relaxed: '放松',
  joyful: '欢乐',
  missing: '思念',
  anxiety: '焦虑',
  sadness: '伤感',
  warm: '温暖',
};

function labelWeatherOrMood(raw: string, dict: Record<string, string>): string {
  const c = raw.trim();
  if (!c) return '';
  const lower = c.toLowerCase();
  const zh = dict[lower];
  if (zh) return `${c}（${zh}）`;
  return c;
}

export function buildMemorySummaryUserPrompt(memory: Record<string, unknown>): string {
  const title = pickString(memory, 'title').trim() || '（无标题）';
  const date = pickString(memory, 'date', 'created_at');
  const location = pickString(memory, 'location');
  const weather = labelWeatherOrMood(pickString(memory, 'weather'), WEATHER_ZH);
  const mood = labelWeatherOrMood(pickString(memory, 'mood'), MOOD_ZH);
  const coverImage = pickString(memory, 'cover_image', 'coverImage');
  const isQuickMood = pickBool(memory, 'is_quick_mood', 'isQuickMood');
  const isMultiUser = pickBool(memory, 'is_multi_user', 'isMultiUser');
  const userCount = pickNumber(memory, 'user_count', 'userCount');
  const likes = pickNumber(memory, 'likes');
  const isSealed = pickBool(memory, 'is_sealed', 'isSealed');
  const unlockDate = pickString(memory, 'unlock_date', 'unlockDate');

  const imageList = normalizeImageUrls(memory);
  const uniqueUrls = [...new Set([coverImage, ...imageList].filter(Boolean))];
  const mediaCount = uniqueUrls.length;

  const author = pickString(memory, 'author_display_name', 'authorDisplayName');

  const kindLine = isQuickMood
    ? '【记录类型】这是一条「快速心情」记录（可能无标题，以心情为主）。'
    : '【记录类型】这是一条家庭回忆卡片。';

  const lines: string[] = [
    '下面是与 App 中「记忆卡片」一致的结构化事实。请**严格依据这些事实**写 2～4 段中文总结（约 120～320 字），语气温暖、具体；',
    '不要编造未出现的地点、人物或事件；不要逐条复述字段名；若某字段为空则不要臆测。',
    '',
    kindLine,
    '',
    `标题：${title}`,
    author ? `记录者：${author}` : '',
    date ? `日期/时间：${date}` : '',
    location ? `地点：${location}` : '',
    weather ? `天气：${weather}` : '',
    mood ? `心情/情感标签：${mood}` : '',
  ];

  if (likes != null && likes > 0) {
    lines.push(`互动：约 ${likes} 次点赞（反映家人对这条回忆的共鸣）。`);
  }
  if (isMultiUser && userCount != null && userCount > 1) {
    lines.push(`参与：多人相关记录，约 ${userCount} 人参与。`);
  }
  if (mediaCount > 0) {
    lines.push(`媒体：共有 ${mediaCount} 张与封面相关的图片或视频（用户卡片上可见照片墙）。总结时可自然提到「留下了影像」之类，但不要编造画面细节。`);
  }
  if (isSealed) {
    lines.push(
      unlockDate
        ? `其它：本条为封存/时光胶囊类回忆，解锁时间：${unlockDate}。总结里可轻轻点到「封存」即可，不要展开未发生的内容。`
        : '其它：本条为封存类回忆。总结里可轻轻点到「封存」即可，不要展开未发生的内容。'
    );
  }

  return lines.filter(Boolean).join('\n');
}
