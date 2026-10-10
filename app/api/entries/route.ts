import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { entries } from '@/lib/schema';
import { and, gte, lte, ne, not, or, lt, gt, eq, isNull } from 'drizzle-orm';

const isoString = z.string().refine((s) => !isNaN(Date.parse(s)), { message: 'Invalid ISO date' });

const getQuerySchema = z.object({
  from: isoString,
  to: isoString,
});

const postBodySchema = z.object({
  start: isoString,
  end: isoString,
  task: z.string().default(''),
});

const patchBodySchema = z.object({
  id: z.string().uuid(),
  start: isoString.optional(),
  end: isoString.optional(),
  task: z.string().optional(),
});

const deleteBodySchema = z.object({
  id: z.string().uuid(),
});

async function checkOverlap(
  startDate: Date,
  endDate: Date,
  excludeId?: string
): Promise<boolean> {
  // Explicitly exclude running entries (end IS NULL) so they never block manual adds/edits
  const conditions = [
    not(
      or(
        lte(entries.end, startDate),
        gte(entries.start, endDate)
      )!
    ),
    not(isNull(entries.end)),
  ];

  if (excludeId) {
    conditions.push(ne(entries.id, excludeId));
  }

  const overlapping = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(...conditions))
    .limit(1);

  return overlapping.length > 0;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const parsed = getQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { from, to } = parsed.data;
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const rows = await db
    .select()
    .from(entries)
    .where(
      and(
        gte(entries.start, fromDate),
        lte(entries.start, toDate)
      )
    )
    .orderBy(entries.start);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const startDate = new Date(parsed.data.start);
  const endDate = new Date(parsed.data.end);

  if (endDate <= startDate) {
    return NextResponse.json({ error: 'End must be after start' }, { status: 400 });
  }

  const hasOverlap = await checkOverlap(startDate, endDate);
  if (hasOverlap) {
    return NextResponse.json({ error: 'Entry overlaps with an existing entry' }, { status: 409 });
  }

  const [newEntry] = await db
    .insert(entries)
    .values({ start: startDate, end: endDate, task: parsed.data.task })
    .returning();

  return NextResponse.json(newEntry, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id, start, end, task } = parsed.data;

  // Fetch existing entry
  const [existing] = await db.select().from(entries).where(eq(entries.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const newStart = start ? new Date(start) : existing.start;
  const newEnd = end ? new Date(end) : existing.end;

  if (newEnd && newEnd <= newStart) {
    return NextResponse.json({ error: 'End must be after start' }, { status: 400 });
  }

  if (newEnd) {
    const hasOverlap = await checkOverlap(newStart, newEnd, id);
    if (hasOverlap) {
      return NextResponse.json({ error: 'Entry overlaps with an existing entry' }, { status: 409 });
    }
  }

  const updateData: Partial<typeof existing> = {};
  if (start) updateData.start = newStart;
  if (end) updateData.end = newEnd;
  if (task !== undefined) updateData.task = task;

  const [updated] = await db
    .update(entries)
    .set(updateData)
    .where(eq(entries.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id } = parsed.data;
  const [deleted] = await db.delete(entries).where(eq(entries.id, id)).returning();

  if (!deleted) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
