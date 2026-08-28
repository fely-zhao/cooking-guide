# Phase D UI 规范

> 本文档定义 Phase D UI 视觉升级后的编码规范，后续所有 UI 代码必须遵循。

---

## 0. 设计哲学

### 整体气质

温暖、诱人、编辑感 —— 像精装数字 cookbook，不是效率工具。

- **食物摄影 / 大图优先**：每张菜谱都是一张小封面
- **衬线标题 + 无衬线正文**：杂志排版感
- **大圆角、柔和阴影、大量留白**：不锐利、不冰冷
- **克制用色**：奶油背景（`background: #FAF4EC`）+ 赤陶 CTA（`primary: #BF5A36`）+ 橄榄绿辅助（`secondary: #6B7A45`）

### 参考来源

- [FireVibe Recipes & Cooking Template](https://www.firevibe.ai/templates/recipes-cooking)
- [NYT Cooking 截图集](https://screensdesign.com/showcase/nyt-cooking-recipes-tips)
- [Kitchen Stories 截图集](https://screensdesign.com/showcase/kitchen-stories-easy-recipes)

---

## 1. 状态栏安全区域

### 原则

> **所有内容不得进入系统状态栏区域** — 状态栏必须始终可见、无遮挡，内容从状态栏底部开始布局。

由于 App 使用 `StatusBar translucent`（状态栏浮于内容之上），各页面须自行处理安全区域。

### 实现方式

**常规流内容** — 使用 `SafeAreaContainer` 组件包裹页面根节点：

```tsx
import { SafeAreaContainer } from '../components/SafeAreaContainer';

export default function MyScreen() {
  return <SafeAreaContainer>{/* 所有内容自动避开状态栏 */}</SafeAreaContainer>;
}
```

`SafeAreaContainer` 内部通过 `useSafeAreaInsets()` 读取设备状态栏高度，自动在 `paddingTop` 中补偿。

**绝对定位元素** — 如果页面内有 `position: 'absolute'` 的浮动元素（如 HomeScreen 的设置按钮），必须以 `useSafeAreaInsets()` 计算 `top` 值：

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaContainer>
      <Animated.View style={[styles.floatingButton, { top: insets.top + spacing.sm }]}>
        {/* ... */}
      </Animated.View>
    </SafeAreaContainer>
  );
}
```

禁止使用固定数值（如 `top: spacing.sm`、`top: 8`）作为绝对定位元素的 `top`，必须加上 `insets.top`。

### 规范

- **所有页面必须使用 `SafeAreaContainer` 作为根节点**（或等效安全区域方案），不得裸 `View` 作为页面容器
- **绝对定位元素**的 `top` 必须通过 `insets.top` 补偿，禁止硬编码固定值
- **Modal / Overlay** 如果全屏展示，同样需要处理安全区域（通过 `SafeAreaContainer` 或 `insets`）
- 此约束在代码审查中发现遗漏即视为不合格，须修改后方可合并

---

## 2. 图标系统

### 使用方式

```tsx
import { Icon } from '../components/icons';
import type { IconName } from '../components/icons';

<Icon name="cooking" size={24} color={colors.primary} />;
```

### 可用图标（25 个）

| 名称            | 用途          |
| --------------- | ------------- |
| `cooking`       | 菜谱封面占位  |
| `book`          | 菜谱/文档相关 |
| `text-input`    | 手动录入入口  |
| `camera`        | 拍照/图片录入 |
| `link`          | 链接导入      |
| `microphone`    | 语音录入      |
| `ai`            | AI 功能相关   |
| `warning`       | 警告/错误提示 |
| `check`         | 确认/完成     |
| `repeat`        | 重播/重复     |
| `chat`          | 提问/对话     |
| `celebration`   | 完成庆祝      |
| `close`         | 关闭/清除     |
| `next`          | 下一步        |
| `headphones`    | 耳机相关      |
| `timer`         | 计时器        |
| `parallel`      | 双菜并行      |
| `offline`       | 离线/本地     |
| `drag`          | 拖拽排序手柄  |
| `plus`          | 添加 / FAB    |
| `chevron-right` | 向右展开      |
| `chevron-left`  | 返回          |
| `play`          | 开始烹饪/播放 |
| `settings`      | 设置          |
| `sparkle`       | 庆祝粒子      |

### 规范

- **禁止新增 emoji 作为图标** — 所有 UI 图标必须用 `<Icon>` 组件
- 默认 size 为 `24`，color 默认 `currentColor`，应显式传入 theme token
- 新图标：在 `src/components/icons/` 下创建 SVG 组件（参考现有 `CookingIcon.tsx`），在 `Icon.tsx` 的 `ICON_MAP` 中注册，在 `index.ts` 中导出

---

## 3. 配色 Token

### 使用方式

```tsx
import { colors } from '../theme/colors';

// 禁止硬编码 #xxxxxx
style={{ backgroundColor: colors.primary, color: colors.text.inverse }}
```

### Token 清单

| 类别         | Token                   | 色值                 | 用途                       |
| ------------ | ----------------------- | -------------------- | -------------------------- |
| 背景/Surface | `background`            | `#FAF4EC`            | 页面背景，奶油色           |
|              | `surface`               | `#FFFFFF`            | 卡片、面板                 |
|              | `surfaceFill`           | `#F5EFE7`            | 次级填充、开关轨道关闭态   |
|              | `surfaceFillLight`      | `#FAF6F1`            | 更浅的填充                 |
|              | `surfaceElevated`       | `#FDF8F1`            | 浮层面板                   |
| Primary      | `primary`               | `#BF5A36`            | 主按钮、active、强调       |
|              | `primaryLight`          | `#F7E8E0`            | 主色浅底                   |
|              | `primaryBorder`         | `#EAD0C6`            | 主色边框                   |
|              | `primarySurface`        | `#FAF0EC`            | 主色浅表面                 |
| Secondary    | `secondary`             | `#6B7A45`            | 成功、标签、计时状态       |
|              | `secondaryLight`        | `#E8EBE0`            | 辅助色浅底                 |
| Success      | `success`               | `#6B7A45`            | 成功状态                   |
|              | `successLight`          | `#E8EBE0`            | 成功浅底                   |
|              | `successSurface`        | `#F4F6EF`            | 成功浅表面                 |
| Danger       | `danger`                | `#B94E48`            | 危险操作                   |
|              | `dangerLight`           | `#F8EAE9`            | 危险浅底                   |
|              | `dangerSurface`         | `#FBF3F2`            | 危险浅表面                 |
| Warning      | `warning`               | `#D4A056`            | 警告、计时提醒             |
|              | `warningLight`          | `#F9EFDC`            | 警告浅底                   |
|              | `warningSurface`        | `#FDF8F0`            | 警告浅表面                 |
| 强调         | `accent`                | `#C67B3C`            | 焦糖/蜂蜜强调              |
|              | `purple`                | `#8B6A4B`            | 暖褐强调（旧 purple 迁移） |
|              | `teal`                  | `#6B7A45`            | 橄榄强调（旧 teal 迁移）   |
|              | `orange`                | `#C67B3C`            | 焦糖强调（旧 orange 迁移） |
| 文字         | `text.primary`          | `#2A211C`            | 主文字                     |
|              | `text.secondary`        | `#5C5048`            | 次要文字                   |
|              | `text.muted`            | `#9A8E84`            | 说明文字                   |
|              | `text.disabled`         | `#C4B8AE`            | 禁用文字                   |
|              | `text.placeholder`      | `#B0A499`            | 占位文字                   |
|              | `text.inputPlaceholder` | `#B0A499`            | 输入框占位                 |
|              | `text.lighter`          | `#A89E94`            | 更淡文字                   |
|              | `text.inverse`          | `#FFFFFF`            | 深色底上的文字             |
| 边框         | `border`                | `#E8E0D6`            | 边框                       |
|              | `borderLight`           | `#F0EAE2`            | 浅色分隔                   |
|              | `divider`               | `#E8E0D6`            | 分隔线                     |
| 覆盖/其他    | `overlay`               | `#2A211C`            | 覆盖层底色                 |
|              | `overlay30`             | `rgba(42,33,28,0.3)` | 浅覆盖                     |
|              | `overlay40`             | `rgba(42,33,28,0.4)` | Modal 背景                 |
|              | `overlay50`             | `rgba(42,33,28,0.5)` | 深色覆盖                   |
|              | `transparent`           | `transparent`        | 透明背景                   |
|              | `tagBackground`         | `#F0EAE2`            | 标签背景                   |
|              | `stepIndicatorActive`   | `#BF5A36`            | 步骤指示器激活             |
|              | `stepIndicatorInactive` | `#D9CFC5`            | 步骤指示器未激活           |
|              | `progressTrack`         | `#E8E0D6`            | 进度条轨道                 |
|              | `skeleton`              | `#F0EAE2`            | 骨架屏底色                 |

### 规范

- **禁止 `#xxxxxx` / `rgba()` 字面量** — 所有颜色必须来自 `colors` token
- **新增颜色**：先在 `colors.ts` 添加语义化 token，再在组件中使用。不要在组件中临时硬编码
- 暗色模式预留：未来 `colors.ts` 将拆分为 `lightColors`/`darkColors` 双对象，保持 key 结构不变

---

## 4. 字体

### 字体族

| 用途                     | 字体                  | React Native `fontFamily`                            |
| ------------------------ | --------------------- | ---------------------------------------------------- |
| 大标题 / 菜谱名 / 步骤号 | **Playfair Display**  | `PlayfairDisplay-Bold`                               |
| 正文 / 按钮 / 标签       | **Inter**             | `Inter-Regular` / `Inter-Medium` / `Inter-SemiBold`  |
| 计时器数字               | **Inter**（等宽数字） | `Inter-ExtraLight` + `fontVariant: ['tabular-nums']` |

> 说明：Playfair Display 静态字重仅提供 Regular / Bold，因此 `h1`–`h4` 统一使用 `PlayfairDisplay-Bold`；需要较细视觉时可配合 `fontWeight`。

### 排版 Token

```tsx
import { typography } from '../theme/typography';

typography.h1; // Playfair Display Bold, 28/36
typography.h2; // Playfair Display Bold, 24/32
typography.h3; // Playfair Display Bold, 20/28
typography.h4; // Playfair Display Bold, 18/24
typography.body; // Inter Regular, 15/22
typography.bodySmall;
typography.caption;
typography.captionSmall;
typography.badge;
typography.button; // Inter SemiBold, 16/22
typography.header; // Inter SemiBold, 17/24
typography.timer; // Inter ExtraLight + tabular-nums, 48/56
```

### 规范

- 所有文字样式必须来自 `typography` token，禁止硬编码 `fontSize`
- 衬线标题使用 `PlayfairDisplay-Bold`，无衬线正文/按钮/标签使用对应 Inter 字重
- 新增字重需先确认字体文件已在 `android/app/src/main/assets/fonts/` 和 `ios/<AppName>/fonts/` 中就位，并在 `Info.plist` `UIAppFonts` / Xcode `Resources` 中注册

---

## 5. 圆角

### Token

| Token         | 值     | 用途             |
| ------------- | ------ | ---------------- |
| `radius.sm`   | `8`    | 小标签、输入框   |
| `radius.md`   | `12`   | 按钮、小卡片     |
| `radius.lg`   | `18`   | 大卡片、图片     |
| `radius.xl`   | `24`   | Hero 卡片、Modal |
| `radius.full` | `9999` | 圆形按钮、头像   |

### 规范

- 圆角统一使用 `spacing.radius.*`，禁止硬编码数字
- 保留 `radius.xs` / `radius.xxl` 用于骨架屏/细微场景，未来逐步收敛

---

## 6. 阴影

### 使用方式

```tsx
import { shadows } from '../theme/shadows';

style={{ ...shadows.md, backgroundColor: colors.surface }}
```

### Token

| Token           | 说明                      |
| --------------- | ------------------------- |
| `shadows.sm`    | 轻微阴影，用于小卡片/标签 |
| `shadows.md`    | 标准阴影，用于按钮/卡片   |
| `shadows.lg`    | 明显阴影，用于大卡片/图片 |
| `shadows.float` | 强阴影，用于 FAB / Modal  |

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

### 规范

- 阴影统一来自 `shadows` token，禁止在组件中手写 `shadowColor` / `elevation`
- 暖调阴影色 `#2A211C` 与文字/覆盖层同色，保持视觉一致

---

## 7. 动画

### 页面转场

```tsx
// AppNavigator.tsx screenOptions 已全局配置
// 所有页面自动 slide_from_right，无需手动配置
animation: 'slide_from_right',
animationDuration: 300,
```

### 按钮反馈

```tsx
// Button 组件已内置 reanimated 缩放反馈，无需额外处理
// onPressIn → withSpring(0.97) → onPressOut → withSpring(1)
// 动画在组件内部实现，不影响 flex 布局
```

### 组件内动画

使用 `react-native-reanimated`（已安装 v4.4.1）：

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

// 进入/退出动画
<Animated.Text entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
  {text}
</Animated.Text>;

// 自定义动画
const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));
```

### 规范

- **全部使用 reanimated** — 弃用 RN 内置 `Animated` API（`Animated.Value`、`Animated.timing`）
- **只用 native-driver 属性**：`opacity`、`transform`（scale/rotate/translate），禁止动画 `width`/`height`
- **页面转场**：在 `AppNavigator.tsx` 的 `screenOptions` 中统一配置，不要在单个屏幕中自定义
- **按钮反馈**：统一使用 `Button` 组件，不要手写 `TouchableOpacity` 动画
- **步骤过渡**：使用 `FadeIn`/`FadeOut` 或 `entering`/`exiting` props

---

## 8. 空/错误状态插画

### 可用组件

```tsx
import { EmptyRecipeIllustration } from '../components/illustrations';
import { ErrorIllustration } from '../components/illustrations';
import { NotFoundIllustration } from '../components/illustrations';

// 空列表
<EmptyRecipeIllustration size={120} />

// 全局错误
<ErrorIllustration size={80} />

// 内容不存在
<NotFoundIllustration size={100} />
```

### 使用场景

| 组件                      | 场景                         |
| ------------------------- | ---------------------------- |
| `EmptyRecipeIllustration` | 列表为空、无数据             |
| `ErrorIllustration`       | 全局 ErrorBoundary、网络错误 |
| `NotFoundIllustration`    | 资源不存在、404              |

### 规范

- **禁止 emoji 占位** — 所有空/错误/未找到状态必须使用插画组件
- **禁止纯文本占位** — 必须有插画 + 文字说明 + 操作按钮（如有）
- 新插画：在 `src/components/illustrations/` 下创建，使用 `react-native-svg` 几何图形，props 仅 `{ size?: number }`

---

## 9. Button 组件

### 使用方式

```tsx
import { Button } from '../components/Button';

// 标准按钮
<Button title="开始烹饪" onPress={handleStart} variant="primary" />

// 带图标
<Button
  title="AI 优化步骤"
  onPress={handleAi}
  variant="secondary"
  icon={<Icon name="ai" size={18} color={colors.primary} />}
/>

// 禁用 + 加载
<Button title="提交" onPress={handleSubmit} disabled loading />
```

### Variant

| variant     | 用途     | 视觉                                 |
| ----------- | -------- | ------------------------------------ |
| `primary`   | 主操作   | 赤陶底（`colors.primary`）+ 白字     |
| `secondary` | 次要操作 | 暖灰底（`colors.surfaceFill`）+ 深字 |
| `outline`   | 边框按钮 | 透明底 + 赤陶字/边框                 |
| `success`   | 成功操作 | 橄榄绿底（`colors.success`）+ 白字   |
| `danger`    | 危险操作 | 砖红底（`colors.danger`）+ 白字      |
| `text`      | 文字按钮 | 透明底 + 赤陶字                      |

### 规范

- **禁止手写带样式的 TouchableOpacity** — 统一使用 `Button` 组件
- **icon prop** 渲染在文字左侧，自动处理间距
- **flex 布局**：Button 支持 `style={{ flex: 1 }}`，内部动画不阻断 flex
- 按钮文本统一使用 `title` prop，不要在 `children` 中自定义内容

---

## 10. 其他共享组件

### `HeaderBar`

```tsx
import { HeaderBar } from '../components/HeaderBar';

<HeaderBar title="我的菜谱" variant="large" subtitle="语音引导，专心做菜" />
<HeaderBar title="手动录入" onBack={navigation.goBack} rightAction={<Button title="完成" variant="text" />} />
```

- 所有屏幕统一使用，禁止内联 header。
- Props：`title`, `subtitle?`, `variant?: 'default' | 'large'`, `onBack?`, `rightAction?`。
- `default`：紧凑横向布局，`typography.h4`。
- `large`：垂直居中布局，`typography.h1` + `typography.body` subtitle，无底部边框。

### `IconButton`

```tsx
import { IconButton } from '../components/IconButton';

<IconButton name="plus" variant="primary" onPress={handleAdd} />;
```

- 圆形图标按钮，内置 reanimated 按压缩放。
- Props：`name`, `onPress`, `size?`, `color?`, `variant?: 'default' | 'primary' | 'secondary' | 'danger'`, `disabled?`, `style?`。

### `Badge`

```tsx
import { Badge } from '../components/Badge';

<Badge label="自动" variant="instant" />;
```

- 步骤标签徽章。Variant：`instant` | `wait_user` | `wait_timer` | `default`。

### `StepNumber`

```tsx
import { StepNumber } from '../components/StepNumber';

<StepNumber number={1} size="md" />;
```

- 圆形步骤序号，使用 Playfair Display。
- Props：`number`, `size?: 'sm' | 'md' | 'lg'`, `variant?: 'default' | 'outline'`。

### `TranscriptBar`

```tsx
import { TranscriptBar } from '../components/TranscriptBar';

<TranscriptBar text="下一步" isListening={true} />;
```

- 烹饪页语音指令提示条。
- Props：`text`, `isListening?`, `onPress?`。

### `MagazineCard`

```tsx
import { MagazineCard } from '../components/MagazineCard';

<MagazineCard title="红烧肉" subtitle="60 分钟 · 2 人份" onPress={handlePress} size="featured" />;
```

- 杂志风格菜谱卡片。
- Props：`title`, `subtitle?`, `image?`, `badge?`, `onPress`, `size?: 'featured' | 'compact'`。

---

## 11. 文件组织

```
src/
  components/
    icons/           # SVG 图标组件 + Icon 包装器 + barrel export
      Icon.tsx       # 图标映射 + 渲染
      CookingIcon.tsx
      ...            # 其余 17 个图标组件
      index.ts       # 统一导出
    illustrations/   # 空/错误状态插画
      EmptyRecipeIllustration.tsx
      ErrorIllustration.tsx
      NotFoundIllustration.tsx
      index.ts
    Button.tsx       # 通用按钮（含 icon prop + reanimated 动画）
    HeaderBar.tsx    # 统一顶部导航栏
    IconButton.tsx   # 圆形图标按钮
    Badge.tsx        # 标签徽章
    StepNumber.tsx   # 步骤序号
    TranscriptBar.tsx # 语音指令提示条
    MagazineCard.tsx # 杂志风格菜谱卡片
  theme/
    colors.ts        # 语义化颜色 token
    spacing.ts       # 间距 + 圆角 + 布局常量
    typography.ts    # 11 级排版样式 + 字体族
    shadows.ts       # 4 级阴影 token
  navigation/
    AppNavigator.tsx # 全局页面转场配置
android/app/src/main/assets/fonts/  # Android 自定义字体
ios/CookingGuideRN/fonts/           # iOS 自定义字体
ios/CookingGuideRN/Info.plist       # UIAppFonts 注册
ios/CookingGuideRN.xcodeproj/project.pbxproj  # Resources 注册
```
