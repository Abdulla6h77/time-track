import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  calcWeekTotal,
  mergeConsecutiveBlocks,
  getWeekBounds,
  Entry,
} from '../lib/timeUtils';

// Helper to create entries
function makeEntry(
  id: string,
  startMs: number,
  endMs: number | null,
  task = 'Task'
): Entry {
  return {
    id,
    start: new Date(startMs),
    end: endMs !== null ? new Date(endMs) : null,
    task,
    created_at: new Date(startMs),
  };
}

describe('formatDuration', () => {
  it('returns "0m" for 0 ms', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('returns "5m" for 300000 ms (5 minutes)', () => {
    expect(formatDuration(300000)).toBe('5m');
  });

  it('returns "1h" for 3600000 ms (1 hour exactly)', () => {
    expect(formatDuration(3600000)).toBe('1h');
  });

  it('returns "1h 30m" for 5400000 ms (1.5 hours)', () => {
    expect(formatDuration(5400000)).toBe('1h 30m');
  });

  it('returns "1h 1m" for 3661000 ms', () => {
    expect(formatDuration(3661000)).toBe('1h 1m');
  });

  it('returns "30m" for 1800000 ms', () => {
    expect(formatDuration(1800000)).toBe('30m');
  });

  it('handles negative ms as "0m"', () => {
    expect(formatDuration(-1000)).toBe('0m');
  });
});

describe('calcWeekTotal', () => {
  const HOUR = 3600000;

  // Monday 2024-01-15 00:00 UTC
  const weekStart = new Date('2024-01-15T00:00:00.000Z');
  // Sunday 2024-01-21 23:59:59 UTC
  const weekEnd = new Date('2024-01-21T23:59:59.999Z');

  it('sums completed entries entirely within the week', () => {
    const entries = [
      makeEntry('1', new Date('2024-01-15T09:00:00Z').getTime(), new Date('2024-01-15T10:00:00Z').getTime()),
      makeEntry('2', new Date('2024-01-16T09:00:00Z').getTime(), new Date('2024-01-16T11:00:00Z').getTime()),
    ];
    // 1h + 2h = 3h
    expect(calcWeekTotal(entries, weekStart, weekEnd)).toBe(3 * HOUR);
  });

  it('excludes running entries (end = null)', () => {
    const entries = [
      makeEntry('1', new Date('2024-01-15T09:00:00Z').getTime(), null),
      makeEntry('2', new Date('2024-01-15T10:00:00Z').getTime(), new Date('2024-01-15T11:00:00Z').getTime()),
    ];
    expect(calcWeekTotal(entries, weekStart, weekEnd)).toBe(1 * HOUR);
  });

  it('excludes entries completely outside the week', () => {
    const entries = [
      makeEntry('1', new Date('2024-01-08T09:00:00Z').getTime(), new Date('2024-01-08T10:00:00Z').getTime()),
      makeEntry('2', new Date('2024-01-22T09:00:00Z').getTime(), new Date('2024-01-22T10:00:00Z').getTime()),
    ];
    expect(calcWeekTotal(entries, weekStart, weekEnd)).toBe(0);
  });

  it('clips entries that extend beyond week boundaries', () => {
    const entries = [
      // Starts before week, ends inside
      makeEntry('1', new Date('2024-01-14T22:00:00Z').getTime(), new Date('2024-01-15T01:00:00Z').getTime()),
      // Starts inside, ends after week
      makeEntry('2', new Date('2024-01-21T23:00:00Z').getTime(), new Date('2024-01-22T02:00:00Z').getTime()),
    ];
    const total = calcWeekTotal(entries, weekStart, weekEnd);
    // First: clipped to weekStart -> 1h remaining
    // Second: clipped to weekEnd -> ~1h remaining  
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(2 * HOUR);
  });

  it('returns 0 for empty entries', () => {
    expect(calcWeekTotal([], weekStart, weekEnd)).toBe(0);
  });
});

describe('mergeConsecutiveBlocks', () => {
  it('returns empty array for empty input', () => {
    expect(mergeConsecutiveBlocks([])).toEqual([]);
  });

  it('merges adjacent same-task entries', () => {
    const t1 = new Date('2024-01-15T09:00:00Z').getTime();
    const t2 = new Date('2024-01-15T10:00:00Z').getTime();
    const t3 = new Date('2024-01-15T11:00:00Z').getTime();
    const entries = [
      makeEntry('1', t1, t2, 'Feature'),
      makeEntry('2', t2, t3, 'Feature'), // exact join
    ];
    const result = mergeConsecutiveBlocks(entries);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(new Date(t1));
    expect(result[0].end).toEqual(new Date(t3));
    expect(result[0].task).toBe('Feature');
  });

  it('does not merge entries with different tasks', () => {
    const t1 = new Date('2024-01-15T09:00:00Z').getTime();
    const t2 = new Date('2024-01-15T10:00:00Z').getTime();
    const t3 = new Date('2024-01-15T11:00:00Z').getTime();
    const entries = [
      makeEntry('1', t1, t2, 'Feature'),
      makeEntry('2', t2, t3, 'Research'),
    ];
    const result = mergeConsecutiveBlocks(entries);
    expect(result).toHaveLength(2);
  });

  it('does not merge entries with a gap > 1 minute', () => {
    const t1 = new Date('2024-01-15T09:00:00Z').getTime();
    const t2 = new Date('2024-01-15T10:00:00Z').getTime();
    const t3 = new Date('2024-01-15T10:05:00Z').getTime(); // 5 min gap from t2
    const t4 = new Date('2024-01-15T11:00:00Z').getTime();
    const entries = [
      makeEntry('1', t1, t2, 'Feature'),
      makeEntry('2', t3, t4, 'Feature'), // same task but gap
    ];
    const result = mergeConsecutiveBlocks(entries);
    expect(result).toHaveLength(2);
  });

  it('does not merge running entries (end = null)', () => {
    const t1 = new Date('2024-01-15T09:00:00Z').getTime();
    const t2 = new Date('2024-01-15T10:00:00Z').getTime();
    const entries = [
      makeEntry('1', t1, t2, 'Feature'),
      makeEntry('2', t2, null, 'Feature'), // running
    ];
    const result = mergeConsecutiveBlocks(entries);
    expect(result).toHaveLength(2);
  });

  it('merges adjacent same-task entries within 1 min tolerance', () => {
    const t1 = new Date('2024-01-15T09:00:00Z').getTime();
    const t2 = new Date('2024-01-15T10:00:00Z').getTime();
    const t2plus30s = t2 + 30000; // 30 seconds after t2
    const t3 = new Date('2024-01-15T11:00:00Z').getTime();
    const entries = [
      makeEntry('1', t1, t2, 'Feature'),
      makeEntry('2', t2plus30s, t3, 'Feature'),
    ];
    const result = mergeConsecutiveBlocks(entries);
    expect(result).toHaveLength(1);
  });
});

describe('getWeekBounds', () => {
  it('returns a Monday start for a mid-week date', () => {
    // Wednesday Jan 17, 2024
    const date = new Date('2024-01-17T12:00:00');
    const { weekStart } = getWeekBounds(date);
    // Should be Monday Jan 15
    expect(weekStart.getDay()).toBe(1); // 1 = Monday
  });

  it('returns a Sunday end for a mid-week date', () => {
    const date = new Date('2024-01-17T12:00:00');
    const { weekEnd } = getWeekBounds(date);
    expect(weekEnd.getDay()).toBe(0); // 0 = Sunday
  });

  it('week end is after week start', () => {
    const date = new Date('2024-01-17T12:00:00');
    const { weekStart, weekEnd } = getWeekBounds(date);
    expect(weekEnd.getTime()).toBeGreaterThan(weekStart.getTime());
  });
});
