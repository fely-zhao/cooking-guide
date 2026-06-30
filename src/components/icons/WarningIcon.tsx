import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function WarningIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3L2 20H22L12 3Z" fill={color} opacity={0.15} />
      <Path d="M12 3L2 20H22L12 3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12 10V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 17V17.01" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
