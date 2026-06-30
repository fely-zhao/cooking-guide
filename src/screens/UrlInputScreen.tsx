import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { HeaderBar } from '../components/HeaderBar';
import { Button } from '../components/Button';
import { SectionTitle } from '../components/SectionTitle';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RecipeInputNavigationProp, RecipeInputStackParamList } from '../navigation/types';
import type { ParseRecipeResponse } from '../types/api';
import { LLMService } from '../services/llm';
import { createApiClient } from '../config';
import { Icon } from '../components/icons';

type UrlInputRouteProp = RouteProp<RecipeInputStackParamList, 'UrlInput'>;

function isValidUrl(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export default function UrlInputScreen() {
  const navigation = useNavigation<RecipeInputNavigationProp>();
  const route = useRoute<UrlInputRouteProp>();
  const { onSave } = route.params;

  const [url, setUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleComplete = useCallback(async () => {
    if (!isValidUrl(url) || isParsing) {
      return;
    }

    setIsParsing(true);
    try {
      const llmService = new LLMService(createApiClient());

      const response: ParseRecipeResponse = await llmService.parseRecipe({
        input: url.trim(),
        source: 'url',
      });

      onSave?.(response);
    } catch {
      Alert.alert('解析失败', '无法解析该链接内容，请检查链接是否有效。');
    } finally {
      setIsParsing(false);
    }
  }, [url, isParsing, onSave, navigation]);

  const canParse = isValidUrl(url) && !isParsing;

  return (
    <SafeAreaContainer style={styles.container}>
      <HeaderBar
        title="链接导入"
        onBack={handleCancel}
        rightTitle="完成"
        onRightPress={handleComplete}
        rightDisabled={!canParse}
      />
      />

      <View style={styles.content}>
        {/* URL Input */}
        <SectionTitle title="菜谱链接" style={styles.sectionTitle} />
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.urlInput}
            value={url}
            onChangeText={setUrl}
            placeholder="粘贴菜谱链接"
            placeholderTextColor={colors.text.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            editable={!isParsing}
          />
          {url.length > 0 && !isParsing && (
            <TouchableOpacity style={styles.clearButton} onPress={() => setUrl('')}>
              <Icon name="close" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.hint}>支持 http 和 https 链接</Text>

        {/* Parse Button */}
        <Button
          variant="primary"
          title="解析菜谱"
          onPress={handleComplete}
          disabled={!canParse}
          loading={isParsing}
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
  },
  urlInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...typography.button,
    color: colors.text.primary,
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -12,
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.text.placeholder,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
});
