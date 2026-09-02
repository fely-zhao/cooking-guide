import React, { useCallback, useRef } from 'react';
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
import { useTranslation } from 'react-i18next';

type TargetScreen = 'ManualInput' | 'ImageInput' | 'UrlInput' | 'VoiceInput';

type InputMethod = {
  id: string;
  icon: IconName;
  title: 'input.manualTitle' | 'input.imageTitle' | 'input.urlTitle' | 'input.voiceTitle';
  description: 'input.manualDesc' | 'input.imageDesc' | 'input.urlDesc' | 'input.voiceDesc';
  screen: TargetScreen;
};

const INPUT_METHODS: InputMethod[] = [
  {
    id: 'manual',
    icon: 'text-input',
    title: 'input.manualTitle',
    description: 'input.manualDesc',
    screen: 'ManualInput',
  },
  {
    id: 'image',
    icon: 'camera',
    title: 'input.imageTitle',
    description: 'input.imageDesc',
    screen: 'ImageInput',
  },
  {
    id: 'url',
    icon: 'link',
    title: 'input.urlTitle',
    description: 'input.urlDesc',
    screen: 'UrlInput',
  },
  {
    id: 'voice',
    icon: 'microphone',
    title: 'input.voiceTitle',
    description: 'input.voiceDesc',
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
  const { t } = useTranslation();
  const navigation = useNavigation<RecipeInputNavigationProp>();
  const rootNavigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RecipeInputRouteProp>();

  const { recipeId } = route.params;

  // 防重入库：上游（双击停止/自动停止竞态）可能触发两次 onSave，
  // 单点在唯一入库口拦截，一次录入只允许创建一条记录。
  const hasSavedRef = useRef(false);

  const handleManualSave = useCallback(
    (data: ParseRecipeResponse) => {
      if (hasSavedRef.current) return;
      hasSavedRef.current = true;
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
      <HeaderBar title={t('input.title')} variant="large" />

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
                    <Text style={styles.cardTitle}>{t(method.title)}</Text>
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {t(method.description)}
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
