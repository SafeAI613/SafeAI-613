import type { TFunction } from 'i18next';
import { localeFor } from '../../i18n/useLocale';

// מספר בגימטריה (1-999) עם גרש/גרשיים, למשל 15 -> ט"ו. משמש לתאריך העברי
// בתצוגה בעברית בלבד.
const toGematria = (num: number): string => {
  if (num === 15) return 'ט"ו';
  if (num === 16) return 'ט"ז';
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  let result = '';
  const h = Math.floor((num % 1000) / 100);
  const t = Math.floor((num % 100) / 10);
  const u = num % 10;
  if (h > 0) result += hundreds[h] || '';
  if (t > 0) result += tens[t] || '';
  if (u > 0) result += units[u] || '';
  if (result.length === 1) return `${result}'`;
  if (result.length > 1) return `${result.slice(0, -1)}"${result.slice(-1)}`;
  return result;
};

// The Hebrew-calendar part of the date: letters in Hebrew ("ט"ו בתשרי"),
// and the English month name in English ("15 Tishri").
const formatJewishDate = (date: Date, language: string, withYear: boolean): string => {
  if (language !== 'he') {
    return new Intl.DateTimeFormat(`${localeFor(language)}-u-ca-hebrew`, {
      day: 'numeric',
      month: 'long',
      year: withYear ? 'numeric' : undefined,
    }).format(date);
  }

  const monthName = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' })
    .format(date)
    .replace(/[֑-ׇ]/g, '');
  let jewishDate = `${toGematria(date.getDate())} ב${monthName}`;

  if (withYear) {
    const yearParts = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { year: 'numeric' }).format(date).split(' ');
    let yearLetters = yearParts[yearParts.length - 1];
    if (yearLetters.startsWith('ה')) yearLetters = yearLetters.substring(1);
    jewishDate += ` ${yearLetters}`;
  }
  return jewishDate;
};

/**
 * Relative date for forum posts and replies: "just now" / "N min ago" /
 * "today at HH:MM" / "yesterday at HH:MM", otherwise the Hebrew-calendar
 * date followed by the Gregorian date.
 */
export const formatForumDate = (dateInput: string | Date | number, t: TFunction, language: string): string => {
  const locale = localeFor(language);
  const now = new Date();
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (diffInMinutes < 60 && diffInMinutes >= 0) {
    return diffInMinutes === 0 ? t('forum.date.justNow') : t('forum.date.minutesAgo', { minutes: diffInMinutes });
  }
  if (compareDate.getTime() === today.getTime()) return t('forum.date.todayAt', { time });
  if (compareDate.getTime() === yesterday.getTime()) return t('forum.date.yesterdayAt', { time });

  const isCurrentYear = date.getFullYear() === now.getFullYear();
  const gregorianDate = date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'numeric',
    year: isCurrentYear ? undefined : 'numeric',
  });
  return `${formatJewishDate(date, language, !isCurrentYear)} / ${gregorianDate}`;
};
