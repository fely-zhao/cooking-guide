import type { StateFrom } from 'xstate';
import { cookingMachine } from '../machines/cooking-machine';
import type { MachineContext, MachineEvent } from '../machines/cooking-machine';
import {
  TTSService,
  TTSCache,
  TimerService,
  LLMService,
  STTService,
  VoiceCommandService,
  TTSPlayer,
} from '../services';
// LOCAL TTS (commented out 2026-08-27) — uncomment to switch back to local server
// import { LocalTTSProvider } from '../services/tts-provider-local';
import { AzureTTSProvider } from '../services/tts-provider-azure';
// LOCAL STT/TTS (commented out 2026-08-27) — uncomment TTS_URL/STT_URL when restoring
import { AZURE_REGION, LLM_URL } from '../config';
import { ApiProxy } from '../services/api-proxy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CookingState = StateFrom<typeof cookingMachine>;
export type CookingSend = (event: MachineEvent) => void;

export interface UseCookingMachineResult {
  state: CookingState;
  context: MachineContext;
  send: CookingSend;
  voiceCommandService: VoiceCommandService;
  /** 菜谱不存在（已删除或非法 ID）——CookingScreen 渲染 NotFound 状态 */
  notFound: boolean;
}

export interface Services {
  tts: TTSService;
  ttsProvider: AzureTTSProvider;
  timer: TimerService;
  llm: LLMService;
  stt: STTService;
  voice: VoiceCommandService;
  ttsCache: TTSCache;
  ttsPlayer: TTSPlayer;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createServices(overrides?: {
  /** Azure Speech subscription key（STT + TTS 共用）；留空则语音相关调用报错 */
  speechKey?: string;
  /** Azure 资源所在区域；默认取 config.ts 的 AZURE_REGION */
  speechRegion?: string;
  llmUrl?: string;
  // LOCAL STT/TTS (commented out 2026-08-27):
  // ttsUrl?: string;
  // sttUrl?: string;
}): Services {
  const llmUrl = overrides?.llmUrl ?? LLM_URL;
  const speechKey = overrides?.speechKey ?? '';
  const speechRegion = overrides?.speechRegion ?? AZURE_REGION;
  // LOCAL STT/TTS (commented out 2026-08-27):
  // const ttsUrl = overrides?.ttsUrl ?? TTS_URL;
  // const sttUrl = overrides?.sttUrl ?? STT_URL;

  const apiProxy = new ApiProxy(llmUrl);
  // LOCAL TTS (commented out 2026-08-27) — restore together with LocalTTSProvider import:
  // const ttsProvider = new LocalTTSProvider(ttsUrl);
  const ttsProvider = new AzureTTSProvider(speechKey, speechRegion);
  const tts = new TTSService(ttsProvider);
  const timer = new TimerService();
  const llm = new LLMService(apiProxy);
  // LOCAL STT (commented out 2026-08-27) — was: new STTService(sttUrl)
  const stt = new STTService(speechKey, speechRegion);
  const voice = new VoiceCommandService(stt);
  const ttsCache = new TTSCache(tts);
  const ttsPlayer = new TTSPlayer();
  return { tts, ttsProvider, timer, llm, stt, voice, ttsCache, ttsPlayer };
}
