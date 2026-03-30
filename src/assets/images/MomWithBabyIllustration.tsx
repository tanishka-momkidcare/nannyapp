import React from 'react';
import NannyImage from '../Group 13273.svg';

interface Props {
  width?: number;
  height?: number;
}

export function MomWithBabyIllustration({width = 150, height = 150}: Props) {
  return <NannyImage width={width} height={height} />;
}
