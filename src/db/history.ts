import { getDatabase } from './database';

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  faviconUrl?: string;
  visitedAt: string;
}

interface HistoryRow {
  id: number;
  url: string;
  title: string;
  favicon_url: string | null;
  visited_at: string;
}

function rowToEntry(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    faviconUrl: row.favicon_url ?? undefined,
    visitedAt: row.visited_at,
  };
}

export function recordVisit(url: string, title: string, faviconUrl?: string): void {
  const db = getDatabase();
  db.prepare(
    'INSERT INTO history (url, title, favicon_url) VALUES (?, ?, ?)',
  ).run(url, title, faviconUrl ?? null);
}

export function searchHistory(query: string, limit = 50): HistoryEntry[] {
  const db = getDatabase();
  const pattern = `%${query}%`;
  const rows = db
    .prepare(
      'SELECT id, url, title, favicon_url, visited_at FROM history WHERE url LIKE ? OR title LIKE ? ORDER BY visited_at DESC LIMIT ?',
    )
    .all(pattern, pattern, limit) as HistoryRow[];
  return rows.map(rowToEntry);
}

export function getRecentHistory(limit = 50): HistoryEntry[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      'SELECT id, url, title, favicon_url, visited_at FROM history ORDER BY visited_at DESC LIMIT ?',
    )
    .all(limit) as HistoryRow[];
  return rows.map(rowToEntry);
}

export function updateFaviconForUrl(url: string, faviconUrl: string): void {
  const db = getDatabase();
  db.prepare(
    'UPDATE history SET favicon_url = ? WHERE url = ? AND favicon_url IS NULL',
  ).run(faviconUrl, url);
}

export function deleteHistoryEntry(id: number): void {
  const db = getDatabase();
  db.prepare('DELETE FROM history WHERE id = ?').run(id);
}

export function clearHistory(): void {
  const db = getDatabase();
  db.exec('DELETE FROM history');
}
