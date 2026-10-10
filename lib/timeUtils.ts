import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

export interface Entry {
  id: string;
  start: Date;
  end: Date | null;
  task: string;
  created_at: Date;
}

/**
 * Formats a duration in milliseconds to "Xh Ym" format.
 * Shows only minutes if < 1 hour, only hours if 0 minutes.
 * Returns "0m" for zero.
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/**
 * Calculates the total milliseconds of completed entries that overlap a week range.
 * Clips entries that extend beyond the range.
 */
export function calcWeekTotal(entries: Entry[], weekStart: Date, weekEnd: Date): number {
  let total = 0;
  for (const entry of entries) {
    // Skip running entries
    if (entry.end === null) continue;

    const start = entry.start < weekStart ? weekStart : entry.start;
    const end = entry.end > weekEnd ? weekEnd : entry.end;

    if (end > start) {
      total += end.getTime() - start.getTime();
    }
  }
  return total;
}

/**
 * Returns the Monday-start week bounds for the given date in local time.
 */
export function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return { weekStart, weekEnd };
}

/**
 * Returns start and end of today in local time.
 */
export function getTodayBounds(): { start: Date; end: Date } {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
}

/**
 * Merges consecutive entries that have the same task (within 1 min tolerance).
 * Sorted by start. Running entries (end = null) are not merged.
 */
export function mergeConsecutiveBlocks(entries: Entry[]): Entry[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Entry[] = [];

  for (const entry of sorted) {
    const last = merged[merged.length - 1];

    if (
      last &&
      last.end !== null &&
      entry.end !== null &&
      last.task === entry.task &&
      Math.abs(entry.start.getTime() - last.end.getTime()) <= 60000 // 1 min tolerance
    ) {
      // Extend the last merged entry
      last.end = entry.end > last.end ? entry.end : last.end;
    } else {
      merged.push({ ...entry });
    }
  }

  return merged;
}
