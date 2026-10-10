import { format } from 'date-fns';
import { mergeConsecutiveBlocks, formatDuration, Entry } from './timeUtils';

/**
 * Generates a timesheet summary string from today's entries.
 *
 * Template:
 * Timesheet - {Day, DD Mon}
 *
 * {h:mm AM} - {h:mm AM}: {task}
 * ...
 *
 * Total today: {Xh Ym} | This week: {Xh Ym} / 40h
 */
export function generateSummary(entries: Entry[], weekTotalMs: number): string {
  // Filter to completed entries only, sort by start
  const completed = entries
    .filter((e) => e.end !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge consecutive same-task blocks
  const blocks = mergeConsecutiveBlocks(completed);

  // Determine the date (first entry's date or today)
  const referenceDate = blocks.length > 0 ? blocks[0].start : new Date();

  // Header line: "Timesheet - Wednesday, 15 Jan"
  const header = `Timesheet - ${format(referenceDate, 'EEEE, dd MMM')}`;

  // Build time lines
  const lines = blocks
    .filter((b) => b.end !== null)
    .map((b) => {
      const startStr = format(b.start, 'h:mm a');
      const endStr = format(b.end!, 'h:mm a');
      return `${startStr} - ${endStr}: ${b.task}`;
    });

  // Calculate total today
  let todayTotalMs = 0;
  for (const b of blocks) {
    if (b.end !== null) {
      todayTotalMs += b.end.getTime() - b.start.getTime();
    }
  }

  const footer = `Total today: ${formatDuration(todayTotalMs)} | This week: ${formatDuration(weekTotalMs)} / 40h`;

  const parts = [header, '', ...lines, '', footer];
  return parts.join('\n');
}
