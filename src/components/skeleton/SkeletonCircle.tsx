import React from 'react';
import { ViewStyle } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

export function SkeletonCircle({ size = 48, style }: SkeletonCircleProps) {
  return <SkeletonBox width={size} height={size} borderRadius={size / 2} style={style} />;
}
