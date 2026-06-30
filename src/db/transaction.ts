import { getDatabase } from './init';

/**
 * Execute a synchronous function within a SQLite transaction.
 * Uses BEGIN/COMMIT/ROLLBACK via executeSync for atomicity.
 * If fn throws, the transaction is rolled back and the error re-thrown.
 */
export function withTransaction<T>(fn: () => T): T {
  const db = getDatabase();
  db.executeSync('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.executeSync('COMMIT');
    return result;
  } catch (error) {
    db.executeSync('ROLLBACK');
    throw error;
  }
}
