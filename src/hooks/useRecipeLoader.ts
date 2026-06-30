import { useEffect } from 'react';
import { getRecipe } from '../db/recipes';
import type { CookingSend } from './cooking-machine-shared';

/**
 * Loads a recipe by ID on mount and dispatches the START event
 * to the cooking FSM.
 */
export function useRecipeLoader(send: CookingSend, recipeId: string): void {
  useEffect(() => {
    const recipe = getRecipe(recipeId);
    if (!recipe) {
      // TODO(fely): surface this error through the UI
      return;
    }
    send({ type: 'START', recipe });
  }, [recipeId, send]);
}
