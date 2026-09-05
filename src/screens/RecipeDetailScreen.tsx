import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackNavigationProp, RootStackParamList } from '../navigation/types';
import { getRecipe, deleteRecipe } from '../db';
import type { Recipe, Step } from '../types/cooking';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { StepNumber } from '../components/StepNumber';
import { SectionTitle } from '../components/SectionTitle';
import { RecipeDetailSkeleton } from '../components/skeleton';
import { NotFoundIllustration } from '../components/illustrations';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/icons';
import { PressableScale } from '../components/PressableScale';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

type RecipeDetailRouteProp = RouteProp<RootStackParamList, 'RecipeDetail'>;

const HERO_HEIGHT = 260;
const HERO_ICON_SIZE = 72;

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min > 0 && sec > 0) return i18n.t('common.durationMinSec', { m: min, s: sec });
  if (min > 0) return i18n.t('common.durationMinOnly', { m: min });
  return i18n.t('common.seconds', { n: sec });
}

function computeTotalTime(steps: Step[]): number {
  return steps.reduce(
    (sum, step) => (step.tag === 'wait_timer' ? sum + (step.durationSeconds ?? 0) : sum),
    0,
  );
}

function getStepBadgeLabel(step: Step): string {
  if (step.tag === 'instant') return i18n.t('detail.badgeAuto');
  if (step.tag === 'wait_user') return i18n.t('detail.badgeConfirm');
  if (step.tag === 'wait_timer') {
    return step.durationSeconds
      ? i18n.t('detail.badgeTimerWithDuration', { duration: formatDuration(step.durationSeconds) })
      : i18n.t('detail.badgeTimer');
  }
  return '';
}

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RecipeDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [servings, setServings] = useState(2);
  const [prepMode, setPrepMode] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  // focus 时静默刷新（同步读库批处理后一次 commit，不闪骨架屏）；
  // 首次挂载 loading=true 的骨架屏仅作转场期间兜底
  useFocusEffect(
    useCallback(() => {
      try {
        const data = getRecipe(recipeId);
        if (data) {
          setRecipe(data);
          setServings(data.servings || 2);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }, [recipeId]),
  );

  const handleDelete = useCallback(() => {
    Alert.alert(t('detail.deleteTitle'), t('detail.deleteMsg', { name: recipe?.name ?? '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('detail.delete'),
        style: 'destructive',
        onPress: () => {
          deleteRecipe(recipeId);
          navigation.goBack();
        },
      },
    ]);
  }, [recipe?.name, recipeId, navigation]);

  const handleStartCooking = useCallback(() => {
    navigation.navigate('Cooking', { recipeId });
  }, [navigation, recipeId]);

  const handleEdit = useCallback(() => {
    navigation.navigate('RecipeEdit', { recipeId });
  }, [navigation, recipeId]);

  const toggleIngredient = useCallback((id: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaContainer style={styles.container}>
        <RecipeDetailSkeleton />
      </SafeAreaContainer>
    );
  }

  if (notFound || !recipe) {
    return (
      <SafeAreaContainer style={styles.container}>
        <View style={styles.centeredState}>
          <NotFoundIllustration size={100} />
          <Text style={styles.centeredText}>{t('detail.notFound')}</Text>
          <Button title={t('detail.back')} onPress={() => navigation.goBack()} variant="outline" />
        </View>
      </SafeAreaContainer>
    );
  }

  const totalTime = computeTotalTime(recipe.steps);

  return (
    <SafeAreaContainer style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View>
          <View style={[styles.hero, { height: HERO_HEIGHT }]}>
            <View style={styles.heroGradientBase} />
            <View style={styles.heroGradientBlobTop} />
            <View style={styles.heroGradientBlobBottom} />
            <View style={styles.heroScrim} />

            <View style={[styles.heroNav, { top: insets.top + spacing.sm }]}>
              <IconButton
                name="chevron-left"
                variant="default"
                onPress={() => navigation.goBack()}
                color={colors.text.inverse}
                style={styles.heroNavBtn}
                accessibilityLabel={t('common.back')}
              />
              <Button
                title={t('detail.edit')}
                variant="text"
                onPress={handleEdit}
                style={styles.heroEditBtn}
                textStyle={styles.heroEditBtnText}
              />
            </View>

            <View style={styles.heroIcon}>
              <Icon name="cooking" size={HERO_ICON_SIZE} color={colors.primary} />
            </View>

            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {recipe.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.infoCell, styles.infoCellWide]}>
              <Text style={styles.infoLabel}>{t('detail.servings')}</Text>
              <View style={styles.stepper}>
                <Button
                  title="-"
                  variant="secondary"
                  onPress={() => setServings(s => Math.max(1, s - 1))}
                  disabled={servings <= 1}
                  style={styles.stepperBtn}
                  textStyle={styles.stepperBtnText}
                  accessibilityLabel={t('common.a11y.decrease')}
                />
                <Text style={styles.stepperValue}>{servings}</Text>
                <Button
                  title="+"
                  variant="secondary"
                  onPress={() => setServings(s => s + 1)}
                  style={styles.stepperBtn}
                  textStyle={styles.stepperBtnText}
                  accessibilityLabel={t('common.a11y.increase')}
                />
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{t('detail.totalTime')}</Text>
              <Text style={styles.infoValue}>
                {totalTime > 0 ? formatDuration(totalTime) : '-'}
              </Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{t('detail.steps')}</Text>
              <Text style={styles.infoValue}>
                {t('detail.stepsCount', { n: recipe.steps.length })}
              </Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SectionTitle title={t('detail.ingredients')} style={styles.sectionTitle} />
            <Button
              title={prepMode ? t('common.done') : t('detail.prep')}
              variant="text"
              onPress={() => setPrepMode(p => !p)}
              icon={prepMode ? <Icon name="check" size={16} color={colors.success} /> : undefined}
              textStyle={prepMode ? styles.prepToggleActive : styles.prepToggleInactive}
            />
          </View>

          <View style={styles.ingredientGrid}>
            {recipe.ingredients.map(ing => {
              const checked = checkedIngredients.has(ing.id);
              return (
                <PressableScale
                  key={ing.id}
                  scale={0.98}
                  haptic={prepMode ? 'light' : false}
                  onPress={() => toggleIngredient(ing.id)}
                  disabled={!prepMode}
                  style={styles.ingredientCard}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked, disabled: !prepMode }}
                >
                  {prepMode && (
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Icon name="check" size={12} color={colors.text.inverse} />}
                    </View>
                  )}
                  <View style={styles.ingredientText}>
                    <Text
                      style={[styles.ingredientName, checked && styles.ingredientTextChecked]}
                      numberOfLines={2}
                    >
                      {ing.name}
                    </Text>
                    <Text
                      style={[styles.ingredientAmount, checked && styles.ingredientTextChecked]}
                    >
                      {ing.amount}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <SectionTitle title={t('detail.steps')} style={styles.sectionTitle} />
          <View style={styles.stepListContainer}>
            <View style={styles.stepConnectorLine} />
            {recipe.steps.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepNumberColumn}>
                  <StepNumber number={index + 1} size="lg" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>{step.text}</Text>
                  <Badge label={getStepBadgeLabel(step)} variant={step.tag} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Glass bottom action bar */}
      <View style={styles.glassBar}>
        {Platform.OS === 'ios' && (
          <BlurView blurType="dark" blurAmount={20} style={StyleSheet.absoluteFill} />
        )}
        <Button
          title={t('detail.delete')}
          onPress={handleDelete}
          variant="danger"
          style={styles.actionBtn}
        />
        <Button
          title={t('components.startCooking')}
          onPress={handleStartCooking}
          variant="primary"
          style={styles.actionBtn}
        />
      </View>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  centeredText: {
    ...typography.button,
    color: colors.text.lighter,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.scrollBottomPadding + spacing.xl,
  },

  // Hero
  hero: {
    overflow: 'hidden',
  },
  heroGradientBase: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.primarySurface,
  },
  heroGradientBlobTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
    top: -60,
    right: -70,
  },
  heroGradientBlobBottom: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primary,
    opacity: 0.1,
    bottom: -60,
    left: -50,
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: colors.overlay50,
  },
  heroNav: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroNavBtn: {
    backgroundColor: colors.overlay30,
  },
  heroEditBtn: {
    backgroundColor: colors.overlay30,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  heroEditBtnText: {
    color: colors.text.inverse,
  },
  heroIcon: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    opacity: 0.25,
  },
  heroTitleWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text.inverse,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  infoCellWide: {
    flex: 1.3,
  },
  infoDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.captionSmall,
    color: colors.text.muted,
  },
  infoValue: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // Servings stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    minHeight: 32,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: spacing.radius.full,
  },
  stepperBtnText: {
    ...typography.h4,
  },
  stepperValue: {
    ...typography.h4,
    color: colors.text.primary,
    minWidth: spacing.xl,
    textAlign: 'center',
  },

  // Section
  section: {
    marginTop: spacing.xxxl,
    marginHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 0,
  },
  prepToggleActive: {
    color: colors.success,
  },
  prepToggleInactive: {
    color: colors.text.muted,
  },

  // Ingredients
  ingredientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  ingredientCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: spacing.radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxs,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  ingredientText: {
    flex: 1,
    gap: spacing.xxs,
  },
  ingredientName: {
    ...typography.body,
    color: colors.text.secondary,
  },
  ingredientAmount: {
    ...typography.captionSmall,
    color: colors.text.muted,
  },
  ingredientTextChecked: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },

  // Steps
  stepListContainer: {
    position: 'relative',
  },
  stepConnectorLine: {
    position: 'absolute',
    left: 17,
    top: 18,
    bottom: 18,
    width: 2,
    backgroundColor: colors.borderLight,
  },
  stepItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  stepNumberColumn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  stepText: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // Glass bottom bar
  glassBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.overlay30,
    borderTopLeftRadius: spacing.radius.xl,
    borderTopRightRadius: spacing.radius.xl,
  },
  actionBtn: {
    flex: 1,
  },
});
