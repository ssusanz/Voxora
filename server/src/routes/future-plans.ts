import { Router } from 'express';
import { geminiGenerateFreeform, isGeminiSummarizeConfigured } from '../lib/gemini-summarize';

const router = Router();

type EntryBody = { authorLabel?: string; text?: string };

function buildLocalSummary(title: string, lines: string[]): string {
  const body =
    lines.length > 0
      ? lines.map((l) => `· ${l}`).join('\n')
      : '（暂无具体发言，可先补充想法再生成小结。）';
  return (
    `【${title} · 讨论小结】\n\n` +
    `【大家说了什么】\n${body}\n\n` +
    `【待对齐】\n· 时间窗口与预算是否有一致意向\n· 是否需要照顾老人/小孩的安排\n\n` +
    `【行动建议】\n· 先定 1 个「决策截止日」，当天投票定大方向\n· 拆成「交通 / 住宿 / 分工」三块，各指定一位主理人\n`
  );
}

router.post('/summarize', async (req, res) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const kind = typeof req.body?.kind === 'string' ? req.body.kind.trim() : '';
    const entries = Array.isArray(req.body?.entries) ? (req.body.entries as EntryBody[]) : [];

    if (!title) {
      res.status(400).json({ ok: false, error: 'missing_title' });
      return;
    }

    const lines = entries
      .map((e) => {
        const who = typeof e.authorLabel === 'string' ? e.authorLabel.trim() : '家人';
        const text = typeof e.text === 'string' ? e.text.trim() : '';
        if (!text) return '';
        return `${who}：${text}`;
      })
      .filter(Boolean);

    const block = lines.join('\n');

    if (isGeminiSummarizeConfigured()) {
      const prompt =
        `你是家庭活动策划助手。一家人正在讨论即将发生的一件事「${title}」` +
        (kind ? `（类型：${kind}）` : '') +
        `。以下是家人留言，可能包含口语、重复或玩笑，请忽略无效内容。\n\n` +
        `${block || '（暂无留言，请仍根据标题给出温和的筹备框架与提问清单。）'}\n\n` +
        `请用中文输出，结构必须包含以下 Markdown 小节标题（三级标题）：\n` +
        `### 共识摘要\n### 待确认 / 分歧点\n### 方案与分工建议\n` +
        `语气温暖、具体、可执行；每条建议尽量短。`;

      try {
        const summary = await geminiGenerateFreeform(prompt);
        res.json({ ok: true, summary, source: 'gemini' });
        return;
      } catch (e) {
        console.warn('[future-plans] Gemini 小结失败，回退本地模板:', e);
      }
    }

    const summary = buildLocalSummary(title, lines);
    res.json({ ok: true, summary, source: 'local' });
  } catch (e) {
    console.error('[future-plans] summarize error:', e);
    res.status(500).json({ ok: false, error: 'summarize_failed' });
  }
});

export default router;
