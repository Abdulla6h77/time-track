'use client';

import { useEffect, useState, useCallback } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import ClockControls from '@/components/ClockControls';
import RunningTimer from '@/components/RunningTimer';
import TodayView from '@/components/TodayView';
import WeekView from '@/components/WeekView';
import SummaryPanel from '@/components/SummaryPanel';
import EntryForm from '@/components/EntryForm';
import DaysChecklist from '@/components/DaysChecklist';
import OffTracker, { OffDay } from '@/components/OffTracker';

interface Entry {
  id: string;
  start: string;
  end: string | null;
  task: string;
}

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [offDays, setOffDays] = useState<OffDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchEntries = useCallback(async () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    try {
      const res = await fetch(
        `/api/entries?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOffDays = useCallback(async () => {
    try {
      const res = await fetch('/api/off-days');
      if (res.ok) {
        const data = await res.json();
        setOffDays(data);
      }
    } catch {
      // silent
    }
  }, []);

  const handleRefreshAll = useCallback(() => {
    fetchEntries();
    fetchOffDays();
  }, [fetchEntries, fetchOffDays]);

  useEffect(() => {
    fetchEntries();
    fetchOffDays();
  }, [fetchEntries, fetchOffDays]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchEntries();
        fetchOffDays();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchEntries, fetchOffDays]);

  const runningEntry = entries.find((e) => e.end === null) ?? null;

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">⏱ Time Tracker</h1>
        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Clock controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {runningEntry && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Running:</span>
            <RunningTimer startISO={runningEntry.start} onRefresh={handleRefreshAll} />
          </div>
        )}
        <ClockControls runningEntry={runningEntry} onAction={handleRefreshAll} />
      </div>

      {/* Days Checklist (Mon - Sun attendance) */}
      <DaysChecklist
        entries={entries}
        offDays={offDays}
        onAttendanceChange={fetchEntries}
      />

      {/* Today view */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading…</div>
      ) : (
        <TodayView entries={entries} onRefresh={fetchEntries} />
      )}

      {/* Week view */}
      <WeekView entries={entries} />

      {/* Off & Leave Tracker */}
      <OffTracker offDays={offDays} onRefresh={fetchOffDays} />

      {/* Summary */}
      <SummaryPanel entries={entries} />

      {/* Add entry */}
      <div>
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          + Add Entry Manually
        </button>
      </div>

      {showAddForm && (
        <EntryForm
          onSave={() => {
            setShowAddForm(false);
            fetchEntries();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </main>
  );
}

