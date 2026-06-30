import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface SectionTitleProps {
  title: string;
  style?: ViewStyle;
}

export function SectionTitle({ title, style }: SectionTitleProps) {
  return <Text style={[styles.title, style]}>{title.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...typography.captionSmall,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
});
