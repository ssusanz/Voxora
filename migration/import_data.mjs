#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

function ensureRecord(input, index) {
  const source = input && typeof input === 'object' ? input : {};
  const title =
    typeof source.title === 'string' && source.title.trim().length > 0
      ? source.title.trim()
      : `迁移回忆 ${index + 1}`;
  const memoryDate =
    typeof source.memory_date === 'string' && source.memory_date.trim().length > 0
      ? source.memory_date.trim()
      : new Date().toISOString().slice(0, 10);

  return {
    title,
    memory_date: memoryDate,
    location: typeof source.location === 'string' ? source.location : null,
    weather: typeof source.weather === 'string' ? source.weather : null,
    mood: typeof source.mood === 'string' ? source.mood : null,
    media_keys: Array.isArray(source.media_keys)
      ? source.media_keys.filter((value) => typeof value === 'string' && value.length > 0)
      : null,
    audio_key: typeof source.audio_key === 'string' ? source.audio_key : null,
  };
}

async function main() {
  const baseUrlArg = process.argv[2];
  const dataPathArg = process.argv[3];
  const baseUrl = normalizeBaseUrl(baseUrlArg || process.env.MIGRATION_API_BASE_URL || 'http://localhost:9091');
  const dataPath = dataPathArg
    ? path.resolve(process.cwd(), dataPathArg)
    : path.resolve(CURRENT_DIR, 'memories_data.json');

  const raw = await readFile(dataPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`迁移文件格式错误：${dataPath} 必须是数组`);
  }

  console.log(`开始迁移，共 ${parsed.length} 条数据`);
  console.log(`目标 API: ${baseUrl}/api/v1/memories`);

  for (let index = 0; index < parsed.length; index += 1) {
    const payload = ensureRecord(parsed[index], index);
    const response = await fetch(`${baseUrl}/api/v1/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      const errorMessage =
        (result && typeof result.error === 'string' && result.error) ||
        `HTTP ${response.status}`;
      throw new Error(`第 ${index + 1} 条导入失败：${errorMessage}`);
    }

    console.log(`[${index + 1}/${parsed.length}] 已导入：${payload.title}`);
  }

  console.log('迁移完成');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
