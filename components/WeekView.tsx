'use client';

import { calcWeekTotal, getWeekBounds, formatDuration } from '@/lib/timeUtils';
import ProgressBar from './ProgressBar';

interface Entry {
  id: string;
  start: string;
  end: string | null;
  task: string;
}

interface WeekViewProps {
  entries: Entry[];
}

const TARGET_MS = 40 * 60 * 60 * 1000; // 40 hours in ms

export default function WeekView({ entries: rawEntries }: WeekViewProps) {
  const { weekStart, weekEnd } = getWeekBounds(new Date());

  // Convert string dates to Date objects for calcWeekTotal
  const entries = rawEntries.map((e) => ({
    ...e,
    start: new Date(e.start),
    end: e.end ? new Date(e.end) : null,
    created_at: new Date(e.start),
  }));

  const weekTotalMs = calcWeekTotal(entries, weekStart, weekEnd);
  const remainingMs = Math.max(0, TARGET_MS - weekTotalMs);
  const percentage = Math.min(100, (weekTotalMs / TARGET_MS) * 100);

  const weekTotalHours = (weekTotalMs / 3600000).toFixed(1);
  const remainingHours = (remainingMs / 3600000).toFixed(1);

  const barColor =
    percentage >= 100
      ? 'bg-green-500'
      : percentage >= 75
      ? 'bg-blue-500'
      : 'bg-blue-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">This Week</h2>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Progress</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatDuration(weekTotalMs)} / 40h
          </span>
        </div>

        <ProgressBar value={percentage} color={barColor} />

        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>{weekTotalHours}h worked</span>
          <span>
            {percentage >= 100
              ? '🎉 Goal reached!'
              : `${remainingHours}h remaining`}
          </span>
        </div>
      </div>
    </div>
  );
}
