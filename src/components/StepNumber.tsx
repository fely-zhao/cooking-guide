import React from 'react';
import { View, Text, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type StepNumberSize = 'sm' | 'md' | 'lg';
type StepNumberVariant = 'default' | 'outline';

interface StepNumberProps {
  number: number;
  size?: StepNumberSize;
  variant?: StepNumberVariant;
}

const SIZE_DIMENSIONS: Record<StepNumberSize, number> = {
  sm: 24,
  md: 28,
  lg: 36,
};

const SIZE_TYPOGRAPHY: Record<StepNumberSize, TextStyle> = {
  sm: { ...typography.badge },
  md: { ...typography.button },
  lg: { ...typography.button, fontSize: 18, lineHeight: 24 },
};

const VARIANT_STYLES: Record<
  StepNumberVariant,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  default: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.text.inverse,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    color: colors.primary,
  },
};

export function StepNumber({ number, size = 'md', variant = 'default' }: StepNumberProps) {
  const dimension = SIZE_DIMENSIONS[size];
  const v = VARIANT_STYLES[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          width: dimension,
          height: dimension,
          backgroundColor: v.backgroundColor,
          borderColor: v.borderColor,
        },
      ]}
    >
      <Text style={[SIZE_TYPOGRAPHY[size], { color: v.color }]}>{number}</Text>
    </View>
  );
}

const styles = {
  badge: {
    borderRadius: spacing.radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
};
