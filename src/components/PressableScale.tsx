import React, { useCallback } from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle, AccessibilityProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { hapticLight, hapticMedium, hapticSelection } from '../utils/haptic';

type HapticType = 'light' | 'medium' | 'selection';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  haptic?: HapticType | false;
  /** 读屏无障碍透传（见 UI 规范第 12 节） */
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityProps['accessibilityRole'];
  accessibilityState?: AccessibilityProps['accessibilityState'];
  accessibilityActions?: AccessibilityProps['accessibilityActions'];
  onAccessibilityAction?: AccessibilityProps['onAccessibilityAction'];
}

const HAPTIC_HANDLERS: Record<HapticType, () => void> = {
  light: hapticLight,
  medium: hapticMedium,
  selection: hapticSelection,
};

export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  scale = 0.96,
  haptic = false,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  accessibilityActions,
  onAccessibilityAction,
}: PressableScaleProps) {
  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(scale, { damping: 20, stiffness: 400 });
  }, [pressed, scale]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(1, { damping: 20, stiffness: 400 });
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (disabled) {
      return;
    }
    if (haptic) {
      HAPTIC_HANDLERS[haptic]();
    }
    onPress();
  }, [disabled, haptic, onPress]);

  return (
    <Pressable
      style={style}
      onPress={handlePress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
    >
      <Animated.View style={[styles.content, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
