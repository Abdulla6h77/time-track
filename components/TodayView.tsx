'use client';

import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { formatDuration } from '@/lib/timeUtils';
import RunningTimer from './RunningTimer';
import EntryForm from './EntryForm';

interface Entry {
  id: string;
  start: string;
  end: string | null;
  task: string;
}

interface TodayViewProps {
  entries: Entry[];
  onRefresh: () => void;
}

export default function TodayView({ entries, onRefresh }: TodayViewProps) {
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Filter to today's entries
  const todayEntries = entries.filter((e) => isToday(new Date(e.start)));

  // Calculate today's total (completed only)
  let todayTotalMs = 0;
  for (const e of todayEntries) {
    if (e.end) {
      todayTotalMs += new Date(e.end).getTime() - new Date(e.start).getTime();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return;
    try {
      await fetch('/api/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      onRefresh();
    } catch {
      // silent
    }
  }

  if (todayEntries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Today</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No entries yet today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Today</h2>
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          Total: {formatDuration(todayTotalMs)}
        </span>
      </div>

      <div className="space-y-2">
        {todayEntries.map((entry) => {
          const startDate = new Date(entry.start);
          const endDate = entry.end ? new Date(entry.end) : null;
          const durationMs = endDate ? endDate.getTime() - startDate.getTime() : null;

          return (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {entry.task || <span className="italic text-gray-400">No task</span>}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {format(startDate, 'h:mm a')} –{' '}
                  {endDate ? format(endDate, 'h:mm a') : (
                    <RunningTimer startISO={entry.start} onRefresh={onRefresh} />
                  )}
                  {durationMs !== null && (
                    <span className="ml-2 text-gray-400">({formatDuration(durationMs)})</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingEntry(entry)}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                  aria-label="Edit entry"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors"
                  aria-label="Delete entry"
                >
                  Del
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingEntry && (
        <EntryForm
          entry={editingEntry}
          onSave={() => {
            setEditingEntry(null);
            onRefresh();
          }}
          onCancel={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}
