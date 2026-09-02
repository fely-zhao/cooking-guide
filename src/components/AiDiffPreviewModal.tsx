import React from 'react';
import { View, Text, ScrollView, Modal, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from './Button';
import type { EditableStep } from '../utils/recipe-edit';

interface AiDiffPreviewModalProps {
  visible: boolean;
  originalSteps: EditableStep[];
  proposedSteps: EditableStep[];
  previewMode: 'optimize' | 'split';
  onAccept: (acceptedSteps: EditableStep[]) => void;
  onReject: () => void;
}

export function AiDiffPreviewModal({
  visible,
  originalSteps,
  proposedSteps,
  previewMode,
  onAccept,
  onReject,
}: AiDiffPreviewModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onReject}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {t(
              previewMode === 'optimize' ? 'components.previewOptimize' : 'components.previewSplit',
            )}
          </Text>

          <ScrollView style={styles.scroll}>
            {/* Old steps section */}
            <Text style={styles.sectionLabel}>{t('components.originalSteps')}</Text>
            {originalSteps.map((s, i) => (
              <View key={s.tempId} style={styles.stepRow}>
                <Text style={styles.stepIndex}>{i + 1}</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>{s.text}</Text>
                  <Text style={styles.stepTag}>{t(`tags.${s.tag}`)}</Text>
                </View>
              </View>
            ))}

            <View style={styles.divider}>
              <Text style={styles.arrow}>↓</Text>
            </View>

            {/* New steps section */}
            <Text style={styles.sectionLabel}>
              {t(
                previewMode === 'optimize' ? 'components.optimizedSteps' : 'components.splitSteps',
              )}
            </Text>
            {proposedSteps.map((s, i) => (
              <View key={s.tempId} style={[styles.stepRow, styles.stepRowNew]}>
                <Text style={styles.stepIndex}>{i + 1}</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>{s.text}</Text>
                  <View style={styles.stepMeta}>
                    <Text style={[styles.stepTag, styles.stepTagNew]}>{t(`tags.${s.tag}`)}</Text>
                    {s.durationSeconds ? (
                      <Text style={styles.stepDuration}>
                        {t('common.seconds', { n: Number(s.durationSeconds) })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <Button
              variant="outline"
              title={t('components.reject')}
              onPress={onReject}
              style={styles.actionButton}
            />
            <Button
              variant="primary"
              title={t('components.accept')}
              onPress={() => onAccept(proposedSteps)}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay40,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '85%',
  },
  title: {
    ...typography.header,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  scroll: {
    maxHeight: 400,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.text.placeholder,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radius.sm,
    backgroundColor: colors.surfaceFill,
    marginBottom: 6,
  },
  stepRowNew: {
    backgroundColor: colors.successSurface,
  },
  stepIndex: {
    width: 24,
    ...typography.caption,
    color: colors.text.placeholder,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  stepTag: {
    ...typography.badge,
    color: colors.text.placeholder,
    marginTop: spacing.xs,
  },
  stepTagNew: {
    color: colors.success,
    fontWeight: '500',
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stepDuration: {
    ...typography.badge,
    color: colors.primary,
  },
  divider: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  arrow: {
    ...typography.h3,
    color: colors.text.placeholder,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    flex: 1,
  },
});
