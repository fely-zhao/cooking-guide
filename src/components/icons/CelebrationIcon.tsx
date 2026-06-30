import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function CelebrationIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Party popper body */}
      <Path d="M5 22L3 16L16 3L19 6L5 22Z" fill={color} opacity={0.12} />
      <Path
        d="M5 22L3 16L16 3L19 6L5 22Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Confetti dots */}
      <Circle cx={18} cy={3} r={1} fill={color} />
      <Circle cx={21} cy={7} r={1} fill={color} />
      <Circle cx={21} cy={12} r={1} fill={color} />
      {/* Confetti lines */}
      <Path d="M17 1L18.5 2.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M22 9L20.5 10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M22 14L20 14.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
