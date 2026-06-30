import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Alert } from 'react-native';
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

type ImageInputRouteProp = RouteProp<RecipeInputStackParamList, 'ImageInput'>;

type ActionSheetOption = {
  label: string;
  onPress: () => void;
};

/** Placeholder base64 used for mock image selection in dev mode */
const MOCK_IMAGE_BASE64 =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsM';

export default function ImageInputScreen() {
  const navigation = useNavigation<RecipeInputNavigationProp>();
  const route = useRoute<ImageInputRouteProp>();
  const { onSave } = route.params;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePreviewPress = useCallback(() => {
    setActionSheetVisible(true);
  }, []);

  const handleActionSelect = useCallback(() => {
    // Mock: simulate picking from gallery
    setImageUri(MOCK_IMAGE_BASE64);
    setActionSheetVisible(false);
  }, []);

  const handleActionCamera = useCallback(() => {
    // Mock: simulate taking a photo
    setImageUri(MOCK_IMAGE_BASE64);
    setActionSheetVisible(false);
  }, []);

  const handleRecognize = useCallback(async () => {
    if (!imageUri || isRecognizing) {
      return;
    }

    setIsRecognizing(true);
    try {
      const llmService = new LLMService(createApiClient());

      // Extract base64 data and mime type from data URI
      const mimeMatch = imageUri.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
      const rawBase64 = imageUri.replace(/^data:image\/\w+;base64,/, '');

      const response: ParseRecipeResponse = await llmService.parseRecipe({
        input: { image_base64: rawBase64, mime_type: mimeType },
        source: 'image',
      });

      onSave?.(response);
    } catch {
      Alert.alert('识别失败', '无法解析图片内容，请重试或换一张图片。');
    } finally {
      setIsRecognizing(false);
    }
  }, [imageUri, isRecognizing, onSave, navigation]);

  const actionSheetOptions: ActionSheetOption[] = [
    { label: '拍照', onPress: handleActionCamera },
    { label: '从相册选择', onPress: handleActionSelect },
  ];

  return (
    <SafeAreaContainer style={styles.container}>
        <HeaderBar
          title="截图识别"
          onBack={handleCancel}
          rightTitle="完成"
          onRightPress={handleRecognize}
        />

      <View style={styles.content}>
        {/* Preview Area */}
        <SectionTitle title="选择图片" style={styles.sectionTitle} />
        <TouchableOpacity
          style={styles.previewArea}
          onPress={handlePreviewPress}
          activeOpacity={0.7}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Icon name="camera" size={40} color={colors.text.placeholder} />
              <Text style={styles.previewPlaceholderText}>点击选择图片</Text>
              <Text style={styles.previewPlaceholderHint}>支持拍照或从相册选取</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Recognize Button */}
        {imageUri && (
          <Button
            title="识别菜谱"
            onPress={handleRecognize}
            variant="primary"
            loading={isRecognizing}
            disabled={isRecognizing}
          />
        )}
      </View>

      {/* ActionSheet Modal */}
      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setActionSheetVisible(false)}
        >
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheet}>
              {actionSheetOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.actionSheetOption,
                    index < actionSheetOptions.length - 1 && styles.actionSheetOptionBorder,
                  ]}
                  onPress={option.onPress}
                >
                  <Text style={styles.actionSheetOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionSheet}>
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => setActionSheetVisible(false)}
              >
                <Text style={styles.actionSheetCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  previewArea: {
    aspectRatio: 1,
    borderRadius: spacing.radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.divider,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  previewPlaceholderText: {
    ...typography.button,
    color: colors.text.muted,
  },
  previewPlaceholderHint: {
    ...typography.caption,
    color: colors.text.placeholder,
  },
  /* ActionSheet */
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay40,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  actionSheetContainer: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  actionSheet: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionSheetOption: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  actionSheetOptionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actionSheetOptionText: {
    ...typography.header,
    color: colors.text.primary,
  },
  actionSheetCancelText: {
    ...typography.header,
    color: colors.primary,
  },
});
