import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { hapticLight } from '../utils/haptic';
import { Icon, IconName } from './icons';

type IconButtonVariant = 'default' | 'primary' | 'secondary' | 'danger';

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  size?: number;
  color?: string;
  variant?: IconButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  haptic?: boolean;
  /** 读屏文案；图标按钮无可见文本，必须传入 */
  accessibilityLabel?: string;
}

const ICON_BUTTON_SIZE = 44;

const VARIANT_COLORS: Record<IconButtonVariant, string> = {
  default: colors.text.primary,
  primary: colors.text.inverse,
  secondary: colors.text.primary,
  danger: colors.text.inverse,
};

const VARIANT_BACKGROUNDS: Record<IconButtonVariant, string> = {
  default: colors.transparent,
  primary: colors.primary,
  secondary: colors.surfaceFill,
  danger: colors.danger,
};

export function IconButton({
  name,
  onPress,
  size = 24,
  color,
  variant = 'default',
  disabled = false,
  style,
  haptic = true,
  accessibilityLabel,
}: IconButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (haptic && !disabled) {
      hapticLight();
    }
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  }, [scale, haptic, disabled]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const iconColor = color ?? VARIANT_COLORS[variant];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: VARIANT_BACKGROUNDS[variant] },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={animatedStyle}>
        <Icon name={name} size={size} color={iconColor} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    borderRadius: spacing.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
