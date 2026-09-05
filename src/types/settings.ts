import { AZURE_REGION, LLM_URL } from '../config';

// 2026-08-27: STT/TTS 切换到 Azure Speech 后，ttsUrl/sttUrl 不再被服务层消费，
// 仅作为切回本地服务时的存量配置保留（默认值与 config.ts 中被注释的本地地址对应）。
export interface AppSettings {
  llmUrl: string;
  ttsUrl: string;
  sttUrl: string;
  /** Azure AI Speech 订阅密钥（STT + TTS 共用），由用户在设置页录入 */
  azureSpeechKey: string;
  /** Azure 资源所在区域，如 eastasia / japaneast；默认取 config.ts 的 AZURE_REGION */
  azureRegion: string;
  /** 播报音量档位 index，对应 TTS_VOLUME_LEVELS */
  ttsVolumeLevel: number;
  defaultServings: number;
  gestureEnabled: boolean;
  headsetAutoDetect: boolean;
  language: 'zh' | 'en';
}

/** 播报音量档位（档位制不用滑杆，适应爆炒/安静场景）；显示名见 i18n settings.volumeLevels */
export const TTS_VOLUME_LEVELS = [
  { gain: 0 },
  { gain: 0.5 },
  { gain: 1 },
  { gain: 1.5 },
  { gain: 2 },
] as const;

export const DEFAULT_TTS_VOLUME_LEVEL = 2; // 标准

/** 计时到点提醒播报（ANNOUNCING_REMINDER）的临时增益倍率，与用户档位相乘，播完恢复 */
export const REMINDER_BOOST = 3; // +9.5dB，1.5× 仅 +3.5dB 真机听感无差别

export const DEFAULT_SETTINGS: AppSettings = {
  llmUrl: LLM_URL,
  ttsUrl: 'http://localhost:4000',
  sttUrl: 'http://localhost:5000',
  azureSpeechKey: '',
  azureRegion: AZURE_REGION,
  ttsVolumeLevel: DEFAULT_TTS_VOLUME_LEVEL,
  defaultServings: 2,
  gestureEnabled: true,
  headsetAutoDetect: true,
  language: 'zh',
};

export type SettingsKey = keyof AppSettings;
