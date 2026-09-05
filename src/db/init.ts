import { open } from '@op-engineering/op-sqlite';
import { runMigrations } from './migrations';

let dbInstance: ReturnType<typeof open> | null = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = open({ name: 'cooking-guide.db' });
    dbInstance.executeSync('PRAGMA foreign_keys = ON');
    runMigrations(dbInstance);
  }
  return dbInstance;
}
