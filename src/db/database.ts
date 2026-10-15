import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, DEFAULT_CATEGORIES } from './schema';

// A single shared connection, opened lazily on first use.
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Opens (once) and initializes the local database: enables foreign keys,
// creates the tables, and seeds the default categories.
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync('receipts.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  await seedCategories(db);

  dbInstance = db;
  return db;
}

// Inserts the default categories only when the table is still empty.
async function seedCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM categories'
  );
  if (row && row.count > 0) return;

  for (const c of DEFAULT_CATEGORIES) {
    await db.runAsync(
      'INSERT INTO categories (name, color, keywords) VALUES (?, ?, ?)',
      c.name,
      c.color,
      c.keywords
    );
  }
}
