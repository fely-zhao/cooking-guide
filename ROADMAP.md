# ROADMAP

> 厨房 AI 副厨 — React Native 移动端 App
> 项目介绍与使用方式见 [`README.md`](README.md)，编码规范见 [`CLAUDE.md`](CLAUDE.md)

---

## 当前状态（2026-08-31）

<!-- prettier-ignore -->
| 指标       | 数值                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| 源文件     | 130 TS/TSX（不含测试）                                                                                    |
| 代码量     | ~14000 行（含测试）                                                                                       |
| 测试       | 8 套件全过（cooking-machine, haptic, useKeepAwake, HomeScreen, voice-commands, LoadingOverlay, migrations, e2e-flow） |
| 屏幕       | 10                                                                                                        |
| 共享组件   | 28（不含图标）                                                                                            |
| 图标       | 27 个 SVG 图标组件（icons/ 目录，不含 Icon.tsx 分发器）                                                   |
| 后端服务   | LLM 本地代理 1 个；STT/TTS 已切 Azure AI Speech（本地服务代码保留可切回）                                 |
| 插画       | 3 个空/错误状态插画                                                                                       |
| 颜色 token | 44 个语义化 token                                                                                         |

**已完成**：

近期（2026-09，细节见 git log）：

- **audio-libs 本地 vendor 缓存** (2026-09-02)：`scripts/download-audio-libs.js` 三级回退（vendor zip 直解 → 下载并回存 vendor → 明确报错提示代理）；修复幂等检查误判（原查解压根目录、npm 包自带 include 导致永不补库，改查产物目录）；恢复演练通过（删库后零网络本地恢复）。同日 i18n 三依赖（i18next/react-i18next/react-native-localize）已装，真机构建通过
- i18n 阶段 1 基建：进行中（依赖就位，`src/i18n/` 与设置页语言项待做）

近期（2026-08，细节见 git log）：

- **DB 迁移机制** (2026-08-31)：schema_migrations 版本表 + 幂等迁移序列替代散落建表逻辑；真机覆盖安装待验证
- **播报音量控制** (2026-08-31，真机验证通过)：设置页音量档位 + 提醒播报 3× 增益软限幅；V2「音量自动增强」由此消化
- **首页大卡片与列表策略** (2026-08-31，真机验证中)：大卡片固定推荐最新菜谱，列表改完整筛选结果
- **烹饪记录接入 V1** (2026-08-31，真机验证通过)：烹饪会话读写收尾，「最近」tab 改为最近做过
- **首页细节打磨** (2026-08-31)：筛选栏下划线自适应；长按菜单改卡片级覆盖层（真机迭代中）；列表闪烁修复
- **转场卡顿优化** (2026-08-31，真机验证通过)：进场动画减负，修复遮罩常驻根因，新增 LoadingOverlay + 回归测试
- **构建与工程基建** (2026-08-29)：audio-api 构建零下载；审计整改删死代码、测试统一 jest、无线调试打通
- **语音服务切 Azure AI Speech** (2026-08-27，真机验证通过)：STT/TTS 均切换，key 设置页录入存 MMKV，本地服务保留可切回
- **收藏 / 录入幂等 / 重播补全** (2026-08-27，真机验证通过)：收藏全链路、录入竞态修复、计时状态重播

里程碑（历史）：

- **核心链路**：12 种录入方式（文本/图片/URL/语音）→ DeepSeek 结构化解析（llm-server 纯代理）→ SQLite 本地存储 → XState v5 FSM 烹饪引导（7 状态/9 事件，e2e 覆盖）
- **语音管线**：TTS 四层管线（Provider→Service→Cache→Player，错误降级）+ STT 录音/VAD + 音频焦点处理
- **烹饪体验**：计时器可打断 + mm:ss 显示 + 到点震动循环播报；步骤拖拽排序；重播
- **UI 体系**：Phase B/C/D 全部完成——LLM 接入、代码债清理、组件统一（HeaderBar/Button 全覆盖、硬编码 fontSize 清零）、Design system（44 色 token + 26 图标 + 3 插画）、微交互（PressableScale/Haptic/KeepAwake）
- **数据与设置**：菜谱导出/导入；设置页三项服务地址（LLM/TTS/STT）存 MMKV；useSettings 稳定性修复
- **测试基建**：jest 单测 + e2e 全绿（7 套件）

**待解决**：

- 待复现：首页偶现筛选栏与卡片瞬态重叠（真机截图一次后自恢复，疑与 FadeInUp entering 中间帧相关；再出现时记录是否在进首页/切筛选动画期间、长按菜单是否弹出过）

## 长期（V2）

<!-- prettier-ignore -->
| 功能             | 说明                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------- |
| 双菜并行         | XState spawn 子 FSM，两道菜同步推进                                                           |
| BLE 耳机按键     | 耳机物理按键控制烹饪流程（优先级 1）                                                          |
| 手势控制         | MediaPipe HandLandmarker 挥手控制（优先级 4）                                                 |
| ~~DB 迁移机制~~  | ✅ V1 已实现（2026-08-31）：schema_migrations 版本表 + 幂等迁移序列                           |
| 多语言（i18n）   | i18next + react-i18next + react-native-localize，zh-CN 源语言 + en 首发，语音管线联动   |
| Gesture/Headset  | 生产路径实现（当前未实现，早前「stub」描述有误）                                         |
| ~~音量自动增强~~ | ✅ 已由 V1 播报音量控制消化（2026-08-31）：提醒播报 REMINDER_BOOST 3× + tanh 软限幅，播完恢复 |

---

## 架构决策记录

<!-- prettier-ignore -->
| 决策       | 内容                                                |
| ---------- | --------------------------------------------------- |
| 大模型角色 | 仅在录入时调用一次，烹饪全程本地 FSM 驱动，不调 LLM |
| LLM 选型   | DeepSeek V4 Flash（function calling, ~3s 响应）     |
| 离线优先   | 所有数据存本地 SQLite，后端仅做转发 + 隐藏密钥      |
| 交互降级   | 耳机 > 语音 > 屏幕按钮 > 手势，自动检测可用设备     |
| 身份       | Sisyphus（OhMyOpenCode）                            |

---

## 依赖服务

<!-- prettier-ignore -->
| 服务                         | 端口/区域 | 状态                                |
| ---------------------------- | --------- | ----------------------------------- |
| STT（Azure AI Speech）       | eastasia  | ✅ 真机验证通过                     |
| TTS（Azure AI Speech）       | eastasia  | ✅ 真机验证通过                     |
| LLM（Node.js DeepSeek 代理） | 3001      | ✅ 可工作                           |
| STT 本地（faster-whisper）   | 5000      | ⏸️ 停用（代码注释保留，可随时切回） |
| TTS 本地（Windows SAPI）     | 4000      | ⏸️ 停用（代码注释保留，可随时切回） |

---

## 多语言（i18n）改造计划

选型：i18next + react-i18next + react-native-localize（前沿共识，JSON 资源文件，AI 翻译工具链全支持）。
架构：`src/i18n/`（index.ts 初始化 + locales/zh-CN.json 源语言按域拆命名空间 + en.json + voiceMap.ts 语言→语音配置枢纽）；语言优先级 = 设置页覆盖（MMKV `appLanguage`）> 系统语言 > zh-CN 兛底。

<!-- prettier-ignore -->
| 阶段 | 内容                                                                                                              | 验收标准                                                 | 状态     |
| ---- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| 1    | 基建：依赖安装（Windows PowerShell 手动）+ src/i18n 初始化 + 设置页语言项 + 类型安全                                | 设置页切语言即时生效，重启保持                           | 进行中（依赖已装） |
| 2    | UI 文案抽取：38 文件硬编码替换为 t('key')，分屏幕推进；FSM 层「烹饪完成」两处改 i18n.t()                            | grep 无硬编码 UI 文案（排除注释），每屏切语言即时生效    | 未开始   |
| 3    | 语音管线联动：voiceMap.ts + VoiceCommandService 关键词注入改造 + TTS voiceId / STT language 接线                     | 英文模式下英文关键词可控制 FSM，英文 voice 播报          | 未开始   |
| 4    | en 包翻译：AI 批量翻译 + 真机校对 + LLM 录入 prompt 多语言化                                                        | 录入→烹饪→语音全流程英文跑通                             | 未开始   |

明确不做：RTL 布局（目标语言无 RTL 需求）、翻译管理平台（AI 工具链足够）、阶段 4 后更多语言（加 JSON 文件即可）。

---

详见 [`docs/Phase-D-UI规范.md`](docs/Phase-D-UI规范.md) 和 [`docs/架构与技术文档.md`](docs/架构与技术文档.md)
