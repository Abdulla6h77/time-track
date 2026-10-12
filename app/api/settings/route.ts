import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const postBodySchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function GET() {
  try {
    const all = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const s of all) {
      map[s.key] = s.value;
    }
    return NextResponse.json(map);
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
      .insert(settings)
      .values({
        key: parsed.data.key,
        value: parsed.data.value,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: parsed.data.value,
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
