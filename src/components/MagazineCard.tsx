import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageSourcePropType,
  ImageBackground,
  Pressable,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { Icon } from './icons';
import { PressableScale } from './PressableScale';

type MagazineCardSize = 'featured' | 'compact';
type MagazineCardVariant = 'default' | 'overlay';

interface MagazineCardProps {
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType;
  badge?: ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  onPlayPress?: () => void;
  size?: MagazineCardSize;
  variant?: MagazineCardVariant;
}

export function MagazineCard({
  title,
  subtitle,
  image,
  badge,
  onPress,
  onLongPress,
  onPlayPress,
  size = 'compact',
  variant = 'default',
}: MagazineCardProps) {
  const isFeatured = size === 'featured';
  const isOverlay = variant === 'overlay' && !isFeatured;
  const hasImage = !!image;

  const renderOverlayContent = () => {
    const textColor = hasImage ? colors.text.inverse : colors.primary;
    return (
      <View style={styles.overlayContent}>
        <View style={styles.overlayTextColumn}>
          <Text
            style={[styles.overlayTitle, !hasImage && styles.overlayTitlePrimary]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.overlaySubtitle, !hasImage && styles.overlaySubtitlePrimary]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {onPlayPress && (
          <Pressable
            style={[styles.playButton, !hasImage && styles.playButtonPrimary]}
            onPress={(event: GestureResponderEvent) => {
              event.stopPropagation();
              onPlayPress();
            }}
          >
            <Icon name="play" size={24} color={textColor} />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <PressableScale
      style={[
        styles.container,
        isFeatured ? styles.featured : isOverlay ? styles.overlayCompact : styles.compact,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      scale={0.97}
      haptic="light"
    >
      {image ? (
        <ImageBackground
          source={image}
          style={[
            styles.imageArea,
            isOverlay
              ? styles.overlayImage
              : isFeatured
                ? styles.featuredImage
                : styles.compactImage,
          ]}
        >
          {badge && <View style={styles.badge}>{badge}</View>}
          {isOverlay && (
            <>
              <View style={styles.overlayGradient}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id={`cardGrad-${title}`} x1={0} y1={1} x2={0} y2={0}>
                      <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.55} />
                      <Stop offset="40%" stopColor={colors.primary} stopOpacity={0.2} />
                      <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill={`url(#cardGrad-${title})`} />
                </Svg>
              </View>
              {renderOverlayContent()}
            </>
          )}
        </ImageBackground>
      ) : (
        <View
          style={[styles.placeholderArea, isFeatured ? styles.featuredImage : styles.compactImage]}
        >
          {isOverlay ? (
            <>
              {/* Cooking icon at top area */}
              <View style={styles.placeholderOverlayTop}>
                <Icon name="cooking" size={32} color={colors.primary} />
              </View>
              {badge && <View style={styles.badge}>{badge}</View>}
              {/* Text + play button at bottom */}
              <View style={styles.placeholderOverlayBottom}>
                <View style={styles.contentTextColumn}>
                  <Text
                    style={styles.placeholderOverlayTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {title}
                  </Text>
                  {subtitle && (
                    <Text style={styles.placeholderOverlaySubtitle} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  )}
                </View>
                {onPlayPress && (
                  <Pressable
                    style={styles.playButtonCompact}
                    onPress={(event: GestureResponderEvent) => {
                      event.stopPropagation();
                      onPlayPress();
                    }}
                  >
                    <Icon name="play" size={20} color={colors.primary} />
                  </Pressable>
                )}
              </View>
            </>
          ) : (
            <>
              <Icon name="cooking" size={isFeatured ? 48 : 32} color={colors.primary} />
              {badge && <View style={styles.badge}>{badge}</View>}
            </>
          )}
        </View>
      )}

      {!isOverlay && (
        <View style={[styles.content, isFeatured && styles.featuredContent]}>
          <View style={styles.contentTextColumn}>
            <Text
              style={[styles.title, isFeatured ? styles.featuredTitle : styles.compactTitle]}
              numberOfLines={isFeatured ? 2 : 1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {isFeatured && onPlayPress && (
            <Pressable
              style={styles.featuredActionButton}
              onPress={(event: GestureResponderEvent) => {
                event.stopPropagation();
                onPlayPress();
              }}
            >
              <Text style={styles.featuredActionText}>开始烹饪</Text>
            </Pressable>
          )}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  featured: {
    borderRadius: spacing.radius.xl,
    ...shadows.lg,
  },
  compact: {
    borderRadius: spacing.radius.lg,
    ...shadows.md,
  },
  overlayCompact: {
    borderRadius: spacing.radius.lg,
    ...shadows.diffuse,
    backgroundColor: colors.transparent,
  },
  imageArea: {
    overflow: 'hidden',
  },
  featuredImage: {
    height: 180,
  },
  compactImage: {
    aspectRatio: 1,
  },
  overlayImage: {
    aspectRatio: 1,
  },
  placeholderArea: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  placeholderOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
  },
  placeholderOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
  },
  placeholderOverlayTitle: {
    ...typography.button,
    color: colors.text.primary,
  },
  placeholderOverlaySubtitle: {
    ...typography.captionSmall,
    color: colors.text.muted,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  overlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  overlayContent: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    bottom: 0,
    left: 0,
    right: 0,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  overlayTextColumn: {
    flex: 1,
  },
  playButton: {
    width: 32,
    height: 32,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.radius.sm,
    backgroundColor: colors.text.inverse15,
  },
  playButtonPrimary: {
    backgroundColor: colors.primaryLight,
  },
  overlayTitle: {
    ...typography.button,
    color: colors.text.inverse,
  },
  overlayTitlePrimary: {
    color: colors.primary,
  },
  overlaySubtitle: {
    ...typography.captionSmall,
    color: colors.text.inverse,
    opacity: 0.8,
    marginTop: 2,
  },
  overlaySubtitlePrimary: {
    color: colors.primary,
    opacity: 0.7,
  },
  content: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  contentTextColumn: {
    flex: 1,
  },
  featuredActionButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginLeft: spacing.md,
  },
  featuredActionText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  playButtonCompact: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.radius.sm,
    backgroundColor: colors.primaryLight,
    marginLeft: spacing.sm,
  },
  title: {
    color: colors.text.primary,
  },
  featuredTitle: {
    ...typography.h4,
  },
  compactTitle: {
    ...typography.button,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
});
