import { useEffect } from 'react';
import { Alert } from 'react-native';
import type { LocalTTSProvider } from '../services/tts-provider-local';

/**
 * Checks TTS provider health on mount and alerts the user if unavailable.
 *
 * Side-effect only — returns nothing. Shows an Alert if the local TTS
 * server is not reachable.
 */
export function useTtsHealthCheck(ttsProvider: LocalTTSProvider): void {
  useEffect(() => {
    ttsProvider.checkHealth().then(ok => {
      if (!ok) {
        Alert.alert(
          'TTS 服务未启动',
          '烹饪需要本地 TTS 服务，请先启动 tts-server（local-tts-server.js）\n然后重新打开应用。',
        );
      }
    });
  }, [ttsProvider]);
}
