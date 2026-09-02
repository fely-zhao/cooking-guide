import { MIGRATIONS, runMigrations } from '../db/migrations';

type Executed = { sql: string; params?: unknown[] };

function createMockDb(options: { appliedVersions?: number[]; failOn?: RegExp } = {}) {
  const executed: Executed[] = [];
  const db = {
    executeSync: jest.fn((sql: string, params?: unknown[]) => {
      if (options.failOn?.test(sql)) {
        throw new Error(`mock failure: ${sql}`);
      }
      executed.push({ sql, params });
      if (/SELECT version FROM schema_migrations/.test(sql)) {
        return { rows: (options.appliedVersions ?? []).map(version => ({ version })) };
      }
      // PRAGMA table_info：默认返回不含 is_favorite 的旧列结构，触发 ALTER 分支
      if (/PRAGMA table_info/.test(sql)) {
        return { rows: [{ name: 'id' }, { name: 'name' }] };
      }
      return { rows: [] };
    }),
  };
  return { db, executed };
}

function countSql(executed: Executed[], pattern: RegExp) {
  return executed.filter(entry => pattern.test(entry.sql)).length;
}

describe('runMigrations', () => {
  it('全新数据库执行全部迁移，每个迁移一个事务并写入版本记录', () => {
    const { db, executed } = createMockDb();
    runMigrations(db as never);

    expect(countSql(executed, /BEGIN TRANSACTION/)).toBe(MIGRATIONS.length);
    expect(countSql(executed, /COMMIT/)).toBe(MIGRATIONS.length);
    expect(countSql(executed, /INSERT INTO schema_migrations/)).toBe(MIGRATIONS.length);

    const versions = executed
      .filter(entry => /INSERT INTO schema_migrations/.test(entry.sql))
      .map(entry => entry.params?.[0]);
    expect(versions).toEqual(MIGRATIONS.map(migration => migration.version));
  });

  it('跳过已应用版本，只执行剩余迁移', () => {
    const { db, executed } = createMockDb({ appliedVersions: [1] });
    runMigrations(db as never);

    expect(countSql(executed, /BEGIN TRANSACTION/)).toBe(MIGRATIONS.length - 1);
    const versions = executed
      .filter(entry => /INSERT INTO schema_migrations/.test(entry.sql))
      .map(entry => entry.params?.[0]);
    expect(versions).not.toContain(1);
  });

  it('迁移失败时 ROLLBACK 且不写入版本记录', () => {
    const { db, executed } = createMockDb({ failOn: /ALTER TABLE/ });
    expect(() => runMigrations(db as never)).toThrow();

    expect(countSql(executed, /ROLLBACK/)).toBe(1);
    expect(countSql(executed, /INSERT INTO schema_migrations/)).toBe(1); // 仅 v1 成功记录
  });

  it('迁移 version 严格递增且不重复', () => {
    for (let i = 1; i < MIGRATIONS.length; i++) {
      expect(MIGRATIONS[i].version).toBeGreaterThan(MIGRATIONS[i - 1].version);
    }
  });
});
