import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { HeaderBar } from '../components/HeaderBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RecipeInputNavigationProp, RecipeInputStackParamList } from '../navigation/types';
import type { ParseRecipeResponse } from '../types/api';
import { STTService, recordAudio } from '../services/stt';
import { LLMService } from '../services/llm';
import { settingsStorage } from '../services/storage';
import { AZURE_REGION, createApiClient } from '../config';

type VoiceInputRouteProp = RouteProp<RecipeInputStackParamList, 'VoiceInput'>;

const RECORD_BUTTON_SIZE = 120;
const WAVE_BAR_COUNT = 7;
const MAX_RECORD_SECONDS = 30;

function useWaveAnimations(count: number) {
  const anims: ReturnType<typeof useSharedValue<number>>[] = [];
  for (let i = 0; i < count; i++) {
    anims.push(useSharedValue(0.15));
  }
  return anims;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function VoiceInputScreen() {
  const navigation = useNavigation<RecipeInputNavigationProp>();
  const route = useRoute<VoiceInputRouteProp>();
  const { onSave } = route.params;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useSharedValue(1);
  const waveAnims = useWaveAnimations(WAVE_BAR_COUNT);

  const processRecording = useCallback(
    async (durationSeconds: number) => {
      const speechKey = settingsStorage.get('azureSpeechKey') ?? '';
      if (!speechKey) {
        Alert.alert('未配置 Azure Key', '请先在「设置」页填写 Azure Speech Key，再使用语音录入。');
        return;
      }
      const speechRegion = settingsStorage.get('azureRegion') ?? AZURE_REGION;

      setIsProcessing(true);
      try {
        const { filePath } = await recordAudio({
          maxDurationMs: Math.max(durationSeconds * 1000, 1000),
        });

        const sttService = new STTService(speechKey, speechRegion);
        const text = await sttService.speechToTextForCommand(filePath);

        if (text.trim().length === 0) {
          Alert.alert('未识别到语音', '请重新录制。');
          return;
        }

        const llmService = new LLMService(createApiClient());
        const response: ParseRecipeResponse = await llmService.parseRecipe({
          input: text,
          source: 'voice',
        });

        onSave?.(response);
      } catch {
        Alert.alert('识别失败', '语音识别或解析出错，请重试。');
      } finally {
        setIsProcessing(false);
      }
    },
    [onSave, navigation],
  );

  const handleStopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);
    const seconds = elapsedSeconds;
    setElapsedSeconds(0);
    processRecording(seconds);
  }, [isRecording, elapsedSeconds, processRecording]);

  const handleToggleRecording = useCallback(() => {
    if (isProcessing) return;

    if (isRecording) {
      handleStopRecording();
    } else {
      setElapsedSeconds(0);
      setIsRecording(true);
    }
  }, [isRecording, isProcessing, handleStopRecording]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const recordButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const waveBarAnimatedStyles = waveAnims.map(anim =>
    useAnimatedStyle(() => ({
      transform: [{ scaleY: anim.value }],
    })),
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Recording animations and timer
  useEffect(() => {
    if (!isRecording) return;

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    waveAnims.forEach((anim, i) => {
      const duration = 350 + i * 90;
      anim.value = withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, { duration, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    });

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      pulseAnim.value = 1;
      waveAnims.forEach(anim => {
        anim.value = 0.15;
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, pulseAnim, waveAnims]);

  // Auto-stop at max duration
  useEffect(() => {
    if (elapsedSeconds >= MAX_RECORD_SECONDS && isRecording) {
      handleStopRecording();
    }
  }, [elapsedSeconds, isRecording, handleStopRecording]);

  return (
    <SafeAreaContainer style={styles.container}>
      <HeaderBar
        title="语音录入"
        onBack={handleCancel}
        rightTitle="完成"
        onRightPress={handleConfirm}
      />

      <View style={styles.content}>
        {/* Status */}
        <Text style={styles.statusText}>
          {isRecording ? '录音中...' : isProcessing ? '识别中...' : '点击开始录音'}
        </Text>

        {/* Timer */}
        <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>

        {/* Waveform */}
        <View style={styles.waveform}>
          {waveAnims.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                isRecording ? styles.waveBarActive : styles.waveBarInactive,
                waveBarAnimatedStyles[i],
              ]}
            />
          ))}
        </View>

        {/* Record Button */}
        <TouchableOpacity
          onPress={handleToggleRecording}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              recordButtonAnimatedStyle,
              isProcessing && styles.recordButtonDisabled,
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color={colors.text.inverse} />
            ) : (
              <View
                style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]}
              />
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* Hint */}
        <Text style={styles.hintText}>
          {isRecording
            ? '再次点击停止录音'
            : isProcessing
              ? '正在识别语音...'
              : `最长录制 ${MAX_RECORD_SECONDS} 秒`}
        </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: 80,
  },
  statusText: {
    ...typography.button,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  timerText: {
    ...typography.timer,
    color: colors.text.primary,
    marginBottom: spacing.xxxl,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 48,
    marginBottom: 40,
  },
  waveBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: colors.danger,
  },
  waveBarActive: {
    opacity: 1,
  },
  waveBarInactive: {
    opacity: 0.2,
  },
  recordButton: {
    width: RECORD_BUTTON_SIZE,
    height: RECORD_BUTTON_SIZE,
    borderRadius: RECORD_BUTTON_SIZE / 2,
    backgroundColor: colors.text.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  recordButtonActive: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  recordButtonDisabled: {
    opacity: 0.7,
  },
  recordButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  recordButtonInnerActive: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  hintText: {
    ...typography.caption,
    color: colors.text.placeholder,
    marginTop: spacing.xxl,
  },
});
