import type { TFunction } from 'i18next';

/** Map i18next language to BCP 47 for Intl */
export function resolveIntlLocale(language: string | undefined): string {
  const raw = (language || 'zh-CN').trim();
  const base = raw.split('-')[0]?.toLowerCase() || 'zh';
  if (base === 'hi') return 'hi-IN';
  if (base === 'zh') return 'zh-CN';
  return 'en-US';
}

export function formatRelativeTime(date: Date | number, t: TFunction): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60 * 1000) return t('family.justNow');

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return t('family.minutesAgo', { minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('family.hoursAgo', { hours });

  const days = Math.floor(hours / 24);
  return t('family.daysAgo', { days });
}

export function formatDateLocalized(
  isoOrDate: string | Date,
  language: string | undefined,
  preset: 'long' | 'dateOnly' | 'shortMd'
): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const loc = resolveIntlLocale(language);
  if (preset === 'long') {
    return new Intl.DateTimeFormat(loc, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  }
  if (preset === 'dateOnly') {
    return new Intl.DateTimeFormat(loc, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  }
  return new Intl.DateTimeFormat(loc, { month: 'numeric', day: 'numeric' }).format(d);
}
