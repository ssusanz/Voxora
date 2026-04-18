import { Router } from 'express';

const router = Router();

const VIDEO_DISABLED = {
  error: 'VIDEO_GENERATION_DISABLED',
  message:
    'Image-to-video is not configured on this server. 当前服务器未配置图生视频（已移除原厂商绑定）。',
} as const;

// 唤醒回忆（图片转视频）— 占位：避免调用已移除的上游 SDK
router.post('/awaken', async (_req, res) => {
  return res.status(501).json(VIDEO_DISABLED);
});

export default router;
