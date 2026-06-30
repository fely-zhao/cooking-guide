# 厨房 AI 副厨

> React Native 移动端 App — 耳机为主交互，AI 语音引导完成烹饪每一步。

输入你的菜谱（文本 / 图片 / URL / 语音），AI 自动解析为结构化步骤。烹饪时全程本地 FSM 驱动，不用看手机，听耳机指令即可——自动计时、主动提醒、语音问答，像有个真人在旁边一步步教你。

---

## 核心特性

- **12 种录入方式** — 文本、图片（OCR）、网页 URL、语音、自由格式全部支持，AI 一次性解析为带标签的结构化步骤
- **全程本地 FSM 驱动** — 大模型仅在录入时调用一次，烹饪中 100% 本地状态机控制，零网络依赖
- **耳机主交互** — 语音播报每一步、主动提醒翻面/关火，用户语音确认推进流程
- **四级交互降级** — 耳机 > 语音 > 屏幕按钮 > 挥手手势，自动检测可用设备
- **计时器自动提醒** — 带计时器的步骤到点 AI 主动语音提醒（如"该关火了"）
- **离线优先** — 所有数据存本地 SQLite，不依赖云端

---

## 技术栈

| 层       | 选型                                             |
| -------- | ------------------------------------------------ |
| 框架     | React Native 0.86                                |
| 语言     | TypeScript（严格模式）                           |
| 状态机   | XState v5                                        |
| 本地存储 | SQLite（op-sqlite）                              |
| 导航     | React Navigation 6                               |
| 动画     | react-native-reanimated 4.4                      |
| 图标     | react-native-svg（18 个 SVG 图标）               |
| LLM      | DeepSeek V4 Flash（function calling 结构化解析） |
| TTS      | MiniMax Speech-02 Turbo（本地代理转发）          |
| STT      | faster-whisper（独立 Python 服务）               |

---

## 快速开始

### 前置条件

- **Windows 10/11**（当前仅支持 Windows 开发环境）
- **Node.js** ≥ 22.11.0
- **Yarn**（包管理统一使用 yarn，不混用 npm）
- **Android Studio** + Android SDK（模拟器或真机调试）
- **Python 3.10+**（STT 服务依赖）
- 三个本地后端服务的源码目录（见下方）

### 1. 克隆并安装

```powershell
# 在 Windows PowerShell 中执行（不要在 WSL 中）
git clone <repo-url>
cd cooking-guide
yarn install
```

### 2. 启动后端服务

App 依赖三个本地后端服务。推荐一键启动：

```powershell
# 双击项目根目录下的 start-services.bat
# 或在 PowerShell 中：
.\scripts\start-services.ps1
```

首次运行会自动创建 venv 并安装 Python 依赖。按任意键统一关闭所有服务。

| 服务                         | 端口 | 用途         |
| ---------------------------- | ---- | ------------ |
| STT（Python faster-whisper） | 5000 | 语音转文字   |
| TTS（Node.js Windows SAPI）  | 4000 | 文字转语音   |
| LLM（Node.js DeepSeek 代理） | 3001 | LLM API 转发 |

### 3. 启动 Metro + 编译

```powershell
# 启动 Metro
yarn start

# 新开一个 PowerShell 窗口，编译安装到模拟器
$env:SKIP_IOS="true"; yarn android
```

### 4. ADB 端口转发

```powershell
# 模拟器通过 adb reverse 访问宿主机后端
node scripts/adb-reverse.js
```

### 5. 真机独立打包

无需插电脑，打包 APK 安装到手机（手机和电脑需在同一 WiFi）：

1. 修改 `src/config.ts` 中的服务地址为电脑局域网 IP
2. `cd android && .\gradlew assembleRelease`
3. 将 `android/app/build/outputs/apk/release/app-release.apk` 安装到手机

> 详细步骤见 [`docs/运行与打包指南.md`](docs/运行与打包指南.md)

---

## 项目结构

```
cooking-guide/
├── src/
│   ├── components/     # UI 组件（Button, Card, HeaderBar, Icon, Modal 等 22 个）
│   ├── screens/         # 页面级别组件（11 个屏幕）
│   ├── machines/        # XState v5 FSM 定义（烹饪引导状态机）
│   ├── services/        # 外部服务调用（TTS, STT, LLM API）
│   ├── db/              # SQLite 数据库操作（op-sqlite）
│   ├── hooks/           # 自定义 React Hooks
│   ├── theme/           # 设计 token（38 个颜色 + spacing + typography）
│   ├── utils/           # 通用工具函数
│   └── types/           # TypeScript 类型定义
├── android/             # Android 原生代码
├── ios/                 # iOS 原生代码（开发中）
├── docs/                # 详细技术文档
├── scripts/             # 辅助脚本（启动服务、ADB 转发等）
└── App.tsx              # 应用入口
```

---

## 开发指南

### 编码约束速查

- 包管理统一使用 **yarn**
- 文件名使用 **kebab-case**
- 样式使用 `StyleSheet.create()`，颜色使用语义化 token（`src/theme/colors.ts`）
- 图标使用 `<Icon name="..." />`（18 个 SVG 图标），禁止 emoji
- 动画使用 react-native-reanimated，禁止 RN 内置 Animated API
- 空/错误状态使用插画组件（`EmptyRecipeIllustration` 等），禁止纯文字占位
- 加载状态使用骨架屏组件，禁止"加载中..."裸文本
- 密钥/token 不进代码、不进 commit
- FSM 状态转换图、数据库 schema 不可随意改动

> 完整编码规范见 [`CLAUDE.md`](CLAUDE.md)

### 常用命令

| 命令                | 说明                             |
| ------------------- | -------------------------------- |
| `yarn start`        | 启动 Metro 开发服务器            |
| `yarn android`      | 编译安装到 Android 模拟器/真机   |
| `yarn test`         | 运行 bun 单元测试                |
| `yarn test:e2e`     | 运行 Jest e2e 测试（烹饪全流程） |
| `yarn test:all`     | 顺序运行所有测试                 |
| `yarn lint`         | ESLint 代码检查                  |
| `yarn format`       | Prettier 格式化                  |
| `yarn format:check` | Prettier 格式检查                |
| `npx tsc --noEmit`  | TypeScript 类型检查              |

### 关键架构原则

1. **大模型不参与实时决策** — 录入时处理一次结构化解析，烹饪时全程本地 FSM 驱动
2. **API 代理不存数据** — 后端仅做转发 + 隐藏密钥，所有数据在本地 SQLite
3. **四级交互降级** — 耳机 > 语音 > 屏幕按钮 > 挥手手势，自动检测可用设备

> 详细架构见 [`docs/架构与技术文档.md`](docs/架构与技术文档.md)

---

## 文档索引

| 文档                                               | 内容                                | 读者        |
| -------------------------------------------------- | ----------------------------------- | ----------- |
| [`CLAUDE.md`](CLAUDE.md)                           | 编码规范、架构约束、AI 代理工作指引 | 贡献者 / AI |
| [`ROADMAP.md`](ROADMAP.md)                         | 当前进度、已完成任务、路线图        | 所有人      |
| [`docs/架构与技术文档.md`](docs/架构与技术文档.md) | 完整架构、FSM 状态图、DB Schema     | 开发者      |
| [`docs/Phase-D-UI规范.md`](docs/Phase-D-UI规范.md) | 图标/动画/插画/配色/Button 视觉规范 | UI 开发者   |
| [`docs/运行与打包指南.md`](docs/运行与打包指南.md) | 启动方式、端口转发、真机配置        | 所有开发者  |
| [`docs/STT-实现备忘.md`](docs/STT-实现备忘.md)     | STT 管线实现细节                    | 语音开发者  |
| [`docs/TTS-实现备忘.md`](docs/TTS-实现备忘.md)     | TTS 管线实现细节                    | 语音开发者  |

---

## 当前状态

- **源文件** ~125 TS/TSX，~12000 行
- **屏幕** 11 个，**共享组件** 28 个
- **后端服务** STT ✅ / TTS ✅ / LLM ✅
- **Phase A–D** 全部完成
- **Phase 4 UI 微交互与打磨** 已完成：按压反馈、Haptic、列表动画、玻璃底栏、烹饪熄屏阻止
- **测试环境** 已修复：`yarn test` / `yarn test:e2e` / `yarn test:all` 全部通过
- **V2 规划中**：双菜并行、BLE 耳机按键、手势控制

> 完整进度见 [`ROADMAP.md`](ROADMAP.md)
