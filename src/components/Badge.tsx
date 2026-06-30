import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type BadgeVariant = 'instant' | 'wait_user' | 'wait_timer' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  instant: { bg: colors.successLight, text: colors.success },
  wait_user: { bg: colors.primaryLight, text: colors.primary },
  wait_timer: { bg: colors.warningLight, text: colors.warning },
  default: { bg: colors.surfaceFill, text: colors.text.muted },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const v = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: spacing.radius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.badge,
  },
});
