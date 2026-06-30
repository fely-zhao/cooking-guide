import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Icon } from './icons';

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  variant?: 'default' | 'large';
  onBack?: () => void;
  rightTitle?: string;
  onRightPress?: () => void;
  rightDisabled?: boolean;
}

export function HeaderBar({
  title,
  subtitle,
  variant = 'default',
  onBack,
  rightTitle,
  onRightPress,
  rightDisabled,
}: HeaderBarProps) {
  const insets = useSafeAreaInsets();
  const isLarge = variant === 'large';

  const headerContent = (
    <View style={[styles.container, isLarge ? styles.containerLarge : styles.containerDefault]}>
      {isLarge && onBack ? (
        <View style={styles.sideLeft}>
          <TouchableOpacity onPress={onBack} style={styles.leftButton}>
            <Icon name="chevron-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      ) : !isLarge ? (
        <View style={styles.sideLeft}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.leftButton}>
              <Icon name="chevron-left" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      ) : null}

      <View style={[styles.center, isLarge && styles.centerLarge]}>
        <View style={styles.titleWrap}>
          <Text
            style={[styles.title, isLarge ? styles.titleLarge : styles.titleDefault]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {isLarge && subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightTitle && onRightPress ? (
        <View style={styles.sideRight}>
          <TouchableOpacity
            onPress={onRightPress}
            style={styles.rightButton}
            disabled={rightDisabled}
          >
            <Text style={[styles.rightButtonText, rightDisabled && styles.rightButtonDisabled]}>
              {rightTitle}
            </Text>
          </TouchableOpacity>
        </View>
      ) : !isLarge ? (
        <View style={styles.sideRight}>
          <View style={styles.placeholder} />
        </View>
      ) : null}
    </View>
  );

  if (isLarge) {
    return headerContent;
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        marginTop: -insets.top,
        paddingTop: insets.top,
      }}
    >
      {headerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  containerDefault: {
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    height: 56,
  },
  containerLarge: {
    paddingTop: spacing.screenTopPadding,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.transparent,
    alignItems: 'center',
  },
  sideLeft: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideRight: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  rightButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  rightButtonDisabled: {
    opacity: 0.5,
  },
  titleWrap: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  titleDefault: {
    ...typography.h4,
    lineHeight: undefined,
  },
  titleLarge: {
    ...typography.h1,
    textAlign: 'left',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
