# STT 管线实现备忘

## 现状 (2026-08-27 更新：切换到 Azure AI Speech)

STT 已从本地 stt-server（faster-whisper，:5000）切换到 **Azure AI Speech REST 短音频转写 API**。
本地实现代码保留在 `src/services/stt.ts` 注释块中（类注释内有完整恢复步骤），可随时切回。

> **Azure 切换要点**：`STTService` 构造改为 `new STTService(subscriptionKey, region)`；key 和 region 由用户在设置页录入存 MMKV（`azureSpeechKey` / `azureRegion`，2026-08-27 起 region 也可配），不进代码不进 git；config.ts 仅留默认值 `AZURE_REGION`。Endpoint：`POST https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN`，body 为原始 WAV 二进制（Blob body，解决 Hermes 不支持二进制请求体的旧限制——Azure 只收二进制音频，不走 base64-JSON）。**单次音频硬上限 60 秒**（语音命令 5s 无风险；菜谱语音录入 VoiceInputScreen 上限 30s 也安全）。

### 历史现状 (2026-06-17，TTS 串扰修复 + 服务端加速，本地 stt-server 时期)

STT（语音输入）管线已打通。烹饪时 app 持续监听麦克风，识别中文语音指令（"下一步"、"再说一遍"、"我想问…"），通过 `VoiceCommandService` 匹配关键词并触发 FSM 事件，完成交互闭环。

STT（语音输入）管线已打通。烹饪时 app 持续监听麦克风，识别中文语音指令（"下一步"、"再说一遍"、"我想问…"），通过 `VoiceCommandService` 匹配关键词并触发 FSM 事件，完成交互闭环。

> **网络说明**（2026-08-27 更新）：STT 已切换 Azure AI Speech REST 短音频转写（区域 eastasia，key 由设置页录入存 MMKV），无需本地服务与端口转发；本地 stt-server 代码注释保留可切回。LLM 请求走 `llm-server`（`POST /v1/chat/completions`，localhost:3001）DeepSeek 代理，已接入（Phase B 完成）。

### 架构

```
AudioRecorder              ← react-native-audio-api 原生录音
  └── recordAudio()       ← enableFileOutput(WAV) 直接写文件，无内存拼接

STTService                 ← multipart/form-data → stt-server（faster-whisper，:5000）
  ├── speechToText()       ← 通用转写（指定 model 参数）
  └── speechToTextForCommand()  ← 中文命令专用（language='zh', model='base'）

VoiceCommandService        ← 连续监听 → VAD → 关键词匹配 → FSM 事件
  ├── startListening()     ← while 循环：record → VAD stop → transcribe → match
  ├── stopListening()
  └── onCommand callback   ← next / repeat / ask

LLMService                 ← JSON → llm-server（OpenAI 代理，:3001）（当前 mock）
  ├── parseRecipe()        ← 菜谱结构化解析（含 function calling）
  └── askQuestion()        ← 烹饪上下文问答
```

### 当前各层状态

<!-- prettier-ignore -->
| 层             | 文件                               | 状态                                                                                                               |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 麦克风录音     | `src/services/stt.ts`              | **已完成** — `AudioRecorder.enableFileOutput(FileFormat.Wav)` 直接写 WAV 文件，固定文件名 `stt_recording.wav` 覆盖 |
| 录音权限       | `src/services/stt.ts`              | **已完成** — `AudioManager.requestRecordingPermissions()`，结果缓存                                                |
| VAD            | `src/services/stt.ts`              | **已完成** — RMS 阈值检测，支持 `silenceTimeoutMs` / `noSpeechTimeoutMs` / `silenceThreshold`                      |
| STT Service    | `src/services/stt.ts`              | **已完成** — 直连 stt-server（multipart/form-data 上传 WAV），支持通过 `model` 参数选择 whisper 模型               |
| 关键词匹配     | `src/services/voice-commands.ts`   | **已完成** — `KEYWORD_MAP` 有序匹配（ask 优先于 next）                                                             |
| 连续监听循环   | `src/services/voice-commands.ts`   | **已完成** — VAD 录音 + 转录 + 匹配，连续失败 3 次自动停止                                                         |
| FSM 集成       | `src/hooks/useCookingMachine.ts`   | **已完成** — 暴露 `voiceCommandService`，COMPLETED 时自动停止 voice + TTS                                          |
| 烹饪页接线     | `src/screens/CookingScreen.tsx`    | **已完成** — `onCommand` → `send()` 到 FSM，unmount 时清理                                                         |
| API Proxy 接口 | `src/services/api-proxy.ts`        | **已精简** — `speechToText()` 已移除（STT 不再走 API Proxy）                                                       |
| Mock API       | `src/services/api-proxy.mock.ts`   | **精简** — `speechToText` mock 已移除（STT 不再走 mock）                                                           |
| 语音录入页     | `src/screens/VoiceInputScreen.tsx` | **待测试** — 使用 `new STTService()` 直连 stt-server，LLM 部分仍用 mock                                            |

### 完整数据流（烹饪语音命令）

```
用户说 "下一步"
  → VoiceCommandService.startListening()
     → recordAudio(maxDurationMs: 5000, silenceTimeoutMs: 300, silenceThreshold: 0.001)
      → AudioManager.requestRecordingPermissions()   # 首次自动请求
      → AudioRecorder.enableFileOutput(WAV)           # 直接写 WAV 文件
      → AudioRecorder.onAudioReady()                  # VAD: RMS 检测静音
      → recorder.start({ fileNameOverride: 'stt_recording.wav' })
      → [VAD] 检测到语音 → hasSeenVoice = true
      → [VAD] 连续 300ms 静音 → stopTrigger()
      → recorder.stop()
      → return { filePath: 'file://...stt_recording.wav' }
    → STTService.speechToTextForCommand(filePath)     # POST stt-server:5000/v1/audio/transcriptions
      → buildMultipartBody(filePath, 'zh', 'base')     # fetch(filePath) → ArrayBuffer → 手动拼 multipart
    → faster-whisper 返回 "下一步"
    → VoiceCommandService._dispatch("下一步")           # 匹配 KEYWORD_MAP
    → onCommand('next')
    → CookingScreen useEffect → send({ type: 'NEXT' })
    → FSM WAITING_AUTO → ANNOUNCING_STEP (advanceStep)
```

### 用户提问流程

```
用户说 "我想问为什么要小火"
  → recordAudio(3000) → STT → "我想问为什么要小火"
  → _dispatch → 匹配 keyword "我想问"
  → command: 'ask', question: "为什么要小火"
  → send({ type: 'ASK', question: '为什么要小火' })
  → FSM → ANSWERING → llmService.invoke({ question, stepText, recipeName })
  → LLM 回答 → TTS 播报答案 → 回到之前状态
```

### 关键词表

<!-- prettier-ignore -->
| 关键词                                         | 命令     | 说明                                                                                                                                              |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `我想问` / `我问个问题` / `有个问题`           | `ask`    | 其余文本提取为 `question`，`ASK` 事件携带                                                                                                         |
| `再说一遍` / `重复` / `再来一次`               | `repeat` | 触发 `REPEAT` 事件，重新播报当前步骤（2026-08-27 起 WAITING_TIMER/WAITING_AUTO 也可用；在计时/自动等待状态触发会取消倒计时，播完按 tag 重新计时） |
| `好了` / `下一步` / `继续` / `完成` / `已完成` | `next`   | 触发 `NEXT` 事件，推进到下一步                                                                                                                    |

**语音命令关键词表（阶段 3 起按 UI 语言切换）**

<!-- prettier-ignore -->
| 语言 | 关键词表                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------- |
| zh   | ask: `我想问`/`我问个问题`/`有个问题`；repeat: `再说一遍`/`重复`/`再来一次`；next: `好了`/`下一步`/`继续`/`完成`/`已完成` |
| en   | ask: `question`/`ask you`；repeat: `repeat`/`say it again`/`one more time`；next: `next`/`done`/`continue`/`go on` |

- 词表定义在 `src/services/voice-commands.ts` 的 `KEYWORD_MAPS`（Record<AppLanguage, …>），`_dispatch` 时按 `i18n.language` 求值——服务实例被 `useCookingServices` 的 ref 缓存、切语言不重建，**必须 dispatch 时取词表**，不能构造时固化
- STT 转写语言同步跟随：`speechToTextForCommand()` 内部经 `getVoiceConfig().sttLanguage`（`src/i18n/voiceMap.ts`）取语言，英文模式下说英文关键词可控制 FSM

`ask` 关键字排在前面，避免 "我想问下一步要做什么" / "I have a question about the next step" 被 `next` 提前消费。

### VAD（Voice Activity Detection）

录音函数 `recordAudio()` 定义在 `src/services/stt.ts`：

<!-- prettier-ignore -->
| 参数                | 默认值   | 说明                                         |
| ------------------- | -------- | -------------------------------------------- |
| `maxDurationMs`     | （必填） | 硬限制，到时间强制停止                       |
| `silenceTimeoutMs`  | 未设置   | 启用 VAD，说话结束后静音持续此毫秒数即停     |
| `silenceThreshold`  | 0.005    | RMS 阈值（Float32 -1.0~1.0），低于此视为静音 |
| `noSpeechTimeoutMs` | 未设置   | 一直没检测到语音时提前停                     |

VAD 逻辑：

1. 等待第一个语音帧（`hasSeenVoice = false`，不计数静音）
2. 检测到语音后开始计数静音帧（每帧 ~100ms）
3. 连续静音帧达到 `silenceTimeoutMs` 阈值 → 停止
4. `maxDurationMs` 作为安全网兜底

### 模型选择

调用方通过 `model` 参数指定（默认 `base`），stt-server 按需惰性加载并缓存多个模型。

支持模型（faster-whisper）：`tiny` / `base` / `small` / `medium` / `large-v3`

### 监听生命周期

- `startListening()` — 启动循环，连续失败 3 次自动停止
- `stopListening()` — 停止循环
- `pauseListening()` / `resumeListening()` — TTS 播放期间暂停，播完恢复
- `debounceMs: 2000` — 同一命令 2s 内不重复触发
- FSM 进入 `COMPLETED` 状态时自动停止 voice + TTS
- 离开烹饪页面（unmount）时自动清理

### VoiceCommandService 录音参数

```typescript
maxDurationMs: 5000
silenceTimeoutMs: 300      # 2026-06-17: 从 500 降到 300，减少录音后等待时间
silenceThreshold: 0.001
```

### Android 原生配置

**AndroidManifest.xml** (`android/app/src/main/`):

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

`react-native-audio-api` 的库 manifest **没有**声明 `RECORD_AUDIO`，必须在 app 自己的 manifest 中显式添加。否则 `AudioManager.requestRecordingPermissions()` 不会弹窗，返回 `'Denied'`，`recordAudio()` 抛 `STTError`，被 `VoiceCommandService` 的 catch 静默吞掉。

**构建环境**（`android/app/build.gradle`）：

`react-native-audio-api` 的 `downloadPrebuiltBinaries` 任务每次构建都会下载 iOS 预编译库（`ffmpeg_ios`/`iphoneos`/`iphonesimulator`/`macosx`），在 Windows 上完全无用且卡住构建。

已添加 Gradle 拦截逻辑：设置环境变量 `SKIP_IOS=true` 时，在下载脚本执行前创建占位目录，脚本检测到目录存在后自动跳过下载。

```powershell
$env:SKIP_IOS="true"
yarn android --no-packager
```

### 录音实现细节

- **录音方式**: `AudioRecorder.enableFileOutput(FileFormat.Wav)` 直接写 WAV 文件，**不使用** PCM 回调 + Blob/ArrayBuffer 管线（Hermes 限制）
- **文件管理**: 固定文件名 `stt_recording.wav`（通过 `fileNameOverride` 设置），每次覆盖同一文件，不累积
- **multipart 构造**: 手动拼接 `ArrayBuffer`，绕过 RN FormData/Blob 限制
- **WAV debug**: 每次录音后打印 RIFF header 和前 1000 采样点统计
- **采样率**: 22050 Hz（`FilePreset.Low`），16-bit PCM
- **声道**: 单声道（mono）
- **权限**: 模块级 `permissionsGranted` 缓存，仅首次调用 `recordAudio()` 时弹授权窗。App manifest 必须声明 `RECORD_AUDIO`
- **资源**: 单例 `AudioRecorder` 实例，复用同一实例

### 关键变更

1. **录音实现**: mock（返回静音 WAV）→ `AudioRecorder.enableFileOutput(WAV)` 直接写文件
2. **去除内存管线**: PCM 回调 + Float32Array 累积 + float32ToInt16 + base64 → 文件输出 + multipart ArrayBuffer
3. **开放语音服务**: `useCookingMachine` 返回值新增 `voiceCommandService`，CookingScreen 直接消费
4. **Android 配置**: 在 `AndroidManifest.xml` 中声明 `RECORD_AUDIO` 权限；App `build.gradle` 添加 `SKIP_IOS` 环境变量支持
5. **stt-server 接入**: `STTService` 移除 `ApiClient` 依赖，改直连 stt-server（multipart/form-data 上传 WAV）。`ApiClient` 接口精简（移除 `speechToText`），`STTRequest`/`STTResponse` 类型删除，`VoiceInputScreen` 和 `useCookingMachine` 同步更新构造方式
6. **VAD 录音**: 新增 RMS 阈值检测 + `hasSeenVoice` 逻辑，支持 `silenceTimeoutMs` / `noSpeechTimeoutMs` / `silenceThreshold`
7. **模型参数**: stt-server 支持 `model` 表单参数动态选择 whisper 模型，调用方通过 `speechToText()` 参数指定
8. **COMPLETED 自动清理**: FSM 进入 COMPLETED 时自动停止 voice listening + TTS player
9. **连续失败停止**: 监听循环连续失败 3 次自动退出
10. **TTS 串扰防护**: VoiceCommandService 添加录音阶段追踪（`_recordingPhase: 'idle' | 'recording' | 'transcribing'`），TTS 开始时仅当麦克风仍在录音（`recording` 阶段）才标记 discard。转录完成后检查标记丢弃结果，避免 TTS 播放的语音被误识别为语音命令。`pauseListening()` 注释更新说明此行为。
11. **服务端转录加速**: `stt-server/server.py` — `transcribe()` 添加 `vad_filter=True`（Silero VAD 跳过静音段，减少幻觉 + 缩短转录时间）和 `beam_size=1`（贪婪解码替代 beam search，速度翻倍）
12. **缩短静音超时**: `VoiceCommandService` 录音参数 `silenceTimeoutMs` 从 500 降至 300
13. **切换 Azure STT** (2026-08-27): `STTService` 改为 Azure Speech REST 直调（构造参数 `subscriptionKey + region`）；删除 `model` 参数（Azure 无此概念），`speechToTextForCommand()` 接口不变，`VoiceCommandService`/`VoiceInputScreen` 调用点零改动；本地 faster-whisper 实现体与 base64 工具函数以注释保留在 `stt.ts` 内；设置页新增 `azureSpeechKey` 输入框（MMKV 存储）
14. **i18n 阶段 3 联动** (2026-09-03): `speechToTextForCommand()` 转写语言改经 `src/i18n/voiceMap.ts` 的 `getVoiceConfig().sttLanguage` 随 UI 语言（原硬编码 `'zh'`）；语音命令关键词表改 `KEYWORD_MAPS` 按语言取（见上方关键词表）

## 待办/后续

### 1. 验证真实录音

- [x] 模拟器上跑通 `recordAudio()` → STT → FSM 完整链路（2026-06-16 已验证）
- [x] 真机上跑通录音 → STT → 关键词匹配 → FSM 完整链路（2026-06-17 已验证）
- [x] `AndroidManifest.xml` 声明 `RECORD_AUDIO` 权限（已加）

### 2. VoiceInputScreen 适配

- [x] `src/screens/VoiceInputScreen.tsx` — STT 已直连 stt-server（`new STTService()`），不再走 mock proxy
- [ ] 需要测试语音录入菜谱的完整流程：录音 → STT → LLM 解析
- [x] 该页面的 `processRecording` 调用 `STTService.speechToTextForCommand()` → `LLMService.parseRecipe()`，与烹饪命令走不同分支。LLM 部分已接入 llm-server

### 3. 后端服务（独立项目）

- [x] **llm-server**（`/mnt/d/project/llm-server/`）— **已接入**。OpenAI 兼容代理，端口 3001，转发 DeepSeek（Phase B 完成）
- [x] STT/LLM 均已脱离 mock（`api-proxy.mock.ts` 已删除）
- [x] **STT 切换 Azure AI Speech**（2026-08-27）— `STTService` 改 REST 短音频直调；本地 stt-server 停用，代码注释保留可切回
- [x] **一键启动脚本** — `scripts/start-services.ps1`（Windows）或 `scripts/start-services.sh`（WSL），自动创建 Windows venv、启动 STT + TTS、设置 adb reverse、健康检查。按任意键统一关闭。

### 4. 体验优化（可选）

- [ ] 录音时 UI 反馈（波形动画、状态提示）—— 当前 CookingScreen 无录音状态指示
- [ ] 双菜并行（V2）场景下，每个菜各自持有 `VoiceCommandService` 实例

---

## 已解决 / 已知问题

### ✅ STT ↔ TTS 音频冲突（2026-06-16 修复）

**问题**：`AudioRecorder`（STT 录音）和 `AudioContext`（TTS 播放）同时使用 `react-native-audio-api`，录音循环启动后 TTS 无声。

**根因**：两个模块共享原生音频会话但没有协调。Android 上 AudioRecorder 活跃时会话配置冲突，导致 AudioContext 播放被静音。

**修复**：

1. `VoiceCommandService` 添加 `pauseListening()` / `resumeListening()` 方法
2. TTS actor 中 `voice.pauseListening()` → TTS 播放 → `finally { voice.resumeListening() }`
3. `recordAudio()` 每次录音前调 `AudioManager.setAudioSessionActivity(true)`（确保会话激活）
4. `AudioManager.setAudioSessionOptions({ iosCategory: 'playAndRecord' })` 模块级配置

**涉及文件**：

- `src/services/voice-commands.ts` — pause/resume 机制
- `src/services/stt.ts` — 会话激活
- `src/hooks/useCookingMachine.ts` — TTS actor 中调用 pause/resume
- `src/services/tts.player.ts` — AudioContext suspended 检测 + resume

### ✅ WAITING_USER 不响应 NEXT 事件（2026-06-16 修复）

**问题**：Voice command 说"下一步"在 `wait_user` 标签步骤（步骤2）无反应。日志确认命令已 dispatch 但机器忽略。

**根因**：`WAITING_USER` 状态只处理 `CONFIRM`，未处理 `NEXT`。Voice command 统一发 `NEXT`，在 `WAITING_USER` 被静默丢弃。

**修复**：`WAITING_USER` 状态添加 `NEXT` 事件，行为和 `CONFIRM` 相同（前进到下一步或完成）。

**涉及文件**：

- `src/machines/cooking-machine.ts` — WAITING_USER 添加 NEXT handler

### ✅ TTS 语音被录音转录导致误触发（2026-06-17 修复）

**问题**：`pauseListening()` 被调用时，当前轮次的 `recordAudio()` 还在录音中（麦克风开着），TTS 从扬声器播放的语音被麦克风拾取并转录。转录结果进入 `_dispatch()`，若 TTS 内容恰好包含关键词（如"下一步"）会误触发命令。日志示例：转录 `"小火燉煮3分鐘讓味道融合"` → `"no keyword matched"`（未触发，但 TTS 如果包含关键词就会触发）。

**根因**：录音循环中 `_paused` 只在每轮循环开始时检查。一旦 `recordAudio()` 启动，`pauseListening()` 设置的 `_paused=true` 不会停止当前录音，录音继续捕获 TTS 播放的音频。

**修复**：

1. 添加 `_recordingPhase` 状态追踪（`'idle'` / `'recording'` / `'transcribing'`）
2. `pauseListening()` 仅在 `_recordingPhase === 'recording'`（麦克风打开）时设置 `_pauseDiscard = true`
3. 转录完成后检查 `_pauseDiscard`，若为 true 则丢弃结果并 continue
4. `finally` 块重置阶段为 `'idle'`

关键设计：仅 discard 在 recording 阶段被打断的录音，不 discard 在 transcribing 阶段被打断的（此时麦克风已关闭，录音是干净的）。这避免"计时器在转录期间到期 → TTS 播放"场景下误杀有效命令。

**涉及文件**：

- `src/services/voice-commands.ts` — recording phase tracking + discard 逻辑

### ❌ TTS 播放有杂音且截断（未修复）

**问题**：TTS 合成语音播放时出现杂音，且部分步骤的文字没念完就停止播放。

**已排除**：

- 音频会话冲突（已通过 pause/resume 机制隔离）
- `AudioManager.setAudioSessionActivity(false)` 误关会话（已移除）

**可能原因（待排查）**：

1. `react-native-audio-api` v0.12.2 的 `decodeAudioData` 对本地 TTS 服务器返回的 WAV 格式处理有问题
2. `AudioManager.setAudioSessionActivity(true)` 在录音循环开头调用可能影响 AudioContext
3. 本地 TTS 服务器 `local-tts-server.js` 生成的 WAV 存在格式或采样率问题
4. `AudioContext` 在长时间使用后状态退化（录音循环反复激活/不激活）

**涉及文件**：

- `src/services/tts.player.ts` — 播放逻辑
- `src/services/stt.ts` — `recordAudio()` 中的会话管理
