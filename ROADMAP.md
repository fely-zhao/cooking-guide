# ROADMAP

> 厨房 AI 副厨 — React Native 移动端 App
> 项目介绍与使用方式见 [`README.md`](README.md)，编码规范见 [`CLAUDE.md`](CLAUDE.md)

---

## 当前状态（2026-09-05）

<!-- prettier-ignore -->
| 指标       | 数值                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| 源文件     | 132 TS/TSX（不含测试）                                                                                    |
| 代码量     | ~12700 行（不含测试）                                                                                     |
| 测试       | 8 套件全过（单测 33 + e2e 36，其中 5 个 ask 用例 skip 为提问功能临时禁用）：cooking-machine, haptic, useKeepAwake, HomeScreen, voice-commands, LoadingOverlay, migrations, e2e-flow |
| i18n       | zh-CN/en 双语，193 key，全链路随设置页语言切换（UI/语音命令/播报音色/LLM 解析）                        |
| 代码审计   | 发版前全量审计完成：Blocker 3/3 + Warning 5/6 处置并真机验证（2026-09-02），报告 `docs/代码审计-2026-09-02.md`，SOP `docs/发版前审计清单.md` |
| 屏幕       | 10                                                                                                        |
| 共享组件   | 28（不含图标）                                                                                            |
| 图标       | 27 个 SVG 图标组件（icons/ 目录，不含 Icon.tsx 分发器）                                                   |
| 后端服务   | LLM 本地代理 1 个；STT/TTS 已切 Azure AI Speech（本地服务代码保留可切回）                                 |
| 插画       | 3 个空/错误状态插画                                                                                       |
| 颜色 token | 44 个语义化 token                                                                                         |

**已完成**：

近期（2026-09，细节见 git log）：

- **发版前审计整改第一批（Blocker 清零）** (2026-09-02，真机验证通过——14 项检查全过)：
  - B1：设置页音色选择器全链路删除（SettingsScreen 组件+样式、AppSettings.ttsVoiceId 字段、storage 读写、i18n key）；音色唯一来源为 voiceMap 按文本语言自动决定
  - B2：提问入口临时禁用——InteractionControls 的 ASK_FEATURE_ENABLED=false + 两个语言词表 ask 词条注释保留 + 5 个 ask 测试用例 it.skip；提问功能设计完成后一并恢复
  - B3：RecipeEditScreen handleSave 多表写入包 withTransaction，中途失败回滚
  - 同日全量代码审计（报告 docs/代码审计-2026-09-02.md，SOP 固化 docs/发版前审计清单.md）；B4/W1 复核为扫描范围误报撤销（App.tsx 已挂 ErrorBoundary/已调 cleanupOrphanCovers），教训已入清单

- **i18n 多语言体系** (2026-09-03，四阶段真机验收全部通过)：
  - 阶段 1 基建：架构文档新增 3.5 章节（先规范后代码）；src/i18n/（同步初始化 + 语言解析优先级 MMKV 覆盖 > 系统语言 > zh 兕底 + changeAppLanguage 唯一入口 + TS key 类型增强）；设置页语言项切语言即时生效、重启保持
  - 阶段 2 全量抽取：10 屏 + 10 组件 + FSM 播报/服务层错误文案接入 t()；TAG_OPTIONS/音量档位名移入资源；jest.setup 全局初始化 i18n；grep 验收无硬编码 UI 文案
  - 阶段 3 语音联动：voiceMap.ts 语言→语音配置枢纽；语音命令词表 zh/en 双表 dispatch 时按语言取；STT 转写语言随 UI 语言；TTS 音色随**播报文本**语言（晓晓/Jenny，真机教训：Jenny 念纯中文返回空音频）；英文模式 next/repeat/ok 控 FSM 真机验收通过
  - 阶段 4 prompt 多语言化：llm.\* 域（解析 system prompt + AI 编辑指令），输出语言跟会话语言——英文模式录中文菜谱直接得地道英文菜谱（真机验证：to taste 等惯用表达）
  - 数据语言原则：LLM 产出跟会话语言，录入后不做翻译；英文 UI + 中文菜谱混排是预期行为
- **audio-libs 本地 vendor 缓存** (2026-09-02)：`scripts/download-audio-libs.js` 三级回退（vendor zip 直解 → 下载并回存 vendor → 明确报错提示代理）；修复幂等检查误判（原查解压根目录、npm 包自带 include 导致永不补库，改查产物目录）；恢复演练通过（删库后零网络本地恢复）。同日 i18n 三依赖（i18next/react-i18next/react-native-localize）已装，真机构建通过

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

**发版前代码审计待清项**（2026-09-02 审计，Blocker 已清零并真机验证；完整报告 `docs/代码审计-2026-09-02.md`，SOP `docs/发版前审计清单.md`）：

- ✅ W2/W5/W7 已修复（2026-09-02）：16 处调试 console.log 加 `__DEV__` 守卫（含 useCookingLogger，生产零开销不查库；转写文本仅 DEV 输出），6 处 console.error（错误观测）保留
- ✅ W6 已修复（2026-09-02）：useRecipeLoader 返回 notFound，CookingScreen 兑底 NotFound 状态（插画+返回按钮，i18n cooking.notFound/back 双语）
- 🔧 真机走查新发现（2026-09-05，修复中）：① 英文模式字体不一致——命名字体叠加 fontWeight 致 Android 整体 fallback 系统字体，已修 2 处（AiDiffPreviewModal/SettingsScreen radio），扫描规则已入审计清单，待真机复验；② 设置页/编辑页 HeaderBar 标题与右侧按钮视觉不居中——布局代码几何对称，疑似 PlayfairDisplay 中文 fallback metrics 偏移，待看截图定位（换模型续修）
- ✅ W3 已关闭（2026-09-02 调研）：STT/权限错误中文 message 不上 UI（catch 层已换 i18n 文案）；LLM 错误英文技术串仅作 i18n 插值参数，无中英混杂问题
- ⏸ W4 挂起：ASK prompt 中文硬编码，随提问功能设计恢复时一并多语言化
- Nit 7 项发版后处理（真孤儿导出 3 个、多余 export、fontSize 半 token、模板依赖、大文件拆分等，见报告）

- Blocker：① 设置页 TTS 音色选择器无消费路径（`ttsVoiceId` 写入 MMKV 但播放用 `getVoiceConfigForText` 硬映射，选项仅 MiniMax 而运行时只实例化 AzureTTSProvider，选择零效果）；② FSM ANSWERING invoke 无 onError，LLM 失败卡死（ROADMAP 既有记录，代码复核属实）；③ RecipeEditScreen 保存为多表写入（update+delete+recreate）未包 withTransaction，违反红线；④ ErrorBoundary 组件零引用，App 未挂载，生产崩溃白屏无兜底
- Warning：cleanupOrphanCovers 未接线（封面图堆积）、useCookingLogger 挂生产路径（转态打日志+白查 DB）、服务层错误 message 硬编码中文（stt/permissions/tts-provider-azure）、ASK prompt 中文硬编码、console.log 21 处、useRecipeLoader 错误不上浮 UI
- 通过项：tsc/lint/format 全绿、硬编码颜色零残留、any/@ts-ignore 零、generateUuid/withTransaction 入口约定遵守（违规在 screen 层）、密钥不进日志

- 提问功能（ASK/ANSWERING）设计未完成，fely 待设计回答范围后再实施。设计输入（2026-09-03 排查结论）：
  - 回答被静默丢弃：ANSWERING 的 llmService 拿到 answer 后直接回原状态，无 TTS 播报（接入方案已讨论：useCookingFsm 的 llmService actor 内播报，voice 跟随回答文本语言，播完才回原状态）
  - 卡死隐患：ANSWERING invoke 无 onError，LLM 失败（服务未起/网络）会卡死在 ANSWERING，设计时必须一并处理
  - 回答范围现状：ASK_SYSTEM_PROMPT 仅限「30 字以内」，无内容边界（能答什么/不能答什么未定义），fely 要先设计这个
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
| 1    | 基建：依赖安装（Windows PowerShell 手动）+ src/i18n 初始化 + 设置页语言项 + 类型安全                                | 设置页切语言即时生效，重启保持                           | ✅ 完成（2026-09-02，真机验收通过） |
| 2    | UI 文案抽取：38 文件硬编码替换为 t('key')，分屏幕推进；FSM 层「烹饪完成」两处改 i18n.t()                            | grep 无硬编码 UI 文案（排除注释），每屏切语言即时生效    | ✅ 完成（2026-09-03，真机验收通过） |
| 3    | 语音管线联动：voiceMap.ts + VoiceCommandService 关键词注入改造 + TTS voiceId / STT language 接线                     | 英文模式下英文关键词可控制 FSM，英文 voice 播报          | ✅ 完成（2026-09-03，真机验收通过：next/repeat 控 FSM、转写/播报链路正常；ask 播报缺失属提问功能整体设计范畴，见待解决） |
| 4    | en 包翻译：AI 批量翻译 + 真机校对 + LLM 录入 prompt 多语言化                                                        | 录入→烹饪→语音全流程英文跑通                             | ✅ 完成（2026-09-03，真机验收通过：中文菜谱录入→英文菜谱产出（to taste 等地道表达）、英文语音控制、播报链路全通） |

明确不做：RTL 布局（目标语言无 RTL 需求）、翻译管理平台（AI 工具链足够）、阶段 4 后更多语言（加 JSON 文件即可）。

---

详见 [`docs/Phase-D-UI规范.md`](docs/Phase-D-UI规范.md) 和 [`docs/架构与技术文档.md`](docs/架构与技术文档.md)
