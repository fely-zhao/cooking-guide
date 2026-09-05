import { useEffect, useState } from 'react';
import { getRecipe } from '../db/recipes';
import type { CookingSend } from './cooking-machine-shared';

/**
 * Loads a recipe by ID on mount and dispatches the START event
 * to the cooking FSM.
 *
 * Returns `notFound` — true when the recipe does not exist (deleted or bad ID);
 * CookingScreen renders a NotFound state instead of a blank cooking page
 * (2026-09-02 审计 W6：错误不再静默)。
 */
export function useRecipeLoader(send: CookingSend, recipeId: string): boolean {
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    const recipe = getRecipe(recipeId);
    if (!recipe) {
      setNotFound(true);
      return;
    }
    send({ type: 'START', recipe });
  }, [recipeId, send]);
  return notFound;
}
