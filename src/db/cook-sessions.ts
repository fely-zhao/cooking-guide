import { getDatabase } from './init';
import type { CookSession } from '../types/cooking';
import { generateUuid } from '../utils/uuid';

function mapRowToCookSession(row: Record<string, unknown>): CookSession {
  return {
    id: row.id as string,
    recipeId: row.recipe_id as string,
    startedAt: row.started_at as string,
    finishedAt: row.finished_at as string | undefined,
    completed: Boolean(row.completed),
  };
}

export function createSession(recipeId: string): string {
  const db = getDatabase();
  const id = generateUuid();
  const now = Date.now().toString();

  db.executeSync(
    `INSERT INTO cook_sessions (id, recipe_id, started_at, finished_at, completed)
     VALUES (?, ?, ?, ?, ?)`,
    [id, recipeId, now, null, 0],
  );

  return id;
}

export function finishSession(id: string, completed: boolean): void {
  const db = getDatabase();
  const now = Date.now().toString();

  db.executeSync(`UPDATE cook_sessions SET finished_at = ?, completed = ? WHERE id = ?`, [
    now,
    completed ? 1 : 0,
    id,
  ]);
}

export function getSessionsByRecipe(recipeId: string): CookSession[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT * FROM cook_sessions WHERE recipe_id = ? ORDER BY started_at DESC`,
    [recipeId],
  );

  return result.rows.map(mapRowToCookSession);
}
