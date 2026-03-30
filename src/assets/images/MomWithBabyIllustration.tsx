import React from 'react';
import {Image} from 'react-native';

interface Props {
  width?: number;
  height?: number;
}

const IMAGE = require('../freepik__improve-the-girl-skin-tone-a-little-bit__90854.png');

export function MomWithBabyIllustration({width = 150, height = 150}: Props) {
  return (
    <Image
      source={IMAGE}
      style={{width, height}}
      resizeMode="contain"
    />
  );
}
