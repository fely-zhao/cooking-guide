import { useSyncExternalStore } from 'react';
import { settingsStorage } from '../services/storage';
import { DEFAULT_SETTINGS } from '../types/settings';
import type { AppSettings, SettingsKey } from '../types/settings';

let lastSnapshot: AppSettings | null = null;
let lastJson = '';

function subscribeToAllSettings(onStoreChange: () => void): () => void {
  const unsubs = (Object.keys(DEFAULT_SETTINGS) as SettingsKey[]).map(key =>
    settingsStorage.subscribe(key, () => onStoreChange()),
  );
  return () => {
    for (const unsub of unsubs) {
      unsub();
    }
  };
}

function getSettingsSnapshot(): AppSettings {
  const current = settingsStorage.getAll();
  const currentJson = JSON.stringify(current);
  if (currentJson === lastJson && lastSnapshot) {
    return lastSnapshot;
  }
  lastJson = currentJson;
  lastSnapshot = current;
  return lastSnapshot;
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribeToAllSettings, getSettingsSnapshot);
}

export function useSetting<K extends SettingsKey>(key: K): AppSettings[K] {
  return useSyncExternalStore(
    onStoreChange => settingsStorage.subscribe(key, () => onStoreChange()),
    () => settingsStorage.get(key) ?? DEFAULT_SETTINGS[key],
  );
}
