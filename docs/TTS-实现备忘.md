# TTS 管线实现备忘

## 现状 (2026-06-16 更新)

TTS 管线已打通，模拟器和真机均已验证通过（已出声）。当前使用 `LocalTTSProvider` 连接本地 tts-server 服务（Windows SAPI）。

> **网络说明**：模拟器通过 `adb reverse tcp:4000 tcp:4000` 映射宿主机端口（代码使用 `http://localhost:4000`）；真机通过局域网 IP 直连（修改 `src/config.ts` 中 `TTS_URL`）。真机 + WiFi 5GHz 下 TTS 播报正常可用。

### 架构：Provider 策略模式

```
TTSProvider (interface)           ← 新增，策略接口
  ├── LocalTTSProvider            ← 当前使用：请求本地 tts-server 服务
  ├── MiniMaxTTSProvider (stub)   ← 未来使用：填 MiniMax API 即可
  └── MockTTSProvider             ← 测试使用：返回 0.5s 静音 WAV
```

切换 Provider 只需在 `createServices()` 中改一行：

```typescript
new TTSService(new LocalTTSProvider('http://host:4000'));
new TTSService(new MiniMaxTTSProvider('Bearer ...'));
new TTSService(new MockTTSProvider());
```

### 当前各层状态

| 层                        | 文件                                   | 状态                                                                              |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| TTS Player                | `src/services/tts.player.ts`           | **已完成** — 使用 `react-native-audio-api`，`play()` 返回 Promise，播完才 resolve |
| TTS Service               | `src/services/tts.ts`                  | **已重构** — 接受 `TTSProvider` 而非 `ApiClient`                                  |
| TTS Provider 接口         | `src/services/tts-provider.ts`         | **已完成** — `TTSProvider` + `TTSProviderOptions` + `MockTTSProvider`             |
| LocalTTSProvider          | `src/services/tts-provider-local.ts`   | **已完成** — POST `/tts` `{ text, voice?, rate? }` → `audio/wav`                  |
| MiniMaxTTSProvider (stub) | `src/services/tts-provider-minimax.ts` | **占位** — 待实现                                                                 |
| ApiProxy                  | `src/services/api-proxy.ts`            | **已清理** — 移除 `textToSpeech`，只处理 LLM/STT                                  |
| FSM 调用                  | `src/hooks/useCookingMachine.ts`       | **已完成** — `tts.textToSpeech()` → `ttsPlayer.play()`                            |
| TTSCache                  | `src/services/tts-cache.ts`            | 预缓存逻辑正常                                                                    |

### 完整数据流

```
FSM invoke ttsService
  → tts.textToSpeech(text)          # TTSService → TTSProvider.synthesize()
  → LocalTTSProvider.synthesize()   # POST { text, voice?, rate? } → WAV
  → ttsPlayer.play(audioData)       # decodeAudioData → AudioBufferSourceNode → 出声
  → onEnded → Promise resolve       # 播完
  → FSM onDone → 下一步骤
```

### 本地服务请求格式

**服务端**: `D:\project\tts-server\local-tts-server.js`（Express + Windows SAPI）

**请求**: `POST /tts` `Content-Type: application/json`

```json
{ "text": "你好", "voice": "zh-cn-female-xiaoxiao", "rate": 0 }
```

| 字段    | 必填 | 说明                                       |
| ------- | ---- | ------------------------------------------ |
| `text`  | 是   | 合成文本，最长 5000 字符                   |
| `voice` | 否   | VOICE_MAP 键名，如 `zh-cn-female-xiaoxiao` |
| `rate`  | 否   | 语速，-10 ~ 10，默认 0                     |

**响应**: `audio/wav`（200）或 `{ message: "..." }`（400/500）

### 关键变更

1. **播放库**：`react-native-track-player` → `react-native-audio-api`
2. **TTS 解耦**：从 `ApiClient` 中剥离，独立为 `TTSProvider` 策略接口
3. **本地服务**：`LocalTTSProvider` 匹配 tts-server 服务的实际 API（字段 `voice`/`rate`，非 `voice_id`）

### 启动服务

TTS 本地服务（`D:\project\tts-server\local-tts-server.js`，Express + Windows SAPI，端口 4000）可使用一键脚本启动：

```powershell
# Windows PowerShell
.\scripts\start-services.ps1

# 或从 WSL bash
./scripts/start-services.sh
```

脚本自动启动 TTS + STT、设置 adb reverse 端口转发、健康检查等待。按任意键统一关闭。

## 待办/后续

### 1. 验证播放器

- [x] LocalTTSProvider 真实出声验证通过（模拟器听到语音，FSM 自动走到下一步）

### 2. MiniMax TTS Provider

- [ ] 实现 `src/services/tts-provider-minimax.ts` 中的 `synthesize()`
- [ ] 参考 MiniMax Speech-02 Turbo 的 API 文档

### 3. 启动服务

- [x] **一键启动脚本** — `scripts/start-services.ps1`（Windows）/ `scripts/start-services.sh`（WSL），自动启动 TTS + STT + adb reverse

### 4. 预缓存消费优化（可选）

- 目前 TTSCache 预缓存的数据并未直接对接播放器，每次仍走 `textToSpeech()` 完整流程
- 可优化：缓存命中时跳过 API 请求，直接 `ttsPlayer.play(cachedData)`
