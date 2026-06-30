import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function LinkIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13.5C10 13.5 8.5 15 7 15C5.5 15 4 13.5 4 12C4 10.5 5.5 9 7 9C8.5 9 10 10.5 10 10.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M14 10.5C14 10.5 15.5 9 17 9C18.5 9 20 10.5 20 12C20 13.5 18.5 15 17 15C15.5 15 14 13.5 14 13.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M9 12H15" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
