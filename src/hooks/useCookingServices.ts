import { useRef } from 'react';
import type { Services } from './cooking-machine-shared';
import { createServices } from './cooking-machine-shared';
import { useSettings } from './useSettings';

export function useCookingServices(): Services {
  const settings = useSettings();
  const servicesRef = useRef<Services | null>(null);

  if (!servicesRef.current) {
    servicesRef.current = createServices({
      ttsUrl: settings.ttsUrl,
      sttUrl: settings.sttUrl,
      llmUrl: settings.llmUrl,
    });
  }

  return servicesRef.current;
}
