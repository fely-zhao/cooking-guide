import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from './Button';

interface AiOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (mode: 'optimize' | 'split') => void;
}

export function AiOptionsModal({ visible, onClose, onSelect }: AiOptionsModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('components.aiTitle')}</Text>

          <TouchableOpacity style={styles.optionButton} onPress={() => onSelect('optimize')}>
            <Text style={styles.optionLabel}>{t('components.optimizeSteps')}</Text>
            <Text style={styles.optionDesc}>{t('components.optimizeStepsDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={() => onSelect('split')}>
            <Text style={styles.optionLabel}>{t('components.splitSubSteps')}</Text>
            <Text style={styles.optionDesc}>{t('components.splitSubStepsDesc')}</Text>
          </TouchableOpacity>

          <Button variant="secondary" title={t('common.cancel')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    padding: spacing.xxl,
  },
  title: {
    ...typography.h4,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  optionButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  optionLabel: {
    ...typography.button,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  optionDesc: {
    ...typography.caption,
    color: colors.text.placeholder,
  },
});
