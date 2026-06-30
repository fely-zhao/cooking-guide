import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SkeletonBox } from './SkeletonBox';
import { SkeletonText } from './SkeletonText';

const INGREDIENT_ROWS = 4;
const STEP_ROWS = 4;

export function RecipeDetailSkeleton() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover image placeholder */}
      <SkeletonBox width="100%" height={200} borderRadius={0} />

      {/* Servings row */}
      <View style={styles.servingsRow}>
        <SkeletonText width={48} fontSize={typography.body.fontSize as number} />
        <View style={styles.stepper}>
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <SkeletonBox width={24} height={24} borderRadius={spacing.radius.xs} />
          <SkeletonBox width={36} height={36} borderRadius={18} />
        </View>
      </View>

      {/* Ingredients section */}
      <View style={styles.section}>
        <SkeletonBox width={120} height={20} borderRadius={spacing.radius.xs} />
        <View style={styles.ingredientList}>
          {Array.from({ length: INGREDIENT_ROWS }).map((_, i) => (
            <View key={i} style={styles.ingredientRow}>
              <SkeletonText width="55%" fontSize={typography.body.fontSize as number} />
              <SkeletonText width="25%" fontSize={typography.bodySmall.fontSize as number} />
            </View>
          ))}
        </View>
      </View>

      {/* Steps section */}
      <View style={styles.section}>
        <SkeletonBox width={120} height={20} borderRadius={spacing.radius.xs} />
        <View style={styles.stepList}>
          {Array.from({ length: STEP_ROWS }).map((_, i) => (
            <View key={i} style={styles.stepRow}>
              <SkeletonBox width={28} height={28} borderRadius={14} />
              <View style={styles.stepContent}>
                <SkeletonText width="80%" fontSize={typography.body.fontSize as number} />
                <SkeletonText
                  width="30%"
                  fontSize={typography.captionSmall.fontSize as number}
                  style={{ marginTop: spacing.xs }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.scrollBottomPadding,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: spacing.radius.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  section: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
  },
  ingredientList: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.md,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  stepList: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepContent: {
    flex: 1,
  },
});
