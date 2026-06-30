import React from 'react';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface ErrorIllustrationProps {
  size?: number;
}

export function ErrorIllustration({ size = 80 }: ErrorIllustrationProps) {
  const center = size / 2;
  const radius = size * 0.35;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill={colors.dangerLight}
        stroke={colors.danger}
        strokeWidth={2}
        opacity={0.3}
      />

      {/* Warning triangle */}
      <Path
        d={`M ${center} ${center - radius * 0.6} 
            L ${center + radius * 0.7} ${center + radius * 0.5} 
            L ${center - radius * 0.7} ${center + radius * 0.5} Z`}
        fill={colors.dangerSurface}
        stroke={colors.danger}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Exclamation mark - vertical line */}
      <Line
        x1={center}
        y1={center - radius * 0.2}
        x2={center}
        y2={center + radius * 0.15}
        stroke={colors.danger}
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {/* Exclamation mark - dot */}
      <Circle cx={center} cy={center + radius * 0.35} r={1.5} fill={colors.danger} />

      {/* Decorative broken line segments */}
      <Line
        x1={center - radius * 0.9}
        y1={center - radius * 0.2}
        x2={center - radius * 0.7}
        y2={center - radius * 0.4}
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      <Line
        x1={center + radius * 0.7}
        y1={center - radius * 0.3}
        x2={center + radius * 0.9}
        y2={center - radius * 0.1}
        stroke={colors.warning}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
    </Svg>
  );
}
