/**
 * Date arithmetic, kept in one place and kept UTC-only.
 *
 * Every date in the corpus is a plain ISO day. Nothing here touches the wall
 * clock: the as-of date is always passed in, so a resolution is reproducible
 * from its inputs alone.
 */

const MS_PER_DAY = 86_400_000;

export function toUtcMillis(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    throw new Error(`expected an ISO date (YYYY-MM-DD), got: ${isoDate}`);
  }
  const [, year, month, day] = match;
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`expected an ISO date (YYYY-MM-DD), got: ${isoDate}`);
  }
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

/** Whole days from `from` to `to`. Negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / MS_PER_DAY);
}

export function addDays(isoDate: string, days: number): string {
  return formatUtc(new Date(toUtcMillis(isoDate) + days * MS_PER_DAY));
}

export function formatUtc(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Human phrasing for a receipt: "3 years ago", "11 months ago", "6 days ago". */
export function describeAge(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 45) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months} months ago`;
  const years = Math.round(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
