import { Router, type Request } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseClient } from '../storage/database/supabase-client';
import {
  buildSlideshowMp4FromUrls,
  collectMemoryImageUrls,
  isFfmpegAvailable,
} from '../vlog-ffmpeg';

const router = Router();

function publicBaseUrl(req: Request): string {
  const xf = req.get('x-forwarded-proto');
  const proto = (xf && xf.split(',')[0].trim()) || req.protocol || 'http';
  const host = req.get('host') || `127.0.0.1:${process.env.PORT || 9091}`;
  return `${proto}://${host}`;
}

/** 使用本机 ffmpeg 将所选回忆的图片合成 MP4，落盘后经 /uploads/local-vlogs 提供访问 */
router.post('/generate', async (req, res) => {
  req.setTimeout(6 * 60 * 1000);
  res.setTimeout(6 * 60 * 1000);
  try {
    const { memoryIds, title, userId, familyId } = req.body as {
      memoryIds?: unknown;
      title?: string;
      userId?: string;
      familyId?: string;
    };

    if (!Array.isArray(memoryIds) || memoryIds.length === 0) {
      return res.status(400).json({ error: '请至少选择一个回忆' });
    }

    const ids = memoryIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    if (ids.length === 0) {
      return res.status(400).json({ error: '回忆 ID 无效' });
    }

    if (!(await isFfmpegAvailable())) {
      return res.status(503).json({
        error: 'VLOG_FFMPEG_MISSING',
        message: '未检测到 ffmpeg。请在服务器安装 ffmpeg 或设置环境变量 FFMPEG_PATH。',
      });
    }

    const client = getSupabaseClient();
    const { data: rows, error } = await client.from('memories').select('*').in('id', ids);

    if (error) {
      throw new Error(error.message);
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: '未找到选中的回忆' });
    }

    const rowById = new Map((rows as Record<string, unknown>[]).map((r) => [r.id as string, r]));
    const orderedUrls: string[] = [];
    for (const id of ids) {
      const row = rowById.get(id);
      if (!row) continue;
      for (const u of collectMemoryImageUrls(row as { cover_image?: string | null; images?: unknown })) {
        if (!orderedUrls.includes(u)) orderedUrls.push(u);
      }
    }

    if (orderedUrls.length === 0) {
      return res.status(400).json({
        error: 'VLOG_NO_IMAGES',
        message: '选中的回忆没有可用的网络图片（需 http(s) 图片链接；纯视频 URL 不会入片）。',
      });
    }

    const outDir = path.resolve(process.cwd(), 'data', 'local-uploads', 'vlogs');
    fs.mkdirSync(outDir, { recursive: true });
    const fileName = `${Date.now()}_vlog_${Math.random().toString(16).slice(2)}.mp4`;
    const outPath = path.join(outDir, fileName);

    await buildSlideshowMp4FromUrls(orderedUrls, outPath);

    const videoUrl = `${publicBaseUrl(req)}/uploads/local-vlogs/${encodeURIComponent(fileName)}`;

    const insertRow = {
      title: (title && String(title).trim()) || '我的回忆 Vlog',
      video_url: videoUrl,
      memory_ids: ids,
      user_id: userId || 'user_1',
      family_id: familyId || 'family_1',
    };

    const { data: vlogData, error: insertError } = await client
      .from('vlogs')
      .insert(insertRow)
      .select()
      .single();

    if (insertError) {
      console.error('保存 Vlog 记录失败:', insertError);
      return res.json({
        success: true,
        videoUrl,
        title: insertRow.title,
        memoryCount: ids.length,
      });
    }

    res.json({
      success: true,
      videoUrl,
      title: vlogData.title,
      memoryCount: ids.length,
      id: vlogData.id,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '生成 Vlog 失败';
    console.error('生成 Vlog 失败:', e);
    res.status(500).json({
      error: 'VLOG_RENDER_FAILED',
      message: msg,
    });
  }
});

/** 将已生成的视频 URL 写入 vlogs 表（用于生成成功但首次入库失败时的补存） */
router.post('/', async (req, res) => {
  try {
    const { videoUrl, title, memoryIds, userId, familyId } = req.body as {
      videoUrl?: unknown;
      title?: string;
      memoryIds?: unknown;
      userId?: string;
      familyId?: string;
    };

    if (typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return res.status(400).json({ error: '缺少有效的 videoUrl' });
    }

    const ids = Array.isArray(memoryIds)
      ? memoryIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];

    const insertRow = {
      title: (title && String(title).trim()) || '我的回忆 Vlog',
      video_url: videoUrl.trim(),
      memory_ids: ids.length > 0 ? ids : [],
      user_id: userId || 'user_1',
      family_id: familyId || 'family_1',
    };

    const client = getSupabaseClient();
    const { data: vlogData, error: insertError } = await client
      .from('vlogs')
      .insert(insertRow)
      .select()
      .single();

    if (insertError) {
      console.error('手动保存 Vlog 失败:', insertError);
      return res.status(500).json({ error: insertError.message || '保存 Vlog 失败' });
    }

    res.status(201).json({
      success: true,
      id: vlogData.id,
      title: vlogData.title,
      videoUrl: vlogData.video_url,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '保存 Vlog 失败';
    console.error('保存 Vlog 失败:', e);
    res.status(500).json({ error: msg });
  }
});

router.get('/', async (req, res) => {
  try {
    const { familyId, page = 1, limit = 20 } = req.query;
    const client = getSupabaseClient();

    let query = client
      .from('vlogs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (familyId) {
      query = query.eq('family_id', familyId);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum - 1;

    const { data, error, count } = await query.range(start, end);

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    res.json({
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error: any) {
    console.error('获取 Vlog 列表失败:', error);
    res.status(500).json({ error: error.message || '获取 Vlog 列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('vlogs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({ error: 'Vlog 不存在' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('获取 Vlog 详情失败:', error);
    res.status(500).json({ error: error.message || '获取 Vlog 详情失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client.from('vlogs').delete().eq('id', id);

    if (error) {
      throw new Error(`删除失败: ${error.message}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('删除 Vlog 失败:', error);
    res.status(500).json({ error: error.message || '删除 Vlog 失败' });
  }
});

export default router;
