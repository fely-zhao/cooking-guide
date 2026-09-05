import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackNavigationProp, RootStackParamList } from '../navigation/types';
import { getRecipe, updateRecipe } from '../db/recipes';
import { deleteByRecipe as deleteIngredientsByRecipe, createIngredient } from '../db/ingredients';
import { deleteByRecipe as deleteStepsByRecipe, createStep } from '../db/steps';
import { withTransaction } from '../db/transaction';
import { LLMService } from '../services/llm';
import { createApiClient } from '../config';
import type { ParseRecipeResponse } from '../types/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { HeaderBar } from '../components/HeaderBar';
import { Button } from '../components/Button';
import { SectionTitle } from '../components/SectionTitle';
import { RecipeEditSkeleton } from '../components/skeleton';
import DocumentPicker from 'react-native-document-picker';
import { EditableIngredient, EditableStep, generateTempId } from '../utils/recipe-edit';
import { AiProcessingOverlay } from '../components/LoadingOverlay';
import { AiOptionsModal } from '../components/AiOptionsModal';
import { AiDiffPreviewModal } from '../components/AiDiffPreviewModal';
import { Icon } from '../components/icons';
import { DraggableStep, STEP_ITEM_HEIGHT } from '../components/DraggableStep';
import { DraggableIngredient } from '../components/DraggableIngredient';
import { SkeletonBox } from '../components/skeleton';
import { saveCoverImagePermanent, deleteCoverImage } from '../utils/cover-image';
import { useTranslation } from 'react-i18next';

type RecipeEditRouteProp = RouteProp<RootStackParamList, 'RecipeEdit'>;

// 与 AppNavigator 的 animationDuration: 300 对齐 + 余量；
// 转场期间只挂载轻量首屏，重组件列表延后填充
const LISTS_MOUNT_DELAY_MS = 350;

// ---------------------------------------------------------------------------
// ListPlaceholder — 列表挂载前的骨架占位（视觉连续，高度近似真实行）
// ---------------------------------------------------------------------------

function ListPlaceholder({ rows, rowHeight }: { rows: number; rowHeight: number }) {
  return (
    <View style={styles.placeholderList}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBox key={i} width="100%" height={rowHeight} borderRadius={spacing.radius.sm} />
      ))}
    </View>
  );
}

export default function RecipeEditScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RecipeEditRouteProp>();
  const { recipeId } = route.params;

  const [recipeName, setRecipeName] = useState('');
  const [servings, setServings] = useState(1);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [loading, setLoading] = useState(true);
  // 转场期间只挂载轻量首屏；食材/步骤列表为 Draggable* 重组件
  // （每行手势 + 多输入框），延迟到转场结束后挂载，避免与转场动画争抢线程导致掉帧
  const [listsReady, setListsReady] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [proposedSteps, setProposedSteps] = useState<EditableStep[] | null>(null);
  const [previewMode, setPreviewMode] = useState<'optimize' | 'split'>('optimize');

  useEffect(() => {
    const recipe = getRecipe(recipeId);
    if (!recipe) {
      Alert.alert(t('common.error'), t('edit.notFound'));
      navigation.goBack();
      return;
    }

    setRecipeName(recipe.name);
    setServings(recipe.servings);
    setIngredients(
      recipe.ingredients.map(ing => ({
        tempId: ing.id,
        name: ing.name,
        amount: ing.amount,
      })),
    );
    setSteps(
      recipe.steps.map(step => ({
        tempId: step.id,
        text: step.text,
        tag: step.tag,
        durationSeconds: step.durationSeconds != null ? String(step.durationSeconds) : '',
      })),
    );
    setCoverImage(recipe.coverImage);
    setLoading(false);
  }, [recipeId, navigation]);

  useEffect(() => {
    const timer = setTimeout(() => setListsReady(true), LISTS_MOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
      });
      if (result[0]?.uri) {
        await deleteCoverImage(coverImage);
        const permanentUri = await saveCoverImagePermanent(result[0].uri);
        setCoverImage(permanentUri);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert(t('edit.pickImageFailed'), t('edit.pickImageFailedMsg'));
      }
    }
  }, [coverImage]);

  const handleSave = useCallback(() => {
    if (!recipeName.trim()) {
      Alert.alert(t('common.notice'), t('edit.nameRequired'));
      return;
    }

    // 多表写入（recipes/ingredients/steps）必须原子：2026-09-02 审计 B3 补事务包裹，
    // 中途失败回滚，避免留下无食材/无步骤的半损菜谱。
    withTransaction(() => {
      updateRecipe(recipeId, {
        name: recipeName.trim(),
        servings,
        coverImage,
      });

      deleteIngredientsByRecipe(recipeId);
      deleteStepsByRecipe(recipeId);

      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (ing.name.trim()) {
          createIngredient({
            recipeId,
            name: ing.name.trim(),
            amount: ing.amount.trim(),
            sortOrder: i,
          });
        }
      }

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.text.trim()) {
          createStep({
            recipeId,
            stepNumber: i + 1,
            text: step.text.trim(),
            tag: step.tag,
            durationSeconds:
              step.tag === 'wait_timer' && step.durationSeconds
                ? Number(step.durationSeconds)
                : undefined,
            sortOrder: i,
          });
        }
      }
    });

    navigation.goBack();
  }, [recipeId, recipeName, servings, coverImage, ingredients, steps, navigation]);

  const addIngredient = () => {
    setIngredients(prev => [...prev, { tempId: generateTempId(), name: '', amount: '' }]);
  };

  const removeIngredient = (tempId: string) => {
    setIngredients(prev => prev.filter(ing => ing.tempId !== tempId));
  };

  const updateIngredient = (tempId: string, field: keyof EditableIngredient, value: string) => {
    setIngredients(prev =>
      prev.map(ing => (ing.tempId === tempId ? { ...ing, [field]: value } : ing)),
    );
  };

  const moveIngredient = useCallback((fromIndex: number, toIndex: number) => {
    setIngredients(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { tempId: generateTempId(), text: '', tag: 'wait_user' as const, durationSeconds: '' },
    ]);
  };

  const removeStep = (tempId: string) => {
    setSteps(prev => prev.filter(step => step.tempId !== tempId));
  };

  const updateStep = (tempId: string, field: keyof EditableStep, value: string) => {
    setSteps(prev =>
      prev.map(step => (step.tempId === tempId ? { ...step, [field]: value } : step)),
    );
  };

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    setSteps(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const changeServings = (delta: number) => {
    setServings(prev => Math.max(1, prev + delta));
  };

  const llmService = useMemo(() => new LLMService(createApiClient()), []);

  const buildAiPrompt = useCallback(
    (mode: 'optimize' | 'split'): string => {
      const stepsText = steps
        .map(
          (s, i) =>
            `${i + 1}. ${s.text} (${t(`tags.${s.tag}`)})${s.durationSeconds ? ` ${t('common.seconds', { n: Number(s.durationSeconds) })}` : ''}`,
        )
        .join('\n');
      const ingredientsText = ingredients.map(i => `${i.name}: ${i.amount}`).join('\n');

      const instruction =
        mode === 'optimize' ? t('llm.optimizeInstruction') : t('llm.splitInstruction');

      return t('llm.editPromptTemplate', {
        instruction,
        recipeName,
        ingredients: ingredientsText,
        steps: stepsText,
      });
    },
    [t, recipeName, ingredients, steps],
  );

  const createStepsFromResponse = useCallback(
    (response: ParseRecipeResponse): EditableStep[] =>
      response.steps.map(step => ({
        tempId: generateTempId(),
        text: step.text,
        tag: step.tag,
        durationSeconds: step.duration_seconds != null ? String(step.duration_seconds) : '',
      })),
    [],
  );

  const handleAiAction = useCallback(
    async (mode: 'optimize' | 'split') => {
      setAiProcessing(true);
      setAiModalVisible(false);

      try {
        const prompt = buildAiPrompt(mode);
        const response = await llmService.parseRecipe({ input: prompt, source: 'text' });
        const newSteps = createStepsFromResponse(response);

        setProposedSteps(newSteps);
        setPreviewMode(mode);
        setPreviewVisible(true);
      } catch (error) {
        Alert.alert(
          t('edit.aiFailedTitle'),
          error instanceof Error ? error.message : t('common.unknownError'),
        );
      } finally {
        setAiProcessing(false);
      }
    },
    [buildAiPrompt, createStepsFromResponse, llmService],
  );

  const handleAcceptProposal = useCallback((acceptedSteps: EditableStep[]) => {
    setSteps(acceptedSteps);
    setPreviewVisible(false);
    setProposedSteps(null);
  }, []);

  const handleRejectProposal = useCallback(() => {
    setPreviewVisible(false);
    setProposedSteps(null);
  }, []);

  if (loading) {
    return (
      <SafeAreaContainer style={styles.container}>
        <RecipeEditSkeleton />
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <HeaderBar
          title={t('edit.title')}
          onBack={navigation.goBack}
          rightTitle={t('common.save')}
          onRightPress={handleSave}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: 基本信息 */}
          <View>
            <SectionTitle title={t('edit.basicInfo')} style={styles.sectionTitle} />
            <View style={styles.card}>
              <Text style={styles.label}>{t('edit.name')}</Text>
              <TextInput
                style={styles.input}
                value={recipeName}
                onChangeText={setRecipeName}
                placeholder={t('edit.namePlaceholder')}
                placeholderTextColor={colors.text.inputPlaceholder}
                accessibilityLabel={t('edit.name')}
              />

              <Text style={[styles.label, styles.labelSpacing]}>{t('edit.servings')}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => changeServings(-1)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.a11y.decrease')}
                >
                  <Text
                    style={styles.stepperButtonText}
                    accessibilityElementsHidden={true}
                    importantForAccessibility="no"
                  >
                    −
                  </Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{t('edit.servingsValue', { n: servings })}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => changeServings(1)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.a11y.increase')}
                >
                  <Text
                    style={styles.stepperButtonText}
                    accessibilityElementsHidden={true}
                    importantForAccessibility="no"
                  >
                    +
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, styles.labelSpacing]}>{t('edit.coverImage')}</Text>
              <TouchableOpacity
                style={styles.coverPlaceholder}
                activeOpacity={0.9}
                onPress={handlePickImage}
              >
                {coverImage ? (
                  <ImageBackground source={{ uri: coverImage }} style={styles.coverImagePreview} />
                ) : (
                  <>
                    <View style={styles.coverDecorCircle} />
                    <View style={styles.coverDecorArc} />
                    <View style={styles.coverDecorDot} />
                  </>
                )}
                <View style={styles.coverOverlay}>
                  <Icon name="camera" size={24} color={colors.primary} />
                  <Text style={styles.coverPlaceholderText}>
                    {coverImage ? t('edit.changeCover') : t('edit.addCover')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: 食材列表 */}
          <View>
            <SectionTitle title={t('edit.ingredientsSection')} style={styles.sectionTitle} />
            {listsReady ? (
              <View>
                {ingredients.map((ing, index) => (
                  <DraggableIngredient
                    key={ing.tempId}
                    ingredient={ing}
                    index={index}
                    totalCount={ingredients.length}
                    onMove={moveIngredient}
                    onUpdate={updateIngredient}
                    onRemove={removeIngredient}
                  />
                ))}
                <Button
                  variant="secondary"
                  title={t('edit.addIngredient')}
                  icon={<Icon name="plus" size={18} color={colors.text.secondary} />}
                  onPress={addIngredient}
                  style={styles.addButton}
                />
              </View>
            ) : (
              <ListPlaceholder rows={3} rowHeight={60} />
            )}
          </View>

          {/* Section 3: 步骤列表 */}
          <View>
            <SectionTitle title={t('edit.stepsSection')} style={styles.sectionTitle} />
            {listsReady ? (
              <View>
                {steps.map((step, index) => (
                  <DraggableStep
                    key={step.tempId}
                    step={step}
                    index={index}
                    totalCount={steps.length}
                    onMove={moveStep}
                    onUpdate={updateStep}
                    onRemove={removeStep}
                  />
                ))}
                <Button
                  variant="secondary"
                  title={t('edit.addStep')}
                  icon={<Icon name="plus" size={18} color={colors.text.secondary} />}
                  onPress={addStep}
                  style={styles.addButton}
                />
              </View>
            ) : (
              <ListPlaceholder rows={2} rowHeight={STEP_ITEM_HEIGHT} />
            )}
          </View>

          {/* AI 辅助按钮 */}
          <View>
            <Button
              variant="outline"
              title={t('edit.aiButton')}
              icon={<Icon name="ai" size={18} color={colors.primary} />}
              onPress={() => setAiModalVisible(true)}
              disabled={aiProcessing}
              loading={aiProcessing}
              style={styles.aiButton}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Fixed bottom save button */}
        <View style={styles.bottomBar}>
          <Button variant="primary" title={t('edit.saveRecipe')} onPress={handleSave} />
        </View>
      </KeyboardAvoidingView>

      {/* AI 选项 Modal */}
      <AiOptionsModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSelect={handleAiAction}
      />

      {/* 预览 Modal */}
      <AiDiffPreviewModal
        visible={previewVisible}
        originalSteps={steps}
        proposedSteps={proposedSteps ?? []}
        previewMode={previewMode}
        onAccept={handleAcceptProposal}
        onReject={handleRejectProposal}
      />

      {/* AI 处理中遮罩 */}
      <AiProcessingOverlay visible={aiProcessing} />
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.scrollBottomPadding,
  },
  sectionTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  labelSpacing: {
    marginTop: spacing.lg,
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    ...typography.h3,
    color: colors.text.secondary,
  },
  stepperValue: {
    ...typography.button,
    color: colors.text.primary,
    minWidth: 60,
    textAlign: 'center',
  },
  coverPlaceholder: {
    height: 190,
    borderRadius: spacing.radius.xl,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImagePreview: {
    ...StyleSheet.absoluteFill,
  },
  coverDecorCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
    top: -60,
    right: -40,
  },
  coverDecorArc: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.secondaryLight,
    opacity: 0.5,
    bottom: -30,
    left: -20,
  },
  coverDecorDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.accent,
    opacity: 0.4,
    top: 40,
    left: 60,
  },
  coverOverlay: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  coverPlaceholderText: {
    ...typography.button,
    color: colors.primary,
  },
  addButton: {
    marginTop: spacing.xs,
  },
  placeholderList: {
    gap: spacing.md,
  },
  aiButton: {
    marginTop: spacing.xl,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 0,
  },
  bottomSpacer: {
    height: spacing.scrollBottomPadding,
  },
});
