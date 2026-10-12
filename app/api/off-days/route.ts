import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { offDays } from '@/lib/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const getQuerySchema = z.object({
  from: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)').optional(),
  to: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)').optional(),
});

const postBodySchema = z.object({
  date: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
  type: z.enum(['paid', 'unpaid']),
  reason: z.string().optional().default(''),
});

const deleteBodySchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().regex(dateRegex).optional(),
}).refine((data) => data.id || data.date, { message: 'Must provide either id or date' });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  const parsed = getQuerySchema.safeParse({ from, to });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' }, { status: 400 });
  }

  try {
    if (parsed.data.from && parsed.data.to) {
      const records = await db
        .select()
        .from(offDays)
        .where(and(gte(offDays.date, parsed.data.from), lte(offDays.date, parsed.data.to)))
        .orderBy(desc(offDays.date));
      return NextResponse.json(records);
    }

    const records = await db
      .select()
      .from(offDays)
      .orderBy(desc(offDays.date));
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
      .insert(offDays)
      .values({
        date: parsed.data.date,
        type: parsed.data.type,
        reason: parsed.data.reason ?? '',
      })
      .onConflictDoUpdate({
        target: offDays.date,
        set: {
          type: parsed.data.type,
          reason: parsed.data.reason ?? '',
        },
      })
      .returning();

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  try {
    if (parsed.data.id) {
      await db.delete(offDays).where(eq(offDays.id, parsed.data.id));
    } else if (parsed.data.date) {
      await db.delete(offDays).where(eq(offDays.date, parsed.data.date));
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
