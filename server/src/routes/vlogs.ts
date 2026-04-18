import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

const VLOG_GENERATE_DISABLED = {
  error: 'VLOG_GENERATION_DISABLED',
  /** 客户端应优先用 i18n `vlog.generationNotConfigured`；此处供日志或非 i18n 客户端 */
  message: '当前服务器未开启 Vlog 视频自动生成（离线演示）。',
} as const;

router.post('/generate', async (_req, res) => {
  return res.status(501).json(VLOG_GENERATE_DISABLED);
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
