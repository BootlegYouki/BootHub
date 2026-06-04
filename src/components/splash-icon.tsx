import React from 'react';
import { SvgProps } from 'react-native-svg';
import { IconSvg } from './icon-svg';

interface SplashIconProps extends SvgProps {
  color?: string;
  size?: number;
}

export const SplashIcon: React.FC<SplashIconProps> = ({
  color,
  size = 120,
  ...props
}) => {
  return (
    <IconSvg color={color} width={size} height={size} {...props} />
  );
};
