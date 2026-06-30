import { MMKV } from 'react-native-mmkv';
import { DEFAULT_SETTINGS } from '../types/settings';
import type { AppSettings, SettingsKey } from '../types/settings';

const STORAGE_ID = 'kitchen-ai-settings';

// Dev encryption key — in production, generate once and store in system keychain
const ENCRYPTION_KEY = 'kitchen-ai-dev-key-2024';

class SettingsStorage {
  private storage: MMKV;

  constructor() {
    this.storage = new MMKV({
      id: STORAGE_ID,
      encryptionKey: ENCRYPTION_KEY,
    });
  }

  get<K extends SettingsKey>(key: K): AppSettings[K] | undefined {
    const raw = this.storage.getString(key);
    if (raw === undefined) {
      return undefined;
    }
    return JSON.parse(raw) as AppSettings[K];
  }

  set<K extends SettingsKey>(key: K, value: AppSettings[K]): void {
    this.storage.set(key, JSON.stringify(value));
  }

  getAll(): AppSettings {
    return {
      llmUrl: this.get('llmUrl') ?? DEFAULT_SETTINGS.llmUrl,
      ttsUrl: this.get('ttsUrl') ?? DEFAULT_SETTINGS.ttsUrl,
      sttUrl: this.get('sttUrl') ?? DEFAULT_SETTINGS.sttUrl,
      ttsVoiceId: this.get('ttsVoiceId') ?? DEFAULT_SETTINGS.ttsVoiceId,
      defaultServings: this.get('defaultServings') ?? DEFAULT_SETTINGS.defaultServings,
      gestureEnabled: this.get('gestureEnabled') ?? DEFAULT_SETTINGS.gestureEnabled,
      headsetAutoDetect: this.get('headsetAutoDetect') ?? DEFAULT_SETTINGS.headsetAutoDetect,
      language: this.get('language') ?? DEFAULT_SETTINGS.language,
    };
  }

  reset(): void {
    this.storage.clearAll();
    this.set('llmUrl', DEFAULT_SETTINGS.llmUrl);
    this.set('ttsUrl', DEFAULT_SETTINGS.ttsUrl);
    this.set('sttUrl', DEFAULT_SETTINGS.sttUrl);
    this.set('ttsVoiceId', DEFAULT_SETTINGS.ttsVoiceId);
    this.set('defaultServings', DEFAULT_SETTINGS.defaultServings);
    this.set('gestureEnabled', DEFAULT_SETTINGS.gestureEnabled);
    this.set('headsetAutoDetect', DEFAULT_SETTINGS.headsetAutoDetect);
    this.set('language', DEFAULT_SETTINGS.language);
  }

  subscribe(
    key: SettingsKey,
    callback: (value: AppSettings[SettingsKey] | undefined) => void,
  ): () => void {
    const listener = this.storage.addOnValueChangedListener(changedKey => {
      if (changedKey === key) {
        const value = this.get(key);
        callback(value);
      }
    });
    return () => listener.remove();
  }
}

export const settingsStorage = new SettingsStorage();
