# UI 改造方案

> 方向：FireVibe 式温暖编辑风 —— "像周日早晨翻阅一本温暖的 Bon Appétit"
> 状态：Phase 3 已完成；全部 7 个屏幕已按 FireVibe 温暖编辑风重设计；下一步 Phase 4

---

## 1. 设计方向

### 整体气质

- **温暖、诱人、编辑感**：像精装数字 cookbook，不是效率工具
- **食物摄影/大图优先**：每张菜谱都是一张小封面
- **衬线标题 + 无衬线正文**：杂志排版感
- **大圆角、柔和阴影、大量留白**：不锐利、不冰冷
- **克制用色**：奶油背景 + 赤陶 CTA + 橄榄绿辅助

### 参考来源

- [FireVibe Recipes & Cooking Template](https://www.firevibe.ai/templates/recipes-cooking)
- [NYT Cooking 截图集](https://screensdesign.com/showcase/nyt-cooking-recipes-tips)
- [Kitchen Stories 截图集](https://screensdesign.com/showcase/kitchen-stories-easy-recipes)

---

## 2. 设计 Token（初定）

### 颜色

| Token             | 色值                 | 用途                       |
| ----------------- | -------------------- | -------------------------- |
| `background`      | `#FAF4EC`            | 页面背景，未涂布纸感奶油色 |
| `surface`         | `#FFFFFF`            | 卡片、面板                 |
| `surfaceElevated` | `#FDF8F1`            | 浮层面板                   |
| `primary`         | `#BF5A36`            | 主按钮、active、强调       |
| `primaryLight`    | `#F7E8E0`            | 主色浅底                   |
| `secondary`       | `#6B7A45`            | 成功、标签、计时状态       |
| `secondaryLight`  | `#E8EBE0`            | 辅助色浅底                 |
| `accent`          | `#C67B3C`            | 焦糖/蜂蜜强调              |
| `danger`          | `#B94E48`            | 危险操作                   |
| `warning`         | `#D4A056`            | 警告、计时提醒             |
| `text.primary`    | `#2A211C`            | 主文字，暖黑               |
| `text.secondary`  | `#5C5048`            | 次要文字                   |
| `text.muted`      | `#9A8E84`            | 说明文字                   |
| `text.inverse`    | `#FFFFFF`            | 深色底上的文字             |
| `overlay`         | `#2A211C`            | 覆盖层底色                 |
| `overlay40`       | `rgba(42,33,28,0.4)` | Modal 背景                 |
| `overlay50`       | `rgba(42,33,28,0.5)` | 深色覆盖                   |
| `border`          | `#E8E0D6`            | 边框                       |
| `borderLight`     | `#F0EAE2`            | 浅色分隔                   |

### 字体

| 用途                     | 字体                      | 说明                 |
| ------------------------ | ------------------------- | -------------------- |
| 大标题 / 菜谱名 / 步骤号 | **Playfair Display**      | 优雅衬线，杂志标题感 |
| 正文 / 按钮 / 标签       | **Inter**                 | 清晰现代无衬线       |
| 计时器数字               | **Inter**（tabular nums） | 等宽数字，倒计时稳定 |

### 圆角

| Token         | 值       | 用途             |
| ------------- | -------- | ---------------- |
| `radius.sm`   | `8px`    | 小标签、输入框   |
| `radius.md`   | `12px`   | 按钮、小卡片     |
| `radius.lg`   | `18px`   | 大卡片、图片     |
| `radius.xl`   | `24px`   | Hero 卡片、Modal |
| `radius.full` | `9999px` | 圆形按钮、头像   |

### 阴影

新增 `src/theme/shadows.ts`：

```ts
export const shadows = {
  sm: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  float: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
};
```

---

## 3. 屏幕改造清单

### HomeScreen

- 顶部：小字问候 + 大号衬线标题 `"今天想做什么？"`
- 中央：Featured Hero 卡片（大图/渐变 + 菜名 + "开始烹饪"）
- 下方：2×2 Bento 快捷入口（最近 / 录入 / 收藏 / 设置）
- 进入动画：标题淡入 + 卡片 stagger

### RecipeListScreen

- 顶部：衬线标题 `"我的菜谱"`
- 列表：第一项 Featured 大卡片，后续 Compact 双列卡片
- 卡片信息：封面图/渐变 + 菜名（Playfair Display）+ 时间/份量标签
- 新增横向分类筛选条
- 右下角 FAB 替代右上角 "+" 按钮
- 列表项 `FadeIn` 进入动画

### RecipeDetailScreen

- 顶部 260px Hero：大图/渐变 + 白色衬线标题覆盖
- 食材：双栏卡片 + checkbox 备料模式
- 步骤：大号衬线步骤号 + `<Badge>` 标签
- 底部：玻璃质感操作栏（深色底 + 主色 CTA）

### CookingScreen

- 深色沉浸背景（`#2A211C`）
- 超大衬线步骤号 + 22px 步骤文案
- 顶部 transcript bar 显示最近语音指令
- 琥珀色/金色计时环，随状态变色
- 大按钮控制区，适合余光操作
- 完成态：SVG 粒子 + haptic + TTS 庆祝

### RecipeEditScreen

- 食材行：数量 | 单位 | 名称 | 删除，拖拽排序
- 步骤卡片化：tag 选择器 + 计时器快捷选择
- 封面占位改为杂志式图片区域
- 头部、底部保存栏统一风格

### RecipeInputScreen

- 4 种录入方式改为 2×2 Bento 大卡片
- 统一使用 `<HeaderBar>`

### SettingsScreen

- 分组卡片化
- 统一开关、单选、步进器风格

---

## 4. 分阶段执行计划

### Phase 1：设计系统底座

**预计耗时**：2–3 小时

- [x] 更新 `src/theme/colors.ts`（新暖调编辑色）
- [x] 更新 `src/theme/typography.ts`（Playfair Display + Inter）
- [x] 新增 `src/theme/shadows.ts`
- [x] 引入字体文件并配置 Android / iOS
- [x] 更新 `docs/Phase-D-UI规范.md`

### Phase 2：组件统一与债务清理

**预计耗时**：3–4 小时

- [x] 所有屏幕使用 `<HeaderBar>`
- [x] `InteractionControls` 全部按钮改用 `<Button>`
- [x] `RecipeDetailScreen` 内联 badge 改用 `<Badge>`
- [x] `SkeletonBox` / `VoiceInputScreen` 从 RN `Animated` 迁到 `react-native-reanimated`
- [x] `CookingScreen` 庆祝 emoji 替换为 SVG 粒子动画
- [x] 清理硬编码 `rgba()`（Modal / Overlay / ActionSheet 背景色已全部 token 化）
- [x] 清理硬编码 `fontSize`
- [x] 新增 `<MagazineCard>` / `<IconButton>` / `<StepNumber>` / `<TranscriptBar>` 组件

### Phase 3：屏幕重设计

**预计耗时**：6–8 小时

- [x] HomeScreen 改造
- [x] RecipeListScreen 改造
- [x] RecipeDetailScreen 改造
- [x] CookingScreen 改造
- [x] RecipeEditScreen 改造
- [x] RecipeInputScreen 改造
- [x] SettingsScreen 改造

### Phase 4：微交互与打磨

**预计耗时**：2–3 小时

- [x] 所有可点击元素加按压反馈
- [x] 关键操作加 Haptic 反馈
- [x] 列表进入动画
- [x] 玻璃质感底部栏
- [x] 烹饪屏幕阻止熄屏

---

## 5. 验收标准

- [x] `yarn lint` 通过
- [x] `yarn typecheck` 通过（`npx tsc --noEmit`）
- [x] 无硬编码 `#xxxxxx` / `rgba()` / `fontSize` 数字（仅 `colors.ts` / `shadows.ts` / `typography.ts` 定义）
- [x] 无 emoji 作为 UI 元素
- [x] 所有动画使用 `react-native-reanimated`
- [x] 所有屏幕使用 `<HeaderBar>`，核心按钮使用 `<Button>`
- [x] `docs/Phase-D-UI规范.md` 已同步更新

---

## 6. 注意事项

- **图片**：封面区先用渐变/插画占位，暂不做真实图片选择器
- **暗色模式**：本次只预留 token 结构，完整暗色模式后续再做
- **FSM / DB / 业务逻辑**：不改
- **颜色 hex**：实现中可微调，但整体方向不变

---

## 7. 进度日志

| 日期       | 阶段     | 完成内容                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-23 | Phase 1  | 完成设计系统底座：`colors.ts` 暖调编辑色、`typography.ts` Playfair Display + Inter、`shadows.ts`、Android/iOS 字体配置、`Phase-D-UI规范.md` 同步                                                                                                                                                                                                                                                                                                              |
| 2026-06-23 | 债务清理 | 修复 3 个既有类型错误（`Button.tsx` ReactNode 导入、`useTtsPreCache.ts` 状态匹配、`uuid.ts` 类型声明）；`Button.tsx` 全 lint 问题清零                                                                                                                                                                                                                                                                                                                         |
| 2026-06-23 | 债务清理 | 全项目 lint / type / prettier 清理：161 → 0 个问题；拆分 `stt.ts` Android 权限到 `permissions.android.ts` / `permissions.ios.ts`；新增 `overlay30` token                                                                                                                                                                                                                                                                                                      |
| 2026-06-23 | Phase 2  | 组件统一与债务清理：全 11 屏统一 `<HeaderBar>`；`<InteractionControls>` / `<RecipeDetailScreen>` 改用 `<Button>` / `<Badge>` / `<StepNumber>`；`SkeletonBox` / `VoiceInputScreen` 迁到 reanimated；CookingScreen 庆祝 emoji 替换为 SVG；清理全部硬编码 `fontSize`；新增 `IconButton` / `StepNumber` / `TranscriptBar` / `MagazineCard`；同步 `Phase-D-UI规范.md`                                                                                              |
| 2026-06-23 | Phase 3  | 屏幕重设计：HomeScreen Hero + Bento；RecipeListScreen MagazineCard 列表 + 分类筛选 + FAB；RecipeDetailScreen 260px Hero + 双栏食材备料 + 大号步骤号 + 玻璃底栏；CookingScreen 深色沉浸模式 + 248px 计时环 + TranscriptBar；RecipeEditScreen 杂志封面占位 + 可拖拽食材卡片 + 卡片化步骤 + 计时器快捷预设；RecipeInputScreen 2×2 Bento 录入卡片；SettingsScreen 分组卡片化；新增 `DraggableIngredient`；`TranscriptBar` / `InteractionControls` 扩展 style 属性 |
| 2026-06-23 | Phase 4  | 微交互与打磨：新增 `PressableScale` 按压反馈组件、`haptic.ts` 触觉反馈、`useKeepAwake` 阻止熄屏；Button/IconButton/MagazineCard/TranscriptBar/分类筛选/食材卡片/设置控件全部接入按压反馈与 Haptic；RecipeListScreen 列表动画优化；RecipeDetailScreen 玻璃底栏加 iOS BlurView；CookingScreen 烹饪中阻止熄屏 + 完成/提醒 Haptic；新增 haptic / useKeepAwake 单元测试                                                                                            |

## 8. 开工指令

UI 改造方案全部四个阶段已完成。
