import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { entries } from '@/lib/schema';
import { isNull, eq } from 'drizzle-orm';

export async function POST() {
  const [running] = await db
    .select()
    .from(entries)
    .where(isNull(entries.end))
    .limit(1);

  if (!running) {
    return NextResponse.json({ error: 'Not clocked in' }, { status: 400 });
  }

  const [updated] = await db
    .update(entries)
    .set({ end: new Date() })
    .where(eq(entries.id, running.id))
    .returning();

  return NextResponse.json(updated);
}
