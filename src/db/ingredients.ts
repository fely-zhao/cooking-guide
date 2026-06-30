import { getDatabase } from './init';
import type { Ingredient } from '../types/cooking';
import { generateUuid } from '../utils/uuid';

type IngredientInput = Omit<Ingredient, 'id'> & {
  recipeId: string;
  sortOrder?: number;
};

type IngredientUpdateInput = Partial<Omit<Ingredient, 'id'>> & {
  recipeId?: string;
  sortOrder?: number;
};

function mapRowToIngredient(row: Record<string, unknown>): Ingredient {
  return {
    id: row.id as string,
    name: row.name as string,
    amount: row.amount as string,
  };
}

export function createIngredient(ingredient: IngredientInput): string {
  const db = getDatabase();
  const id = generateUuid();

  db.executeSync(
    `INSERT INTO ingredients (id, recipe_id, name, amount, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [id, ingredient.recipeId, ingredient.name, ingredient.amount, ingredient.sortOrder ?? 0],
  );

  return id;
}

export function getIngredientsByRecipe(recipeId: string): Ingredient[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order`,
    [recipeId],
  );

  return result.rows.map(mapRowToIngredient);
}

export function updateIngredient(id: string, partial: IngredientUpdateInput): boolean {
  const db = getDatabase();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (partial.recipeId !== undefined) {
    fields.push('recipe_id = ?');
    values.push(partial.recipeId);
  }
  if (partial.name !== undefined) {
    fields.push('name = ?');
    values.push(partial.name);
  }
  if (partial.amount !== undefined) {
    fields.push('amount = ?');
    values.push(partial.amount);
  }
  if (partial.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(partial.sortOrder);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  const result = db.executeSync(`UPDATE ingredients SET ${fields.join(', ')} WHERE id = ?`, values);

  return result.rowsAffected > 0;
}

export function deleteIngredient(id: string): boolean {
  const db = getDatabase();
  const result = db.executeSync(`DELETE FROM ingredients WHERE id = ?`, [id]);
  return result.rowsAffected > 0;
}

export function deleteByRecipe(recipeId: string): void {
  const db = getDatabase();
  db.executeSync(`DELETE FROM ingredients WHERE recipe_id = ?`, [recipeId]);
}
