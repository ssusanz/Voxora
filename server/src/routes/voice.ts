import { Router } from 'express';
import { extractSimpleMemoryInfo } from '../voice-memory-heuristics';

const router = Router();

const ASR_DISABLED = {
  error: 'VOICE_ASR_DISABLED',
  message:
    'Server-side speech recognition is not enabled. Please type your memory, or add on-device speech (e.g. dev build with a speech library). 服务端未启用语音识别，请改用文字输入。',
} as const;

// 语音识别（原依赖上游 ASR；已移除，避免绑定特定区域云）
router.post('/transcribe', async (_req, res) => {
  return res.status(501).json(ASR_DISABLED);
});

// 从已有文本提取回忆字段（无 LLM，规则提取）
router.post('/extract-memory-info', async (req, res) => {
  try {
    const { transcription } = req.body;

    if (!transcription || typeof transcription !== 'string') {
      return res.status(400).json({ error: '未提供转录文本' });
    }

    const extractedInfo = extractSimpleMemoryInfo(transcription);

    res.json({
      transcription,
      extractedInfo,
    });
  } catch (error: any) {
    console.error('提取回忆信息失败:', error);
    res.status(500).json({ error: '提取回忆信息失败，请稍后重试' });
  }
});

// 录音 + 识别 + 提取：识别环节已关闭
router.post('/transcribe-and-extract', async (_req, res) => {
  return res.status(501).json(ASR_DISABLED);
});

export default router;
