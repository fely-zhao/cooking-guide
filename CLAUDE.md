---
name: '厨房 AI 副厨'
description: 'React Native 移动端 App — 项目专属约束、编码规范、架构规则（AI 代理工作指引）'
---

> 本文件是 AI 代理的**项目专属工作指引**（编码规范、架构约束、技术约定）。
> 同时服务于 Claude Code 和 OpenCode（后者通过全局 `~/.config/opencode/AGENTS.md` 指针发现）。
> 全局通用约束见 `~/.claude/CLAUDE.md`。
> **项目介绍与使用方式**见 [`README.md`](README.md)，**进度与路线图**见 [`ROADMAP.md`](ROADMAP.md)。
> **所有 UI 开发强制遵照** [`docs/Phase-D-UI规范.md`](docs/Phase-D-UI规范.md)（图标、配色、动画、插画、Button）。

## 目录结构约定

```
src/
  components/     # UI 组件，按功能分文件夹
  screens/         # 页面级别组件
  machines/        # XState FSM 定义
  services/        # API 调用、TTS、STT 等外部服务
  db/              # SQLite 数据库操作
  hooks/           # 自定义 React Hooks
  utils/           # 通用工具函数
  types/           # TypeScript 类型定义
```

## 全局约束

- **包管理统一使用 yarn**，不混用 npm。新增依赖、运行脚本全部通过 `yarn add` / `yarn <script>` 执行。
- **密钥、token 不进代码、不进 commit**
- **不改动已定义的 FSM 状态转换图、数据库 schema、交互优先级和降级逻辑**（除非架构文档更新）
- AI 生成代码需手动审查后方可提交

## 技术栈

| 层       | 选型                                   |
| -------- | -------------------------------------- |
| 框架     | React Native                           |
| 语言     | TypeScript（严格模式）                 |
| FSM      | XState v5                              |
| 本地存储 | SQLite（op-sqlite）                    |
| 导航     | React Navigation                       |
| LLM      | Claude / GPT-4o（仅录入端 + 临时问答） |
| TTS      | MiniMax Speech-02 Turbo                |
| STT      | faster-whisper（独立 stt-server）      |
| 手势     | MediaPipe HandLandmarker               |
| 后端     | llm-server（独立项目，LLM 代理）       |

完整技术栈 + 架构图详见 [`docs/架构与技术文档.md`](docs/架构与技术文档.md)。

## 核心架构原则

1. **大模型不参与实时决策** — 录入时处理一次结构化解析，烹饪时全程本地 FSM 驱动，不调用 LLM
2. **API 代理不存数据** — 后端仅做转发 + 隐藏密钥，所有数据在本地 SQLite
3. **四级交互降级** — 耳机 > 语音 > 屏幕按钮 > 挥手手势，自动检测可用设备

## FSM 设计规则

- 每个 FSM 定义在 `src/machines/` 下，使用 XState v5 `createMachine`
- 状态节点枚举：`IDLE`, `ANNOUNCING_STEP`, `WAITING_AUTO`, `WAITING_USER`, `WAITING_TIMER`, `ANSWERING`
- `WAITING_TIMER` 状态下计时器结束后发射 `TIMER_DONE` 事件进入 `ANNOUNCING_REMINDER`
- 所有并行状态（V2 双菜并行）使用 XState 的 `spawn` 创建子 FSM 实例

完整状态图见 [`docs/架构与技术文档.md`](docs/架构与技术文档.md#32-烹饪引导模块核心)。

## 步骤标签规则

步骤的 `tag` 字段由大模型在录入时一次性打好，烹饪中不可变更：

| 标签         | 行为                          |
| ------------ | ----------------------------- |
| `instant`    | 3-5 秒后自动播下一步          |
| `wait_user`  | 等待用户主动确认（按键/语音） |
| `wait_timer` | 启动计时器，到时 AI 主动提醒  |

## 数据库约定

- 表操作统一在 `src/db/` 下，每个表一个文件
- 使用 op-sqlite 的同步 API（`executeSync`）
- **ID 生成**：统一使用 `generateUuid()`（`src/utils/uuid.ts`，uuid v4），禁止 `Date.now() + Math.random()`
- **事务**：多表写入必须包裹在 `withTransaction()` 中（`src/db/transaction.ts`），利用 `BEGIN/COMMIT/ROLLBACK` 保证原子性
- **外键**：`PRAGMA foreign_keys = ON` 在 `init.ts` 中已启用，子表已声明 `ON DELETE CASCADE`，单条 `DELETE FROM recipes` 即可级联删除
- `cook_sessions` 表为 V2 预留，V1 只写不读

完整 Schema 见 [`docs/架构与技术文档.md`](docs/架构与技术文档.md#34-本地存储sqlite)。

## 编码规范

> **⚠️ 所有 UI 开发必须遵照 [`docs/Phase-D-UI规范.md`](docs/Phase-D-UI规范.md) 执行。** 该文档是图标、配色、动画、插画、Button 组件的唯一权威来源。以下各节为速查摘要，完整细则见规范文档。
> **涉及图标选择、新增颜色 token、动画细节、空状态插画、Button variant 时，必须 `read` 该文档确认，不得凭记忆猜测。**
> **涉及图标选择、新增颜色 token、动画细节、空状态插画、Button variant 时，必须 `read` 该文档确认，不得凭记忆猜测。**

### 基础规则

- 优先使用 `const` 而非 `let`
- 函数组件 + Hooks，不使用 class 组件（全局 ErrorBoundary 除外——React 要求 class 组件实现 `componentDidCatch`）
- 异步操作使用 `async/await`，避免 `.then()`
- 样式使用 `StyleSheet.create()`，不写内联样式
- 文件名使用 kebab-case（如 `cooking-machine.ts`）
- 类型定义优先放 `src/types/`，组件内不写内联类型；与特定功能强耦合的类型可伴随模块放在 `src/utils/` 中
- 不擅自添加未在架构文档中定义的功能

### 设计 Token 规范

- **禁止硬编码颜色**：所有颜色必须使用 `src/theme/colors.ts` 中的语义化 token（44 个），不允许裸 `#xxxxxx`
- **禁止魔术数字**：间距使用 `spacing` token（`xxs:2` ~ `xxxl:32`），字号使用 `typography` token（`h1` ~ `captionSmall`），圆角使用 `spacing.radius.*`
- **新增 token 需评审**：如果现有 44 个颜色 token 不满足需求，先在 `colors.ts` 中添加语义化 token，不直接在组件中硬编码

### 图标规范

- **禁止 emoji 作为 UI 图标**：所有图标必须使用 `<Icon name="..." />`（19 个 SVG 图标，见 `docs/Phase-D-UI规范.md`）
- 新图标在 `src/components/icons/` 下创建 SVG 组件，在 `Icon.tsx` 的 `ICON_MAP` 注册

### 动画规范

- **全部使用 react-native-reanimated**（已安装 v4.4.1），弃用 RN 内置 `Animated` API
- 只用 native-driver 属性：`opacity`、`transform`，禁止动画 `width`/`height`
- 页面转场在 `AppNavigator.tsx` 统一配置，不要在单个屏幕中自定义
- 按钮反馈统一使用 `Button` 组件（已内置 reanimated 缩放动画）

### 空/错误状态规范

- **禁止 emoji 或纯文本占位**：必须使用 `EmptyRecipeIllustration` / `ErrorIllustration` / `NotFoundIllustration` 插画组件
- 插画 + 文字说明 + 操作按钮（如有）三者齐全

### 组件拆分规范

- **屏幕文件不超过 500 行**（当前 RecipeEditScreen 694 行仍需进一步拆分）
- 内联 Modal/Dialog/Overlay 必须提取为独立组件，放在 `src/components/` 下
- 组件 Props 接口应明确：`visible`、`onClose`/`onAccept`/`onReject` 等回调
- 被 2+ 组件共享的类型和常量提取到 `src/utils/`（如 `EditableStep`、`TAG_OPTIONS` → `recipe-edit.ts`）
- 样式随组件走——Modal 的 StyleSheet 定义在组件文件内，不在父屏幕中

**示例**：RecipeEditScreen 的 3 个弹窗 → `AiOptionsModal` / `AiDiffPreviewModal` / `AiProcessingOverlay`

### Hook 设计规范

- **单一职责**：每个 hook 只做一件事。巨型 hook（如 useCookingMachine 原本 235 行 7 职责）必须拆分
- **组合优于继承**：拆分后的子 hook 由父 hook 组合调用，对外保持原有接口不变
- 子 hook 文件命名：`use[Feature].ts`，放在 `src/hooks/` 下
- 共享类型和工厂函数（如 `Services` 接口、`createServices()`）放在 `cooking-machine-shared.ts` 中
- 纯副作用 hook（日志、预缓存、清理）不返回数据，只产生副作用

**示例**：useCookingMachine → `useCookingServices` + `useCookingFsm` + `useRecipeLoader` + `useTtsPreCache` + `useCookingCleanup` + `useCookingLogger` + `useTtsHealthCheck`

### 错误处理规范

- **全局兜底**：`<ErrorBoundary>` 包裹 `<NavigationContainer>`（在 `App.tsx` 中），任意组件崩溃不白屏
- **服务层**：抛出领域错误类（`TTSError`、`STTError`、`LLMError`、`ApiProxyError`），不吞错误
- **非关键服务降级**：TTS 失败不应阻断流程——catch 后 `console.error` 记录，进入 FSM `onError` 过渡状态
- **屏幕层**：预期错误用 `Alert.alert()` 告知用户（如"解析失败"、"识别失败"）；不预期错误靠 ErrorBoundary 兜底
- **DB 层**：事务操作失败自动 ROLLBACK（`withTransaction` 内抛异常即回滚）

### 加载状态规范

- **禁止使用裸文本**"加载中..."作为 loading 状态——使用骨架屏组件
- 骨架屏组件位于 `src/components/skeleton/`，3 个基础原语：
  - `SkeletonBox`（矩形，支持 pulse 动画）
  - `SkeletonCircle`（圆形）
  - `SkeletonText`（文本行）
- 每个需要骨架屏的屏幕创建对应的组合骨架组件（如 `RecipeCardSkeleton`、`RecipeDetailSkeleton`）
- 骨架屏用 `colors.skeleton`（`#eeeeee`）作底色，`useNativeDriver: true` 驱动 pulse 动画
- Button 的 `loading` prop 保持 ActivityIndicator——那是操作反馈，不是内容占位

## 后端服务

App 依赖三个本地后端服务（独立项目）：

| 服务                         | 端口 | 用途         |
| ---------------------------- | ---- | ------------ |
| STT（Python faster-whisper） | 5000 | 语音转文字   |
| TTS（Node.js Windows SAPI）  | 4000 | 文字转语音   |
| LLM（Node.js 代理）          | 3001 | LLM API 转发 |

启动方式、端口转发、真机配置等见 [`docs/运行与打包指南.md`](docs/运行与打包指南.md)。

## 语音交互

- STT 管线实现细节： [`docs/STT-实现备忘.md`](docs/STT-实现备忘.md)
- TTS 管线实现细节： [`docs/TTS-实现备忘.md`](docs/TTS-实现备忘.md)

## 验证命令

| 命令                | 说明                |
| ------------------- | ------------------- |
| `yarn lint`         | ESLint 代码检查     |
| `npx tsc --noEmit`  | TypeScript 类型检查 |
| `yarn format:check` | Prettier 格式检查   |
| `yarn test`         | bun 单元测试        |
| `yarn test:e2e`     | Jest 端到端测试     |
| `yarn test:all`     | 运行全部测试        |

## Git 工作流

> 采用 **GitHub Flow**：`main` 分支始终可部署，新工作从 `main` 切出特性分支，完成后通过 PR 合回。

### 分支规范

| 前缀     | 用途     | 示例                               |
| -------- | -------- | ---------------------------------- |
| `feat/`  | 新功能   | `feat/parallel-cooking`            |
| `fix/`   | 修复 bug | `fix/tts-crash-on-network-loss`    |
| `chore/` | 杂务     | `chore/upgrade-react-native-0.87`  |

- 分支名使用 **kebab-case**（小写英文 + 连字符），不用中文，不用编号
- PR 标题同分支名风格，描述中引用 GitHub Issue 编号（如有）

### 开发流程

```bash
# 1. 从 main 切出特性分支
git checkout -b feat/your-feature

# 2. 完成开发，提交
git add <files>
git commit -m "feat: 一句话说明（英文或中文）"

# 3. 推送
git push -u origin feat/your-feature

# 4. 在 GitHub 创建 Pull Request → main
# 5. Review 通过后 Squash merge
# 6. 删除远程特性分支，本地切回 main 并拉取
git checkout main
git pull
git branch -d feat/your-feature
```

### 提交信息规范

- 首行格式：`<type>: <简短描述>`
- type 参考：`feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `style`
- 描述可英文可中文，清晰即可

```
feat: 双菜并行模式
fix: TTS 网络断开时崩溃
chore: 清理无用 SVG 图标
docs: 更新 README 安装步骤
```

### .gitignore 规则

- `.codegraph/`、`.omo/` — 本地 AI 工具缓存，不提交
- `.env`、`.env.local`、`.env.*.local` — 环境变量，不提交
- `bun.lock` — 项目使用 yarn，不提交
- `android/hs_err_pid*.log`、`android/replay_pid*.log` — JVM 崩溃日志
- `__MACOSX/`、`.AppleDouble`、`.LSOverride` — macOS 元数据残留
- `*.keystore` — 密钥库文件（含 debug.keystore）
- 完整规则见根目录 [`.gitignore`](.gitignore)

## 关键文档索引

| 文档                     | 内容                                                  |
| ------------------------ | ----------------------------------------------------- |
| `README.md`              | 项目介绍、快速开始、使用方式                          |
| `ROADMAP.md`             | 当前状态、短期/中期/长期路线图                        |
| `docs/架构与技术文档.md` | 完整架构、FSM 状态图、DB Schema                       |
| `docs/Phase-D-UI规范.md` | **Phase D UI 视觉规范（图标/动画/插画/配色/Button）** |
| `docs/运行与打包指南.md` | 启动方式、端口转发、真机配置                          |
| `docs/STT-实现备忘.md`   | STT 管线实现细节                                      |
| `docs/TTS-实现备忘.md`   | TTS 管线实现细节                                      |
