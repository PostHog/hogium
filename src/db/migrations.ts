import Database from 'better-sqlite3';

export interface Migration {
  version: number;
  up: (db: Database.Database) => void;
}

/** Ordered list of migrations. Append new ones at the end. */
export const migrations: Migration[] = [
  // Future feature tables go here, e.g.:
  // { version: 1, up: (db) => { db.exec(`CREATE TABLE ...`); } },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => (row as { version: number }).version),
  );

  const runAll = db.transaction(() => {
    for (const migration of migrations) {
      if (!applied.has(migration.version)) {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(
          migration.version,
        );
      }
    }
  });

  runAll();
}
