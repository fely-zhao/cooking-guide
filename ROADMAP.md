# ROADMAP

> 厨房 AI 副厨 — React Native 移动端 App
> 项目介绍与使用方式见 [`README.md`](README.md)，编码规范见 [`CLAUDE.md`](CLAUDE.md)

---

## 当前状态（2026-08-27）

| 指标       | 数值                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| 源文件     | 125 TS/TSX（不含测试）                                                    |
| 代码量     | ~12000 行                                                                 |
| 屏幕       | 11                                                                        |
| 共享组件   | 28（新增 PressableScale）                                                 |
| 测试       | 4 个（cooking-machine ✅, haptic ✅, useKeepAwake ✅, e2e-flow ✅）       |
| 后端服务   | LLM 本地代理 1 个；STT/TTS 已切 Azure AI Speech（本地服务代码保留可切回） |
| 图标       | 23 个 SVG 图标组件                                                        |
| 插画       | 3 个空/错误状态插画                                                       |
| 颜色 token | 44 个语义化 token                                                         |

**已完成**：

- **质量闸门恢复全绿** (2026-08-27)：清理 ESLint/Prettier 历史欠账（36 error → 0），yarn lint / tsc / format:check / test:all 全部通过；新增《项目审计报告》（docs/项目审计报告.md，架构/视觉/交互/废代码静态走查）
- **语音服务切换 Azure AI Speech** (2026-08-27)：
  - 新增 `AzureTTSProvider`（REST + SSML，WAV 输出兼容现有 Player）；`createServices()` 注释 Local 行切换，一行可回退
  - `STTService` 改为 Azure REST 短音频转写直调（Blob body），`speechToTextForCommand()` 接口不变、调用点零改动
  - Azure key + region 由设置页录入存 MMKV（`azureSpeechKey` / `azureRegion`，不进代码不进 git），config.ts 仅留默认值
  - 默认音色改为 `zh-CN-XiaoxiaoNeural`；`useTtsHealthCheck` 改用 voices/list 验证 key
  - 本地 stt-server/tts-server 实现代码全部注释保留
- **debug 构建链路修复 + 真机无线调试打通** (2026-08-27)：
  - 修复三个构建坑：多 flavor 无裸 `installDebug`（android script 写入 `--mode arm64Debug`）；`debuggableVariants` 未匹配 flavor 致 debug 构建被内嵌 bundle（已显式列出）；keep-awake 的 jcenter() patch 未应用（`npx patch-package` 补上）
  - 真机无线调试（WiFi ADB）打通：配对/连接双端口、reverse、双设备条目坑均已验证并记入运行与打包指南
  - Azure 语音功能真机验证通过（2026-08-27）
- XState v5 FSM 烹饪引导（7 状态 / 9 事件，e2e 测试覆盖）
- TTS 四层管线（Provider → Service → Cache → Player）
- STT 录音 + VAD + faster-whisper
- 12 输入方式（文本/图片/URL/语音）UI 完整
- Design system（44 token 颜色系统 + spacing + typography）
- Phase A 组件化落地（18 处 Button 替换 + 9 处 SectionTitle 替换，-375 行代码）
- **Phase B LLM 接入**（DeepSeek V4 Flash, function calling 结构化解析, llm-server 纯代理）
- TTS 错误降级（网络失败不再崩溃）
- **Phase C 代码债清理**（7 个子任务全部完成）
- **Phase D UI 视觉升级**（4 个子任务全部完成）
  - D.1 图标系统：react-native-svg + 18 SVG 图标 + Icon 组件，替换全部 emoji
  - D.2 配色微调：+3 token（dangerSurface, warningSurface, text.disabled）
  - D.3 动画增强：reanimated 页面转场 + 按钮缩放反馈 + 步骤淡入淡出 + 庆祝动画 + TimerRing 优化
  - D.4 插画系统：3 张空/错误状态 SVG 插画
- **Button 重构**：新增 icon prop + reanimated 缩放动画（内部实现，不阻断 flex）
- **计时器可打断**：WAITING_TIMER 状态新增 NEXT 事件处理，用户可按"下一步"跳过计时；底层 TimerService 通过 AbortSignal 取消 setTimeout，无泄漏
- **计时器显示 mm:ss**：TimerRing 格式化显示（如"03:45"），不再只显示裸秒数
- **步骤拖拽排序**：RecipeEditScreen 步骤列表支持拖拽重排（gesture-handler Pan + reanimated 动画），长按拖拽手柄 150ms 激活，splice 插入式重排
- **TTS 音频焦点修复**：TTSPlayer 播放前请求 Android Audio Focus（`gainTransientMayDuck`），消除与其他 App 并发播放时的卡顿；释放时自动归还焦点
- **计时器提醒增强**：到时间后震动（`VIBRATE` permission）+ TTS 循环播报"计时结束！"(每 3 秒重复），用户按"下一步"才进入下一步
- **Debug 构建架构**：debug 从 x86_64 改为 arm64-v8a，真机可直接安装调试
- **Android VIBRATE 权限**：`AndroidManifest.xml` 声明震动权限
- **6 项 Bug 修复 & 功能追加**：
  - TimerRing 圆环改为 SVG 平滑缩圈（`strokeDashoffset`，替代旧 4 段边框 + 圆点）
  - 菜谱列表/详情页返回后自动刷新（`useFocusEffect` + `refetch`）
  - 「设置」按钮 Android 崩溃修复（VoiceSelector `overflow:hidden` 替代条件渲染）
  - 菜谱详情页返回图标放大（`chevron-left` 新图标）+ 编辑按钮改文字按钮
  - 编辑页卡顿优化（`DraggableStep` 提取为独立组件，RecipeEditScreen 768→572 行）
  - 菜谱导出/导入（JSON 文件，`react-native-fs` + `react-native-document-picker`）
- **设置页重构**：单行 API 代理地址 → 三项服务地址（LLM/TTS/STT）+ 存入 MMKV + `createServices()` 实时读取
- **useSettings 稳定性修复**：`useSyncExternalStore` 无限重渲染（JSON 比对替代模块缓存）
- **Phase 2 组件统一与债务清理**：
  - 全 11 屏统一 `<HeaderBar>`，删除所有内联 header 样式
  - `<InteractionControls>` 与 AskModal 全部按钮改用 `<Button>`（含新增 `success` 变体）
  - `<RecipeDetailScreen>` 改用 `<Badge>` 与 `<StepNumber>`
  - `<SkeletonBox>` / `<VoiceInputScreen>` 从 RN `Animated` 迁移到 `react-native-reanimated`
  - `<CookingScreen>` 庆祝 emoji 替换为 SVG `sparkle` 粒子
  - 新增 `IconButton` / `StepNumber` / `TranscriptBar` / `MagazineCard` 组件
  - 全项目硬编码 `fontSize` 清零（仅 `typography.ts` 保留 token 定义）
  - `docs/Phase-D-UI规范.md` 同步更新
- **Phase 4 UI 微交互与打磨**：
  - 新增 `PressableScale` 按压反馈组件、`haptic.ts` 触觉反馈工具、`useKeepAwake` 阻止熄屏 Hook
  - `Button` / `IconButton` / `MagazineCard` / `TranscriptBar` / 分类筛选 / 食材卡片 / 设置控件全部接入按压反馈与 Haptic
  - `RecipeListScreen` 列表动画优化；`RecipeDetailScreen` 玻璃底栏加 iOS `BlurView`
  - `CookingScreen` 烹饪中阻止熄屏 + 完成/提醒 Haptic
- **测试环境修复**：
  - e2e 测试迁移到 Jest + `@react-native/jest-preset`
  - 配置 `transformIgnorePatterns` 处理 `react-native-audio-api` / `uuid` ESM 模块
  - 新增 `jest.setup.js` 自动 mock `react-native-audio-api`
  - 修复 `recordPreviousState` 对复合状态（`ANNOUNCING_REMINDER.playing`）记录为 `null` 的 bug
  - `yarn test` / `yarn test:e2e` / `yarn test:all` 全部通过

**待解决**：

- 首页改造（用我的菜谱页替换首页）

## 长期（V2）

| 功能             | 说明                                                              |
| ---------------- | ----------------------------------------------------------------- |
| 双菜并行         | XState spawn 子 FSM，两道菜同步推进                               |
| BLE 耳机按键     | 耳机物理按键控制烹饪流程（优先级 1）                              |
| 手势控制         | MediaPipe HandLandmarker 挥手控制（优先级 4）                     |
| DB 迁移机制      | Schema 版本化，支持升级                                           |
| Gesture/Headset  | 生产路径实现（当前为 stub）                                       |
| **音量自动增强** | 提醒播报时自动提升音量（GainNode 增益 或 系统音量控制），播完恢复 |

---

## 架构决策记录

| 决策       | 内容                                                |
| ---------- | --------------------------------------------------- |
| 大模型角色 | 仅在录入时调用一次，烹饪全程本地 FSM 驱动，不调 LLM |
| LLM 选型   | DeepSeek V4 Flash（function calling, ~3s 响应）     |
| 离线优先   | 所有数据存本地 SQLite，后端仅做转发 + 隐藏密钥      |
| 交互降级   | 耳机 > 语音 > 屏幕按钮 > 手势，自动检测可用设备     |
| 身份       | Sisyphus（OhMyOpenCode）                            |

---

## 依赖服务

| 服务                         | 端口/区域 | 状态                                |
| ---------------------------- | --------- | ----------------------------------- |
| STT（Azure AI Speech）       | eastasia  | ✅ 真机验证通过                     |
| TTS（Azure AI Speech）       | eastasia  | ✅ 真机验证通过                     |
| LLM（Node.js DeepSeek 代理） | 3001      | ✅ 可工作                           |
| STT 本地（faster-whisper）   | 5000      | ⏸️ 停用（代码注释保留，可随时切回） |
| TTS 本地（Windows SAPI）     | 4000      | ⏸️ 停用（代码注释保留，可随时切回） |

---

详见 [`docs/Phase-D-UI规范.md`](docs/Phase-D-UI规范.md) 和 [`docs/架构与技术文档.md`](docs/架构与技术文档.md)
