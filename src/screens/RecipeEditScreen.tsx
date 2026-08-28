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
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { RootStackNavigationProp, RootStackParamList } from '../navigation/types';
import { getRecipe, updateRecipe } from '../db/recipes';
import { deleteByRecipe as deleteIngredientsByRecipe, createIngredient } from '../db/ingredients';
import { deleteByRecipe as deleteStepsByRecipe, createStep } from '../db/steps';
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
import {
  EditableIngredient,
  EditableStep,
  TAG_OPTIONS,
  generateTempId,
} from '../utils/recipe-edit';
import { AiProcessingOverlay } from '../components/AiProcessingOverlay';
import { AiOptionsModal } from '../components/AiOptionsModal';
import { AiDiffPreviewModal } from '../components/AiDiffPreviewModal';
import { Icon } from '../components/icons';
import { DraggableStep } from '../components/DraggableStep';
import { DraggableIngredient } from '../components/DraggableIngredient';
import { saveCoverImagePermanent, deleteCoverImage } from '../utils/cover-image';

type RecipeEditRouteProp = RouteProp<RootStackParamList, 'RecipeEdit'>;

const SECTION_STAGGER = 80;

export default function RecipeEditScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RecipeEditRouteProp>();
  const { recipeId } = route.params;

  const [recipeName, setRecipeName] = useState('');
  const [servings, setServings] = useState(1);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [proposedSteps, setProposedSteps] = useState<EditableStep[] | null>(null);
  const [previewMode, setPreviewMode] = useState<'optimize' | 'split'>('optimize');

  useEffect(() => {
    const recipe = getRecipe(recipeId);
    if (!recipe) {
      Alert.alert('错误', '菜谱不存在');
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
        Alert.alert('选图失败', '无法选择图片');
      }
    }
  }, [coverImage]);

  const handleSave = useCallback(() => {
    if (!recipeName.trim()) {
      Alert.alert('提示', '请输入菜谱名称');
      return;
    }

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
            `${i + 1}. ${s.text} (${TAG_OPTIONS.find(t => t.value === s.tag)?.label ?? s.tag})${s.durationSeconds ? ` ${s.durationSeconds}秒` : ''}`,
        )
        .join('\n');
      const ingredientsText = ingredients.map(i => `${i.name}: ${i.amount}`).join('\n');

      const instruction =
        mode === 'optimize'
          ? '优化以下菜谱的步骤文案，使其更清晰、具体、可操作。保持步骤数量不变。\n请优化每一步的文案，保持步骤数量一致。返回结构化菜谱。'
          : '检查以下菜谱的每一步，如果某步包含多个独立操作，将其拆分为多个子步骤，并为每个子步骤打上合适的标签（instant=快速操作, wait_user=需判断, wait_timer=计时操作）。不含多操作的步骤保持不变。\n请拆分多操作步骤。返回结构化菜谱。';

      return `你是专业菜谱助手。${instruction}

菜谱名称: ${recipeName}

食材:
${ingredientsText}

当前步骤:
${stepsText}`;
    },
    [recipeName, ingredients, steps],
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
        Alert.alert('AI 处理失败', error instanceof Error ? error.message : '未知错误');
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
          title="编辑菜谱"
          onBack={navigation.goBack}
          rightTitle="保存"
          onRightPress={handleSave}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: 基本信息 */}
          <Animated.View entering={FadeInUp.duration(400).delay(SECTION_STAGGER * 0)}>
            <SectionTitle title="基本信息" style={styles.sectionTitle} />
            <View style={styles.card}>
              <Text style={styles.label}>名称</Text>
              <TextInput
                style={styles.input}
                value={recipeName}
                onChangeText={setRecipeName}
                placeholder="输入菜谱名称"
                placeholderTextColor={colors.text.inputPlaceholder}
              />

              <Text style={[styles.label, styles.labelSpacing]}>分量</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperButton} onPress={() => changeServings(-1)}>
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{servings} 人份</Text>
                <TouchableOpacity style={styles.stepperButton} onPress={() => changeServings(1)}>
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, styles.labelSpacing]}>封面图片</Text>
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
                    {coverImage ? '更换封面' : '添加封面'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Section 2: 食材列表 */}
          <Animated.View entering={FadeInUp.duration(400).delay(SECTION_STAGGER * 1)}>
            <SectionTitle title="食材列表" style={styles.sectionTitle} />
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
                title="添加食材"
                icon={<Icon name="plus" size={18} color={colors.text.secondary} />}
                onPress={addIngredient}
                style={styles.addButton}
              />
            </View>
          </Animated.View>

          {/* Section 3: 步骤列表 */}
          <Animated.View entering={FadeInUp.duration(400).delay(SECTION_STAGGER * 2)}>
            <SectionTitle title="步骤列表" style={styles.sectionTitle} />
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
                title="添加步骤"
                icon={<Icon name="plus" size={18} color={colors.text.secondary} />}
                onPress={addStep}
                style={styles.addButton}
              />
            </View>
          </Animated.View>

          {/* AI 辅助按钮 */}
          <Animated.View entering={FadeInUp.duration(400).delay(SECTION_STAGGER * 3)}>
            <Button
              variant="outline"
              title="AI 优化步骤"
              icon={<Icon name="ai" size={18} color={colors.primary} />}
              onPress={() => setAiModalVisible(true)}
              disabled={aiProcessing}
              loading={aiProcessing}
              style={styles.aiButton}
            />
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Fixed bottom save button */}
        <View style={styles.bottomBar}>
          <Button variant="primary" title="保存菜谱" onPress={handleSave} />
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
