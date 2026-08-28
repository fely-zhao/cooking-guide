import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { HeaderBar } from '../components/HeaderBar';
import { Button } from '../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RecipeInputNavigationProp, RecipeInputStackParamList } from '../navigation/types';
import type { ParseRecipeResponse } from '../types/api';
import { LLMService } from '../services/llm';
import { createApiClient } from '../config';

type ManualInputRouteProp = RouteProp<RecipeInputStackParamList, 'ManualInput'>;

export default function ManualInputScreen() {
  const navigation = useNavigation<RecipeInputNavigationProp>();
  const route = useRoute<ManualInputRouteProp>();
  const { onSave } = route.params;

  const [recipeText, setRecipeText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleSave = useCallback(async () => {
    if (!recipeText.trim()) {
      Alert.alert('提示', '请输入菜谱内容');
      return;
    }
    if (isParsing) {
      return;
    }

    setIsParsing(true);
    try {
      const llmService = new LLMService(createApiClient());

      const response: ParseRecipeResponse = await llmService.parseRecipe({
        input: recipeText.trim(),
        source: 'text',
      });

      onSave?.(response);
    } catch (error) {
      console.error('ManualInputScreen.parseRecipe failed:', error);
      Alert.alert(
        '解析失败',
        `无法解析输入的菜谱内容，请检查后重试。\n\n${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsParsing(false);
    }
  }, [recipeText, isParsing, onSave, navigation]);

  return (
    <SafeAreaContainer style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <HeaderBar
          title="手动录入"
          onBack={navigation.goBack}
          rightTitle="完成"
          onRightPress={handleSave}
          rightDisabled={isParsing}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <TextInput
              style={styles.textArea}
              value={recipeText}
              onChangeText={setRecipeText}
              placeholder={`把菜谱粘贴在这里，或者直接输入...

例如：
番茄炒蛋

食材：
- 番茄 2个
- 鸡蛋 3个
- 葱 适量
- 盐 适量
- 糖 少许

步骤：
1. 番茄切块，鸡蛋打散备用
2. 热锅凉油，倒入蛋液翻炒至凝固
3. 加入番茄块翻炒出汁
4. 加入盐和糖调味
5. 小火炖煮3分钟让味道融合`}
              placeholderTextColor={colors.text.inputPlaceholder}
              textAlignVertical="top"
              multiline
              editable={!isParsing}
            />
          </View>

          {isParsing && (
            <View style={styles.parsingHint}>
              <Text style={styles.parsingHintText}>AI 正在解析菜谱…</Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Fixed bottom save button */}
        <View style={styles.bottomBar}>
          <Button
            title="完成"
            variant="primary"
            onPress={handleSave}
            disabled={isParsing}
            loading={isParsing}
          />
        </View>
      </KeyboardAvoidingView>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 300,
    ...typography.button,
    color: colors.text.primary,
  },
  parsingHint: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  parsingHintText: {
    ...typography.bodySmall,
    color: colors.text.muted,
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
    paddingBottom: spacing.xxxl,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
