import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SkeletonBox } from './SkeletonBox';
import { SkeletonText } from './SkeletonText';

const INGREDIENT_ROWS = 3;
const STEP_ROWS = 3;

export function RecipeEditSkeleton() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header placeholder */}
      <View style={styles.header}>
        <SkeletonText width={48} fontSize={typography.body.fontSize as number} />
        <SkeletonText width={80} fontSize={typography.h4.fontSize as number} />
        <SkeletonText width={48} fontSize={typography.button.fontSize as number} />
      </View>

      {/* Section: 基本信息 */}
      <View style={styles.section}>
        <SkeletonBox width={80} height={18} borderRadius={spacing.radius.xs} />
        <View style={styles.card}>
          {/* Name input */}
          <SkeletonText width={60} fontSize={typography.bodySmall.fontSize as number} />
          <SkeletonBox
            width="100%"
            height={48}
            borderRadius={spacing.radius.sm}
            style={{ marginTop: spacing.sm }}
          />

          {/* Servings */}
          <SkeletonText
            width={60}
            fontSize={typography.bodySmall.fontSize as number}
            style={{ marginTop: spacing.lg }}
          />
          <View style={styles.stepperRow}>
            <SkeletonBox width={40} height={40} borderRadius={spacing.radius.sm} />
            <SkeletonBox width={80} height={24} borderRadius={spacing.radius.xs} />
            <SkeletonBox width={40} height={40} borderRadius={spacing.radius.sm} />
          </View>

          {/* Cover placeholder */}
          <SkeletonText
            width={60}
            fontSize={typography.bodySmall.fontSize as number}
            style={{ marginTop: spacing.lg }}
          />
          <SkeletonBox
            width="100%"
            height={120}
            borderRadius={spacing.radius.sm}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>

      {/* Section: 食材列表 */}
      <View style={styles.section}>
        <SkeletonBox width={80} height={18} borderRadius={spacing.radius.xs} />
        <View style={styles.card}>
          {Array.from({ length: INGREDIENT_ROWS }).map((_, i) => (
            <View key={i} style={styles.ingredientRow}>
              <SkeletonBox width={20} height={16} borderRadius={spacing.radius.xs} />
              <SkeletonBox width="35%" height={44} borderRadius={spacing.radius.sm} />
              <SkeletonBox width="25%" height={44} borderRadius={spacing.radius.sm} />
              <SkeletonBox width={32} height={32} borderRadius={spacing.radius.sm} />
            </View>
          ))}
        </View>
      </View>

      {/* Section: 步骤列表 */}
      <View style={styles.section}>
        <SkeletonBox width={80} height={18} borderRadius={spacing.radius.xs} />
        <View style={styles.card}>
          {Array.from({ length: STEP_ROWS }).map((_, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepHeader}>
                <SkeletonBox width={24} height={16} borderRadius={spacing.radius.xs} />
                <SkeletonBox width={20} height={16} borderRadius={spacing.radius.xs} />
                <SkeletonBox width={32} height={32} borderRadius={spacing.radius.sm} />
              </View>
              <SkeletonBox
                width="100%"
                height={64}
                borderRadius={spacing.radius.sm}
                style={{ marginTop: spacing.sm }}
              />
              <View style={styles.tagRow}>
                <SkeletonBox width="30%" height={32} borderRadius={spacing.radius.sm} />
                <SkeletonBox width="30%" height={32} borderRadius={spacing.radius.sm} />
                <SkeletonBox width="30%" height={32} borderRadius={spacing.radius.sm} />
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
    padding: spacing.lg,
    paddingBottom: spacing.scrollBottomPadding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  section: {
    marginTop: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 10,
  },
});
