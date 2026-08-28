export { settingsStorage } from './storage';

export { ApiProxy, ApiProxyError } from './api-proxy';
export type { ApiClient } from './api-proxy';
export { createMockApiProxy } from './api-proxy.mock';

export { TimerService } from './timer';

export { TTSService, TTSError } from './tts';
export { TTSCache } from './tts-cache';
export { TTSPlayer } from './tts.player';
export type { TTSPlayerInterface, TTSPlayerEventCallback } from './tts.player';
export { MockTTSProvider } from './tts-provider';
export type { TTSProvider, TTSProviderOptions } from './tts-provider';
export { LocalTTSProvider } from './tts-provider-local';
export { MiniMaxTTSProvider } from './tts-provider-minimax';
export { AzureTTSProvider } from './tts-provider-azure';
export { LLMService, LLMError } from './llm';
export { STTError } from './stt-error';
export { STTService, recordAudio, releaseRecorder } from './stt';
export { VoiceCommandService } from './voice-commands';
export type { VoiceCommand } from './voice-commands';

export { GestureService, GestureError } from './gesture';
export type { GestureKind } from './gesture';

export { HeadsetService, HeadsetError, HID_SERVICE_UUID } from './headset';
export type { ButtonEvent } from './headset';

export type {
  ParseRecipeRequest,
  ParseRecipeResponse,
  AskQuestionRequest,
  AskQuestionResponse,
  TTSRequest,
  TTSResponse,
  ApiError,
} from '../types/api';
