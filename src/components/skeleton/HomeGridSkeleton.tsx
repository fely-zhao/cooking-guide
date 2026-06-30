import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme/spacing';
import { SkeletonBox } from './SkeletonBox';

const PLACEHOLDER_COUNT = 6;

export function HomeGridSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardInner}>
            <SkeletonBox borderRadius={spacing.radius.lg} style={styles.skeletonFill} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  card: {
    width: '47%',
  },
  cardInner: {
    aspectRatio: 1,
  },
  skeletonFill: {
    width: '100%',
    height: '100%',
  },
});
