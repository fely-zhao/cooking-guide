import type { DB } from '@op-engineering/op-sqlite';

/**
 * Schema 迁移定义。规则：
 * - 每个迁移必须幂等（CREATE TABLE IF NOT EXISTS / PRAGMA table_info 检测后 ALTER），
 *   因为无版本记录的老安装会从 v1 顺序重放，已生效的迁移靠幂等写法空转。
 * - 只能追加新迁移到数组末尾，version 严格递增；禁止修改已发布的迁移内容。
 * - 变更必须同步更新 docs/架构与技术文档.md「本地存储」Schema 段。
 */
export type Migration = {
  version: number;
  name: string;
  up: (db: DB) => void;
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'init',
    up: db => {
      // 4 张表最终结构（含 is_favorite），新安装一次到位
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
    },
  },
  {
    version: 2,
    name: 'add-is-favorite',
    up: db => {
      // 老安装补列：is_favorite 为后补列，CREATE TABLE IF NOT EXISTS 不会为已存在的表加列
      const columns = db.executeSync('PRAGMA table_info(recipes)');
      const hasFavoriteColumn = columns.rows.some(
        row => (row as { name: string }).name === 'is_favorite',
      );
      if (!hasFavoriteColumn) {
        db.executeSync('ALTER TABLE recipes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0');
      }
    },
  },
];

export function runMigrations(db: DB): void {
  db.executeSync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const appliedRows = db.executeSync('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.rows.map(row => (row as { version: number }).version));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) {
      continue;
    }
    // 每个迁移独立事务：迁移执行与版本记录同生共死。
    // 不复用 withTransaction：它经 init.ts 取实例，从这里引用会形成循环依赖。
    db.executeSync('BEGIN TRANSACTION');
    try {
      migration.up(db);
      db.executeSync('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
        migration.version,
        migration.name,
        Date.now(),
      ]);
      db.executeSync('COMMIT');
    } catch (error) {
      db.executeSync('ROLLBACK');
      throw error;
    }
  }
}
