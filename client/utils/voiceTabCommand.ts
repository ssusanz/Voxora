/**
 * 解析 Tab 栏长按语音后的意图：简单路由跳转，或「按描述找回忆 / 为某回忆做 Vlog」。
 */
/* eslint-disable regexp/no-super-linear-backtracking -- 短句语音解析，输入长度有界 */
export type TabVoiceTarget = 'add-memory' | 'vlog' | 'moments' | 'family' | 'home' | 'profile';

export type TabVoiceIntent =
  | { type: 'route'; target: TabVoiceTarget }
  | { type: 'find-memory'; query: string }
  | { type: 'vlog-for-memory'; query: string };

function hit(text: string, lower: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => {
    try {
      return re.test(lower) || re.test(text);
    } catch {
      return false;
    }
  });
}

/** 从「找到 xxx 记忆」类说法中抽出描述片段 */
function extractFindMemoryQuery(text: string, lower: string): string | null {
  const zhRe =
    /(?:找到|查找|搜索|定位|打开|查看|看看)(?:一下|到)?\s*(?:关于|叫作|名为|叫)?\s*(.+?)(?:的|那|这条|那条|那段)?(?:记忆|回忆)/;
  const zm = text.match(zhRe);
  if (zm?.[1]) {
    const q = zm[1].replace(/^(?:那条|这条|那段|关于|的)\s*/u, '').trim();
    if (q.length >= 1) return q;
  }
  const enRes: RegExp[] = [
    /(?:find|search|open|locate|show)\s+(?:me\s+)?(?:the\s+)?(.+?)(?:\s+memory|\s+memories)\b/i,
    /(?:find|search)\s+(?:memory|memories)\s+(?:about|for)\s+(.+)/i,
  ];
  for (const re of enRes) {
    const m = lower.match(re);
    if (m?.[1]) {
      const q = m[1].replace(/^(?:the|a|an)\s+/i, '').trim();
      if (q.length >= 1) return q;
    }
  }
  return null;
}

/** 从「为 xxx 生成 vlog」类说法中抽出回忆描述 */
function extractVlogForMemoryQuery(text: string, lower: string): string | null {
  const zhRe =
    /[为给对]\s*(.+?)\s*(?:生成|制作|做)\s*(?:一个|一段)?\s*(?:vlog|视频\s*日\s*记)/i;
  const zm = text.match(zhRe);
  if (zm?.[1]) {
    const q = zm[1].replace(/^(?:这个|那个|那段|的)\s*/u, '').trim();
    if (q.length >= 1) return q;
  }
  const enRes: RegExp[] = [
    /(?:make|create|generate)\s+(?:a\s+)?vlog\s+(?:for|about|from)\s+(.+)/i,
    /(?:make|create|generate)\s+(?:a\s+)?vlog\s+with\s+(.+)/i,
  ];
  for (const re of enRes) {
    const m = lower.match(re);
    if (m?.[1]) {
      const q = m[1].replace(/^(?:the|a|an)\s+/i, '').trim();
      if (q.length >= 1) return q;
    }
  }
  return null;
}

export function interpretTabVoiceIntent(raw: string): TabVoiceIntent | null {
  const text = raw.normalize('NFKC').trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  if (
    hit(text, lower, [
      /(增加|添加|新增|创建|记录|写|建).{0,10}(记忆|回忆)/,
      /我要.{0,12}(记忆|回忆)/,
      /来.{0,4}(一)?条.{0,6}(记忆|回忆)/,
      /记.{0,4}(一)?下.{0,8}(记忆|回忆)/,
      /add(\s+a)?\s*memor(y|ies)/,
      /new\s+memor(y|ies)/,
      /create(\s+a)?\s*memor(y|ies)/,
      /record(\s+a)?\s*memor(y|ies)/,
      /याद\s*जोड़/,
      /नई\s*याद/,
      /याद\s*बन/,
    ])
  ) {
    return { type: 'route', target: 'add-memory' };
  }

  const findQ = extractFindMemoryQuery(text, lower);
  if (findQ) {
    return { type: 'find-memory', query: findQ };
  }

  const vlogMemQ = extractVlogForMemoryQuery(text, lower);
  if (vlogMemQ) {
    return { type: 'vlog-for-memory', query: vlogMemQ };
  }

  if (hit(text, lower, [/vlog/i, /视频\s*日\s*记/, /制作.{0,6}视频/, /व्लॉग/])) {
    return { type: 'route', target: 'vlog' };
  }

  if (hit(text, lower, [/\bmoments\b/i, /瞬间/, /相\s*册/, /照\s*片/, /पल\b/])) {
    return { type: 'route', target: 'moments' };
  }

  if (hit(text, lower, [/\bfamily\b/i, /家庭/, /家人/, /परिवार/])) {
    return { type: 'route', target: 'family' };
  }

  if (hit(text, lower, [/\bhome\b/i, /^首\s*页$/, /回\s*首\s*页/, /到\s*首\s*页/, /回\s*家/, /^होम$/])) {
    return { type: 'route', target: 'home' };
  }

  if (hit(text, lower, [/\bprofile\b/i, /个人中心/, /个\s*人\s*主\s*页/, /प्रोफ़ाइल/])) {
    return { type: 'route', target: 'profile' };
  }

  return null;
}

/** @deprecated 仅保留简单路由类意图；含「找记忆」「为某记忆做 Vlog」时请用 interpretTabVoiceIntent */
export function interpretTabVoiceCommand(raw: string): TabVoiceTarget | null {
  const intent = interpretTabVoiceIntent(raw);
  return intent?.type === 'route' ? intent.target : null;
}

export function routeForTabVoiceTarget(target: TabVoiceTarget): string {
  switch (target) {
    case 'add-memory':
      return '/add-memory';
    case 'vlog':
      return '/vlog';
    case 'moments':
      return '/moments';
    case 'family':
      return '/family';
    case 'profile':
      return '/profile';
    case 'home':
    default:
      return '/';
  }
}
