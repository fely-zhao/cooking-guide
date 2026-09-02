import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AzureTTSProvider } from '../services/tts-provider-azure';

/**
 * Checks TTS provider health on mount and alerts the user if unavailable.
 *
 * Side-effect only — returns nothing. Shows an Alert if Azure Speech rejects
 * the subscription key or the network is unreachable.
 */
export function useTtsHealthCheck(ttsProvider: AzureTTSProvider): void {
  const { t } = useTranslation();
  useEffect(() => {
    ttsProvider.checkHealth().then(ok => {
      if (!ok) {
        Alert.alert(t('errors.ttsUnavailableTitle'), t('errors.ttsUnavailableMsg'));
      }
    });
  }, [ttsProvider, t]);
}
