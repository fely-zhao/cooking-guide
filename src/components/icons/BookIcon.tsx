import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function BookIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4.5C4 3.67 4.67 3 5.5 3H19V19H5.5C4.67 19 4 19.67 4 20.5V4.5Z"
        fill={color}
        opacity={0.12}
      />
      <Path
        d="M4 4.5C4 3.67 4.67 3 5.5 3H19V19H5.5C4.67 19 4 19.67 4 20.5V4.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 19.5V20.5C4 21.33 4.67 22 5.5 22H19"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8 7.5H15M8 11H13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
