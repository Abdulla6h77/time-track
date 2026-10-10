import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signSession, AUTH_COOKIE_NAME, checkRateLimit, recordFailedAttempt } from '@/lib/auth';

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';

  // Check rate limit before doing anything
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter ?? 900) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { password } = parsed.data;
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (password !== appPassword) {
    // Delay on failure to slow brute force
    await new Promise((r) => setTimeout(r, 500));
    recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await signSession({ authenticated: true });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
