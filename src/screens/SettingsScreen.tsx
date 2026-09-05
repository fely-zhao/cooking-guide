import React, { useState, useRef } from 'react';
import { Alert, View, Text, StyleSheet, TextInput, Switch, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../hooks/useSettings';
import { changeAppLanguage } from '../i18n';
import { settingsStorage } from '../services/storage';
import { TTS_VOLUME_LEVELS } from '../types/settings';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { HeaderBar } from '../components/HeaderBar';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { Icon } from '../components/icons';
import { exportRecipesToJson } from '../utils/export-recipes';
import { importRecipesFromFile } from '../utils/import-recipes';

// ── Volume level display keys（顺序对应 TTS_VOLUME_LEVELS index，显示名在 i18n）──
const VOLUME_LEVEL_KEYS = ['muted', 'low', 'standard', 'high', 'max'] as const;

// ── Section Card ──
function SectionCard({
  title,
  index,
  children,
}: {
  title: string;
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(Math.min((index ?? 0) * 100, 400))}
      style={styles.card}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </Animated.View>
  );
}

// ── Hairline separator between rows ──
function Separator() {
  return <View style={styles.separator} />;
}

// ── Row with label ──
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ── Unified switch ──
function SettingSwitch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  /** 行标签：Switch 与旁边文本无关联，读屏需要显式 label */
  accessibilityLabel: string;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primaryLight }}
      thumbColor={value ? colors.primary : colors.surface}
      ios_backgroundColor={colors.border}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

// ── Stepper ──
function Stepper({
  value,
  min,
  max,
  onChange,
  formatValue,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** Optional display formatter (e.g. level labels instead of raw numbers) */
  formatValue?: (v: number) => string;
}) {
  const { t } = useTranslation();
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={styles.stepper}>
      <PressableScale
        scale={0.92}
        haptic="light"
        disabled={!canDecrease}
        onPress={() => canDecrease && onChange(value - 1)}
        style={[styles.stepperBtn, !canDecrease && styles.stepperBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={t('settings.a11y.decrease')}
        accessibilityState={{ disabled: !canDecrease }}
      >
        <View style={styles.stepperBtnContent}>
          <Text
            style={[styles.stepperBtnText, !canDecrease && styles.stepperBtnTextDisabled]}
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
          >
            −
          </Text>
        </View>
      </PressableScale>
      <Text style={styles.stepperValue}>{formatValue ? formatValue(value) : value}</Text>
      <PressableScale
        scale={0.92}
        haptic="light"
        disabled={!canIncrease}
        onPress={() => canIncrease && onChange(value + 1)}
        style={[styles.stepperBtn, !canIncrease && styles.stepperBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={t('settings.a11y.increase')}
        accessibilityState={{ disabled: !canIncrease }}
      >
        <View style={styles.stepperBtnContent}>
          <Text
            style={[styles.stepperBtnText, !canIncrease && styles.stepperBtnTextDisabled]}
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
          >
            +
          </Text>
        </View>
      </PressableScale>
    </View>
  );
}

// ── Voice Selector 已删除（2026-09-02 代码审计 B1）：ttsVoiceId 设置项无消费路径，
// 播报音色由 src/i18n/voiceMap.ts 按文本语言自动决定，设置页不再提供音色选择。
// ── Main Screen ──
export default function SettingsScreen() {
  const navigation = useNavigation();
  const settings = useSettings();
  const { t, i18n } = useTranslation();

  // Local state for text inputs (to avoid keystroke re-render lag)
  const [llmUrl, setLlmUrl] = useState(settings.llmUrl);
  const [ttsUrl, setTtsUrl] = useState(settings.ttsUrl);
  const [sttUrl, setSttUrl] = useState(settings.sttUrl);
  const [azureSpeechKey, setAzureSpeechKey] = useState(settings.azureSpeechKey);
  const [azureRegion, setAzureRegion] = useState(settings.azureRegion);

  // Refs to always hold latest values, avoiding stale closures in handleDone
  const llmRef = useRef(llmUrl);
  const ttsRef = useRef(ttsUrl);
  const sttRef = useRef(sttUrl);
  const azureKeyRef = useRef(azureSpeechKey);
  const azureRegionRef = useRef(azureRegion);
  llmRef.current = llmUrl;
  ttsRef.current = ttsUrl;
  sttRef.current = sttUrl;
  azureKeyRef.current = azureSpeechKey;
  azureRegionRef.current = azureRegion;

  const update = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    settingsStorage.set(key, value);
  };

  const handleExport = async () => {
    try {
      const filePath = await exportRecipesToJson();
      Alert.alert(t('settings.exportSuccess'), t('settings.exportSuccessMsg', { path: filePath }));
    } catch (err) {
      Alert.alert(
        t('settings.exportFailed'),
        err instanceof Error ? err.message : t('common.unknownError'),
      );
    }
  };

  const handleImport = async () => {
    try {
      const count = await importRecipesFromFile();
      if (count === 0) return; // user cancelled
      Alert.alert(t('settings.importSuccess'), t('settings.importSuccessMsg', { count }));
    } catch (err) {
      Alert.alert(
        t('settings.importFailed'),
        err instanceof Error ? err.message : t('common.unknownError'),
      );
    }
  };

  const handleDone = () => {
    update('llmUrl', llmRef.current);
    update('ttsUrl', ttsRef.current);
    update('sttUrl', sttRef.current);
    update('azureSpeechKey', azureKeyRef.current);
    update('azureRegion', azureRegionRef.current);
    navigation.goBack();
  };

  return (
    <SafeAreaContainer style={styles.container}>
      <HeaderBar
        title={t('settings.title')}
        rightTitle={t('common.done')}
        onRightPress={handleDone}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* API 配置 */}
        <SectionCard title={t('settings.sections.services')} index={0}>
          <Text style={styles.fieldLabel}>{t('settings.azureKeyLabel')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('settings.azureKeyPlaceholder')}
            placeholderTextColor={colors.text.placeholder}
            value={azureSpeechKey}
            onChangeText={setAzureSpeechKey}
            onEndEditing={e => update('azureSpeechKey', e.nativeEvent.text)}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            accessibilityLabel={t('settings.azureKeyLabel')}
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Azure Region</Text>
          <TextInput
            style={styles.textInput}
            placeholder="eastasia"
            placeholderTextColor={colors.text.placeholder}
            value={azureRegion}
            onChangeText={setAzureRegion}
            onEndEditing={e => update('azureRegion', e.nativeEvent.text)}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Azure Region"
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t('settings.llmService')}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="http://localhost:3001"
            placeholderTextColor={colors.text.placeholder}
            value={llmUrl}
            onChangeText={setLlmUrl}
            onEndEditing={e => update('llmUrl', e.nativeEvent.text)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel={t('settings.llmService')}
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t('settings.ttsService')}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="http://localhost:4000"
            placeholderTextColor={colors.text.placeholder}
            value={ttsUrl}
            onChangeText={setTtsUrl}
            onEndEditing={e => update('ttsUrl', e.nativeEvent.text)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel={t('settings.ttsService')}
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t('settings.sttService')}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="http://localhost:5000"
            placeholderTextColor={colors.text.placeholder}
            value={sttUrl}
            onChangeText={setSttUrl}
            onEndEditing={e => update('sttUrl', e.nativeEvent.text)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel={t('settings.sttService')}
          />
        </SectionCard>

        {/* TTS 设置（2026-09-02 移除音色选择器，审计 B1：设置无消费路径，音色由 voiceMap 自动决定） */}
        <SectionCard title={t('settings.sections.tts')} index={1}>
          <SettingRow label={t('settings.volumeLabel')}>
            <Stepper
              value={settings.ttsVolumeLevel}
              min={0}
              max={TTS_VOLUME_LEVELS.length - 1}
              formatValue={v => t(`settings.volumeLevels.${VOLUME_LEVEL_KEYS[v]}`)}
              onChange={v => update('ttsVolumeLevel', v)}
            />
          </SettingRow>
        </SectionCard>

        {/* 烹饪默认 */}
        <SectionCard title={t('settings.sections.cooking')} index={2}>
          <SettingRow label={t('settings.defaultServings')}>
            <Stepper
              value={settings.defaultServings}
              min={1}
              max={20}
              onChange={v => update('defaultServings', v)}
            />
          </SettingRow>

          <Separator />

          <SettingRow label={t('settings.gestureControl')}>
            <SettingSwitch
              value={settings.gestureEnabled}
              onValueChange={v => update('gestureEnabled', v)}
              accessibilityLabel={t('settings.gestureControl')}
            />
          </SettingRow>

          <Separator />

          <SettingRow label={t('settings.headsetAutoDetect')}>
            <SettingSwitch
              value={settings.headsetAutoDetect}
              onValueChange={v => update('headsetAutoDetect', v)}
              accessibilityLabel={t('settings.headsetAutoDetect')}
            />
          </SettingRow>
        </SectionCard>

        {/* 语言 */}
        <SectionCard title={t('settings.sections.language')} index={3}>
          <View style={styles.radioGroup}>
            {(['zh', 'en'] as const).map(lang => {
              // 选中态以 i18n 实际生效语言为准（未选择时跟随系统，裸 MMKV 值不可靠）
              const active = (i18n.language === 'en' ? 'en' : 'zh') === lang;
              return (
                <PressableScale
                  key={lang}
                  style={[styles.radioItem, active && styles.radioItemActive]}
                  onPress={() => changeAppLanguage(lang)}
                  haptic="selection"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.radioItemContent}>
                    {active ? (
                      <Icon name="check" size={20} color={colors.primary} />
                    ) : (
                      <View style={styles.radioDot} />
                    )}
                    <Text style={[styles.radioLabel, active && styles.radioLabelActive]}>
                      {lang === 'zh' ? '中文' : 'English'}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </SectionCard>

        {/* 数据备份 */}
        <SectionCard title={t('settings.sections.backup')} index={4}>
          <Text style={styles.backupHint}>{t('settings.backupHint')}</Text>
          <View style={styles.backupActions}>
            <View style={styles.backupButton}>
              <Button
                title={t('settings.exportRecipes')}
                onPress={handleExport}
                variant="secondary"
              />
            </View>
            <View style={styles.backupButton}>
              <Button
                title={t('settings.importRecipes')}
                onPress={handleImport}
                variant="primary"
              />
            </View>
          </View>
        </SectionCard>
      </ScrollView>
    </SafeAreaContainer>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.caption,
    color: colors.text.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },

  // Field label
  fieldLabel: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  fieldLabelSpaced: {
    marginTop: spacing.md,
  },

  // Text input
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.sm,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.surfaceFillLight,
  },

  // Row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceFill,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepperBtnContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: colors.surfaceFillLight,
    borderColor: colors.borderLight,
  },
  stepperBtnText: {
    ...typography.h4,
    color: colors.text.secondary,
  },
  stepperBtnTextDisabled: {
    color: colors.text.disabled,
  },
  stepperValue: {
    ...typography.header,
    color: colors.text.primary,
    minWidth: spacing.xxl,
    textAlign: 'center',
  },

  // Radio
  radioGroup: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  radioItem: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceFillLight,
  },
  radioItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  radioItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: spacing.radius.full,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioLabel: {
    ...typography.body,
    color: colors.text.muted,
  },
  radioLabelActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },

  // Backup
  backupHint: {
    ...typography.bodySmall,
    color: colors.text.muted,
    marginBottom: spacing.lg,
  },
  backupActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backupButton: {
    flex: 1,
  },
});
