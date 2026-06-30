// ---------------------------------------------------------------------------
// 服务地址配置
// ---------------------------------------------------------------------------
// 开发（模拟器）  → localhost + adb reverse（adb reverse tcp:4000/5000/3001）
// 生产（真机）    → 电脑局域网 IP，手机和电脑需在同一 WiFi
// ---------------------------------------------------------------------------

// 真机时改成你电脑的局域网 IP
const HOST_IP = '192.168.1.133';

/** TTS 服务地址 */
export const TTS_URL = __DEV__ ? 'http://localhost:4000' : `http://${HOST_IP}:4000`;

/** STT 服务地址 */
export const STT_URL = __DEV__ ? 'http://localhost:5000' : `http://${HOST_IP}:5000`;

/** LLM 代理服务地址 */
export const LLM_URL = __DEV__ ? 'http://localhost:3001' : `http://${HOST_IP}:3001`;

// ---------------------------------------------------------------------------
// API client factory
// ---------------------------------------------------------------------------

import { ApiProxy } from './services/api-proxy';
import type { ApiClient } from './services/api-proxy';

/**
 * Create the API client — connects to llm-server.
 *
 * Priority:
 *   1. 用户在设置页面配置的 LLM 地址（MMKV）
 *   2. 编译期常量 LLM_URL（config.ts）
 *
 * API key is managed server-side (llm-server/.env), never exposed to the app.
 * If llm-server is not running, API calls will fail with a user-visible error.
 */
export function createApiClient(): ApiClient {
  // 优先读取用户设置 → 懒加载避免循环依赖（config → storage → settings → config）
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { settingsStorage } = require('./services/storage');
    const url = settingsStorage.get('llmUrl');
    if (url) {
      return new ApiProxy(url);
    }
  } catch {
    // MMKV 未就绪时 fallback 到编译期常量
  }
  return new ApiProxy(LLM_URL);
}
