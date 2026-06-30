import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface SafeAreaContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom')[];
}

export function SafeAreaContainer({
  children,
  style,
  edges = ['top', 'bottom'],
}: SafeAreaContainerProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;

  return <View style={[styles.container, { paddingTop, paddingBottom }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
