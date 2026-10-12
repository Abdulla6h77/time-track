import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { entries, attendance } from '@/lib/schema';
import { isNull } from 'drizzle-orm';
import { format } from 'date-fns';

const clockInSchema = z.object({
  task: z.string().optional().default(''),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = clockInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Check no running entry exists
  const running = await db
    .select()
    .from(entries)
    .where(isNull(entries.end))
    .limit(1);

  if (running.length > 0) {
    return NextResponse.json({ error: 'Already clocked in' }, { status: 409 });
  }

  const [newEntry] = await db
    .insert(entries)
    .values({ start: new Date(), task: parsed.data.task })
    .returning();

  // Auto-record office attendance for today
  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    await db
      .insert(attendance)
      .values({ date: todayStr, attended: true })
      .onConflictDoUpdate({
        target: attendance.date,
        set: { attended: true, updated_at: new Date() },
      });
  } catch {
    // Non-blocking if attendance write fails
  }

  return NextResponse.json(newEntry);
}

