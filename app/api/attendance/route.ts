import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { attendance } from '@/lib/schema';
import { and, gte, lte } from 'drizzle-orm';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const getQuerySchema = z.object({
  from: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
  to: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
});

const postBodySchema = z.object({
  date: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
  attended: z.boolean(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    // If no range specified, return all attendance records
    try {
      const records = await db.select().from(attendance);
      return NextResponse.json(records);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const parsed = getQuerySchema.safeParse({ from, to });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' }, { status: 400 });
  }

  try {
    const records = await db
      .select()
      .from(attendance)
      .where(and(gte(attendance.date, parsed.data.from), lte(attendance.date, parsed.data.to)));

    return NextResponse.json(records);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  try {
    const [result] = await db
      .insert(attendance)
      .values({
        date: parsed.data.date,
        attended: parsed.data.attended,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: attendance.date,
        set: {
          attended: parsed.data.attended,
          updated_at: new Date(),
        },
      })
      .returning();

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
