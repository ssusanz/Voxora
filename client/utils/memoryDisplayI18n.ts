import type { TFunction } from 'i18next';
import i18n, { normalizeAppLanguage } from '@/locales/i18n';

type AppLng = ReturnType<typeof normalizeAppLanguage>;

function currentLng(): AppLng {
  return normalizeAppLanguage(i18n.resolvedLanguage || i18n.language);
}

/** 显式 lng，避免 getFixedT/闭包与当前界面语言不一致（如日期已是印地语而标题仍中文） */
function tx(key: string, opts?: { defaultValue?: string }): string {
  const lng = currentLng();
  return String(i18n.t(key, { lng, ...opts }));
}

/** 统一 Unicode、去掉不可见字符，避免与映射表「看起来相同」却不命中 */
function sanitizeLookup(s: string): string {
  return s.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

/**
 * 将服务端 / 演示数据里的固定中文标题、地点映射到 i18n。
 * 未命中映射的字符串视为用户自定义内容，原样返回。
 */
const TITLE_KEY_BY_ZH: Record<string, string> = {
  春节团聚: 'memoryDemo.titles.springFestivalGathering',
  暑假旅行: 'memoryDemo.titles.summerTrip',
  周末野餐: 'memoryDemo.titles.weekendPicnic',
  生日派对: 'memoryDemo.titles.birthdayParty',
  海边度假: 'memoryDemo.titles.beachVacation',
  婚礼纪念日: 'memoryDemo.titles.weddingAnniversary',
  露营体验: 'memoryDemo.titles.camping',
  第一次游泳: 'memoryDemo.titles.firstSwim',
  圣诞节: 'memoryDemo.titles.christmas',
  动物园一日游: 'memoryDemo.titles.zooDay',
  时光胶囊: 'memoryDemo.titles.timeCapsule',
  家庭聚餐: 'memoryDemo.titles.familyDinner',
  想念爷爷: 'memoryDemo.titles.missingGrandpa',
  周末郊游: 'memoryDemo.titles.weekendOuting',
  平静的午后: 'memoryDemo.titles.calmAfternoon',
  情绪波动提醒: 'memoryDemo.titles.emotionPulseAlert',
  宝宝周岁: 'memoryDemo.titles.babyFirstBirthday',
  我的妈妈: 'memoryDemo.titles.myMother',
  一只猫的故事: 'memoryDemo.titles.storyOfACat',
};

const LOCATION_KEY_BY_ZH: Record<string, string> = {
  老家: 'memoryDemo.locations.hometown',
  黄山: 'memoryDemo.locations.huangshan',
  公园: 'memoryDemo.locations.park',
  家里: 'memoryDemo.locations.atHome',
  家中: 'memoryDemo.locations.atHome',
  三亚: 'memoryDemo.locations.sanya',
  餐厅: 'memoryDemo.locations.restaurant',
  山林: 'memoryDemo.locations.mountainForest',
  游泳馆: 'memoryDemo.locations.swimmingPool',
  动物园: 'memoryDemo.locations.zoo',
  '北京·外婆家': 'memoryDemo.locations.beijingGrandma',
  颐和园: 'memoryDemo.locations.summerPalace',
  阳台: 'memoryDemo.locations.balcony',
  书房: 'memoryDemo.locations.study',
  上海: 'memoryDemo.locations.shanghai',
};

function fallbackZhForTitleKey(i18nKey: string): string | undefined {
  for (const [zh, k] of Object.entries(TITLE_KEY_BY_ZH)) {
    if (k === i18nKey) return zh;
  }
  return undefined;
}

function fallbackZhForLocationKey(i18nKey: string): string | undefined {
  for (const [zh, k] of Object.entries(LOCATION_KEY_BY_ZH)) {
    if (k === i18nKey) return zh;
  }
  return undefined;
}

/** 去掉首尾书名号/引号类括号，便于匹配《我的妈妈》等与词条一致的内文 */
function stripTitleWrappers(s: string): string {
  const v = s.trim();
  if (v.length >= 2) {
    if (v.startsWith('《') && v.endsWith('》')) return v.slice(1, -1).trim();
    if (v.startsWith('「') && v.endsWith('」')) return v.slice(1, -1).trim();
    if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).trim();
    if (v.startsWith('“') && v.endsWith('”')) return v.slice(1, -1).trim();
  }
  return v;
}

export function translateMemoryTitle(raw: string | null | undefined, _t?: TFunction): string {
  const v0 = (raw ?? '').trim();
  if (!v0) return tx('common.untitled');

  // 库里若误存了 i18n 路径，仍按 key 翻译；失败则回退到对应中文
  if (v0.startsWith('memoryDemo.titles.')) {
    const fb = fallbackZhForTitleKey(v0) ?? v0;
    return tx(v0, { defaultValue: fb });
  }

  const v = sanitizeLookup(v0);
  const inner = sanitizeLookup(stripTitleWrappers(v0));
  const key =
    TITLE_KEY_BY_ZH[v0] ??
    TITLE_KEY_BY_ZH[v] ??
    TITLE_KEY_BY_ZH[inner] ??
    TITLE_KEY_BY_ZH[sanitizeLookup(stripTitleWrappers(v))];
  if (key) {
    const fallback = inner || v || v0;
    return tx(key, { defaultValue: fallback });
  }
  return v0;
}

export function translateMemoryLocation(raw: string | null | undefined, _t?: TFunction): string {
  const v0 = (raw ?? '').trim();
  if (!v0) return '';

  if (v0.startsWith('memoryDemo.locations.')) {
    const fb = fallbackZhForLocationKey(v0) ?? v0;
    return tx(v0, { defaultValue: fb });
  }

  const v = sanitizeLookup(v0);
  const inner = sanitizeLookup(stripTitleWrappers(v0));
  const key =
    LOCATION_KEY_BY_ZH[v0] ??
    LOCATION_KEY_BY_ZH[v] ??
    LOCATION_KEY_BY_ZH[inner] ??
    LOCATION_KEY_BY_ZH[sanitizeLookup(stripTitleWrappers(v))];
  if (key) {
    const fallback = inner || v || v0;
    return tx(key, { defaultValue: fallback });
  }
  return v0;
}
