import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function TimerIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={8} fill={color} opacity={0.12} />
      <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 9V13L15 15"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 2H14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M19.5 5.5L18.5 6.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
