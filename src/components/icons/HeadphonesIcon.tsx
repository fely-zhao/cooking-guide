import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function HeadphonesIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 13V12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12V13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M4 13V17C4 17.55 4.45 18 5 18H7C7.55 18 8 17.55 8 17V14C8 13.45 7.55 13 7 13H4Z"
        fill={color}
        opacity={0.15}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M20 13V17C20 17.55 19.55 18 19 18H17C16.45 18 16 17.55 16 17V14C16 13.45 16.45 13 17 13H20Z"
        fill={color}
        opacity={0.15}
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  );
}
