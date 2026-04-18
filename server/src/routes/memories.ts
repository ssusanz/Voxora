import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

/** 根据回忆字段生成本地模板总结（不依赖任何区域锁定的云端大模型） */
function buildTemplateMemorySummary(memory: {
  title?: string | null;
  date?: string | null;
  location?: string | null;
  weather?: string | null;
  mood?: string | null;
}): string {
  const title = (memory.title || '这段回忆').trim();
  const date = (memory.date || '').trim();
  const loc = (memory.location || '').trim();
  const weather = (memory.weather || '').trim();
  const mood = (memory.mood || '').trim();
  const bits: string[] = [`「${title}」`];
  if (date) bits.push(`记录在 ${date}`);
  if (loc) bits.push(`地点是 ${loc}`);
  if (weather) bits.push(`天气 ${weather}`);
  if (mood) bits.push(`心情 ${mood}`);
  return `${bits.join('，')}。\n\n这是一段值得慢慢回味的家庭瞬间。以上为根据回忆信息整理的模板总结；若后续接入自建或全球化 AI 服务，可替换为个性化文案与配图。`;
}

const router = Router();

// 获取所有回忆（按时间倒序，过滤隐藏）
router.get('/', async (req, res) => {
  try {
    const { familyId, page = 1, limit = 20 } = req.query;
    const client = getSupabaseClient();

    let query = client
      .from('memories')
      .select(`
        *,
        users:user_id (name)
      `, { count: 'exact' })
      .eq('is_hidden', false) // 过滤已隐藏的回忆
      .order('created_at', { ascending: false }); // 按创建时间倒序

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

    // 格式化返回数据，提取用户名称
    const formattedData = (data || []).map(item => ({
      ...item,
      user_name: item.users?.name || '家人',
    }));

    res.json({
      data: formattedData,
      total: count || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error: any) {
    console.error('获取回忆列表失败:', error);
    res.status(500).json({ error: error.message || '获取回忆列表失败' });
  }
});

// 获取单个回忆详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('memories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({ error: '回忆不存在' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('获取回忆详情失败:', error);
    res.status(500).json({ error: error.message || '获取回忆详情失败' });
  }
});

// 创建回忆
router.post('/', async (req, res) => {
  try {
    const { title, date, location, weather, mood, images, userId, familyId, isSealed, unlockDate } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: '标题和日期不能为空' });
    }

    const client = getSupabaseClient();
    const newMemory = {
      title,
      cover_image: images?.[0] || '',
      date,
      location: location || '',
      is_multi_user: false,
      user_count: 1,
      weather: weather || 'sunny',
      mood: mood || 'happy',
      images: images || [],
      user_id: userId || 'user_1',
      family_id: familyId || 'family_1',
      likes: 0,
      is_sealed: isSealed || false,
      unlock_date: unlockDate || null,
    };

    const { data, error } = await client
      .from('memories')
      .insert(newMemory)
      .select()
      .single();

    if (error) {
      throw new Error(`插入失败: ${error.message}`);
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('创建回忆失败:', error);
    res.status(500).json({ error: error.message || '创建回忆失败' });
  }
});

// 心情快速记录（无需标题，只需心情和用户信息）
router.post('/quick-mood', async (req, res) => {
  console.log('收到快速心情记录请求:', req.body);
  try {
    const { mood, userId, familyId } = req.body;

    if (!mood) {
      console.log('错误：心情不能为空');
      return res.status(400).json({ error: '心情不能为空' });
    }

    console.log('开始创建心情记录:', { mood, userId, familyId });

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    const newMemory = {
      title: '', // 心情类回忆不需要标题
      cover_image: '',
      date: now,
      location: '',
      is_multi_user: false,
      user_count: 1,
      weather: 'sunny',
      mood: mood,
      images: [],
      user_id: userId || 'user_1',
      family_id: familyId || 'family_1',
      likes: 0,
      is_sealed: false,
      unlock_date: null,
      is_quick_mood: true, // 标识为心情快速记录
    };

    console.log('准备插入数据库:', newMemory);

    const { data, error } = await client
      .from('memories')
      .insert(newMemory)
      .select()
      .single();

    if (error) {
      console.error('数据库插入失败:', error);
      throw new Error(`插入失败: ${error.message}`);
    }

    console.log('心情记录创建成功:', data);
    res.status(201).json(data);
  } catch (error: any) {
    console.error('心情快速记录失败:', error);
    res.status(500).json({ error: error.message || '心情快速记录失败' });
  }
});

// 隐藏回忆
router.post('/:id/hide', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('memories')
      .update({
        is_hidden: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`隐藏失败: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({ error: '回忆不存在' });
    }

    res.json({ success: true, message: '回忆已隐藏', data });
  } catch (error: any) {
    console.error('隐藏回忆失败:', error);
    res.status(500).json({ error: error.message || '隐藏回忆失败' });
  }
});

// 取消隐藏回忆
router.post('/:id/unhide', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('memories')
      .update({
        is_hidden: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`取消隐藏失败: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({ error: '回忆不存在' });
    }

    res.json({ success: true, message: '回忆已取消隐藏', data });
  } catch (error: any) {
    console.error('取消隐藏回忆失败:', error);
    res.status(500).json({ error: error.message || '取消隐藏回忆失败' });
  }
});

// 更新回忆
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, location, weather, mood, images, userId, familyId, isSealed, unlockDate, coverImage } = req.body;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('memories')
      .update({
        title,
        date,
        location,
        weather,
        mood,
        images,
        cover_image: coverImage || images?.[0] || '',
        user_id: userId,
        family_id: familyId,
        is_sealed: isSealed || false,
        unlock_date: unlockDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新失败: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({ error: '回忆不存在' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('更新回忆失败:', error);
    res.status(500).json({ error: error.message || '更新回忆失败' });
  }
});

// 删除回忆
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`删除失败: ${error.message}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('删除回忆失败:', error);
    res.status(500).json({ error: error.message || '删除回忆失败' });
  }
});

// 点赞回忆
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    // 先获取当前点赞数
    const { data: memory, error: fetchError } = await client
      .from('memories')
      .select('likes')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`查询失败: ${fetchError.message}`);
    }

    if (!memory) {
      return res.status(404).json({ error: '回忆不存在' });
    }

    // 更新点赞数
    const newLikes = (memory.likes || 0) + 1;
    const { error: updateError } = await client
      .from('memories')
      .update({ likes: newLikes })
      .eq('id', id);

    if (updateError) {
      throw new Error(`更新失败: ${updateError.message}`);
    }

    res.json({ likes: newLikes });
  } catch (error: any) {
    console.error('点赞失败:', error);
    res.status(500).json({ error: error.message || '点赞失败' });
  }
});

// 添加评论
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, content } = req.body;

    // 检查回忆是否存在
    const client = getSupabaseClient();
    const { data: memory, error } = await client
      .from('memories')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    if (!memory) {
      return res.status(404).json({ error: '回忆不存在' });
    }

    // 暂时返回模拟评论（后续可以创建 comments 表）
    const comment = {
      id: `comment_${Date.now()}`,
      userId,
      userName,
      content,
      timestamp: '刚刚',
    };

    res.status(201).json(comment);
  } catch (error: any) {
    console.error('添加评论失败:', error);
    res.status(500).json({ error: error.message || '添加评论失败' });
  }
});

// AI 总结回忆
router.post('/:id/summarize', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data: memory, error } = await client
      .from('memories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    if (!memory) {
      return res.status(404).json({ error: '回忆不存在' });
    }

    return res.json({
      summary: buildTemplateMemorySummary(memory),
      imageUrl: null,
      stub: true,
    });
  } catch (error: any) {
    console.error('生成回忆总结失败:', error);
    res.status(500).json({
      error: '生成总结失败，请稍后重试',
      message: typeof error?.message === 'string' ? error.message : undefined,
    });
  }
});

// 添加情感反应（语音互动）
router.post('/:id/reactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId, message, emotion } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: '家庭成员 ID 不能为空' });
    }

    // 检查回忆是否存在
    const client = getSupabaseClient();
    const { data: memory, error: fetchError } = await client
      .from('memories')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`查询失败: ${fetchError.message}`);
    }

    if (!memory) {
      return res.status(404).json({ error: '回忆不存在' });
    }

    // 暂时返回模拟反应数据（后续可以创建 reactions 表）
    const reaction = {
      id: `reaction_${Date.now()}`,
      memoryId: id,
      memberId,
      message: message || '',
      emotion: emotion || 'calm',
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(reaction);
  } catch (error: any) {
    console.error('添加情感反应失败:', error);
    res.status(500).json({ error: error.message || '添加情感反应失败' });
  }
});

export default router;
