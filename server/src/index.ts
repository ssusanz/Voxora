import './load-env';
import path from 'path';
import { isGeminiSummarizeConfigured } from './lib/gemini-summarize';
import { isLocalLlmSummarizeConfigured } from './lib/local-llm-summarize';
import { getSupabaseServiceRoleKey } from './storage/database/supabase-client';
import express from "express";
import cors from "cors";
import memoriesRouter from "./routes/memories";
import familiesRouter from "./routes/families";
import petsRouter from "./routes/pets";
import vlogsRouter from "./routes/vlogs";
import voiceRouter from "./routes/voice";
import uploadRouter from "./routes/upload";
import videoRouter from "./routes/video";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 未配置对象存储时，upload 路由会把图片落盘到此目录并通过该 URL 对外提供（仅适合开发/演示）
const localMemoryUploadDir = path.join(path.resolve(process.cwd(), 'data', 'local-uploads', 'memories'));
const localVlogUploadDir = path.join(path.resolve(process.cwd(), 'data', 'local-uploads', 'vlogs'));
app.use('/uploads/local-memories', express.static(localMemoryUploadDir));
app.use('/uploads/local-vlogs', express.static(localVlogUploadDir));

// Health check（summarize 字段便于确认当前进程是否读到 Gemini / 本地 LLM 环境变量）
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    summarize: {
      gemini: isGeminiSummarizeConfigured(),
      localLlm: isLocalLlmSummarizeConfigured(),
    },
    supabase: {
      /** 未配置时列表走 anon，若 RLS 禁止读 memories 会得到空数组 */
      memoriesListUsesServiceRole: Boolean(getSupabaseServiceRoleKey()),
    },
  });
});

// API Routes
app.use('/api/v1/memories', memoriesRouter);
app.use('/api/v1/families', familiesRouter);
app.use('/api/v1/pets', petsRouter);
app.use('/api/v1/vlogs', vlogsRouter);
app.use('/api/v1/voice', voiceRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/video', videoRouter);

// User routes (简化版)
app.get('/api/v1/users/me', (req, res) => {
  res.json({
    id: '1',
    name: '小明',
    email: 'xiaoming@example.com',
    familyId: 'family_1',
    avatar: '',
    createdAt: '2023-01-15T00:00:00Z',
  });
});

app.put('/api/v1/users/me', (req, res) => {
  const { name, avatar } = req.body;
  res.json({
    id: '1',
    name: name || '小明',
    email: 'xiaoming@example.com',
    familyId: 'family_1',
    avatar: avatar || '',
    updatedAt: new Date().toISOString(),
  });
});

// NFC tag routes
app.get('/api/v1/nfc/:tagId', (req, res) => {
  const { tagId } = req.params;
  // 返回标签绑定的回忆 ID
  res.json({
    tagId,
    memoryId: '1',
    familyId: 'family_1',
  });
});

app.post('/api/v1/nfc/:tagId/bind', (req, res) => {
  const { tagId } = req.params;
  const { memoryId } = req.body;
  
  res.json({
    success: true,
    tagId,
    memoryId,
    boundAt: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
  console.log(`API available at http://localhost:${port}/api/v1/`);
  console.log(
    `[summarize] Gemini: ${isGeminiSummarizeConfigured() ? 'on' : 'off'}, local LLM: ${isLocalLlmSummarizeConfigured() ? 'on' : 'off'}`
  );
  const sr = Boolean(getSupabaseServiceRoleKey());
  console.log(
    `[supabase] GET /memories 使用 ${sr ? 'service_role（可绕过 RLS）' : 'anon（受 RLS 限制；无数据时请配置 SUPABASE_SERVICE_ROLE_KEY）'}`
  );
});
