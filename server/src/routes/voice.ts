import { Router } from 'express';
import { extractSimpleMemoryInfo } from '../voice-memory-heuristics';
import { geminiTranscribeAudioBase64, isGeminiTranscribeConfigured } from '../lib/gemini-transcribe';

const router = Router();

const ASR_DISABLED = {
  error: 'VOICE_ASR_DISABLED',
  message:
    'Server-side speech recognition is not enabled. Set GEMINI_API_KEY on the server, or use a dev build with on-device speech. 服务端未配置 GEMINI_API_KEY，无法云端转写。',
} as const;

// 语音识别：Gemini 多模态短音频转写（Expo Go / 无本机模块时由客户端上传）
router.post('/transcribe', async (req, res) => {
  if (!isGeminiTranscribeConfigured()) {
    return res.status(503).json(ASR_DISABLED);
  }
  try {
    const { audio, mimeType, filename } = req.body as {
      audio?: string;
      mimeType?: string;
      filename?: string;
    };
    if (typeof audio !== 'string' || !audio.trim()) {
      return res.status(400).json({ error: '缺少 audio 字段' });
    }
    const mt =
      typeof mimeType === 'string' && mimeType.trim()
        ? mimeType.trim()
        : typeof filename === 'string' && filename.toLowerCase().endsWith('.webm')
          ? 'audio/webm'
          : 'audio/m4a';
    const transcription = await geminiTranscribeAudioBase64(mt, audio);
    return res.json({ transcription });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '转写失败';
    console.error('[voice/transcribe]', msg);
    return res.status(500).json({ error: msg });
  }
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

// 录音 + 识别 + 提取
router.post('/transcribe-and-extract', async (req, res) => {
  if (!isGeminiTranscribeConfigured()) {
    return res.status(503).json(ASR_DISABLED);
  }
  try {
    const { audio, mimeType, filename } = req.body as {
      audio?: string;
      mimeType?: string;
      filename?: string;
    };
    if (typeof audio !== 'string' || !audio.trim()) {
      return res.status(400).json({ error: '缺少 audio 字段' });
    }
    const mt =
      typeof mimeType === 'string' && mimeType.trim()
        ? mimeType.trim()
        : typeof filename === 'string' && filename.toLowerCase().endsWith('.webm')
          ? 'audio/webm'
          : 'audio/m4a';
    const transcription = await geminiTranscribeAudioBase64(mt, audio);
    const extractedInfo = extractSimpleMemoryInfo(transcription);
    return res.json({ transcription, extractedInfo });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '处理失败';
    console.error('[voice/transcribe-and-extract]', msg);
    return res.status(500).json({ error: msg });
  }
});

export default router;
