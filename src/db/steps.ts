import { getDatabase } from './init';
import type { Step } from '../types/cooking';
import { generateUuid } from '../utils/uuid';

const VALID_TAGS = ['instant', 'wait_user', 'wait_timer'] as const;
type ValidTag = (typeof VALID_TAGS)[number];

type StepInput = Omit<Step, 'id' | 'subSteps'> & {
  recipeId: string;
  stepNumber: number;
  sortOrder?: number;
};

type StepUpdateInput = Partial<Omit<Step, 'id' | 'subSteps'>> & {
  recipeId?: string;
  stepNumber?: number;
  sortOrder?: number;
};

function validateTag(tag: string): ValidTag {
  if (VALID_TAGS.includes(tag as ValidTag)) {
    return tag as ValidTag;
  }
  throw new Error(`Invalid step tag: ${tag}. Must be one of: ${VALID_TAGS.join(', ')}`);
}

function mapRowToStep(row: Record<string, unknown>): Step {
  return {
    id: row.id as string,
    text: row.text as string,
    tag: row.tag as ValidTag,
    durationSeconds: row.duration_seconds as number | undefined,
    subSteps: [],
  };
}

export function createStep(step: StepInput): string {
  const db = getDatabase();
  const id = generateUuid();
  const validatedTag = validateTag(step.tag);

  db.executeSync(
    `INSERT INTO steps (id, recipe_id, step_number, text, tag, duration_seconds, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      step.recipeId,
      step.stepNumber,
      step.text,
      validatedTag,
      step.durationSeconds ?? null,
      step.sortOrder ?? 0,
    ],
  );

  return id;
}

export function getStepsByRecipe(recipeId: string): Step[] {
  const db = getDatabase();
  const result = db.executeSync(`SELECT * FROM steps WHERE recipe_id = ? ORDER BY step_number`, [
    recipeId,
  ]);

  return result.rows.map(mapRowToStep);
}

export function updateStep(id: string, partial: StepUpdateInput): boolean {
  const db = getDatabase();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (partial.recipeId !== undefined) {
    fields.push('recipe_id = ?');
    values.push(partial.recipeId);
  }
  if (partial.stepNumber !== undefined) {
    fields.push('step_number = ?');
    values.push(partial.stepNumber);
  }
  if (partial.text !== undefined) {
    fields.push('text = ?');
    values.push(partial.text);
  }
  if (partial.tag !== undefined) {
    const validatedTag = validateTag(partial.tag);
    fields.push('tag = ?');
    values.push(validatedTag);
  }
  if (partial.durationSeconds !== undefined) {
    fields.push('duration_seconds = ?');
    values.push(partial.durationSeconds);
  }
  if (partial.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(partial.sortOrder);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  const result = db.executeSync(`UPDATE steps SET ${fields.join(', ')} WHERE id = ?`, values);

  return result.rowsAffected > 0;
}

export function deleteStep(id: string): boolean {
  const db = getDatabase();
  const result = db.executeSync(`DELETE FROM steps WHERE id = ?`, [id]);
  return result.rowsAffected > 0;
}

export function deleteByRecipe(recipeId: string): void {
  const db = getDatabase();
  db.executeSync(`DELETE FROM steps WHERE recipe_id = ?`, [recipeId]);
}
