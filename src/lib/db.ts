import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function getDb() {
  if (db) return db;

  // Ensure a persistent data directory exists outside of next build paths
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'quran_typing.db');
  db = new Database(dbPath);

  // Initialize tables directly supporting MVP, cleanly allowing future Supabase migration
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cloud_sync (
      user_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return db;
}
