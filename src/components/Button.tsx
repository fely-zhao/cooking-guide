import React, { useCallback, type ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { hapticLight } from '../utils/haptic';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'text' | 'success';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    // Don't shrink: HeaderBar's right `side` is flex:1 (~65dp on 360dp screens),
    // which would squeeze a 2-char Chinese label vertically.
    flexShrink: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  secondary: {
    backgroundColor: colors.surfaceFill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  success: {
    backgroundColor: colors.success,
  },
  text: {
    backgroundColor: colors.transparent,
    // Tight padding so the natural width fits any HeaderBar side.
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.button,
    // Don't shrink: keeps short labels (e.g. "保存") horizontal in narrow
    // containers like HeaderBar's flex:1 side.
    flexShrink: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconWrapper: {
    marginRight: 2,
  },
  primaryLabel: {
    color: colors.text.inverse,
  },
  secondaryLabel: {
    color: colors.text.secondary,
  },
  outlineLabel: {
    color: colors.primary,
  },
  dangerLabel: {
    color: colors.text.inverse,
  },
  successLabel: {
    color: colors.text.inverse,
  },
  textLabel: {
    color: colors.primary,
  },
  disabledLabel: {
    opacity: 0.7,
  },
});

const VARIANT_CONTAINER_STYLES: Record<ButtonVariant, ViewStyle> = {
  primary: styles.primary,
  secondary: styles.secondary,
  outline: styles.outline,
  danger: styles.danger,
  success: styles.success,
  text: styles.text,
};

const VARIANT_LABEL_STYLES: Record<ButtonVariant, TextStyle> = {
  primary: styles.primaryLabel,
  secondary: styles.secondaryLabel,
  outline: styles.outlineLabel,
  danger: styles.dangerLabel,
  success: styles.successLabel,
  text: styles.textLabel,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  haptic = true,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (haptic && !disabled && !loading) {
      hapticLight();
    }
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [scale, haptic, disabled, loading]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const containerStyle = [
    styles.base,
    VARIANT_CONTAINER_STYLES[variant],
    disabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    VARIANT_LABEL_STYLES[variant],
    disabled && styles.disabledLabel,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <Animated.View style={[animatedStyle, styles.content]}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'outline' ? colors.primary : colors.text.inverse}
          />
        ) : (
          <View style={styles.labelRow}>
            {icon && <View style={styles.iconWrapper}>{icon}</View>}
            <Text style={labelStyle}>{title}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}
