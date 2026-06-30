import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface NotFoundIllustrationProps {
  size?: number;
}

export function NotFoundIllustration({ size = 100 }: NotFoundIllustrationProps) {
  const center = size / 2;
  const glassRadius = size * 0.25;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Magnifying glass circle */}
      <Circle
        cx={center - glassRadius * 0.3}
        cy={center - glassRadius * 0.3}
        r={glassRadius}
        fill={colors.primaryLight}
        stroke={colors.primary}
        strokeWidth={2.5}
      />

      {/* Magnifying glass handle */}
      <Line
        x1={center + glassRadius * 0.4}
        y1={center + glassRadius * 0.4}
        x2={center + glassRadius * 1.2}
        y2={center + glassRadius * 1.2}
        stroke={colors.primary}
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* Question mark inside the glass */}
      <Path
        d={`M ${center - glassRadius * 0.3} ${center - glassRadius * 0.6}
            Q ${center - glassRadius * 0.1} ${center - glassRadius * 0.6}
              ${center - glassRadius * 0.1} ${center - glassRadius * 0.3}
            Q ${center - glassRadius * 0.1} ${center - glassRadius * 0.1}
              ${center - glassRadius * 0.3} ${center - glassRadius * 0.05}`}
        fill="none"
        stroke={colors.text.muted}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle
        cx={center - glassRadius * 0.3}
        cy={center + glassRadius * 0.15}
        r={1.5}
        fill={colors.text.muted}
      />

      {/* Decorative dots suggesting "searching" */}
      <Circle
        cx={center + glassRadius * 0.8}
        cy={center - glassRadius * 0.8}
        r={2}
        fill={colors.border}
      />
      <Circle
        cx={center + glassRadius * 1.1}
        cy={center - glassRadius * 0.5}
        r={1.5}
        fill={colors.borderLight}
      />
      <Circle
        cx={center - glassRadius * 1.0}
        cy={center + glassRadius * 0.8}
        r={2.5}
        fill={colors.primaryBorder}
      />
    </Svg>
  );
}
