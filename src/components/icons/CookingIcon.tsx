import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function CookingIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 17.5C8.5 19.71 10.29 21.5 12.5 21.5C14.71 21.5 16.5 19.71 16.5 17.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M4 13.5H20V12C20 9.24 17.76 7 15 7H9C6.24 7 4 9.24 4 12V13.5Z"
        fill={color}
        opacity={0.15}
      />
      <Path d="M4 13.5H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path
        d="M4 13.5V12C4 9.24 6.24 7 9 7H15C17.76 7 20 9.24 20 12V13.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M8 4.5V6.5M12 3V6.5M16 4.5V6.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
