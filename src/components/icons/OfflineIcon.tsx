import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function OfflineIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Wifi signal arcs */}
      <Path
        d="M1.5 8.5C5.5 4.5 10 3 12 3C16 3 19.5 5 22.5 8.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.3}
      />
      <Path
        d="M5 12C7.5 9.5 9.5 8.5 12 8.5C14.5 8.5 16.5 9.5 19 12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.3}
      />
      <Path
        d="M8.5 15.5C10 14 11 13.5 12 13.5C13 13.5 14 14 15.5 15.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.3}
      />
      {/* Slash through */}
      <Path d="M3 20L21 4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
