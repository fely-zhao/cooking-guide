import React, { useState, useCallback } from 'react';
import {
  View,
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
import { AiProcessingOverlay } from '../components/LoadingOverlay';
import { Button } from '../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RecipeInputNavigationProp, RecipeInputStackParamList } from '../navigation/types';
import type { ParseRecipeResponse } from '../types/api';
import { LLMService } from '../services/llm';
import { createApiClient } from '../config';
import { useTranslation } from 'react-i18next';

type ManualInputRouteProp = RouteProp<RecipeInputStackParamList, 'ManualInput'>;

export default function ManualInputScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<RecipeInputNavigationProp>();
  const route = useRoute<ManualInputRouteProp>();
  const { onSave } = route.params;

  const [recipeText, setRecipeText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleSave = useCallback(async () => {
    if (!recipeText.trim()) {
      Alert.alert(t('common.notice'), t('manual.emptyContent'));
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
        t('common.parseFailed'),
        t('manual.parseFailedMsg', {
          error: error instanceof Error ? error.message : String(error),
        }),
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
        <HeaderBar title={t('manual.title')} onBack={navigation.goBack} />

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
              placeholder={t('manual.placeholder')}
              placeholderTextColor={colors.text.inputPlaceholder}
              textAlignVertical="top"
              multiline
              editable={!isParsing}
              accessibilityLabel={t('manual.title')}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <AiProcessingOverlay visible={isParsing} />

        {/* Fixed bottom save button */}
        <View style={styles.bottomBar}>
          <Button
            title={t('common.done')}
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
