import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '../auth/route';

export async function GET(req: Request) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const syncData = db.prepare('SELECT version, updated_at, payload FROM cloud_sync WHERE user_id = ?').get(user.id) as any;
    
    if (!syncData) {
      return NextResponse.json({ empty: true });
    }

    return NextResponse.json({
      empty: false,
      version: syncData.version,
      updated_at: syncData.updated_at,
      payload: JSON.parse(syncData.payload)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { payload, version } = body;
    
    if (!payload) return NextResponse.json({ error: 'Missing Sync Payload' }, { status: 400 });

    const db = getDb();
    const now = Date.now();

    const existing = db.prepare('SELECT user_id FROM cloud_sync WHERE user_id = ?').get(user.id);

    if (existing) {
      db.prepare('UPDATE cloud_sync SET version = ?, updated_at = ?, payload = ? WHERE user_id = ?')
        .run(version || 1, now, JSON.stringify(payload), user.id);
    } else {
      db.prepare('INSERT INTO cloud_sync (user_id, version, updated_at, payload) VALUES (?, ?, ?, ?)')
        .run(user.id, version || 1, now, JSON.stringify(payload));
    }

    return NextResponse.json({ success: true, updated_at: now });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
