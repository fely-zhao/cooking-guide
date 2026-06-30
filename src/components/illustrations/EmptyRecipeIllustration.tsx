import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface EmptyRecipeIllustrationProps {
  size?: number;
}

export function EmptyRecipeIllustration({ size = 120 }: EmptyRecipeIllustrationProps) {
  const center = size / 2;
  const plateRadius = size * 0.35;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer plate circle */}
      <Circle
        cx={center}
        cy={center}
        r={plateRadius}
        fill={colors.surfaceFill}
        stroke={colors.border}
        strokeWidth={2}
      />

      {/* Inner plate circle */}
      <Circle
        cx={center}
        cy={center}
        r={plateRadius * 0.7}
        fill={colors.surface}
        stroke={colors.borderLight}
        strokeWidth={1.5}
      />

      {/* Decorative dots around the plate */}
      <Circle
        cx={center - plateRadius * 0.5}
        cy={center - plateRadius * 0.5}
        r={3}
        fill={colors.primaryBorder}
      />
      <Circle
        cx={center + plateRadius * 0.6}
        cy={center - plateRadius * 0.3}
        r={2.5}
        fill={colors.primaryBorder}
      />
      <Circle
        cx={center + plateRadius * 0.4}
        cy={center + plateRadius * 0.6}
        r={2}
        fill={colors.border}
      />

      {/* Small geometric accent lines */}
      <Line
        x1={center - plateRadius * 0.3}
        y1={center + plateRadius * 0.2}
        x2={center - plateRadius * 0.1}
        y2={center + plateRadius * 0.2}
        stroke={colors.primaryLight}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={center + plateRadius * 0.1}
        y1={center - plateRadius * 0.1}
        x2={center + plateRadius * 0.3}
        y2={center - plateRadius * 0.1}
        stroke={colors.primaryLight}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
