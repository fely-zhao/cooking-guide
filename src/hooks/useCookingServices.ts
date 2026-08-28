import { useRef } from 'react';
import type { Services } from './cooking-machine-shared';
import { createServices } from './cooking-machine-shared';
import { useSettings } from './useSettings';

export function useCookingServices(): Services {
  const settings = useSettings();
  const servicesRef = useRef<Services | null>(null);

  if (!servicesRef.current) {
    servicesRef.current = createServices({
      speechKey: settings.azureSpeechKey,
      speechRegion: settings.azureRegion,
      llmUrl: settings.llmUrl,
      // LOCAL STT/TTS (commented out 2026-08-27):
      // ttsUrl: settings.ttsUrl,
      // sttUrl: settings.sttUrl,
    });
  }

  return servicesRef.current;
}
