import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type {
  RecipeInputNavigationProp,
  RecipeInputStackParamList,
  RootStackNavigationProp,
} from '../navigation/types';
import { createRecipe } from '../db';
import type { Ingredient, Step } from '../types/cooking';
import type { ParseRecipeResponse } from '../types/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { HeaderBar } from '../components/HeaderBar';
import { Icon } from '../components/icons';
import type { IconName } from '../components/icons';

type TargetScreen = 'ManualInput' | 'ImageInput' | 'UrlInput' | 'VoiceInput';

type InputMethod = {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  screen: TargetScreen;
};

const INPUT_METHODS: InputMethod[] = [
  {
    id: 'manual',
    icon: 'text-input',
    title: '文本录入',
    description: '输入或粘贴菜谱文本',
    screen: 'ManualInput',
  },
  {
    id: 'image',
    icon: 'camera',
    title: '截图识别',
    description: '拍照或相册选图解析',
    screen: 'ImageInput',
  },
  {
    id: 'url',
    icon: 'link',
    title: '链接导入',
    description: '粘贴菜谱链接自动提取',
    screen: 'UrlInput',
  },
  {
    id: 'voice',
    icon: 'microphone',
    title: '语音录入',
    description: '语音描述菜谱实时识别',
    screen: 'VoiceInput',
  },
];

const BENTO_ROWS: InputMethod[][] = [INPUT_METHODS.slice(0, 2), INPUT_METHODS.slice(2, 4)];

const ANIMATION_BASE_DELAY_MS = 80;

function getAnimationDelay(rowIndex: number, columnIndex: number): number {
  return (rowIndex * 2 + columnIndex) * ANIMATION_BASE_DELAY_MS;
}

type RecipeInputRouteProp = RouteProp<RecipeInputStackParamList, 'InputMethodSelect'>;

export default function RecipeInputScreen() {
  const navigation = useNavigation<RecipeInputNavigationProp>();
  const rootNavigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RecipeInputRouteProp>();

  const { recipeId } = route.params;

  const handleManualSave = useCallback(
    (data: ParseRecipeResponse) => {
      const newId = createRecipe({
        name: data.name,
        servings: 2,
        ingredients: data.ingredients.map(
          (ing): Ingredient => ({ id: '', name: ing.name, amount: ing.amount }),
        ),
        steps: data.steps.map(
          (step): Step => ({
            id: '',
            text: step.text,
            tag: step.tag,
            durationSeconds: step.duration_seconds,
            subSteps: [],
          }),
        ),
      });
      // Dismiss modal + navigate to RecipeDetail
      rootNavigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'Home' }, { name: 'RecipeDetail', params: { recipeId: newId } }],
        }),
      );
    },
    [rootNavigation],
  );

  const handleMethodPress = (screen: TargetScreen) => {
    navigation.navigate(screen, { recipeId, onSave: handleManualSave });
  };

  return (
    <SafeAreaContainer>
      <HeaderBar title="录入菜谱" variant="large" />

      <View style={styles.content}>
        {BENTO_ROWS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((method, columnIndex) => (
              <Animated.View
                key={method.id}
                style={styles.cardWrapper}
                entering={FadeInUp.duration(400).delay(getAnimationDelay(rowIndex, columnIndex))}
              >
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.92}
                  onPress={() => handleMethodPress(method.screen)}
                >
                  <View style={styles.iconCircle}>
                    <Icon name={method.icon} size={spacing.xxl} color={colors.primary} />
                  </View>

                  <View>
                    <Text style={styles.cardTitle}>{method.title}</Text>
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {method.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        ))}
      </View>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 30,
    elevation: 3,
  },
  iconCircle: {
    width: spacing.xxl * 2,
    height: spacing.xxl * 2,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.button,
    color: colors.text.primary,
  },
  cardDesc: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
});
