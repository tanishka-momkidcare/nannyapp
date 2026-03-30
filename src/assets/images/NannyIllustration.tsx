import React from 'react';
import NannyImage from '../Group 13273.svg';

interface Props {
  width?: number;
  height?: number;
}

export function NannyIllustration({width = 320, height = 280}: Props) {
  return <NannyImage width={width} height={height} />;
}
