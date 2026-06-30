import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { Icon } from './icons';
import { Button } from './Button';

interface CapsuleFabProps {
  title: string;
  onPress: () => void;
}

export function CapsuleFab({ title, onPress }: CapsuleFabProps) {
  return (
    <View style={styles.container}>
      <Button
        title={title}
        variant="primary"
        onPress={onPress}
        icon={<Icon name="plus" size={18} color={colors.text.inverse} />}
        style={styles.capsule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xxl,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  capsule: {
    borderRadius: spacing.radius.full,
    paddingHorizontal: spacing.xxl,
    ...shadows.float,
  },
});
