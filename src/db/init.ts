import { open } from '@op-engineering/op-sqlite';
import { withTransaction } from './transaction';

let dbInstance: ReturnType<typeof open> | null = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = open({ name: 'cooking-guide.db' });
    dbInstance.executeSync('PRAGMA foreign_keys = ON');
    initializeTables(dbInstance);
  }
  return dbInstance;
}

function initializeTables(_db: ReturnType<typeof open>) {
  withTransaction(() => {
    const db = getDatabase();
    db.executeSync(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cover_image BLOB,
        servings INTEGER,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // 幂等迁移：老安装补 is_favorite 列（CREATE TABLE IF NOT EXISTS 不会为已存在的表加列）
    const recipeColumns = db.executeSync('PRAGMA table_info(recipes)');
    const hasFavoriteColumn = recipeColumns.rows.some(
      row => (row as { name: string }).name === 'is_favorite',
    );
    if (!hasFavoriteColumn) {
      db.executeSync('ALTER TABLE recipes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0');
    }

    db.executeSync(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
        name TEXT,
        amount TEXT,
        sort_order INTEGER
      );
    `);

    db.executeSync(`
      CREATE TABLE IF NOT EXISTS steps (
        id TEXT PRIMARY KEY,
        recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
        step_number INTEGER,
        text TEXT,
        tag TEXT CHECK(tag IN ('instant','wait_user','wait_timer')),
        duration_seconds INTEGER,
        sort_order INTEGER
      );
    `);

    db.executeSync(`
      CREATE TABLE IF NOT EXISTS cook_sessions (
        id TEXT PRIMARY KEY,
        recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
        started_at INTEGER,
        finished_at INTEGER,
        completed INTEGER DEFAULT 0
      );
    `);
  });
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
