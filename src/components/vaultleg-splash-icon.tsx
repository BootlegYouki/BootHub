import React from 'react';
import Svg, { Rect, SvgProps } from 'react-native-svg';

interface VaultlegSplashIconProps extends SvgProps {
  color?: string;
  size?: number;
}

export const VaultlegSplashIcon: React.FC<VaultlegSplashIconProps> = ({
  color = '#FFFFFF',
  size = 120,
  ...props
}) => {
  const rects = [
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 11, y: 2 },
    { x: 2, y: 3 },
    { x: 11, y: 3 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 7, y: 4 },
    { x: 8, y: 4 },
    { x: 9, y: 4 },
    { x: 10, y: 4 },
    { x: 11, y: 4 },
    { x: 12, y: 4 },
    { x: 2, y: 5 },
    { x: 12, y: 5 },
    { x: 2, y: 6 },
    { x: 12, y: 6 },
    { x: 2, y: 7 },
    { x: 9, y: 7 },
    { x: 10, y: 7 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 2, y: 8 },
    { x: 9, y: 8 },
    { x: 13, y: 8 },
    { x: 2, y: 9 },
    { x: 9, y: 9 },
    { x: 13, y: 9 },
    { x: 2, y: 10 },
    { x: 9, y: 10 },
    { x: 10, y: 10 },
    { x: 11, y: 10 },
    { x: 12, y: 10 },
    { x: 13, y: 10 },
    { x: 2, y: 11 },
    { x: 12, y: 11 },
    { x: 2, y: 12 },
    { x: 12, y: 12 },
    { x: 2, y: 13 },
    { x: 3, y: 13 },
    { x: 4, y: 13 },
    { x: 5, y: 13 },
    { x: 6, y: 13 },
    { x: 7, y: 13 },
    { x: 8, y: 13 },
    { x: 9, y: 13 },
    { x: 10, y: 13 },
    { x: 11, y: 13 },
    { x: 12, y: 13 }
  ];

  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} {...props}>
      {rects.map((r, i) => (
        <Rect key={i} x={r.x} y={r.y} width={1} height={1} fill={color} />
      ))}
    </Svg>
  );
};
