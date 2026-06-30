import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function TextInputIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3C4.9 3 4 3.9 4 5V19C4 20.1 4.9 21 6 21H14L20 15V5C20 3.9 19.1 3 18 3H6Z"
        fill={color}
        opacity={0.12}
      />
      <Path
        d="M6 3C4.9 3 4 3.9 4 5V19C4 20.1 4.9 21 6 21H14L20 15V5C20 3.9 19.1 3 18 3H6Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 21V15H20"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8 7.5H16M8 11H13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
