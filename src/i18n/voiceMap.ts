import i18n from './index';
import type { AppLanguage } from './index';

/**
 * 语言 → 语音配置枢纽（阶段 3）：STT 转写语言 + TTS 音色随 UI 语言切换。
 * 详见 docs/架构与技术文档.md 3.5 与 docs/STT-实现备忘.md / docs/TTS-实现备忘.md。
 */
export interface VoiceConfig {
  /** Azure STT 短音频转写语言（speechToText 的 language 参数） */
  sttLanguage: 'zh' | 'en';
  /** Azure TTS short name（如 zh-CN-XiaoxiaoNeural） */
  ttsVoiceId: string;
}

const VOICE_MAP: Record<AppLanguage, VoiceConfig> = {
  zh: { sttLanguage: 'zh', ttsVoiceId: 'zh-CN-XiaoxiaoNeural' },
  en: { sttLanguage: 'en', ttsVoiceId: 'en-US-JennyNeural' },
};

/** 当前 UI 语言的语音配置。每次调用求值——切语言后下一次播报/录音即生效 */
export function getVoiceConfig(): VoiceConfig {
  return VOICE_MAP[i18n.language === 'en' ? 'en' : 'zh'];
}

/** 文本含 CJK 字符视为中文——菜谱数据保持录入语言（见架构文档 3.5 数据语言原则） */
function detectTextLanguage(text: string): AppLanguage {
  return /[\u4e00-\u9fff]/.test(text) ? 'zh' : 'en';
}

/**
 * 按播报文本的语言取语音配置。
 *
 * voice 必须跟随**文本**语言而非 UI 语言：Azure 对 voice 与文本语言不匹配的合成
 * 会返回 200 但输出空/无效音频（真机 decodeAudioData Invalid file -10）。
 * 英文 UI + 中文菜谱时用晓晓念中文，才是正确行为。
 */
export function getVoiceConfigForText(text: string): VoiceConfig {
  return VOICE_MAP[detectTextLanguage(text)];
}
