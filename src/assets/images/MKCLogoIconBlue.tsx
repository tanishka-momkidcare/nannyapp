import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import Icon from '../MKCLogoIconBlue.svg';

interface Props {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function MKCLogoIconBlue({width = 40, height = 40, style}: Props) {
  return (
    <View style={style}>
      <Icon width={width} height={height} />
    </View>
  );
}
