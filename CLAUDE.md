---
name: '厨房 AI 副厨'
description: 'React Native 移动端 App — 三层上下文记忆体系：L1 红线（本文件）→ L2 详规（docs/）→ L3 真相（源码）'
---

> **本文件是 L1 热记忆**（Hot Memory）。只记三类内容：**禁令**、**去哪查**、**改前必须做什么**。
> 不记任何可从 L2 工具调用获取的技术细节。不记用法示例。不记配置参数。
> 阅读本文件 < 30 秒。违反红线 → 原地回滚，不得提交。

---

## 📐 文档写入规则

**CLAUDE.md 不是微型规范文档。新增内容时先查此表：**

| 内容类型                                    | 写入目标                   | 判断标准                                             |
| ------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| 红色禁令（严禁/禁止）                       | CLAUDE.md → 🚫 绝对红线区  | 违反即不可逆工程事故                                 |
| 工具调用触发命令                            | CLAUDE.md → 对应领域标题下 | "改 X 前必须 cat Y"                                  |
| 架构图/FSM/DB Schema                        | `docs/架构与技术文档.md`   | 修改代码前需刷新的技术细节                           |
| UI 规范/图标/动画/颜色/插画/Button/安全区域 | `docs/Phase-D-UI规范.md`   | 任何 UI 代码生成前引用                               |
| 端口/网络/真机配置/打包                     | `docs/运行与打包指南.md`   | 涉及后端连接或构建时引用                             |
| STT 管线细节                                | `docs/STT-实现备忘.md`     | 修改录音/VAD/关键词匹配相关代码前                    |
| TTS 管线细节                                | `docs/TTS-实现备忘.md`     | 修改播放器/Provider/预缓存相关代码前                 |
| 进度/路线图                                 | `ROADMAP.md`               | 规划新功能或了解项目阶段时引用                       |
| ~~通用编码规范~~                            | ~~不写入~~                 | OMO Agent 已内置（React 范式、文件命名、git 工作流） |

**铁律：**

1. 新增功能必须同步更新 L2 文档，不得仅在 CLAUDE.md 添加摘要。
2. 凡与 OMO Agent 内置能力重叠的内容（通用 React 规范、标准 git 操作、代码风格），**严禁写入 CLAUDE.md**。Agent 通过读取项目文件和自身训练数据已足够。

---

## 🚫 绝对红线区 — 任何 Agent 任何时候不得触碰

以下规则违反任意一条即视为不可逆工程事故，**原地回滚，不得提交**：

1. **包管理统一使用 yarn。严禁 npm install，严禁生成 package-lock.json。**
2. **严禁私自改动 FSM 状态转换图**（`src/machines/cooking-machine.ts`），除非 `docs/架构与技术文档.md` 同步更新。
3. **严禁私自改动数据库 schema**（`src/db/` 下 4 张表），除非 `docs/架构与技术文档.md` 同步更新。
4. **密钥、token 严禁进代码、严禁进 commit。LLM key 仅存在于 llm-server/.env；Azure Speech key 仅由用户在设置页录入存 MMKV（`azureSpeechKey`）。**
5. **严禁 emoji 作为 UI 图标。** 所有图标必须用 `<Icon name="..." />`。
6. **严禁硬编码颜色 `#xxxxxx` / `rgba()`。** 所有颜色必须使用 `src/theme/colors.ts` 语义化 token。
7. **严禁动画 `width`/`height`。** 全部使用 `react-native-reanimated`，只动画 `opacity`/`transform`。
8. **严禁在根目录执行 npm 命令。严禁生成 bun.lock、package-lock.json。**
9. **依赖变更（`yarn add` / `yarn remove`）与 `yarn install` / `yarn android` / `yarn start` 严禁在 WSL 执行，必须在 Windows PowerShell 手动操作。改依赖后必须重跑 `npx patch-package` 并确认 `patches/` 全部应用。**

---

## 🧠 三层上下文记忆机制

AI Agent 按以下层级获取记忆，不得越级依赖：

| 层级 | 名称   | 存储位置    | 何时读取                             | 刷新方式                     |
| ---- | ------ | ----------- | ------------------------------------ | ---------------------------- |
| L1   | 热记忆 | **本文件**  | 每次会话自动加载                     | 本文的🚫红线 + 📐规则        |
| L2   | 温记忆 | `docs/*.md` | 进入对应领域**之前**必须工具调用读取 | `cat docs/xxx.md`            |
| L3   | 冷记忆 | `src/` 源码 | 需要确认精确实现细节时               | `cat` 或 `codegraph_explore` |

**强制刷新规则**：修改 FSM / DB / UI 组件 / 后端服务相关代码前，必须先执行对应的 L2 工具调用。否则严禁生成任何代码。

---

## FSM 设计规则

> **[强制工具调用] 修改 FSM 前，执行 `cat docs/架构与技术文档.md | grep -A 50 "FSM"` 刷新完整状态图，并在 `src/machines/cooking-machine.ts` 中确认当前转换边。严禁凭记忆新增状态或事件。**

---

## 数据库约定

- ID 生成统一使用 `generateUuid()`（`src/utils/uuid.ts`，uuid v4），禁止 `Date.now() + Math.random()`
- 多表写入必须包裹 `withTransaction()`（`src/db/transaction.ts`）
- `cook_sessions` 表为 V2 预留，V1 只写不读

> **[强制工具调用] 修改 DB 相关代码前，执行 `cat docs/架构与技术文档.md | grep -A 80 "本地存储"` 刷新完整 Schema。**

---

## 编码规范

> **[强制工具调用] 任何 UI 代码生成前，必须执行 `cat docs/Phase-D-UI规范.md` 刷新完整规范。**
> 本文件不提供任何 UI 规范摘要。图标选择、颜色 token、动画细节、空状态插画、Button variant、安全区域的全部权威定义在 L2 文档中。

---

## 后端服务 & 端口

> **[强制工具调用] 修改服务调用/端口/网络相关代码前，执行 `cat docs/运行与打包指南.md` 刷新端口转发和真机配置。**

---

## 语音交互

> **[强制工具调用] 修改语音交互代码前，执行 `cat docs/STT-实现备忘.md` 和 `cat docs/TTS-实现备忘.md` 刷新管线细节。**

---

## 🔴 质量红线（代码生成的最后一道闸）

**代码生成完成后，必须依次运行以下命令。有任何报错，原地重构直到完全通过：**

```bash
yarn lint          # ESLint 零 error、零 warning
npx tsc --noEmit   # TypeScript 严格模式零错误
yarn format:check  # Prettier 零格式差异
yarn test:all      # 单测 + e2e 全部通过
```

**Linter 未通过的代码严禁生成 Commit。违反即回滚。**

---

## Git 工作流

> 采用 **GitHub Flow**：`main` 始终可部署。

### 提交信息规范

首行格式：`<type>: <简短描述>`，type 仅限 `feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `style`。

### 分支规范

- 分支名用 `feat/` / `fix/` / `chore/` 前缀 + kebab-case，不用中文

---

## 关键文档索引（L2 温记忆入口）

| 文档                     | 触发条件（**必须**先工具调用读取）                |
| ------------------------ | ------------------------------------------------- |
| `docs/架构与技术文档.md` | 修改 FSM / 数据库 / 技术栈 / 数据流之前           |
| `docs/Phase-D-UI规范.md` | 新增图标/颜色 token/动画/插画/Button variant 之前 |
| `docs/运行与打包指南.md` | 修改网络请求/服务地址/打包配置/**依赖**之前       |
| `docs/STT-实现备忘.md`   | 修改录音/VAD/关键词匹配/语音命令相关代码之前      |
| `docs/TTS-实现备忘.md`   | 修改播放器/Provider/预缓存/TTS 相关代码之前       |
| `README.md`              | 首次进入项目或新人 onboarding                     |
| `ROADMAP.md`             | 需要了解项目阶段、规划新功能之前                  |
