import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { PressableScale } from './PressableScale';

interface TranscriptBarProps {
  text: string;
  isListening?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function TranscriptBar({
  text,
  isListening = false,
  onPress,
  style,
  textStyle,
}: TranscriptBarProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!isListening) {
      pulse.value = 1;
      return;
    }

    pulse.value = withRepeat(withTiming(1.5, { duration: 900 }), -1, true);
  }, [isListening, pulse]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.6 + 0.4 * (2 - pulse.value),
  }));

  const content = (
    <View style={[styles.container, style]}>
      {isListening && <Animated.View style={[styles.listeningDot, dotAnimatedStyle]} />}
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <PressableScale scale={0.98} haptic="light" onPress={onPress}>
        {content}
      </PressableScale>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primary,
  },
  text: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
});
