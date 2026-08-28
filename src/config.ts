// ---------------------------------------------------------------------------
// 服务地址配置
// ---------------------------------------------------------------------------
// 开发（模拟器）  → localhost + adb reverse（adb reverse tcp:4000/5000/3001）
// 生产（真机）    → 电脑局域网 IP，手机和电脑需在同一 WiFi
// ---------------------------------------------------------------------------

// 真机时改成你电脑的局域网 IP
const HOST_IP = '192.168.1.133';

// 2026-08-27: STT/TTS 切换到 Azure AI Speech，本地服务地址已停用（代码保留，见
// src/services/stt.ts 与 src/hooks/cooking-machine-shared.ts 注释块）。切换回本地时取消下方注释。
// /** TTS 服务地址 */
// export const TTS_URL = __DEV__ ? 'http://localhost:4000' : `http://${HOST_IP}:4000`;
//
// /** STT 服务地址 */
// export const STT_URL = __DEV__ ? 'http://localhost:5000' : `http://${HOST_IP}:5000`;

// ---------------------------------------------------------------------------
// Azure Speech 配置（STT + TTS 共用同一订阅）
// ---------------------------------------------------------------------------
// Azure Speech Key 是密钥，严禁写入本文件 —— key 由用户在设置页录入并存 MMKV。
// 只有 region 这类非敏感配置放这里。

/** Azure Speech Service 区域（如 eastasia、japaneast、westus2 等） */
export const AZURE_REGION = 'eastasia';

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
