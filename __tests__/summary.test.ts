import { describe, it, expect } from 'vitest';
import { generateSummary } from '../lib/summary';
import { Entry } from '../lib/timeUtils';

function makeEntry(
  id: string,
  startISO: string,
  endISO: string | null,
  task: string
): Entry {
  return {
    id,
    start: new Date(startISO),
    end: endISO ? new Date(endISO) : null,
    task,
    created_at: new Date(startISO),
  };
}

describe('generateSummary', () => {
  it('generates correct output for empty entries', () => {
    const result = generateSummary([], 0);
    expect(result).toContain('Timesheet -');
    expect(result).toContain('Total today: 0m | This week: 0m / 40h');
  });

  it('generates correct output for a single entry', () => {
    const entries = [
      makeEntry('1', '2024-01-15T09:00:00.000Z', '2024-01-15T10:30:00.000Z', 'Feature work'),
    ];
    const result = generateSummary(entries, 5400000); // 1.5h week total
    expect(result).toContain('Timesheet -');
    expect(result).toContain('Feature work');
    expect(result).toContain('Total today: 1h 30m | This week: 1h 30m / 40h');
  });

  it('merges consecutive same-task blocks in the summary', () => {
    const entries = [
      makeEntry('1', '2024-01-15T09:00:00.000Z', '2024-01-15T10:00:00.000Z', 'Feature'),
      makeEntry('2', '2024-01-15T10:00:00.000Z', '2024-01-15T11:00:00.000Z', 'Feature'),
    ];
    const result = generateSummary(entries, 7200000);
    // Should only have one "Feature" line after merging
    const lines = result.split('\n').filter((l) => l.includes('Feature'));
    expect(lines).toHaveLength(1);
    expect(result).toContain('Total today: 2h | This week: 2h / 40h');
  });

  it('does not merge entries with different tasks', () => {
    const entries = [
      makeEntry('1', '2024-01-15T09:00:00.000Z', '2024-01-15T10:00:00.000Z', 'Feature'),
      makeEntry('2', '2024-01-15T10:00:00.000Z', '2024-01-15T11:00:00.000Z', 'Research'),
    ];
    const result = generateSummary(entries, 7200000);
    const featureLines = result.split('\n').filter((l) => l.includes('Feature'));
    const researchLines = result.split('\n').filter((l) => l.includes('Research'));
    expect(featureLines).toHaveLength(1);
    expect(researchLines).toHaveLength(1);
  });

  it('skips running entries (end = null)', () => {
    const entries = [
      makeEntry('1', '2024-01-15T09:00:00.000Z', '2024-01-15T10:00:00.000Z', 'Done'),
      makeEntry('2', '2024-01-15T10:00:00.000Z', null, 'Running'),
    ];
    const result = generateSummary(entries, 3600000);
    expect(result).toContain('Done');
    expect(result).not.toContain('Running');
    expect(result).toContain('Total today: 1h');
  });

  it('formats the header line correctly', () => {
    // Monday Jan 15, 2024 at 9am UTC
    const entries = [
      makeEntry('1', '2024-01-15T09:00:00.000Z', '2024-01-15T10:00:00.000Z', 'Work'),
    ];
    const result = generateSummary(entries, 3600000);
    // Header should start with "Timesheet -"
    expect(result.startsWith('Timesheet -')).toBe(true);
  });
});
