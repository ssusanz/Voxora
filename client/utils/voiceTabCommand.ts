/**
 * 解析 Tab 栏长按语音后的意图，返回对应路由名（由 UI 层映射为 router.push 路径）。
 */
export type TabVoiceTarget = 'add-memory' | 'vlog' | 'moments' | 'family' | 'home' | 'profile';

export function interpretTabVoiceCommand(raw: string): TabVoiceTarget | null {
  const text = raw.normalize('NFKC').trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  const hit = (patterns: RegExp[]) =>
    patterns.some((re) => {
      try {
        return re.test(lower) || re.test(text);
      } catch {
        return false;
      }
    });

  // 新增回忆（中文 / 英文 / 印地语常见说法）
  if (
    hit([
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
    return 'add-memory';
  }

  if (hit([/vlog/i, /视频\s*日\s*记/, /制作.{0,6}视频/, /व्लॉग/])) {
    return 'vlog';
  }

  if (hit([/\bmoments\b/i, /瞬间/, /相\s*册/, /照\s*片/, /पल\b/])) {
    return 'moments';
  }

  if (hit([/\bfamily\b/i, /家庭/, /家人/, /परिवार/])) {
    return 'family';
  }

  if (hit([/\bhome\b/i, /^首\s*页$/, /回\s*首\s*页/, /到\s*首\s*页/, /回\s*家/, /^होम$/])) {
    return 'home';
  }

  if (hit([/\bprofile\b/i, /个人中心/, /个\s*人\s*主\s*页/, /प्रोफ़ाइल/])) {
    return 'profile';
  }

  return null;
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
