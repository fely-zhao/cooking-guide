import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function MicrophoneIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={2} width={6} height={11} rx={3} fill={color} opacity={0.15} />
      <Rect x={9} y={2} width={6} height={11} rx={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 10C5 13.87 8.13 17 12 17C15.87 17 19 13.87 19 10"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M12 17V21M8 21H16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
