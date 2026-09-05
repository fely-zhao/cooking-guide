import { TextStyle } from 'react-native';

// 全 App 使用系统字体（2026-09-05 决策，弃用 PlayfairDisplay/Inter 自定义字体）：
// 自定义西文字体不含汉字，中文经回退渲染后因字体 metrics 不对称导致跨元素
// 垂直错位（如 HeaderBar 标题与按钮差 2dp），且无法靠 flex/lineHeight 修复。
// 系统字体中英文同源渲染，flex 布局自然居中，无回退与对齐隐患。
export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  header: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  captionSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  timer: {
    fontSize: 48,
    fontWeight: '200' as const,
    lineHeight: 56,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export type AppTypography = typeof typography;
