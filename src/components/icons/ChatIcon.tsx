import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function ChatIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5C21 16.19 16.97 20 12 20C10.53 20 9.14 19.66 7.9 19.05L3 20L4.18 16.45C3.41 14.97 3 13.28 3 11.5C3 6.81 7.03 3 12 3C16.97 3 21 6.81 21 11.5Z"
        fill={color}
        opacity={0.12}
      />
      <Path
        d="M21 11.5C21 16.19 16.97 20 12 20C10.53 20 9.14 19.66 7.9 19.05L3 20L4.18 16.45C3.41 14.97 3 13.28 3 11.5C3 6.81 7.03 3 12 3C16.97 3 21 6.81 21 11.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 11H8.01M12 11H12.01M16 11H16.01"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
