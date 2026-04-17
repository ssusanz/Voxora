import { Router } from 'express';
import { LLMClient, Config, ASRClient } from 'coze-coding-dev-sdk';

/** 与 coze-coding-dev-sdk README 一致；需由 `server/src/load-env.ts` 在路由模块加载前注入 process.env */
function createCozeConfigFromEnv(): Config {
  const baseUrl = (process.env.COZE_INTEGRATION_BASE_URL || '').trim();
  const modelBaseUrl = (
    process.env.COZE_INTEGRATION_MODEL_BASE_URL ||
    process.env.COZE_INTEGRATION_BASE_URL ||
    ''
  ).trim();
  return new Config({
    apiKey: (process.env.COZE_WORKLOAD_IDENTITY_API_KEY || '').trim(),
    baseUrl,
    modelBaseUrl,
  });
}

function cozeAsrEnvReady(): { ok: true } | { ok: false; message: string } {
  const apiKey = (process.env.COZE_WORKLOAD_IDENTITY_API_KEY || '').trim();
  const baseUrl = (process.env.COZE_INTEGRATION_BASE_URL || '').trim();
  const modelBaseUrl = (
    process.env.COZE_INTEGRATION_MODEL_BASE_URL ||
    process.env.COZE_INTEGRATION_BASE_URL ||
    ''
  ).trim();
  if (!apiKey) {
    return {
      ok: false,
      message:
        '未配置 COZE_WORKLOAD_IDENTITY_API_KEY。请在 .env 或部署环境中设置（与 coze-coding-dev-sdk 文档一致）。',
    };
  }
  if (!baseUrl) {
    return {
      ok: false,
      message:
        '未配置 COZE_INTEGRATION_BASE_URL。ASR 需要有效的集成网关地址（例如 https://api.coze.com）。',
    };
  }
  try {
    new URL(baseUrl);
    if (modelBaseUrl) new URL(modelBaseUrl);
  } catch {
    return {
      ok: false,
      message: 'COZE_INTEGRATION_BASE_URL 或 COZE_INTEGRATION_MODEL_BASE_URL 不是合法 URL。',
    };
  }
  return { ok: true };
}

function isAsrEndpointOrConfigError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? `${err.message} ${err.cause instanceof Error ? err.cause.message : ''}`
      : String(err);
  return /invalid url|invalid\s+url|asr.*url|missing.*url|ENOTFOUND|ECONNREFUSED|fetch failed|api key is required/i.test(
    msg
  );
}

const router = Router();
const llmConfig = createCozeConfigFromEnv();
const llmClient = new LLMClient(llmConfig);
const asrClient = new ASRClient(llmConfig);

// 语音识别接口（接收 Base64 格式）
router.post('/transcribe', async (req, res) => {
  try {
    console.log('收到语音识别请求');

    const { audio, filename, mimeType } = req.body;

    if (!audio) {
      console.log('错误：未提供音频数据');
      return res.status(400).json({ error: '未提供音频数据' });
    }

    console.log('音频数据信息：', {
      filename: filename || 'unknown',
      mimeType: mimeType || 'unknown',
      base64Length: audio.length,
    });

    const asrReady = cozeAsrEnvReady();
    if (!asrReady.ok) {
      console.warn('ASR 环境未就绪:', asrReady.message);
      return res.status(503).json({
        error: '语音识别服务未配置',
        message: asrReady.message,
      });
    }

    // 调用 ASR 进行语音识别
    console.log('调用 ASR 语音识别...');
    const asrResult = await asrClient.recognize({
      uid: 'user_' + Date.now(),
      base64Data: audio,
    });

    console.log('语音识别成功:', asrResult.text);
    console.log('音频时长:', asrResult.duration ? `${asrResult.duration / 1000}秒` : '未知');

    res.json({
      transcription: asrResult.text,
      duration: asrResult.duration ? Math.floor(asrResult.duration / 1000) : undefined,
      utterances: asrResult.utterances,
    });

  } catch (error: any) {
    console.error('语音识别失败:', error);
    console.error('错误详情:', error.message);

    if (isAsrEndpointOrConfigError(error)) {
      return res.status(503).json({
        error: '语音识别服务未配置',
        message:
          'ASR 服务端点无效或未配置。请在运行环境中配置 Coze / ASR 所需的环境变量，或联系管理员。',
      });
    }

    res.status(500).json({
      error: '语音识别失败',
      message: error.message || 'ASR 服务异常',
    });
  }
});

// 智能提取回忆信息
router.post('/extract-memory-info', async (req, res) => {
  try {
    const { transcription } = req.body;

    if (!transcription) {
      return res.status(400).json({ error: '未提供转录文本' });
    }

    // 使用 LLM 智能提取回忆信息
    const messages = [
      {
        role: 'system' as const,
        content: `你是一个专业的回忆信息提取助手。请从用户提供的文本中提取以下信息，并以JSON格式返回。

提取字段：
1. title: 回忆标题（简洁概括，不超过20字）
2. emotion: 情绪类型（枚举值：happy, sad, excited, relaxed, joyful, calm, anxious, tired）
3. color: 颜色类型（枚举值：warm, cool, neutral, vibrant, muted）
4. weather: 天气类型（枚举值：sunny, cloudy, rainy, snowy, foggy, stormy）
5. sensory: 感官类型（枚举值：visual, auditory, olfactory, tactile, gustatory）

请只返回JSON格式，不要包含其他文字。`,
      },
      {
        role: 'user' as const,
        content: `请从以下文本中提取回忆信息：\n${transcription}`,
      },
    ];

    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.3,
    });

    // 尝试解析 LLM 返回的 JSON
    let extractedInfo;
    try {
      // 提取 JSON 部分（LLM 可能会返回一些额外的文本）
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析 JSON');
      }
    } catch (error) {
      console.error('解析 LLM 响应失败:', error);
      // 返回默认值
      extractedInfo = {
        title: transcription.substring(0, 20),
        emotion: 'happy',
        color: 'neutral',
        weather: 'sunny',
        sensory: 'visual',
      };
    }

    res.json({
      transcription,
      extractedInfo,
    });

  } catch (error: any) {
    console.error('提取回忆信息失败:', error);
    res.status(500).json({ error: '提取回忆信息失败，请稍后重试' });
  }
});

// 完整的语音输入流程（录音 + 识别 + 提取，接收 Base64 格式）
router.post('/transcribe-and-extract', async (req, res) => {
  try {
    console.log('收到完整语音处理请求');

    const { audio, filename, mimeType } = req.body;

    if (!audio) {
      console.log('错误：未提供音频数据');
      return res.status(400).json({ error: '未提供音频数据' });
    }

    console.log('音频数据信息：', {
      filename: filename || 'unknown',
      mimeType: mimeType || 'unknown',
      base64Length: audio.length,
    });

    const asrReady = cozeAsrEnvReady();
    if (!asrReady.ok) {
      console.warn('ASR 环境未就绪:', asrReady.message);
      return res.status(503).json({
        error: '语音识别服务未配置',
        message: asrReady.message,
      });
    }

    // 步骤1：语音识别
    console.log('步骤1：开始语音识别...');

    // 调用 ASR 进行语音识别（audio 已经是 Base64 格式）
    console.log('调用 ASR 语音识别...');
    const asrResult = await asrClient.recognize({
      uid: 'user_' + Date.now(),
      base64Data: audio,
    });

    console.log('语音识别成功:', asrResult.text);

    // 检查是否有有效识别结果
    if (!asrResult.text || asrResult.text.trim() === '') {
      console.log('ASR 未识别到有效语音内容');
      return res.json({
        transcription: '',
        extractedInfo: null,
      });
    }

    const transcription = asrResult.text;

    // 步骤2：智能提取信息
    console.log('步骤2：开始智能提取信息...');
    const messages = [
      {
        role: 'system' as const,
        content: `你是一个专业的回忆信息提取助手。请从用户提供的文本中提取以下信息，并以JSON格式返回。

提取字段：
1. title: 回忆标题（简洁概括，不超过20字）
2. emotion: 情绪类型（枚举值：happy, sad, excited, relaxed, joyful, calm, anxious, tired）
3. color: 颜色类型（枚举值：warm, cool, neutral, vibrant, muted）
4. weather: 天气类型（枚举值：sunny, cloudy, rainy, snowy, foggy, stormy）
5. sensory: 感官类型（枚举值：visual, auditory, olfactory, tactile, gustatory）

请只返回JSON格式，不要包含其他文字。`,
      },
      {
        role: 'user' as const,
        content: `请从以下文本中提取回忆信息：\n${transcription}`,
      },
    ];

    let extractedInfo: any = null;
    try {
      const response = await llmClient.invoke(messages, {
        model: 'doubao-seed-2-0-lite-260215',
        temperature: 0.3,
      });

      console.log('LLM 响应:', response.content);

      // 尝试解析 LLM 返回的 JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedInfo = JSON.parse(jsonMatch[0]);
        console.log('提取的信息:', extractedInfo);
      } else {
        console.log('无法从 LLM 响应中解析 JSON，extractedInfo 保持为 null');
      }
    } catch (extractError: any) {
      console.error('提取回忆信息失败:', extractError);
      // LLM 失败时不使用兜底默认值，保持为 null
    }

    res.json({
      transcription,
      extractedInfo,
    });

  } catch (error: any) {
    console.error('语音处理失败:', error);

    if (isAsrEndpointOrConfigError(error)) {
      return res.status(503).json({
        error: '语音识别服务未配置',
        message:
          'ASR 服务端点无效或未配置。请在运行环境中配置 Coze / ASR 所需的环境变量，或联系管理员。',
      });
    }

    res.status(500).json({ error: '语音处理失败，请稍后重试' });
  }
});

export default router;
