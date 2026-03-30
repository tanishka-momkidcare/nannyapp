import React from 'react';
import LoginMomBaby from '../LoginScreenMomWithBaby.svg';

interface Props {
  width?: number;
  height?: number;
}

export function LoginScreenMomWithBaby({width = 200, height = 200}: Props) {
  return <LoginMomBaby width={width} height={height} />;
}
