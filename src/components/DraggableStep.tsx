import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { Icon } from './icons';
import { IconButton } from './IconButton';
import { StepNumber } from './StepNumber';
import { useTranslation } from 'react-i18next';
import type { EditableStep } from '../utils/recipe-edit';
import { TAG_OPTIONS } from '../utils/recipe-edit';

export const STEP_ITEM_HEIGHT = 220;

const TIMER_PRESETS = [30, 60, 180, 300];

export interface DraggableStepProps {
  step: EditableStep;
  index: number;
  totalCount: number;
  onMove: (from: number, to: number) => void;
  onUpdate: (tempId: string, field: keyof EditableStep, value: string) => void;
  onRemove: (tempId: string) => void;
}

export const DraggableStep = React.memo(function DraggableStep({
  step,
  index,
  totalCount,
  onMove,
  onUpdate,
  onRemove,
}: DraggableStepProps) {
  const { t } = useTranslation();
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const fromIndex = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const stepIndex = useSharedValue(index);
  const totalItems = useSharedValue(totalCount);
  stepIndex.value = index;
  totalItems.value = totalCount;

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(150)
        .onStart(() => {
          'worklet';
          isDragging.value = true;
          fromIndex.value = stepIndex.value;
          currentIndex.value = stepIndex.value;
          translateY.value = 0;
        })
        .onUpdate(e => {
          'worklet';
          translateY.value = e.translationY;
          const offset = Math.round(e.translationY / STEP_ITEM_HEIGHT);
          const targetIndex = Math.max(0, Math.min(totalItems.value - 1, fromIndex.value + offset));
          if (targetIndex !== currentIndex.value) {
            runOnJS(onMove)(currentIndex.value, targetIndex);
            currentIndex.value = targetIndex;
          }
        })
        .onEnd(() => {
          'worklet';
          translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
          isDragging.value = false;
        }),
    [onMove],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isDragging.value ? 1000 : 1,
    elevation: isDragging.value ? 10 : 0,
  }));

  const applyTimerPreset = (seconds: number) => {
    onUpdate(step.tempId, 'durationSeconds', String(seconds));
  };

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragHandle}>
                <Icon name="drag" size={18} color={colors.text.placeholder} />
              </View>
            </GestureDetector>
            <StepNumber number={index + 1} size="md" />
          </View>

          <IconButton
            name="close"
            variant="danger"
            size={18}
            onPress={() => onRemove(step.tempId)}
            style={styles.deleteButton}
          />
        </View>

        <TextInput
          style={[styles.input, styles.stepTextInput]}
          value={step.text}
          onChangeText={value => onUpdate(step.tempId, 'text', value)}
          placeholder={t('components.stepPlaceholder')}
          placeholderTextColor={colors.text.inputPlaceholder}
          multiline
        />

        <View style={styles.tagRow}>
          {TAG_OPTIONS.map(option => {
            const isActive = step.tag === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.tagChip, isActive && styles.tagChipActive]}
                onPress={() => onUpdate(step.tempId, 'tag', option.value)}
              >
                <Text style={[styles.tagChipText, isActive && styles.tagChipTextActive]}>
                  {t(option.label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {step.tag === 'wait_timer' && (
          <View style={styles.timerSection}>
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>{t('components.durationLabel')}</Text>
              <TextInput
                style={[styles.input, styles.durationInput]}
                value={step.durationSeconds}
                onChangeText={value => onUpdate(step.tempId, 'durationSeconds', value)}
                placeholder="0"
                placeholderTextColor={colors.text.inputPlaceholder}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.presetRow}>
              {TIMER_PRESETS.map(seconds => (
                <TouchableOpacity
                  key={seconds}
                  style={styles.presetButton}
                  onPress={() => applyTimerPreset(seconds)}
                >
                  <Text style={styles.presetButtonText}>
                    {seconds < 60
                      ? t('common.seconds', { n: seconds })
                      : t('common.minutes', { n: seconds / 60 })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dragHandle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  stepTextInput: {
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderRadius: spacing.radius.full,
    backgroundColor: colors.surfaceFill,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
  },
  tagChipText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  tagChipTextActive: {
    color: colors.text.inverse,
  },
  timerSection: {
    marginTop: spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  durationLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  durationInput: {
    flex: 1,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: spacing.radius.sm,
    backgroundColor: colors.primarySurface,
  },
  presetButtonText: {
    ...typography.caption,
    color: colors.primary,
  },
});
