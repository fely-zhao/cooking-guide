import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export default function DragIcon({ size = 24, color = 'currentColor' }: Props) {
  const r = (size * 1.5) / 24;
  const col1 = size * 0.3;
  const col2 = size * 0.7;

  const rows = [size * 0.25, size * 0.5, size * 0.75];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {rows.map((cy, i) => (
        <React.Fragment key={i}>
          <Circle cx={col1} cy={cy} r={r} fill={color} />
          <Circle cx={col2} cy={cy} r={r} fill={color} />
        </React.Fragment>
      ))}
    </Svg>
  );
}
