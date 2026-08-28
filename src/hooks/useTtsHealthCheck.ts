import { useEffect } from 'react';
import { Alert } from 'react-native';
import type { AzureTTSProvider } from '../services/tts-provider-azure';

/**
 * Checks TTS provider health on mount and alerts the user if unavailable.
 *
 * Side-effect only — returns nothing. Shows an Alert if Azure Speech rejects
 * the subscription key or the network is unreachable.
 */
export function useTtsHealthCheck(ttsProvider: AzureTTSProvider): void {
  useEffect(() => {
    ttsProvider.checkHealth().then(ok => {
      if (!ok) {
        Alert.alert(
          '语音服务不可用',
          '无法连接 Azure 语音服务：请检查设置页的 Azure Speech Key 是否有效，以及网络是否可用。',
        );
      }
    });
  }, [ttsProvider]);
}
