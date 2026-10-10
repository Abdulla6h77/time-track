import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { entries } from '@/lib/schema';
import { isNull, eq } from 'drizzle-orm';

const switchSchema = z.object({
  task: z.string().min(1, 'Task is required'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Find running entry
  const [running] = await db
    .select()
    .from(entries)
    .where(isNull(entries.end))
    .limit(1);

  if (!running) {
    return NextResponse.json({ error: 'Not clocked in' }, { status: 400 });
  }

  const now = new Date();

  // Close the running entry
  const [closedEntry] = await db
    .update(entries)
    .set({ end: now })
    .where(eq(entries.id, running.id))
    .returning();

  // Start a new entry
  const [newEntry] = await db
    .insert(entries)
    .values({ start: now, task: parsed.data.task })
    .returning();

  return NextResponse.json({ closed: closedEntry, started: newEntry });
}
