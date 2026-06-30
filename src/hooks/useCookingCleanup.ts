import { useEffect } from 'react';
import type { Services, CookingState } from './cooking-machine-shared';

/**
 * Handles cleanup on cooking completion and component unmount:
 *
 * (a) When state reaches COMPLETED → stops voice listening and TTS playback
 * (b) On unmount → closes the TTS player to release native resources
 */
export function useCookingCleanup(services: Services, state: CookingState): void {
  // Stop voice + TTS when cooking completes
  useEffect(() => {
    if (!state.matches('COMPLETED')) return;
    services.voice.stopListening();
    services.ttsPlayer.stop();
  }, [services.voice, services.ttsPlayer, state]);

  // Release native TTS player resources on unmount
  useEffect(() => {
    return () => {
      void services.ttsPlayer.close();
    };
  }, [services.ttsPlayer]);
}
