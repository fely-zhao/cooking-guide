import React, { useState, useRef } from 'react';
import { Alert, View, Text, StyleSheet, TextInput, Switch, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../hooks/useSettings';
import { settingsStorage } from '../services/storage';
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

// ── TTS Voice options ──
const TTS_VOICES = [
  { id: 'minimax-female', label: 'MiniMax Female' },
  { id: 'minimax-male', label: 'MiniMax Male' },
] as const;

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
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primaryLight }}
      thumbColor={value ? colors.primary : colors.surface}
      ios_backgroundColor={colors.border}
    />
  );
}

// ── Stepper ──
function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
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
      >
        <View style={styles.stepperBtnContent}>
          <Text style={[styles.stepperBtnText, !canDecrease && styles.stepperBtnTextDisabled]}>
            −
          </Text>
        </View>
      </PressableScale>
      <Text style={styles.stepperValue}>{value}</Text>
      <PressableScale
        scale={0.92}
        haptic="light"
        disabled={!canIncrease}
        onPress={() => canIncrease && onChange(value + 1)}
        style={[styles.stepperBtn, !canIncrease && styles.stepperBtnDisabled]}
      >
        <View style={styles.stepperBtnContent}>
          <Text style={[styles.stepperBtnText, !canIncrease && styles.stepperBtnTextDisabled]}>
            +
          </Text>
        </View>
      </PressableScale>
    </View>
  );
}

// ── Voice Selector (simple dropdown) ──
function VoiceSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = TTS_VOICES.find(v => v.id === selectedId);

  return (
    <View style={styles.dropdown}>
      <PressableScale
        style={styles.dropdownTrigger}
        onPress={() => setExpanded(!expanded)}
        haptic="light"
      >
        <View style={styles.dropdownTriggerContent}>
          <Text style={styles.dropdownText}>{selected?.label ?? '请选择语音'}</Text>
          <View style={[styles.dropdownArrow, expanded && styles.dropdownArrowUp]}>
            <Icon name="chevron-right" size={20} color={colors.text.muted} />
          </View>
        </View>
      </PressableScale>

      {expanded && (
        <View style={styles.dropdownOptions}>
          {TTS_VOICES.map((voice, index) => {
            const active = voice.id === selectedId;
            const isFirst = index === 0;
            return (
              <PressableScale
                key={voice.id}
                style={[
                  styles.dropdownOption,
                  active && styles.dropdownOptionActive,
                  !isFirst && styles.dropdownOptionBorder,
                ]}
                onPress={() => {
                  onSelect(voice.id);
                  setExpanded(false);
                }}
                haptic="light"
              >
                <View style={styles.dropdownOptionContent}>
                  <Text
                    style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}
                  >
                    {voice.label}
                  </Text>
                  {active && <Icon name="check" size={18} color={colors.primary} />}
                </View>
              </PressableScale>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Main Screen ──
export default function SettingsScreen() {
  const navigation = useNavigation();
  const settings = useSettings();

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
      Alert.alert('导出成功', `菜谱已导出到：\n${filePath}`);
    } catch (err) {
      Alert.alert('导出失败', (err as Error).message || '未知错误');
    }
  };

  const handleImport = async () => {
    try {
      const count = await importRecipesFromFile();
      if (count === 0) return; // user cancelled
      Alert.alert('导入成功', `已导入 ${count} 道菜谱`);
    } catch (err) {
      Alert.alert('导入失败', (err as Error).message || '未知错误');
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
      <HeaderBar title="设置" rightTitle="完成" onRightPress={handleDone} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* API 配置 */}
        <SectionCard title="服务地址" index={0}>
          <Text style={styles.fieldLabel}>Azure Speech Key（语音识别 + 播报共用）</Text>
          <TextInput
            style={styles.textInput}
            placeholder="粘贴 Azure 订阅密钥"
            placeholderTextColor={colors.text.placeholder}
            value={azureSpeechKey}
            onChangeText={setAzureSpeechKey}
            onEndEditing={e => update('azureSpeechKey', e.nativeEvent.text)}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
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
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>LLM 服务</Text>
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
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>TTS 服务</Text>
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
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>STT 服务</Text>
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
          />
        </SectionCard>

        {/* TTS 设置 */}
        <SectionCard title="TTS 设置" index={1}>
          <Text style={styles.fieldLabel}>语音选择</Text>
          <VoiceSelector
            selectedId={settings.ttsVoiceId}
            onSelect={id => update('ttsVoiceId', id)}
          />
        </SectionCard>

        {/* 烹饪默认 */}
        <SectionCard title="烹饪默认" index={2}>
          <SettingRow label="默认分量">
            <Stepper
              value={settings.defaultServings}
              min={1}
              max={20}
              onChange={v => update('defaultServings', v)}
            />
          </SettingRow>

          <Separator />

          <SettingRow label="手势控制">
            <SettingSwitch
              value={settings.gestureEnabled}
              onValueChange={v => update('gestureEnabled', v)}
            />
          </SettingRow>

          <Separator />

          <SettingRow label="耳机自动检测">
            <SettingSwitch
              value={settings.headsetAutoDetect}
              onValueChange={v => update('headsetAutoDetect', v)}
            />
          </SettingRow>
        </SectionCard>

        {/* 语言 */}
        <SectionCard title="语言" index={3}>
          <View style={styles.radioGroup}>
            {(['zh', 'en'] as const).map(lang => {
              const active = settings.language === lang;
              return (
                <PressableScale
                  key={lang}
                  style={[styles.radioItem, active && styles.radioItemActive]}
                  onPress={() => update('language', lang)}
                  haptic="selection"
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
        <SectionCard title="数据备份" index={4}>
          <Text style={styles.backupHint}>导出菜谱为 JSON 文件，可在换机或重装后导入恢复。</Text>
          <View style={styles.backupActions}>
            <View style={styles.backupButton}>
              <Button title="导出菜谱" onPress={handleExport} variant="secondary" />
            </View>
            <View style={styles.backupButton}>
              <Button title="导入菜谱" onPress={handleImport} variant="primary" />
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

  // Dropdown
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceFillLight,
  },
  dropdownTrigger: {
    padding: spacing.md,
  },
  dropdownTriggerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    ...typography.body,
    color: colors.text.primary,
  },
  dropdownArrow: {
    transform: [{ rotate: '90deg' }],
  },
  dropdownArrowUp: {
    transform: [{ rotate: '-90deg' }],
  },
  dropdownOptions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  dropdownOption: {
    padding: spacing.md,
  },
  dropdownOptionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownOptionBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  dropdownOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  dropdownOptionText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  dropdownOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
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
