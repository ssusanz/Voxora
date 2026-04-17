import { Router } from 'express';
import { VideoGenerationClient, Config } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();
const videoConfig = new Config();
const videoClient = new VideoGenerationClient(videoConfig);

// 生成 Vlog
router.post('/generate', async (req, res) => {
  try {
    const { memoryIds, title, userId, familyId } = req.body;

    if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
      return res.status(400).json({ error: '请至少选择一个回忆' });
    }

    const client = getSupabaseClient();

    // 获取选中的回忆
    const { data: memories, error } = await client
      .from('memories')
      .select('id, title, date, location')
      .in('id', memoryIds);

    if (error) {
      throw new Error(`查询回忆失败: ${error.message}`);
    }

    if (!memories || memories.length === 0) {
      return res.status(404).json({ error: '未找到选中的回忆' });
    }

    // 构建 prompt，包含所有回忆的信息
    const memoryDescriptions = memories.map((m, index) => {
      return `${index + 1}. ${m.title} - ${m.date} ${m.location}`;
    }).join('\n');

    const prompt = `创作一段温馨的家庭Vlog视频，串联以下美好回忆：
${memoryDescriptions}

视频风格：温暖、治愈、家庭氛围感强，画面流畅自然，配以轻柔的背景音乐`;

    const content = [
      {
        type: 'text' as const,
        text: prompt,
      },
    ];

    // 生成视频
    const response = await videoClient.videoGeneration(content, {
      model: 'doubao-seedance-1-5-pro-251215',
      duration: -1, // 智能选择时长
      ratio: '16:9',
      resolution: '720p',
      generateAudio: true,
      watermark: false,
    });

    if (response.videoUrl) {
      // 保存 Vlog 记录到数据库
      const { data: vlogData, error: insertError } = await client
        .from('vlogs')
        .insert({
          title: title || '我的回忆Vlog',
          video_url: response.videoUrl,
          memory_ids: memoryIds,
          user_id: userId || 'user_1',
          family_id: familyId || 'family_1',
        })
        .select()
        .single();

      if (insertError) {
        console.error('保存 Vlog 记录失败:', insertError);
        // 即使保存失败，也返回视频 URL
        res.json({
          success: true,
          videoUrl: response.videoUrl,
          title: title || '我的回忆Vlog',
          memoryCount: memories.length,
        });
        return;
      }

      res.json({
        success: true,
        videoUrl: response.videoUrl,
        title: vlogData.title,
        memoryCount: memories.length,
        id: vlogData.id,
      });
    } else {
      res.status(500).json({ error: '视频生成失败' });
    }
  } catch (error: any) {
    console.error('生成Vlog失败:', error);
    res.status(500).json({ error: '生成Vlog失败，请稍后重试' });
  }
});

// 获取所有 Vlog
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

// 获取单个 Vlog 详情
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

// 删除 Vlog
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('vlogs')
      .delete()
      .eq('id', id);

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
