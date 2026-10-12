'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isToday,
  isSameWeek,
} from 'date-fns';

interface Entry {
  id: string;
  start: string;
  end: string | null;
  task: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  attended: boolean;
}

interface OffDay {
  id: string;
  date: string;
  type: 'paid' | 'unpaid';
  reason: string;
}

interface DaysChecklistProps {
  entries: Entry[];
  offDays?: OffDay[];
  onAttendanceChange?: () => void;
}

export default function DaysChecklist({
  entries,
  offDays = [],
  onAttendanceChange,
}: DaysChecklistProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [savingDate, setSavingDate] = useState<string | null>(null);

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const isCurrentWeek = isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 });

  const fromStr = format(weekStart, 'yyyy-MM-dd');
  const toStr = format(weekEnd, 'yyyy-MM-dd');

  // Fetch attendance records for this week
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?from=${fromStr}&to=${toStr}`);
      if (res.ok) {
        const data: AttendanceRecord[] = await res.json();
        const map: Record<string, boolean> = {};
        for (const item of data) {
          map[item.date] = item.attended;
        }
        setAttendanceRecords(map);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [fromStr, toStr]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Days of the week Monday -> Sunday
  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  // Set of dates with clocked-in entries
  const clockedInDates = useMemo(() => {
    const dates = new Set<string>();
    for (const e of entries) {
      try {
        const d = format(new Date(e.start), 'yyyy-MM-dd');
        dates.add(d);
      } catch {
        // ignore invalid dates
      }
    }
    return dates;
  }, [entries]);

  // Map off days by date
  const offDaysMap = useMemo(() => {
    const map = new Map<string, OffDay>();
    for (const off of offDays) {
      map.set(off.date, off);
    }
    return map;
  }, [offDays]);

  // Check if a day was attended:
  // 1. Explicit user override in attendanceRecords
  // 2. Otherwise auto-detected from clocked-in entries
  const isDayAttended = (dateStr: string) => {
    if (attendanceRecords[dateStr] !== undefined) {
      return attendanceRecords[dateStr];
    }
    return clockedInDates.has(dateStr);
  };

  async function handleToggle(dateStr: string) {
    const current = isDayAttended(dateStr);
    const nextVal = !current;

    // Optimistic UI update
    setAttendanceRecords((prev) => ({
      ...prev,
      [dateStr]: nextVal,
    }));
    setSavingDate(dateStr);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, attended: nextVal }),
      });
      if (!res.ok) {
        // Revert on failure
        setAttendanceRecords((prev) => ({
          ...prev,
          [dateStr]: current,
        }));
      } else {
        onAttendanceChange?.();
      }
    } catch {
      setAttendanceRecords((prev) => ({
        ...prev,
        [dateStr]: current,
      }));
    } finally {
      setSavingDate(null);
    }
  }

  // Calculate statistics for the week
  const attendedDaysCount = days.filter((d) => isDayAttended(format(d, 'yyyy-MM-dd'))).length;
  // Weekday count (Mon-Fri)
  const attendedWeekdaysCount = days
    .slice(0, 5)
    .filter((d) => isDayAttended(format(d, 'yyyy-MM-dd'))).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-5 transition-all">
      {/* Header and Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>📅</span> Office Days Checklist
            </h2>
            {isCurrentWeek && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                Current Week
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Auto-ticks when you clock in. Click any box to manually toggle attendance.
          </p>
        </div>

        {/* Week switcher buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setSelectedDate((d) => subWeeks(d, 1))}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Previous Week"
          >
            ←
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              This Week
            </button>
          )}
          <button
            onClick={() => setSelectedDate((d) => addWeeks(d, 1))}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Next Week"
          >
            →
          </button>
        </div>
      </div>

      {/* Week Date Range & Summary Badge */}
      <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Attended:</span>
          <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md text-xs">
            {attendedWeekdaysCount}/5 weekdays ({attendedDaysCount} total)
          </span>
        </div>
      </div>

      {/* Days Checklist Grid (Mon - Sun) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {days.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const attended = isDayAttended(dateStr);
          const hasClockIn = clockedInDates.has(dateStr);
          const isTodayDate = isToday(day);
          const isWeekend = idx >= 5; // Saturday or Sunday
          const offDay = offDaysMap.get(dateStr);
          const isSaving = savingDate === dateStr;

          return (
            <div
              key={dateStr}
              onClick={() => handleToggle(dateStr)}
              className={`relative cursor-pointer rounded-xl p-3 border transition-all select-none flex flex-col justify-between min-h-[115px] ${
                isTodayDate
                  ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-gray-200 dark:border-gray-700'
              } ${
                attended
                  ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/60'
              }`}
            >
              {/* Top Row: Day Name & Date */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isTodayDate
                          ? 'text-blue-600 dark:text-blue-400'
                          : isWeekend
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {format(day, 'EEE')}
                    </span>
                    {isTodayDate && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {format(day, 'MMM d')}
                  </span>
                </div>

                {/* Checkbox Icon */}
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    attended
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  {attended && (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Badges / Status row */}
              <div className="mt-2 flex flex-col gap-1">
                {hasClockIn && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-green-700 dark:text-green-300 font-semibold bg-green-50 dark:bg-green-950/40 px-1.5 py-0.5 rounded">
                    <span>⏱</span> Clocked
                  </span>
                )}

                {offDay && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded truncate ${
                      offDay.type === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                    title={offDay.reason || (offDay.type === 'paid' ? 'Paid Leave' : 'Unpaid Off')}
                  >
                    <span>{offDay.type === 'paid' ? '🌴' : '🚫'}</span>
                    <span className="truncate">
                      {offDay.type === 'paid' ? 'Paid Off' : 'Unpaid'}
                    </span>
                  </span>
                )}

                {!hasClockIn && !offDay && attended && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                    Office
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
