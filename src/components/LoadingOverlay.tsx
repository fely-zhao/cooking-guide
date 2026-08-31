import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface LoadingOverlayProps {
  visible: boolean;
  /** 加载提示文案，默认「加载中…」 */
  message?: string;
}

export function LoadingOverlay({ visible, message = '加载中…' }: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <ChefHatWithSteam />
        <Animated.Text style={styles.text}>{message}</Animated.Text>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 厨师帽轻跳 + 三缕蒸汽错相上飘（仅 transform/opacity，reanimated 驱动）
// ---------------------------------------------------------------------------

function ChefHatWithSteam() {
  const STEAM_CYCLE_MS = 2700;

  // 帽子：上下轻跳（auto-reverse 往返）
  const hatY = useSharedValue(0);
  useEffect(() => {
    hatY.value = withRepeat(
      withTiming(-5, { duration: 550, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [hatY]);

  // 蒸汽：单一 0→1 线性周期，三缕各取相位窗口错相（i*1/3 起，各占 1/3）
  const cycle = useSharedValue(0);
  useEffect(() => {
    cycle.value = withRepeat(
      withTiming(1, { duration: STEAM_CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [cycle]);

  const hatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hatY.value }],
  }));

  const steamStyles = [0, 1, 2].map(i =>
    useAnimatedStyle(() => {
      const s = i / 3;
      const opacity = interpolate(
        cycle.value,
        [s, s + 0.1, s + 0.25, s + 0.33],
        [0, 0.85, 0.5, 0],
        'clamp',
      );
      const translateY = interpolate(cycle.value, [s, s + 0.33], [0, -16], 'clamp');
      return { opacity, transform: [{ translateY }] };
    }),
  );

  return (
    <View style={styles.animationArea}>
      {/* 蒸汽三缕（帽子正上方，x 错开） */}
      <View style={styles.steamLayer} pointerEvents="none">
        {steamStyles.map((style, i) => (
          <Animated.View key={i} style={[styles.steamPuff, { left: 18 + i * 14 }, style]}>
            <Svg width={10} height={14} viewBox="0 0 10 14">
              <Path
                d="M5 13 C2 10 8 8 5 5 C3 3 5 1 5 1"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        ))}
      </View>
      {/* 厨师帽（暖色剪影） */}
      <Animated.View style={[styles.hatWrapper, hatStyle]}>
        <Svg width={72} height={72} viewBox="0 0 48 48">
          <Circle cx={15} cy={16} r={7} fill={colors.primary} />
          <Circle cx={24} cy={12} r={8} fill={colors.primary} />
          <Circle cx={33} cy={16} r={7} fill={colors.primary} />
          <Rect x={11} y={18} width={26} height={13} rx={3} fill={colors.primary} />
          <Rect x={9} y={32} width={30} height={5} rx={2.5} fill={colors.primary} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AI 解析专用（预设三步轮换文案，保持向后兼容）
// ---------------------------------------------------------------------------

const AI_PROCESS_STEPS = ['正在识别食材…', '正在提取步骤…', '正在整理菜谱…'];

export function AiProcessingOverlay({ visible }: { visible: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setStepIndex(i => (i + 1) % AI_PROCESS_STEPS.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <ChefHatWithSteam />
        <Animated.Text key={stepIndex} style={styles.text}>
          {AI_PROCESS_STEPS[stepIndex]}
        </Animated.Text>
        <View style={styles.dotsRow}>
          {AI_PROCESS_STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: spacing.md,
    elevation: 8,
    minWidth: 200,
  },
  animationArea: {
    width: 90,
    height: 96,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  steamLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 70,
  },
  steamPuff: {
    position: 'absolute',
    bottom: 0,
    opacity: 0,
  },
  hatWrapper: {
    alignItems: 'center',
  },
  text: {
    ...typography.body,
    color: colors.text.muted,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
});
