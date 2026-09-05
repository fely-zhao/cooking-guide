# TTS 管线实现备忘

## 现状 (2026-08-27 更新：切换到 Azure AI Speech)

TTS 已从本地 tts-server（Windows SAPI，:4000）切换到 **Azure AI Speech REST 短文本合成 API**。
本地 `LocalTTSProvider` 实现完整保留，`createServices()` 中仅注释切换（一行取消注释即可切回）。

> **Azure 切换要点**：新增 `src/services/tts-provider-azure.ts`（实现同一 `TTSProvider` 接口）；Endpoint：`POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`，body 为 SSML，`X-Microsoft-OutputFormat: riff-24khz-16bit-mono-pcm`（WAV 输出与现有 Player 直接兼容）；key 与 STT 共用同一个订阅密钥，key 和 region 均由设置页录入存 MMKV（`azureSpeechKey` / `azureRegion`，config.ts 仅留默认值）。默认音色改为 Azure short name `zh-CN-XiaoxiaoNeural`（晓晓，原 SAPI 名 'zh-cn-female-xiaoxiao' 同源）。`useTtsHealthCheck` 改用 Azure voices/list 接口验证 key 有效性。

### 历史现状 (2026-06-16，本地 tts-server 时期)

TTS 管线已打通，模拟器和真机均已验证通过（已出声）。当时使用 `LocalTTSProvider` 连接本地 tts-server 服务（Windows SAPI）；**2026-08-27 起切换为 AzureTTSProvider，本地服务停用**（见文首 Azure 切换要点）。

> **网络说明**：模拟器通过 `adb reverse tcp:4000 tcp:4000` 映射宿主机端口（代码使用 `http://localhost:4000`）；真机通过局域网 IP 直连（修改 `src/config.ts` 中 `TTS_URL`）。真机 + WiFi 5GHz 下 TTS 播报正常可用。

### 架构：Provider 策略模式

```
TTSProvider (interface)           ← 策略接口
  ├── LocalTTSProvider            ← 本地服务（2026-08-27 起停用，代码保留可切回）
  ├── AzureTTSProvider            ← 当前使用：Azure AI Speech REST（2026-08-27 切换）
  ├── MiniMaxTTSProvider (stub)   ← 未来使用：填 MiniMax API 即可
  └── MockTTSProvider             ← 测试使用：返回 0.5s 静音 WAV
```

切换 Provider 只需在 `createServices()` 中改一行：

```typescript
new TTSService(new AzureTTSProvider({ apiKey, region })); // 当前使用
new TTSService(new LocalTTSProvider('http://host:4000')); // 本地回退
new TTSService(new MockTTSProvider()); // 测试
```

### 当前各层状态

<!-- prettier-ignore -->
| 层                        | 文件                                   | 状态                                                                                                                                                                                                                          |
| ------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TTS Player                | `src/services/tts.player.ts`           | **已完成** — 使用 `react-native-audio-api`，`play()` 返回 Promise，播完才 resolve；播放链路 `source → GainNode → destination`（GainNode 只承载用户档位），提醒 boost 在采样域用 tanh 软限幅实现（防止削波吱吱声，2026-08-31） |
| TTS Service               | `src/services/tts.ts`                  | **已重构** — 接受 `TTSProvider` 而非 `ApiClient`                                                                                                                                                                              |
| TTS Provider 接口         | `src/services/tts-provider.ts`         | **已完成** — `TTSProvider` + `TTSProviderOptions` + `MockTTSProvider`                                                                                                                                                         |
| LocalTTSProvider          | `src/services/tts-provider-local.ts`   | **已完成** — POST `/tts` `{ text, voice?, rate? }` → `audio/wav`                                                                                                                                                              |
| MiniMaxTTSProvider (stub) | `src/services/tts-provider-minimax.ts` | **占位** — 未实现，已被 Azure 替代，保留作未来备选                                                                                                                                                                            |
| ApiProxy                  | `src/services/api-proxy.ts`            | **已清理** — 移除 `textToSpeech`，只处理 LLM/STT                                                                                                                                                                              |
| FSM 调用                  | `src/hooks/useCookingFsm.ts`           | **已完成** — `tts.textToSpeech()` → `ttsPlayer.setVolume()` + `ttsPlayer.play()`（含提醒 boost）                                                                                                                              |
| TTSCache                  | `src/services/tts-cache.ts`            | 预缓存逻辑正常                                                                                                                                                                                                                |

### 完整数据流

```
FSM invoke ttsService
  → tts.textToSpeech(text)          # TTSService → TTSProvider.synthesize()
  → LocalTTSProvider.synthesize()   # POST { text, voice?, rate? } → WAV
  → ttsPlayer.setVolume(userGain)   # 用户档位增益（每次播放前从 MMKV 读档位）
  → ttsPlayer.play(audioData, { boost })  # boost 仅提醒播报传入（REMINDER_BOOST）
  → decodeAudioData → boost>1 时采样域 tanh 软限幅 → GainNode → 出声
                                     # tanh(x·boost)：峰位渐近满幅不硬削波，普通播报零处理
  → onEnded → Promise resolve       # 播完
  → FSM onDone → 下一步骤
```

### 播报音量两级增益（2026-08-31）

- **用户档位**：`ttsVolumeLevel` 存 MMKV，档位定义在 `src/types/settings.ts` 的 `TTS_VOLUME_LEVELS`（静音 0 / 较低 0.5 / 标准 1 / 较高 1.5 / 最高 2），设置页「TTS 设置 → 播报音量」Stepper 切换
- **提醒 boost**：FSM `ANNOUNCING_REMINDER` 的 ttsService input 带 `boost: true`，播放时采样域叠加 `REMINDER_BOOST`（3×，约 +9.5dB）+ tanh 软限幅，只作用提醒播报、不作用普通步骤播报。首版 1.5× 仅 +3.5dB 听感无差别；改线性 GainNode 乘 3× 后真机有削波吱吱声（Azure TTS 音频接近满幅），最终改为采样域 tanh 软限幅
- 不碰系统音量、不需要权限；`useCookingFsm.ts` 的 ttsService actor 每次播放前读档位（MMKV 内存读，开销可忽略），设置即时生效
- 真机验证注意：高增益（较高/最高 × boost）下语音是否失真

### 播报音色随播报文本语言（i18n 阶段 3，2026-09-03）

- Azure short name 不由常量固化：`useCookingFsm` 的 ttsService actor 每次播放经 `src/i18n/voiceMap.ts` 的 `getVoiceConfigForText(input.text).ttsVoiceId` 求值（文本含 CJK → `zh-CN-XiaoxiaoNeural` 晓晓；否则 → `en-US-JennyNeural`）。2026-09-02 审计 B1 后设置页音色选择器已删除（`ttsVoiceId` 设置项无消费路径），音色完全由此映射自动决定
- **voice 跟随播报文本语言而非 UI 语言**：菜谱数据保持录入语言（架构文档 3.5 数据语言原则），中文菜谱在英文 UI 下也用晓晓念。真机教训：Jenny 念纯中文时 Azure 返回 200 + 空/无效音频，播放器报 decodeAudioData Invalid file (-10)
- Azure provider 对空 audio body 抛可诊断错误（`empty audio body`），不再落到播放器 decode
- SSML `xml:lang` 由 voice short name 推导（`zh-CN-XiaoxiaoNeural` → `zh-CN`），不再硬编码
- 预缓存（`TTSCache`）以 text 为 key 且无播放消费方（播放走完整 `textToSpeech()`），未改造

### 本地服务请求格式

**服务端**: `D:\project\tts-server\local-tts-server.js`（Express + Windows SAPI）

**请求**: `POST /tts` `Content-Type: application/json`

```json
{ "text": "你好", "voice": "zh-cn-female-xiaoxiao", "rate": 0 }
```

<!-- prettier-ignore -->
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
4. **切换 Azure** (2026-08-27)：新增 `AzureTTSProvider`；`createServices()` 注释 Local 行改用 Azure；DEFAULT_TTS_VOICE 改为 `zh-CN-XiaoxiaoNeural`；`Services.ttsProvider` 类型同步为 `AzureTTSProvider`
5. **i18n 阶段 3** (2026-09-03)：`DEFAULT_TTS_VOICE` 常量删除，播放时经 `voiceMap.getVoiceConfigForText()` 按播报文本语言取音色（真机教训：Jenny 念纯中文 → Azure 返回空音频 → decode 失败）；`AzureTTSProvider` SSML `xml:lang` 从 voice name 推导 + 空 body 提前报错

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

### 2. Azure TTS Provider

- [x] 已实现 `src/services/tts-provider-azure.ts`（REST + SSML，2026-08-27 切换，真机验证通过）
- MiniMax Provider 保留 stub，未排期

### 3. 启动服务

- [x] **一键启动脚本** — `scripts/start-services.ps1`（Windows）/ `scripts/start-services.sh`（WSL），自动启动 TTS + STT + adb reverse

### 4. 预缓存消费优化（可选）

- 目前 TTSCache 预缓存的数据并未直接对接播放器，每次仍走 `textToSpeech()` 完整流程
- 可优化：缓存命中时跳过 API 请求，直接 `ttsPlayer.play(cachedData)`
