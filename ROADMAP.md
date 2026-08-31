# ROADMAP

> 厨房 AI 副厨 — React Native 移动端 App
> 项目介绍与使用方式见 [`README.md`](README.md)，编码规范见 [`CLAUDE.md`](CLAUDE.md)

---

## 当前状态（2026-08-27）

| 指标       | 数值                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------- |
| 源文件     | 129 TS/TSX（不含测试）                                                                    |
| 代码量     | ~11500 行                                                                                 |
| 屏幕       | 10                                                                                        |
| 共享组件   | 29（不含 26 个图标组件）                                                                  |
| 测试       | 6 套件全过（cooking-machine, haptic, useKeepAwake, HomeScreen, voice-commands, e2e-flow） |
| 后端服务   | LLM 本地代理 1 个；STT/TTS 已切 Azure AI Speech（本地服务代码保留可切回）                 |
| 图标       | 26 个 SVG 图标组件                                                                        |
| 插画       | 3 个空/错误状态插画                                                                       |
| 颜色 token | 44 个语义化 token                                                                         |

**已完成**：

- **audio-api 构建下载裁剪** (2026-08-29)：库自带 Gradle 任务在 Android 构建时强下 4 个 iOS/macOS 无用包（iphonesimulator 等），每次赌 GitHub 网络。patch 修改其 download-prebuilt-binaries.sh，Android 只保留 android.zip + jniLibs.zip（项目 download-audio-libs.js 已预置，构建零下载）；patch 以 `npx patch-package react-native-audio-api --include "scripts"` 生成（必须带 --include，否则解压产物混入 patch 导致重装 install 失败），避坑记录进运行与打包指南
- **首页列表闪烁修复** (2026-08-29，真机验证通过)：筛选切换/收藏 refetch 重建 FlatList 行导致 reanimated entering 重放，内容区域反复播淡入像闪烁。修复：卡片/header 的 entering 动画仅首次进页播放（1.2s 后关闭）；RecipeContextMenu 的 Modal 改常驻挂载（Android Modal 挂卸触发窗口焦点切换重绘）+ statusBarTranslucent
- **收藏功能做实** (2026-08-27，真机验证通过)：recipes 表新增 is_favorite 列（init.ts 幂等补列迁移：PRAGMA 检测缺列则 ALTER TABLE，老安装覆盖升级自动补列默认 0，架构文档 Schema 同步）；长按菜单新增「收藏/取消收藏」（独立 setRecipeFavorite 不刷新 updated_at，避免影响「最近」排序）；首页「收藏」筛选接真数据；已收藏菜谱卡片右上角红色心形角标；新增 heart / heart-filled 图标（25→26，Phase-D 图标表同步）- **AI 解析主题动画** (2026-08-27，真机验证通过)：AiProcessingOverlay 升级为做饭主题全屏遮罩（暖色剪影厨师帽轻跳 + 三缕蒸汽错相上飘 + 三步轮换文案 + 圆点进度），文本录入页接入；菜谱编辑页 AI 辅助修改同步受益；Phase-D §10 同步组件文档
- **录入重复入库修复** (2026-08-27，真机验证通过：重录只生成一条)：文本/语音录入双触发竞态导致同秒重复入库；修复三处——录入入库点 useRef 幂等拦截、文本录入 handleSave 补 isParsing 守卫与 HeaderBar rightDisabled、右上角完成入口移除；图片录入补 rightDisabled 置灰
- **烹饪页重播功能补全** (2026-08-27，真机验证通过)：WAITING_TIMER/WAITING_AUTO 状态新增 REPEAT 事件（转 ANNOUNCING_STEP 重播当前步骤，计时/延迟重置），「再说一遍」按钮在这两个状态启用，语音「再说一遍」同步生效；架构文档 FSM 图同步（此前文档写了「任意状态可重播」但代码缺边）；e2e 新增 2 用例
- **通用加载动画组件** (2026-08-31)：新增 `LoadingOverlay`（厨师帽+蒸汽动画，支持自定义文案）+ `AiProcessingOverlay`（AI 解析专用，内部复用同一动画层）。现有调用点零改动。
- **编辑页列表延迟挂载** (2026-08-31)：食材/步骤列表（Draggable* 重组件，每行手势+双输入框）延迟到转场结束后（350ms）挂载，转场期间用骨架条占位，消除与 native 转场动画争抢线程的掉帧。lint/tsc/test 全过，真机验证通过。
- **页面转场卡顿优化** (2026-08-31)：移除详情页 5 处、编辑页 4 处 `entering` 进场动画阶梯（与 native 转场叠加导致掉帧）；详情页 focus 刷新去掉 `setLoading(true)` 重渲染路径。修复 `AiProcessingOverlay` 重构时丢失 `visible=false → return null` 守卫导致遮罩常驻、动画持续占用线程的 bug（真机全程卡顿+厨师帽一直显示的共同根因）。新增 `LoadingOverlay.test.tsx` 回归测试（5 用例，含 act() 包裹真实渲染断言）。lint/tsc/test 全过，真机验证通过。
- **审计整改后真机回归通过** (2026-08-27)：构建 + 启动 + 首页加载正常，老菜谱数据在覆盖安装后完好；双 patch（document-picker/keep-awake）真机构建验证在位。顺带修两个构建运维问题：android script 补 `--appId com.cookingguidern.arm64`（flavor 的 applicationIdSuffix 导致 CLI 启动 Error type 3）；download-audio-libs 幂等化（目标已存在则跳过下载，不再每次 install 赌 GitHub 网络）
- **审计整改第一批** (2026-08-27)：删死代码（react-native-reanimated-dnd 依赖、SkeletonCircle、api-proxy.mock、useAsync、headset/gesture stub、bun-types）；测试去 bun 化统一 jest 并自动发现测试文件；uuid 移入 dependencies；新增 voice-commands 关键词匹配单测；修正 README/架构文档/Phase-D/STT/TTS 备忘事实漂移（图标 25、录入入口 4 种、Azure 选型、新增实现状态表）；删除 docs/oc和omo使用技巧.md
- **首页改造收尾** (2026-08-27)：HomeScreen 已是完整菜谱首页（筛选/杂志流/长按菜单/录入 FAB），删除无入口的孤儿屏幕 RecipeListScreen 及其路由注册（AppNavigator + navigation/types）；HomeScreen「收藏」筛选为占位实现，做实后见待解决
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

**待解决**：

（当前无）

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
