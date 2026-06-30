import { useEffect } from 'react';
import type { Services, CookingState } from './cooking-machine-shared';

/**
 * Pre-caches the next step's TTS audio during idle periods to hit
 * the ~200ms first-frame target.
 *
 * - WAITING_TIMER always pre-caches (plenty of time)
 * - Other states cache only when the next step is instant/wait_user
 */
export function useTtsPreCache(services: Services, state: CookingState): void {
  useEffect(() => {
    const cache = services.ttsCache;

    const { steps, currentStepIndex } = state.context;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) return;

    const nextStep = steps[nextIndex];
    if (!nextStep) return;

    if (state.matches('WAITING_TIMER')) {
      void cache.preCache(nextStep.text);
      return;
    }

    if (
      state.matches('WAITING_AUTO') ||
      state.matches('WAITING_USER') ||
      state.matches('ANNOUNCING_STEP') ||
      state.matches('ANNOUNCING_REMINDER')
    ) {
      if (nextStep.tag === 'instant' || nextStep.tag === 'wait_user') {
        void cache.preCache(nextStep.text);
      }
    }
  }, [services.ttsCache, state]);
}
