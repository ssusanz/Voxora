import { Router } from 'express';
import { VideoGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

// 唤醒回忆（图片转视频）
router.post('/awaken', async (req, res) => {
  try {
    const { imageUrl, memoryId, prompt } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: '图片 URL 不能为空' });
    }

    console.log('开始生成唤醒视频:', { imageUrl, memoryId });

    // 提取请求头（必需，用于正确传递认证和上下文）
    const headersRecord: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headersRecord[key] = value;
      } else if (Array.isArray(value)) {
        headersRecord[key] = value[0] as string;
      }
    }
    const customHeaders = HeaderUtils.extractForwardHeaders(headersRecord);

    // 初始化客户端
    const config = new Config();
    const videoClient = new VideoGenerationClient(config, customHeaders);

    // 构建内容：第一帧图片 + 描述文字
    const content = [
      {
        type: 'image_url' as const,
        image_url: {
          url: imageUrl,
        },
        role: 'first_frame' as const,
      },
      {
        type: 'text' as const,
        text: prompt || '照片缓缓动起来，温暖的光线流转，仿佛时光在回溯',
      },
    ];

    // 调用视频生成 API（duration: 4-12秒）
    let response: any;
    try {
      response = await videoClient.videoGeneration(content, {
        model: 'doubao-seedance-1-5-pro-251215',
        duration: 4, // 最小4秒
        ratio: '1:1', // 正方形比例
        watermark: true,
        generateAudio: true, // 生成配乐
      });
    } catch (e: any) {
      // In some demo/self-hosted setups, the upstream Coze video endpoint may be unconfigured.
      // The SDK may throw "Invalid URL" when its base endpoint is missing/invalid.
      const msg = e?.message || '视频生成服务不可用';
      console.error('视频生成调用失败:', msg);
      return res.status(501).json({
        error: msg.includes('Invalid URL')
          ? '视频生成服务未配置（上游返回 Invalid URL）'
          : msg,
      });
    }

    console.log('视频生成响应:', response);

    if (!response.videoUrl) {
      throw new Error('视频生成失败');
    }

    // 如果提供了 memoryId，更新回忆数据
    if (memoryId) {
      const client = getSupabaseClient();
      
      // 先获取现有回忆
      const { data: existingMemory, error: fetchError } = await client
        .from('memories')
        .select('images')
        .eq('id', memoryId)
        .maybeSingle();

      if (fetchError) {
        console.error('获取回忆失败:', fetchError);
      } else if (existingMemory) {
        // 将视频 URL 添加到 images 数组
        const existingImages = existingMemory.images || [];
        const newImages = [...existingImages, response.videoUrl];

        await client
          .from('memories')
          .update({
            images: newImages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', memoryId);

        console.log('视频已保存到回忆:', memoryId);
      }
    }

    res.json({
      success: true,
      videoUrl: response.videoUrl,
      message: '唤醒成功！回忆已被唤醒',
    });
  } catch (error: any) {
    console.error('唤醒回忆失败:', error);
    res.status(500).json({ 
      error: error.message || '唤醒回忆失败',
      details: error.response?.data || null,
    });
  }
});

export default router;
