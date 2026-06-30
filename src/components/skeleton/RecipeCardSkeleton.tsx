import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SkeletonBox } from './SkeletonBox';
import { SkeletonText } from './SkeletonText';

const CARD_COUNT = 5;

export function RecipeCardSkeleton() {
  return (
    <View style={styles.list}>
      {Array.from({ length: CARD_COUNT }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBox width={80} height={80} borderRadius={spacing.radius.md} />
          <View style={styles.cardContent}>
            <SkeletonText width="60%" fontSize={typography.button.fontSize as number} />
            <SkeletonText
              width="40%"
              fontSize={typography.caption.fontSize as number}
              style={{ marginTop: spacing.sm }}
            />
            <SkeletonText
              width="30%"
              fontSize={typography.captionSmall.fontSize as number}
              style={{ marginTop: spacing.xs }}
            />
          </View>
          <SkeletonBox width={24} height={24} borderRadius={spacing.radius.xs} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.surfaceFill,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: 6,
    borderRadius: spacing.radius.md,
    padding: spacing.md,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: spacing.sm,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
});
