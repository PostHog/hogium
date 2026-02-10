import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

function getDbPath(): string {
  const filename = app.isPackaged ? 'hogium.db' : 'hogium-dev.db';
  return path.join(app.getPath('userData'), filename);
}

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function clearDatabase(): void {
  const dbPath = getDbPath();
  closeDatabase();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  // Remove WAL/SHM files if present
  for (const suffix of ['-wal', '-shm']) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  getDatabase();
}
