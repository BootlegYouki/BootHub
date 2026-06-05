import React from 'react';
import Svg, { Rect, SvgProps } from 'react-native-svg';

interface SplashIconProps extends SvgProps {
  color?: string;
  size?: number;
}

export const SplashIcon: React.FC<SplashIconProps> = ({
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
    { x: 12, y: 2 },
    { x: 13, y: 2 },
    { x: 2, y: 3 },
    { x: 13, y: 3 },
    { x: 2, y: 4 },
    { x: 13, y: 4 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 7, y: 5 },
    { x: 8, y: 5 },
    { x: 9, y: 5 },
    { x: 10, y: 5 },
    { x: 11, y: 5 },
    { x: 12, y: 5 },
    { x: 13, y: 5 },
    { x: 3, y: 6 },
    { x: 12, y: 6 },
    { x: 3, y: 7 },
    { x: 6, y: 7 },
    { x: 7, y: 7 },
    { x: 8, y: 7 },
    { x: 9, y: 7 },
    { x: 12, y: 7 },
    { x: 3, y: 8 },
    { x: 12, y: 8 },
    { x: 3, y: 9 },
    { x: 12, y: 9 },
    { x: 3, y: 10 },
    { x: 12, y: 10 },
    { x: 3, y: 11 },
    { x: 12, y: 11 },
    { x: 3, y: 12 },
    { x: 4, y: 12 },
    { x: 5, y: 12 },
    { x: 6, y: 12 },
    { x: 7, y: 12 },
    { x: 8, y: 12 },
    { x: 9, y: 12 },
    { x: 10, y: 12 },
    { x: 11, y: 12 },
    { x: 12, y: 12 }
  ];

  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} {...props}>
      {rects.map((r, i) => (
        <Rect key={i} x={r.x} y={r.y} width={1} height={1} fill={color} />
      ))}
    </Svg>
  );
};
