'use client';

import { useState } from 'react';

interface Entry {
  id: string;
  start: string;
  end: string | null;
  task: string;
}

interface ClockControlsProps {
  runningEntry: Entry | null;
  onAction: () => void;
}

export default function ClockControls({ runningEntry, onAction }: ClockControlsProps) {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRunning = runningEntry !== null;

  async function handleClockIn() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to clock in');
      } else {
        setTask('');
        onAction();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitch() {
    if (!task.trim()) {
      setError('Task is required when switching');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to switch task');
      } else {
        setTask('');
        onAction();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOut() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/clock-out', {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to clock out');
      } else {
        onAction();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {isRunning && (
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
          <span className="font-medium text-green-700 dark:text-green-400">● Currently tracking:</span>{' '}
          <span className="italic">{runningEntry.task || 'No task'}</span>
        </div>
      )}

      <input
        type="text"
        placeholder={isRunning ? 'New task name (for Switch)' : 'Task description (optional)'}
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (isRunning) handleSwitch();
            else handleClockIn();
          }
        }}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Task description"
      />

      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {!isRunning && (
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="flex-1 py-4 px-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition-colors"
          >
            {loading ? 'Starting…' : '▶ Clock In'}
          </button>
        )}

        {isRunning && (
          <>
            <button
              onClick={handleSwitch}
              disabled={loading || !task.trim()}
              className="flex-1 py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition-colors"
            >
              {loading ? 'Switching…' : '⇄ Switch Task'}
            </button>
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition-colors"
            >
              {loading ? 'Stopping…' : '■ Clock Out'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
