import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
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
import { useTranslation } from 'react-i18next';
import type { EditableIngredient } from '../utils/recipe-edit';

export const INGREDIENT_ITEM_HEIGHT = 72;

export interface DraggableIngredientProps {
  ingredient: EditableIngredient;
  index: number;
  totalCount: number;
  onMove: (from: number, to: number) => void;
  onUpdate: (tempId: string, field: keyof EditableIngredient, value: string) => void;
  onRemove: (tempId: string) => void;
}

const AMOUNT_REGEX = /^(\d+\/\d+|\d*\.?\d+)?\s*(.*)$/;

function splitAmount(amount: string): { value: string; unit: string } {
  const match = amount.match(AMOUNT_REGEX);
  if (!match) {
    return { value: '', unit: amount };
  }
  return { value: match[1] ?? '', unit: match[2] ?? '' };
}

function combineAmount(value: string, unit: string): string {
  const trimmedValue = value.trim();
  const trimmedUnit = unit.trim();
  if (!trimmedValue) {
    return trimmedUnit;
  }
  if (!trimmedUnit) {
    return trimmedValue;
  }
  return `${trimmedValue} ${trimmedUnit}`;
}

export const DraggableIngredient = React.memo(function DraggableIngredient({
  ingredient,
  index,
  totalCount,
  onMove,
  onUpdate,
  onRemove,
}: DraggableIngredientProps) {
  const { t } = useTranslation();
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const fromIndex = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const itemIndex = useSharedValue(index);
  const totalItems = useSharedValue(totalCount);
  itemIndex.value = index;
  totalItems.value = totalCount;

  const { value: amountValue, unit: amountUnit } = splitAmount(ingredient.amount);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(150)
        .onStart(() => {
          'worklet';
          isDragging.value = true;
          fromIndex.value = itemIndex.value;
          currentIndex.value = itemIndex.value;
          translateY.value = 0;
        })
        .onUpdate(e => {
          'worklet';
          translateY.value = e.translationY;
          const offset = Math.round(e.translationY / INGREDIENT_ITEM_HEIGHT);
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

  const handleAmountChange = (text: string) => {
    onUpdate(ingredient.tempId, 'amount', combineAmount(text, amountUnit));
  };

  const handleUnitChange = (text: string) => {
    onUpdate(ingredient.tempId, 'amount', combineAmount(amountValue, text));
  };

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.card}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragHandle}>
            <Icon name="drag" size={18} color={colors.text.placeholder} />
          </View>
        </GestureDetector>

        <TextInput
          style={[styles.input, styles.amountInput]}
          value={amountValue}
          onChangeText={handleAmountChange}
          placeholder={t('components.amountPlaceholder')}
          placeholderTextColor={colors.text.inputPlaceholder}
          keyboardType="numeric"
        />

        <TextInput
          style={[styles.input, styles.unitInput]}
          value={amountUnit}
          onChangeText={handleUnitChange}
          placeholder={t('components.unitPlaceholder')}
          placeholderTextColor={colors.text.inputPlaceholder}
        />

        <TextInput
          style={[styles.input, styles.nameInput]}
          value={ingredient.name}
          onChangeText={value => onUpdate(ingredient.tempId, 'name', value)}
          placeholder={t('components.ingredientPlaceholder')}
          placeholderTextColor={colors.text.inputPlaceholder}
        />

        <IconButton
          name="close"
          variant="danger"
          size={18}
          onPress={() => onRemove(ingredient.tempId)}
          style={styles.deleteButton}
        />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  dragHandle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  amountInput: {
    flex: 1,
    minWidth: 48,
  },
  unitInput: {
    flex: 1,
    minWidth: 48,
  },
  nameInput: {
    flex: 3,
    minWidth: 100,
  },
  deleteButton: {
    width: 32,
    height: 32,
  },
});
