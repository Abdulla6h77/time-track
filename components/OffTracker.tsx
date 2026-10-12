'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';

export interface OffDay {
  id: string;
  date: string;
  type: 'paid' | 'unpaid';
  reason: string;
  created_at?: string;
}

interface OffTrackerProps {
  offDays: OffDay[];
  onRefresh: () => void;
}

export default function OffTracker({ offDays, onRefresh }: OffTrackerProps) {
  // Settings & Quota state
  const [quota, setQuota] = useState<number>(0);
  const [isEditingQuota, setIsEditingQuota] = useState<boolean>(false);
  const [quotaInput, setQuotaInput] = useState<string>('0');
  const [savingQuota, setSavingQuota] = useState<boolean>(false);

  // Add Off-Day Form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formDate, setFormDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [formType, setFormType] = useState<'paid' | 'unpaid'>('paid');
  const [formReason, setFormReason] = useState<string>('');
  const [savingOffDay, setSavingOffDay] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch settings on mount
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const rawQuota = data.paid_leave_quota;
        if (rawQuota !== undefined) {
          const parsed = parseInt(rawQuota, 10);
          const val = isNaN(parsed) ? 0 : parsed;
          setQuota(val);
          setQuotaInput(String(val));
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Compute metrics
  const paidCount = useMemo(
    () => offDays.filter((d) => d.type === 'paid').length,
    [offDays]
  );
  const unpaidCount = useMemo(
    () => offDays.filter((d) => d.type === 'unpaid').length,
    [offDays]
  );
  const totalCount = offDays.length;
  const remainingPaid = quota - paidCount;

  // Handle Quota Save
  async function handleSaveQuota(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(quotaInput, 10);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid non-negative number for paid leave quota.');
      return;
    }

    try {
      setSavingQuota(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'paid_leave_quota', value: String(val) }),
      });
      if (res.ok) {
        setQuota(val);
        setIsEditingQuota(false);
      }
    } catch {
      alert('Failed to save quota.');
    } finally {
      setSavingQuota(false);
    }
  }

  // Handle Add Off Day
  async function handleAddOffDay(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formDate) {
      setFormError('Please select a date.');
      return;
    }

    try {
      setSavingOffDay(true);
      const res = await fetch('/api/off-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          type: formType,
          reason: formReason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || 'Failed to save off day.');
        return;
      }

      // Reset and refresh
      setFormReason('');
      setShowAddForm(false);
      onRefresh();
    } catch {
      setFormError('Failed to save off day. Please try again.');
    } finally {
      setSavingOffDay(false);
    }
  }

  // Handle Delete Off Day
  async function handleDeleteOffDay(id: string, date: string) {
    if (!confirm(`Remove off day for ${date}?`)) return;

    try {
      const res = await fetch('/api/off-days', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to delete off day.');
      }
    } catch {
      alert('Network error while deleting off day.');
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>🏖️</span> Off & Leave Tracker
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Track non-office days, paid leave balance, and unpaid leaves.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setFormError(null);
          }}
          className="text-xs font-semibold px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
        >
          <span>{showAddForm ? '✕ Close' : '+ Log Off Day'}</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Remaining Paid Leaves */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            Remaining Paid
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {remainingPaid}
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-500 ml-1">
              days
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5 font-medium">
            {remainingPaid < 0
              ? '⚠️ Quota exceeded'
              : remainingPaid === 0
              ? 'No leaves left'
              : 'Available to take'}
          </div>
        </div>

        {/* Paid Leaves Used */}
        <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
            Paid Leaves Used
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {paidCount}
            <span className="text-xs font-normal text-blue-600 dark:text-blue-500 ml-1">
              days
            </span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-500 mt-0.5 font-medium">
            out of {quota} allowed
          </div>
        </div>

        {/* Paid Leave Allowance (Quota) */}
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Total Quota
            </span>
            {!isEditingQuota && (
              <button
                onClick={() => setIsEditingQuota(true)}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingQuota ? (
            <form onSubmit={handleSaveQuota} className="mt-1 flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={quotaInput}
                onChange={(e) => setQuotaInput(e.target.value)}
                className="w-16 px-1.5 py-0.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold"
                autoFocus
              />
              <button
                type="submit"
                disabled={savingQuota}
                className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
              >
                {savingQuota ? '…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuotaInput(String(quota));
                  setIsEditingQuota(false);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 px-1"
              >
                ✕
              </button>
            </form>
          ) : (
            <>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                {quota}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                  days
                </span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Total paid allowance
              </div>
            </>
          )}
        </div>

        {/* Unpaid Off Days */}
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            Unpaid Leaves
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {unpaidCount}
            <span className="text-xs font-normal text-amber-600 dark:text-amber-500 ml-1">
              days
            </span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5 font-medium">
            {totalCount} total leaves taken
          </div>
        </div>
      </div>

      {/* Add Off Day Expandable Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddOffDay}
          className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <span>📝</span> Log a Day Off
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Pick date and leave category
            </span>
          </div>

          {formError && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Leave Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Leave Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormType('paid')}
                  className={`text-xs py-2 px-3 rounded-lg font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    formType === 'paid'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>🌴</span> Paid Leave
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('unpaid')}
                  className={`text-xs py-2 px-3 rounded-lg font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    formType === 'unpaid'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>🚫</span> Unpaid
                </button>
              </div>
            </div>
          </div>

          {/* Reason / Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Reason / Note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Doctor appointment, family function, sick leave"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs px-3.5 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingOffDay}
              className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {savingOffDay ? 'Saving…' : 'Save Off Day'}
            </button>
          </div>
        </form>
      )}

      {/* Logged Off Days List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Leave History ({offDays.length})
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {paidCount} paid · {unpaidCount} unpaid
          </span>
        </div>

        {offDays.length === 0 ? (
          <div className="text-center py-6 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No off days logged yet.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Click &quot;+ Log Off Day&quot; above to record days you didn&apos;t go to the office.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {offDays.map((item) => {
              let formattedDate = item.date;
              try {
                formattedDate = format(parseISO(item.date), 'EEE, MMM d, yyyy');
              } catch {
                // keep fallback
              }

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-md flex items-center gap-1 ${
                        item.type === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      <span>{item.type === 'paid' ? '🌴' : '🚫'}</span>
                      {item.type === 'paid' ? 'Paid Leave' : 'Unpaid'}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {formattedDate}
                      </div>
                      {item.reason && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteOffDay(item.id, item.date)}
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete this off day"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
