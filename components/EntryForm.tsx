'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface Entry {
  id: string;
  start: string;
  end: string | null;
  task: string;
}

interface EntryFormProps {
  entry?: Entry;
  onSave: () => void;
  onCancel: () => void;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  // format as "YYYY-MM-DDTHH:mm" in local time
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function fromDatetimeLocal(value: string): string {
  // Parse datetime-local input as local time and convert to ISO
  return new Date(value).toISOString();
}

export default function EntryForm({ entry, onSave, onCancel }: EntryFormProps) {
  const isEdit = !!entry;

  const [start, setStart] = useState(
    entry ? toDatetimeLocal(entry.start) : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [end, setEnd] = useState(entry?.end ? toDatetimeLocal(entry.end) : '');
  const [task, setTask] = useState(entry?.task ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!start) {
      setError('Start time is required');
      return;
    }
    if (!end) {
      setError('End time is required');
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate <= startDate) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);

    try {
      const url = '/api/entries';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit
        ? JSON.stringify({ id: entry!.id, start: fromDatetimeLocal(start), end: fromDatetimeLocal(end), task })
        : JSON.stringify({ start: fromDatetimeLocal(start), end: fromDatetimeLocal(end), task });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === 'string' ? data.error : 'Failed to save entry');
      } else {
        onSave();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {isEdit ? 'Edit Entry' : 'Add Entry'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start time
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End time
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Task
            </label>
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Task description"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
