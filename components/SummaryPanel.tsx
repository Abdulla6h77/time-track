'use client';

import { useState } from 'react';
import { isToday } from 'date-fns';
import { generateSummary } from '@/lib/summary';
import { calcWeekTotal, getWeekBounds } from '@/lib/timeUtils';

interface Entry {
  id: string;
  start: string;
  end: string | null;
  task: string;
}

interface SummaryPanelProps {
  entries: Entry[];
}

export default function SummaryPanel({ entries: rawEntries }: SummaryPanelProps) {
  const [summary, setSummary] = useState('');
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    const { weekStart, weekEnd } = getWeekBounds(new Date());

    // Convert all entries to the shape expected by timeUtils
    const allEntries = rawEntries.map((e) => ({
      ...e,
      start: new Date(e.start),
      end: e.end ? new Date(e.end) : null,
      created_at: new Date(e.start),
    }));

    // Filter to today's entries only for the summary
    const todayEntries = allEntries.filter((e) => isToday(e.start));

    // Week total for the footer
    const weekTotalMs = calcWeekTotal(allEntries, weekStart, weekEnd);

    const text = generateSummary(todayEntries, weekTotalMs);
    setSummary(text);
    setCopied(false);
  }

  async function handleCopy() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the textarea
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">End-of-Day Summary</h2>

      <button
        onClick={handleGenerate}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
      >
        Generate End-of-Day Summary
      </button>

      {summary && (
        <div className="mt-4 space-y-2">
          <textarea
            readOnly
            value={summary}
            rows={8}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none"
            aria-label="Generated summary"
          />
          <button
            onClick={handleCopy}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      )}
    </div>
  );
}
