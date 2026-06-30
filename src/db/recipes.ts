import { getDatabase } from './init';
import { withTransaction } from './transaction';
import type { Recipe, Ingredient, Step } from '../types/cooking';
import { getIngredientsByRecipe } from './ingredients';
import { getStepsByRecipe } from './steps';
import { generateUuid } from '../utils/uuid';

type RecipeInput = {
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  servings: number;
  coverImage?: string;
};

type RecipeUpdateInput = Partial<Omit<Recipe, 'id' | 'createdAt' | 'ingredients' | 'steps'>> & {
  coverImage?: string;
};

function mapRowToRecipe(
  row: Record<string, unknown>,
): Omit<Recipe, 'ingredients' | 'steps'> & { coverImage?: string } {
  return {
    id: row.id as string,
    name: row.name as string,
    coverImage: (row.cover_image as string) ?? undefined,
    servings: (row.servings as number) ?? 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createRecipe(recipe: RecipeInput): string {
  const db = getDatabase();
  const id = generateUuid();
  const now = Date.now().toString();

  withTransaction(() => {
    db.executeSync(
      `INSERT INTO recipes (id, name, cover_image, servings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, recipe.name, recipe.coverImage ?? null, recipe.servings ?? null, now, now],
    );

    if (recipe.ingredients.length > 0) {
      for (let i = 0; i < recipe.ingredients.length; i++) {
        const ing = recipe.ingredients[i];
        db.executeSync(
          `INSERT INTO ingredients (id, recipe_id, name, amount, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [generateUuid(), id, ing.name, ing.amount, i],
        );
      }
    }

    if (recipe.steps.length > 0) {
      for (let i = 0; i < recipe.steps.length; i++) {
        const step = recipe.steps[i];
        db.executeSync(
          `INSERT INTO steps (id, recipe_id, step_number, text, tag, duration_seconds, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [generateUuid(), id, i + 1, step.text, step.tag, step.durationSeconds ?? null, i],
        );
      }
    }
  });

  return id;
}

export function getRecipe(id: string): Recipe | null {
  const db = getDatabase();
  const result = db.executeSync(`SELECT * FROM recipes WHERE id = ?`, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const baseRecipe = mapRowToRecipe(row);
  const ingredients = getIngredientsByRecipe(id);
  const steps = getStepsByRecipe(id);

  return {
    ...baseRecipe,
    ingredients,
    steps,
  };
}

export function getAllRecipes(): Recipe[] {
  const db = getDatabase();
  const result = db.executeSync(`SELECT * FROM recipes ORDER BY updated_at DESC`);

  return result.rows.map(row => {
    const baseRecipe = mapRowToRecipe(row);
    const ingredients = getIngredientsByRecipe(baseRecipe.id);
    const steps = getStepsByRecipe(baseRecipe.id);
    return {
      ...baseRecipe,
      ingredients,
      steps,
    };
  });
}

export function updateRecipe(id: string, partial: RecipeUpdateInput): boolean {
  const db = getDatabase();
  const now = Date.now().toString();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (partial.name !== undefined) {
    fields.push('name = ?');
    values.push(partial.name);
  }
  if (partial.coverImage !== undefined) {
    fields.push('cover_image = ?');
    values.push(partial.coverImage);
  }
  if (partial.servings !== undefined) {
    fields.push('servings = ?');
    values.push(partial.servings);
  }

  if (fields.length === 0) {
    return false;
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const result = db.executeSync(`UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`, values);

  return result.rowsAffected > 0;
}

export function deleteRecipe(id: string): boolean {
  const db = getDatabase();
  const result = db.executeSync(`DELETE FROM recipes WHERE id = ?`, [id]);
  return result.rowsAffected > 0;
}
