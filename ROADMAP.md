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
| 测试       | 7 套件全过（cooking-machine, haptic, useKeepAwake, HomeScreen, voice-commands, LoadingOverlay, e2e-flow） |
| 后端服务   | LLM 本地代理 1 个；STT/TTS 已切 Azure AI Speech（本地服务代码保留可切回）                 |
| 图标       | 26 个 SVG 图标组件                                                                        |
| 插画       | 3 个空/错误状态插画                                                                       |
| 颜色 token | 44 个语义化 token                                                                         |

**已完成**：

近期（2026-08）：

- **转场卡顿优化** (2026-08-31，真机验证通过)：移除详情/编辑页 entering 进场动画阶梯；详情页 focus 刷新减负；编辑页食材/步骤列表延迟转场后挂载（骨架占位）；修复 AiProcessingOverlay 丢失 visible 守卫导致遮罩常驻（全程卡顿+厨师帽常显根因）。新增通用 `LoadingOverlay` 组件 + 5 用例回归测试
- **audio-api 构建零下载** (2026-08-29)：patch 裁剪库自带预编译包下载，Android 构建不再赌 GitHub 网络
- **首页列表闪烁修复** (2026-08-29，真机验证通过)：entering 动画仅首次进页播放；Modal 改常驻挂载避免 Android 焦点重绘
- **语音服务切 Azure AI Speech** (2026-08-27，真机验证通过)：STT/TTS 均已切换，key 由设置页录入存 MMKV；本地服务代码注释保留可切回
- **收藏 / 录入幂等 / 重播补全** (2026-08-27，真机验证通过)：is_favorite 列幂等迁移 + 长按菜单收藏 + 首页筛选接真数据；录入双触发竞态修复（同秒只入库一条）；WAITING_TIMER/AUTO 状态支持「再说一遍」重播
- **审计整改 + 真机回归** (2026-08-27)：删死代码与孤儿屏幕，测试统一 jest，质量闸门全绿；debug 构建链路修复 + 无线调试打通；老数据覆盖安装完好

里程碑（历史）：

- **核心链路**：12 种录入方式（文本/图片/URL/语音）→ DeepSeek 结构化解析（llm-server 纯代理）→ SQLite 本地存储 → XState v5 FSM 烹饪引导（7 状态/9 事件，e2e 覆盖）
- **语音管线**：TTS 四层管线（Provider→Service→Cache→Player，错误降级）+ STT 录音/VAD + 音频焦点处理
- **烹饪体验**：计时器可打断 + mm:ss 显示 + 到点震动循环播报；步骤拖拽排序；重播
- **UI 体系**：Phase B/C/D 全部完成——LLM 接入、代码债清理、组件统一（HeaderBar/Button 全覆盖、硬编码 fontSize 清零）、Design system（44 色 token + 26 图标 + 3 插画）、微交互（PressableScale/Haptic/KeepAwake）
- **数据与设置**：菜谱导出/导入；设置页三项服务地址（LLM/TTS/STT）存 MMKV；useSettings 稳定性修复
- **测试基建**：jest 单测 + e2e 全绿（7 套件）

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
