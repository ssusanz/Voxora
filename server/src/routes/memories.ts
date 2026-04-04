import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';

const router = Router();

interface MemoryRecord {
  id: number;
  title: string;
  memory_date: string;
  location: string | null;
  weather: string | null;
  mood: string | null;
  media_keys: string[] | null;
  audio_key: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

let demoMemoriesCache: MemoryRecord[] | null = null;

function getSupabaseClientOrNull() {
  try {
    return getSupabaseClient();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[memories] Supabase unavailable, using demo dataset: ${reason}`);
    return null;
  }
}

async function loadDemoMemories(): Promise<MemoryRecord[]> {
  if (demoMemoriesCache) {
    return demoMemoriesCache;
  }

  const demoFilePath = path.resolve(process.cwd(), '../migration/memories_data.json');
  const raw = await fs.readFile(demoFilePath, 'utf-8');
  const parsed = JSON.parse(raw) as MemoryRecord[];
  demoMemoriesCache = parsed
    .slice()
    .sort(
      (a, b) => new Date(b.memory_date).getTime() - new Date(a.memory_date).getTime()
    );
  return demoMemoriesCache;
}

async function attachMediaUrls(memory: MemoryRecord) {
  const media_urls = (memory.media_keys ?? []).map((key) => `/mock-storage/${key}`);
  const audio_url = memory.audio_key ? `/mock-storage/${memory.audio_key}` : null;
  return {
    ...memory,
    media_urls,
    audio_url,
  };
}

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 获取所有回忆（按时间逆序）
router.get('/', async (req, res) => {
  try {
    const client = getSupabaseClientOrNull();

    if (!client) {
      const demoData = await loadDemoMemories();
      const memoriesWithUrls = await Promise.all(demoData.map(attachMediaUrls));
      return res.json({ success: true, data: memoriesWithUrls });
    }

    const { data, error } = await client
      .from('memories')
      .select('*')
      .order('memory_date', { ascending: false });

    if (error) throw new Error(`查询失败: ${error.message}`);

    // 为每条回忆生成媒体文件的访问 URL
    const memoriesWithUrls = await Promise.all(
      (data || []).map(async (memory: any) => {
        let media_urls: string[] = [];
        let audio_url: string | null = null;

        // 生成媒体文件 URL
        if (memory.media_keys && memory.media_keys.length > 0) {
          media_urls = await Promise.all(
            memory.media_keys.map((key: string) =>
              storage.generatePresignedUrl({ key, expireTime: 86400 })
            )
          );
        }

        // 生成音频文件 URL
        if (memory.audio_key) {
          audio_url = await storage.generatePresignedUrl({
            key: memory.audio_key,
            expireTime: 86400,
          });
        }

        return {
          ...memory,
          media_urls,
          audio_url,
        };
      })
    );

    return res.json({ success: true, data: memoriesWithUrls });
  } catch (err: any) {
    console.error('获取回忆列表失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取单个回忆
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClientOrNull();

    if (!client) {
      const demoData = await loadDemoMemories();
      const target = demoData.find((memory) => String(memory.id) === String(id));
      if (!target) {
        return res.status(404).json({ success: false, error: '回忆不存在' });
      }
      const payload = await attachMediaUrls(target);
      return res.json({ success: true, data: payload });
    }

    const { data, error } = await client
      .from('memories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return res.status(404).json({ success: false, error: '回忆不存在' });
    }

    // 生成媒体文件 URL
    let media_urls: string[] = [];
    let audio_url: string | null = null;

    if (data.media_keys && data.media_keys.length > 0) {
      media_urls = await Promise.all(
        data.media_keys.map((key: string) =>
          storage.generatePresignedUrl({ key, expireTime: 86400 })
        )
      );
    }

    if (data.audio_key) {
      audio_url = await storage.generatePresignedUrl({
        key: data.audio_key,
        expireTime: 86400,
      });
    }

    return res.json({
      success: true,
      data: {
        ...data,
        media_urls,
        audio_url,
      },
    });
  } catch (err: any) {
    console.error('获取回忆详情失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 创建回忆
router.post('/', async (req, res) => {
  try {
    const client = getSupabaseClientOrNull();
    const { title, memory_date, location, weather, mood, media_keys, audio_key } = req.body;

    if (!title || !memory_date) {
      return res.status(400).json({ success: false, error: '标题和回忆日期为必填项' });
    }

    if (!client) {
      const demoData = await loadDemoMemories();
      const nextId =
        demoData.length > 0
          ? Math.max(...demoData.map((item) => Number(item.id) || 0)) + 1
          : 1;
      const newMemory: MemoryRecord = {
        id: nextId,
        title,
        memory_date,
        location: location ?? null,
        weather: weather ?? null,
        mood: mood ?? null,
        media_keys: media_keys ?? null,
        audio_key: audio_key ?? null,
        created_at: new Date().toISOString(),
        updated_at: null,
      };
      demoData.unshift(newMemory);
      return res.json({ success: true, data: newMemory });
    }

    const { data, error } = await client
      .from('memories')
      .insert({
        title,
        memory_date,
        location,
        weather,
        mood,
        media_keys,
        audio_key,
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('创建回忆失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新回忆
router.put('/:id', async (req, res) => {
  try {
    const client = getSupabaseClientOrNull();
    const { id } = req.params;
    const { title, memory_date, location, weather, mood, media_keys, audio_key } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (memory_date !== undefined) updateData.memory_date = memory_date;
    if (location !== undefined) updateData.location = location;
    if (weather !== undefined) updateData.weather = weather;
    if (mood !== undefined) updateData.mood = mood;
    if (media_keys !== undefined) updateData.media_keys = media_keys;
    if (audio_key !== undefined) updateData.audio_key = audio_key;

    if (!client) {
      const demoData = await loadDemoMemories();
      const index = demoData.findIndex((item) => String(item.id) === String(id));
      if (index < 0) {
        return res.status(404).json({ success: false, error: '回忆不存在' });
      }
      const updated = {
        ...demoData[index],
        ...updateData,
      };
      demoData[index] = updated;
      return res.json({ success: true, data: updated });
    }

    const { data, error } = await client
      .from('memories')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) {
      return res.status(404).json({ success: false, error: '回忆不存在' });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('更新回忆失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除回忆
router.delete('/:id', async (req, res) => {
  try {
    const client = getSupabaseClientOrNull();
    const { id } = req.params;

    if (!client) {
      const demoData = await loadDemoMemories();
      const index = demoData.findIndex((item) => String(item.id) === String(id));
      if (index < 0) {
        return res.status(404).json({ success: false, error: '回忆不存在' });
      }
      demoData.splice(index, 1);
      return res.json({ success: true, message: '回忆已删除（demo 数据）' });
    }

    // 先查询回忆，获取媒体文件的 key
    const { data: memory, error: queryError } = await client
      .from('memories')
      .select('media_keys, audio_key')
      .eq('id', id)
      .maybeSingle();

    if (queryError) throw new Error(`查询失败: ${queryError.message}`);
    if (!memory) {
      return res.status(404).json({ success: false, error: '回忆不存在' });
    }

    // 删除数据库记录
    const { error: deleteError } = await client.from('memories').delete().eq('id', id);

    if (deleteError) throw new Error(`删除失败: ${deleteError.message}`);

    // 删除关联的媒体文件
    if (memory.media_keys && memory.media_keys.length > 0) {
      await Promise.all(
        memory.media_keys.map((key: string) => storage.deleteFile({ fileKey: key }))
      );
    }

    if (memory.audio_key) {
      await storage.deleteFile({ fileKey: memory.audio_key });
    }

    return res.json({ success: true, message: '回忆已删除' });
  } catch (err: any) {
    console.error('删除回忆失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
