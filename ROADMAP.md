# ROADMAP

> 厨房 AI 副厨 — React Native 移动端 App
> 项目介绍与使用方式见 [`README.md`](README.md)，编码规范见 [`CLAUDE.md`](CLAUDE.md)

---

## 当前状态（2026-08-27）

<!-- prettier-ignore -->
| 指标       | 数值                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| 源文件     | 129 TS/TSX（不含测试）                                                                                    |
| 代码量     | ~11500 行                                                                                                 |
| 屏幕       | 10                                                                                                        |
| 共享组件   | 29（不含 26 个图标组件）                                                                                  |
| 测试       | 7 套件全过（cooking-machine, haptic, useKeepAwake, HomeScreen, voice-commands, LoadingOverlay, e2e-flow） |
| 后端服务   | LLM 本地代理 1 个；STT/TTS 已切 Azure AI Speech（本地服务代码保留可切回）                                 |
| 图标       | 27 个 SVG 图标组件                                                                                        |
| 插画       | 3 个空/错误状态插画                                                                                       |
| 颜色 token | 44 个语义化 token                                                                                         |

**已完成**：

近期（2026-08）：

- **DB 迁移机制** (2026-08-31)：自研轻量 runner（`src/db/migrations.ts`，零新依赖）；启动时建 `schema_migrations` 版本表并按序执行未应用迁移，每个迁移独立事务；老安装无版本记录靠幂等迁移（IF NOT EXISTS / PRAGMA 检测后 ALTER）从 v1 重放；v1 建 4 表最终结构，v2 补 is_favorite；今后 schema 变更只追加迁移 + 同步架构文档；runner 单测 4 用例覆盖全量/跳过/回滚/版本递增；`init.ts` 简化为调 runner，CRUD 接口零变化。真机覆盖安装待验证
- **播报音量控制（TTS 两级增益）** (2026-08-31，真机验证通过)：设置页「TTS 设置」新增播报音量档位（静音/较低/标准/较高/最高，`ttsVolumeLevel` 存 MMKV，Stepper 切换不用滑杆）；播放链路 `source → GainNode → destination`（GainNode 只承载用户档位）；计时到点提醒（`ANNOUNCING_REMINDER`）ttsService input 带 `boost: true`，采样域叠加 `REMINDER_BOOST`（3×）+ tanh 软限幅防削波，只作用提醒播报，普通步骤播报不受影响；不改 FSM 状态/转换边，不碰系统音量；迭代记录：首版 boost 1.5×（+3.5dB）听感无差别 → 3× 线性增益硬削波有吱吱声 → tanh 软限幅真机复验通过；V2「音量自动增强」已由本项消化
- **首页大卡片与列表策略调整** (2026-08-31，真机验证中)：大卡片固定推荐最新添加的菜谱（与 tab 无关，任何 tab 下焦点位不空）；列表改为完整筛选结果（全部/收藏 tab 含大卡片菜谱），消除互斥方案下切 tab 数量对不上、单条收藏时列表空白的割裂；全部/收藏 tab 按 created_at DESC
- **烹饪记录接入 V1（cook_sessions 读写）** (2026-08-31，真机验证通过)：烹饪页挂载写入会话、完成标 completed、其余退出路径由卸载 cleanup 收尾（不留悬挂记录）；「最近」tab 改为最近做过：只显示有烹饪记录的菜，按最后烹饪时间取前 10，卡片时间显示「X 天前做过」（与排序依据一致，其余 tab 仍显示编辑时间）；tab 无结果时页面结构不变，由 FlatList ListEmptyComponent 在列表区显示专属空提示（顺带修正收藏 tab 为空的误导文案）；新增 getLastCookedAtMap 查询；CLAUDE.md/架构文档同步（原「V1 只写不读」描述与代码不符——实际此前连写入都未接入）
- **首页筛选栏下划线自适应** (2026-08-31)：选中 tab 下划线从固定 20dp 改为 alignSelf stretch，与文字等宽；无封面图小卡片白条内边距收紧（上下 12→8、左 16→12、右 12→8）
- **长按菜单改卡片级覆盖层** (2026-08-31，真机迭代中)：首页长按菜单从全屏 Modal 改为卡片内深纱覆盖层（overlay50 压暗 + 收藏/编辑两个暖灰底 IconButton + 右上角 × 对齐原收藏角标位置关闭），菜单项精简为收藏+编辑（删除入口保留在详情页）；新增 edit 图标；真机迭代两轮：白纱方案因浅色卡片对比不足废弃，RecipeContextMenu.tsx 已删；同步更新 Phase-D-UI规范.md
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

- 待复现：首页偶现筛选栏与卡片瞬态重叠（真机截图一次后自恢复，疑与 FadeInUp entering 中间帧相关；再出现时记录是否在进首页/切筛选动画期间、长按菜单是否弹出过）

## 长期（V2）

<!-- prettier-ignore -->
| 功能             | 说明                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------- |
| 双菜并行         | XState spawn 子 FSM，两道菜同步推进                                                           |
| BLE 耳机按键     | 耳机物理按键控制烹饪流程（优先级 1）                                                          |
| 手势控制         | MediaPipe HandLandmarker 挥手控制（优先级 4）                                                 |
| ~~DB 迁移机制~~  | ✅ V1 已实现（2026-08-31）：schema_migrations 版本表 + 幂等迁移序列                           |
| Gesture/Headset  | 生产路径实现（当前为 stub）                                                                   |
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

详见 [`docs/Phase-D-UI规范.md`](docs/Phase-D-UI规范.md) 和 [`docs/架构与技术文档.md`](docs/架构与技术文档.md)
