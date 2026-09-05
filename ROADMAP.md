# ROADMAP

> 厨房 AI 副厨 — React Native 移动端 App
> 项目介绍与使用方式见 [`README.md`](README.md)，编码规范见 [`CLAUDE.md`](CLAUDE.md)

---

## 当前状态（2026-09-05）

<!-- prettier-ignore -->
| 指标       | 数值                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| 源文件     | 132 TS/TSX（不含测试）                                                    |
| 代码量     | ~12700 行（不含测试）                                                     |
| 测试       | 8 套件全绿（3 个 ask 用例 skip 为提问功能临时禁用）                       |
| i18n       | zh-CN/en 双语，全链路随设置页语言切换（UI/语音命令/播报音色/LLM 解析）    |
| 代码审计   | Blocker 清零并真机验证（2026-09-02）；Nit 大半已清（2026-09-05）；报告 `docs/代码审计-2026-09-02.md`，SOP `docs/发版前审计清单.md` |
| 屏幕       | 10                                                                        |
| 共享组件   | 28（不含图标）                                                            |
| 图标       | 28 个（27 个组件文件，HeartIcon 含 heart/heart-filled 双名称）            |
| 后端服务   | LLM 本地代理 1 个；STT/TTS 已切 Azure AI Speech（本地服务代码保留可切回） |
| 插画       | 3 个空/错误状态插画                                                       |
| 颜色 token | 44 个语义化 token                                                         |

**已完成**（细节见 git log）：

近期（2026-09）：

- **依赖清理** (2026-09-05，门禁全绿)：删除模板残留依赖 @react-native/new-app-screen；uuid ^9 从 devDependencies 挪到 dependencies（yarn add 实装 ^14.0.2，named import 用法兼容，tsc 验证通过）
- **DB 迁移覆盖安装真机验证** (2026-09-05)：debug 包覆盖安装至旧数据真机，菜谱/收藏/烹饪记录/设置项全部保留，幂等重放通过（2026-08-31 挂账销项）
- **无障碍第四轮：录入/编辑页** (2026-09-05，门禁全绿)：录入入口 + 手动/图片/链接/语音四屏输入框与操作按钮 label、录音按钮状态化 label + disabled 态、录制时长语义化、波形装饰隐藏、编辑页份数 stepper 与拖拽行删除按钮 label；增减/删除词条提升至 common.a11y 跨页复用
- **无障碍第三轮：设置页** (2026-09-05，门禁全绿)：HeaderBar 返回按钮组件内置「返回」label（全屏复用）、Stepper 增减按钮 label + disabled 态、Switch 关联行标签、语言 radio selected 语义、服务地址输入框关联字段名 label
- **无障碍第二轮：首页** (2026-09-05，门禁全绿)：设置按钮/卡片 play 按钮/长按菜单三按钮读屏 label，筛选 tab 选中态语义化，卡片长按菜单以 accessibilityActions 透出（读屏用户原本无法触达收藏/编辑），PressableScale 无障碍 props 透传
- **无障碍第一轮：烹饪页** (2026-09-05，门禁全绿)：IconButton 组件新增 accessibilityLabel prop（全库复用）、退出按钮接入读屏文案、TimerRing 倒计时语义化（剩余 X 分 Y 秒 + role timer）、状态点/庆祝特效对读屏隐藏；无障碍规范固化入 UI 规范第 12 节
- **审计 Nit 快速清理** (2026-09-05，门禁全绿)：删死代码、收敛 9 处多余导出、StepNumber 改 typography.h4（全库 fontSize 硬编码清零）、err as Error 收窄、hooks barrel 删 7 个子 hook 导出
- **文档治理** (2026-09-05)：删 UI-Redesign-Plan.md 与 08-26 项目审计报告（待办转挂本文件）；UI 规范修正图标计数漂移；iOS 字体死配置清理（Info.plist UIAppFonts + pbxproj 23 行）；审计盲区 4 项固化入审计清单
- **字体方案终极处置** (2026-09-05，真机复验)：全 App 弃用自定义字体改系统字体（fontWeight 失效与 HeaderBar 错位一并根治，commit b115de7）；fontFamily 扫描规则入 CLAUDE.md 红线与审计清单
- **发版前审计整改** (2026-09-02，真机验证)：B1 音色选择器全链路删除、B2 提问入口临时禁用（ASK_FEATURE_ENABLED=false + 5 用例 skip）、B3 保存包 withTransaction；同日全量审计出报告与 SOP
- **i18n 多语言体系** (2026-09-03，四阶段真机验收)：src/i18n 基建 + 全量文案抽取 + 语音管线联动（voiceMap 枢纽）+ LLM prompt 多语言；数据语言原则：LLM 产出跟会话语言，录入后不翻译
- **audio-libs 本地 vendor 缓存** (2026-09-02)：三级回退下载脚本 + 幂等修复 + 恢复演练通过

近期（2026-08）：

- **烹饪体验打磨** (2026-08-31)：烹饪记录 V1（「最近」改最近做过）、播报音量档位 + 3× 软限幅、转场卡顿优化（LoadingOverlay）、DB 迁移机制（schema_migrations 版本表）
- **首页迭代** (2026-08-31，真机迭代中)：大卡片固定推荐最新菜谱、筛选栏下划线自适应、长按菜单卡片级覆盖层
- **语音服务切 Azure AI Speech** (2026-08-27，真机验证)：STT/TTS 切换，key 设置页录入存 MMKV；收藏全链路 / 录入幂等 / 重播补全
- **构建与工程基建** (2026-08-29)：audio-api 构建零下载、测试统一 jest、无线调试打通

里程碑（历史）：

- **核心链路**：4 种录入方式（文本/图片/URL/语音）→ DeepSeek 结构化解析（llm-server 纯代理）→ SQLite 本地存储 → XState v5 FSM 烹饪引导（7 状态/9 事件，e2e 覆盖）
- **语音管线**：TTS 四层管线（Provider→Service→Cache→Player，错误降级）+ STT 录音/VAD + 音频焦点处理
- **烹饪体验**：计时器可打断 + mm:ss 显示 + 到点震动循环播报；步骤拖拽排序；重播
- **UI 体系**：Phase B/C/D 全部完成——LLM 接入、代码债清理、组件统一（HeaderBar/Button 全覆盖）、Design system、微交互（PressableScale/Haptic/KeepAwake）
- **数据与设置**：菜谱导出/导入；设置页三项服务地址（LLM/TTS/STT）存 MMKV
- **测试基建**：jest 单测 + e2e 全绿

**待解决**：

发版前待清项（报告 `docs/代码审计-2026-09-02.md`，SOP `docs/发版前审计清单.md`；2026-09-02/09-05 批次 Blocker/Warning/Nit 大半已闭环，细节见 git log）：

- N6：5 个屏幕超 500 行拆分
- accessibilityLabel 剩余屏幕补齐（烹饪页、首页、设置页、录入/编辑页已完成，剩余详情页等零散触点，规范见 UI 规范第 12 节）
- 语音命令无暂停/继续/上一步

待复现：首页偶现筛选栏与卡片瞬态重叠（疑与 FadeInUp entering 中间帧相关；再出现时记录触发场景）

## 长期（V2）

<!-- prettier-ignore -->
| 功能                | 说明                                                                |
| ------------------- | ------------------------------------------------------------------- |
| 双菜并行            | XState spawn 子 FSM，两道菜同步推进                                 |
| BLE 耳机按键        | 耳机物理按键控制烹饪流程（优先级 1）                                |
| 手势控制            | MediaPipe HandLandmarker 挥手控制（优先级 4）                       |
| 提问功能 ASK/ANSWERING | 烹饪中向 LLM 提问；待设计回答范围。已知隐患（2026-09-03 排查）：answer 静默丢弃无播报、ANSWERING invoke 无 onError 会卡死、ASK prompt 中文硬编码。恢复入口：ASK_FEATURE_ENABLED=false + 两语言词表 ask 词条 + 5 个 ask it.skip 用例 |

---

## 架构决策记录

<!-- prettier-ignore -->
| 决策       | 内容                                                |
| ---------- | --------------------------------------------------- |
| 大模型角色 | 仅在录入时调用一次，烹饪全程本地 FSM 驱动，不调 LLM |
| LLM 选型   | DeepSeek V4 Flash（function calling, ~3s 响应）     |
| 离线优先   | 所有数据存本地 SQLite，后端仅做转发 + 隐藏密钥      |
| 交互       | 语音 + 屏幕按钮两级；耳机按键/挥手手势为 V2 规划    |
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

详见 [`docs/Phase-D-UI规范.md`](docs/Phase-D-UI规范.md) 和 [`docs/架构与技术文档.md`](docs/架构与技术文档.md)
