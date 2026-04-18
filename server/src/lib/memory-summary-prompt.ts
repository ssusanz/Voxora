/** 回忆总结：系统指令与用户提示（Gemini / OpenAI 兼容本地服务共用） */

export const MEMORY_SUMMARY_SYSTEM_INSTRUCTION =
  '你是家庭回忆录应用里的中文写作助手，只输出总结正文，不要标题、不要 Markdown 代码块、不要列表符号堆砌。';

export function buildMemorySummaryUserPrompt(memory: Record<string, unknown>): string {
  const title = String(memory.title ?? '').trim() || '（无标题）';
  const date = String(memory.date ?? '').trim();
  const location = String(memory.location ?? '').trim();
  const weather = String(memory.weather ?? '').trim();
  const mood = String(memory.mood ?? '').trim();
  const images = memory.images;
  let imageHint = '';
  if (Array.isArray(images)) {
    imageHint = `\n附图：共 ${images.length} 张`;
  }
  return [
    '请根据以下「家庭回忆」的结构化信息，用 2～4 段自然中文写一段简短总结（约 120～280 字）。',
    '语气温暖、具体；不要逐条复述字段名；不要编造未提供的事实。',
    '',
    `标题：${title}`,
    date ? `日期：${date}` : '',
    location ? `地点：${location}` : '',
    weather ? `天气：${weather}` : '',
    mood ? `心情：${mood}` : '',
    imageHint,
  ]
    .filter(Boolean)
    .join('\n');
}
