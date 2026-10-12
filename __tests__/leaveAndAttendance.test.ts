import { describe, it, expect } from 'vitest';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

describe('Leave and Attendance calculations', () => {
  it('correctly calculates remaining paid leaves without counting unpaid leaves', () => {
    const quota = 18;
    const offDays = [
      { id: '1', date: '2026-10-01', type: 'paid' as const, reason: 'Vacation' },
      { id: '2', date: '2026-10-02', type: 'paid' as const, reason: 'Vacation' },
      { id: '3', date: '2026-10-03', type: 'unpaid' as const, reason: 'Personal' },
      { id: '4', date: '2026-10-04', type: 'unpaid' as const, reason: 'Personal' },
    ];

    const paidUsed = offDays.filter((d) => d.type === 'paid').length;
    const unpaidUsed = offDays.filter((d) => d.type === 'unpaid').length;
    const remaining = quota - paidUsed;

    expect(paidUsed).toBe(2);
    expect(unpaidUsed).toBe(2);
    expect(remaining).toBe(16);
  });

  it('handles negative remaining when quota is exceeded', () => {
    const quota = 1;
    const offDays = [
      { id: '1', date: '2026-10-01', type: 'paid' as const, reason: 'Leave 1' },
      { id: '2', date: '2026-10-02', type: 'paid' as const, reason: 'Leave 2' },
    ];

    const paidUsed = offDays.filter((d) => d.type === 'paid').length;
    const remaining = quota - paidUsed;

    expect(remaining).toBe(-1);
  });

  it('generates 7 days from Monday to Sunday for any week', () => {
    const date = new Date('2026-10-14T10:00:00Z'); // Wednesday
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    expect(days).toHaveLength(7);
    expect(format(days[0], 'EEE')).toBe('Mon');
    expect(format(days[6], 'EEE')).toBe('Sun');
  });

  it('determines attendance with manual override taking precedence over clocked entries', () => {
    const clockedDates = new Set(['2026-10-12', '2026-10-13']);
    const manualRecords: Record<string, boolean> = {
      '2026-10-12': false, // User manually unchecked this even though clocked
      '2026-10-14': true,  // User manually checked this even though not clocked
    };

    function isAttended(dateStr: string) {
      if (manualRecords[dateStr] !== undefined) {
        return manualRecords[dateStr];
      }
      return clockedDates.has(dateStr);
    }

    expect(isAttended('2026-10-12')).toBe(false); // manual override false
    expect(isAttended('2026-10-13')).toBe(true);  // auto-detected from clocked entry
    expect(isAttended('2026-10-14')).toBe(true);  // manual override true
    expect(isAttended('2026-10-15')).toBe(false); // neither
  });
});
