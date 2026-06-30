import { TTS_URL, STT_URL, LLM_URL } from '../config';

export interface AppSettings {
  llmUrl: string;
  ttsUrl: string;
  sttUrl: string;
  ttsVoiceId: string;
  defaultServings: number;
  gestureEnabled: boolean;
  headsetAutoDetect: boolean;
  language: 'zh' | 'en';
}

export const DEFAULT_SETTINGS: AppSettings = {
  llmUrl: LLM_URL,
  ttsUrl: TTS_URL,
  sttUrl: STT_URL,
  ttsVoiceId: '',
  defaultServings: 2,
  gestureEnabled: true,
  headsetAutoDetect: true,
  language: 'zh',
};

export type SettingsKey = keyof AppSettings;
