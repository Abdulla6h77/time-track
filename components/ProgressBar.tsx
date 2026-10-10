'use client';

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
}

export default function ProgressBar({ value, color = 'bg-blue-500' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
      <div
        className={`${color} h-3 rounded-full transition-all duration-300`}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
