import React from 'react';
import { View, Text, ScrollView, Modal, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from './Button';
import type { EditableStep } from '../utils/recipe-edit';
import { TAG_OPTIONS } from '../utils/recipe-edit';

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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onReject}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {previewMode === 'optimize' ? '预览文案优化' : '预览子步骤拆分'}
          </Text>

          <ScrollView style={styles.scroll}>
            {/* Old steps section */}
            <Text style={styles.sectionLabel}>原始步骤</Text>
            {originalSteps.map((s, i) => (
              <View key={s.tempId} style={styles.stepRow}>
                <Text style={styles.stepIndex}>{i + 1}</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>{s.text}</Text>
                  <Text style={styles.stepTag}>
                    {TAG_OPTIONS.find(t => t.value === s.tag)?.label ?? s.tag}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.divider}>
              <Text style={styles.arrow}>↓</Text>
            </View>

            {/* New steps section */}
            <Text style={styles.sectionLabel}>
              {previewMode === 'optimize' ? '优化后步骤' : '拆分后步骤'}
            </Text>
            {proposedSteps.map((s, i) => (
              <View key={s.tempId} style={[styles.stepRow, styles.stepRowNew]}>
                <Text style={styles.stepIndex}>{i + 1}</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>{s.text}</Text>
                  <View style={styles.stepMeta}>
                    <Text style={[styles.stepTag, styles.stepTagNew]}>
                      {TAG_OPTIONS.find(t => t.value === s.tag)?.label ?? s.tag}
                    </Text>
                    {s.durationSeconds ? (
                      <Text style={styles.stepDuration}>{s.durationSeconds}秒</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <Button variant="outline" title="拒绝" onPress={onReject} style={styles.actionButton} />
            <Button
              variant="primary"
              title="接受"
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
