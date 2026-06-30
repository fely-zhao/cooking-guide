import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export default function ParallelIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Two overlapping rectangles representing parallel tasks */}
      <Path
        d="M4 6C4 4.9 4.9 4 6 4H13C14.1 4 15 4.9 15 6V14C15 15.1 14.1 16 13 16H6C4.9 16 4 15.1 4 14V6Z"
        fill={color}
        opacity={0.1}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M9 8C9 6.9 9.9 6 11 6H18C19.1 6 20 6.9 20 8V16C20 17.1 19.1 18 18 18H11C9.9 18 9 17.1 9 16V8Z"
        fill={color}
        opacity={0.1}
        stroke={color}
        strokeWidth={1.8}
      />
      {/* Handshake line */}
      <Path
        d="M7 20L12 18L17 20"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
