import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { translateMemoryLocation, translateMemoryTitle } from '@/utils/memoryDisplayI18n';

/**
 * 回忆卡片标题 / 地点的展示文案（与当前语言同步）。
 * 集中在一处，避免各卡片各自调用翻译函数时漏写依赖导致语言切换后仍显示旧文案。
 */
export function useMemoryDisplayText(item: { title?: string | null; location?: string | null }) {
  const { i18n } = useTranslation();

  return useMemo(
    () => ({
      title: translateMemoryTitle(item.title),
      location: translateMemoryLocation(item.location ?? ''),
    }),
    [item.title, item.location, i18n.language, i18n.resolvedLanguage]
  );
}
