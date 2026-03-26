import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Extracts and validates the current session
export function getSessionUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || "";
  const match = cookieHeader.match(/quran_session=([^;]+)/);
  if (!match) return null;
  const sessionId = match[1];

  const db = getDb();
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(sessionId) as any;
  
  if (!session || session.expires_at < Date.now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }

  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(session.user_id) as any;
  return user || null;
}

export async function GET(req: Request) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ authenticated: false });
    return NextResponse.json({ authenticated: true, user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password } = body;
    const db = getDb();
    const now = Date.now();

    if (action === 'logout') {
      const cookieHeader = req.headers.get('cookie') || "";
      const match = cookieHeader.match(/quran_session=([^;]+)/);
      if (match) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(match[1]);
      }
      const res = NextResponse.json({ success: true });
      res.cookies.set('quran_session', '', { maxAge: 0, path: '/' });
      return res;
    }

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Valid email and 6+ char password required.' }, { status: 400 });
    }

    let user: any = null;

    if (action === 'register') {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });

      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(userId, email, passwordHash, now);
      user = { id: userId, email };
    } else if (action === 'login') {
      const existingUser = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email) as any;
      if (!existingUser) return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });

      const isValid = await bcrypt.compare(password, existingUser.password_hash);
      if (!isValid) return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
      user = { id: existingUser.id, email: existingUser.email };
    } else {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }

    // Provision Secure Session
    const sessionId = crypto.randomUUID();
    const expiresAt = now + 1000 * 60 * 60 * 24 * 30; // 30 Days
    db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt);

    const res = NextResponse.json({ success: true, user });
    res.cookies.set('quran_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
