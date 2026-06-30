import { useEffect } from 'react';
import { getRecipe } from '../db/recipes';
import type { CookingState } from './cooking-machine-shared';

/**
 * Pure observability hook — logs recipe loading and FSM state transitions
 * to the console for debugging.
 */
export function useCookingLogger(recipeId: string, state: CookingState): void {
  // Log recipe data on mount / recipeId change
  useEffect(() => {
    const recipe = getRecipe(recipeId);
    console.log('[useCookingMachine] getRecipe result:', {
      recipeId,
      found: !!recipe,
      stepCount: recipe?.steps.length ?? 0,
      stepTags: recipe?.steps.map(s => s.tag) ?? [],
    });
  }, [recipeId]);

  // Log every state transition
  useEffect(() => {
    const s = typeof state.value === 'string' ? state.value : String(state.value);
    console.log(
      `[useCookingMachine] state=${s} step=${state.context.currentStepIndex + 1}/${state.context.steps.length}`,
    );
  }, [state]);
}
