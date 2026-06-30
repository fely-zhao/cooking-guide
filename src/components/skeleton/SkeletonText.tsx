import React from 'react';
import { ViewStyle } from 'react-native';
import { typography } from '../../theme/typography';
import { SkeletonBox } from './SkeletonBox';

interface SkeletonTextProps {
  width?: number | string;
  fontSize?: number;
  style?: ViewStyle;
}

const FONT_SIZE_MAP: Record<string, number> = {
  h1: typography.h1.fontSize as number,
  h2: typography.h2.fontSize as number,
  h3: typography.h3.fontSize as number,
  h4: typography.h4.fontSize as number,
  body: typography.body.fontSize as number,
  caption: typography.caption.fontSize as number,
};

export function SkeletonText({
  width = '100%',
  fontSize = typography.body.fontSize as number,
  style,
}: SkeletonTextProps) {
  const resolvedSize = typeof fontSize === 'string' ? (FONT_SIZE_MAP[fontSize] ?? 16) : fontSize;
  const height = Math.round(resolvedSize * 1.2);

  return <SkeletonBox width={width} height={height} borderRadius={4} style={style} />;
}
