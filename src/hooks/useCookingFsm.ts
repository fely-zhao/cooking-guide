import { useMemo } from 'react';
import { Vibration } from 'react-native';
import { fromPromise } from 'xstate';
import { useActor } from '@xstate/react';
import { cookingMachine } from '../machines/cooking-machine';
import type { Services, CookingState, CookingSend } from './cooking-machine-shared';
import { settingsStorage } from '../services/storage';
import { DEFAULT_SETTINGS, REMINDER_BOOST, TTS_VOLUME_LEVELS } from '../types/settings';
import { getVoiceConfigForText } from '../i18n/voiceMap';

/**
 * Builds the provided cooking FSM with real service implementations
 * and returns the XState actor state + send function.
 *
 * The `ttsService` actor wraps TTS playback with voice pause/resume.
 * The `timerService` actor delegates to TimerService.startTimer.
 * The `llmService` actor delegates to LLMService.askQuestion.
 */
export function useCookingFsm(services: Services): {
  state: CookingState;
  send: CookingSend;
} {
  // Build a machine variant with real service implementations wired in.
  // `cookingMachine.provide()` returns a new StateMachine — the original
  // machine definition is untouched.
  const providedMachine = useMemo(() => {
    const { tts, timer, llm, ttsPlayer, voice } = services;

    return cookingMachine.provide({
      actions: {
        vibrateAlert: () => {
          try {
            Vibration.vibrate([0, 500, 200, 500]);
          } catch {
            // Vibration is non-critical — silently ignore if unsupported.
          }
        },
      },
      actors: {
        ttsService: fromPromise(async ({ input }: { input: { text: string; boost?: boolean } }) => {
          voice.pauseListening();
          const voiceId = getVoiceConfigForText(input.text).ttsVoiceId;
          try {
            const audioData = await tts.textToSpeech(input.text, { voiceId });
            // Read the volume level per playback (MMKV read, negligible
            // cost) so setting changes apply without re-subscribing.
            const level = settingsStorage.get('ttsVolumeLevel') ?? DEFAULT_SETTINGS.ttsVolumeLevel;
            ttsPlayer.setVolume(TTS_VOLUME_LEVELS[level]?.gain ?? 1);
            console.log(
              `[TTS] play: voice=${voiceId} bytes=${audioData.byteLength} text=${JSON.stringify(input.text.slice(0, 30))}`,
            );
            await ttsPlayer.play(audioData, input.boost ? { boost: REMINDER_BOOST } : undefined);
          } catch (err) {
            console.error(
              `[TTS] textToSpeech/play failed: voice=${voiceId} text=${JSON.stringify(input.text.slice(0, 30))}`,
              err,
            );
            // Degrade gracefully — TTS is non-critical; don't crash the app.
            // The user still sees step text on screen and can interact.
          } finally {
            voice.resumeListening();
          }
          return { success: true as const };
        }),

        timerService: fromPromise(
          async ({
            input,
            signal,
          }: {
            input: { durationSeconds: number };
            signal: AbortSignal;
          }) => {
            await timer.startTimer(input.durationSeconds, signal);
          },
        ),

        llmService: fromPromise(
          async ({
            input,
          }: {
            input: {
              question: string;
              stepText: string;
              recipeName: string;
            };
          }) => {
            const result = await llm.askQuestion({
              question: input.question,
              context: {
                recipe_name: input.recipeName,
                current_step: { number: 0, text: input.stepText, tag: '' },
              },
            });
            return { answer: result.answer };
          },
        ),
      },
    });
  }, [services]);

  // `useActor` creates, starts, and cleans up the actor automatically.
  const [state, send] = useActor(providedMachine);

  return {
    state: state as CookingState,
    send: send as CookingSend,
  };
}
