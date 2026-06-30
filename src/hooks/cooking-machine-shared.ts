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
import { LocalTTSProvider } from '../services/tts-provider-local';
import { TTS_URL, STT_URL, LLM_URL } from '../config';
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
}

export interface Services {
  tts: TTSService;
  ttsProvider: LocalTTSProvider;
  timer: TimerService;
  llm: LLMService;
  stt: STTService;
  voice: VoiceCommandService;
  ttsCache: TTSCache;
  ttsPlayer: TTSPlayer;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_TTS_VOICE = 'zh-cn-female-xiaoxiao';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createServices(overrides?: {
  ttsUrl?: string;
  sttUrl?: string;
  llmUrl?: string;
}): Services {
  const ttsUrl = overrides?.ttsUrl ?? TTS_URL;
  const sttUrl = overrides?.sttUrl ?? STT_URL;
  const llmUrl = overrides?.llmUrl ?? LLM_URL;

  const apiProxy = new ApiProxy(llmUrl);
  const ttsProvider = new LocalTTSProvider(ttsUrl);
  const tts = new TTSService(ttsProvider);
  const timer = new TimerService();
  const llm = new LLMService(apiProxy);
  const stt = new STTService(sttUrl);
  const voice = new VoiceCommandService(stt);
  const ttsCache = new TTSCache(tts);
  const ttsPlayer = new TTSPlayer();
  return { tts, ttsProvider, timer, llm, stt, voice, ttsCache, ttsPlayer };
}
