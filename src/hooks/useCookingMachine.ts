import { useCookingServices } from './useCookingServices';
import { useTtsHealthCheck } from './useTtsHealthCheck';
import { useCookingFsm } from './useCookingFsm';
import { useRecipeLoader } from './useRecipeLoader';
import { useTtsPreCache } from './useTtsPreCache';
import { useCookingCleanup } from './useCookingCleanup';
import { useCookingLogger } from './useCookingLogger';
import type { UseCookingMachineResult } from './cooking-machine-shared';

export type { UseCookingMachineResult } from './cooking-machine-shared';

/**
 * React hook that wraps the cooking FSM actor.
 *
 * Composes 7 focused sub-hooks:
 * - useCookingServices   → lazy service instantiation
 * - useTtsHealthCheck    → alerts if TTS server is down
 * - useCookingFsm        → XState actor with real service wiring
 * - useRecipeLoader      → loads recipe and dispatches START
 * - useTtsPreCache       → pre-caches next step audio
 * - useCookingCleanup    → stops voice/TTS on completion, closes player on unmount
 * - useCookingLogger     → console observability
 *
 * @param recipeId  ID of the recipe to cook (loaded from SQLite)
 */
export function useCookingMachine(recipeId: string): UseCookingMachineResult {
  const services = useCookingServices();
  useTtsHealthCheck(services.ttsProvider);
  const { state, send } = useCookingFsm(services);
  useRecipeLoader(send, recipeId);
  useTtsPreCache(services, state);
  useCookingCleanup(services, state);
  useCookingLogger(recipeId, state);

  return {
    state,
    context: state.context,
    send,
    voiceCommandService: services.voice,
  };
}
