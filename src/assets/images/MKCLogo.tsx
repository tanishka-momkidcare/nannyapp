import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import Logo from '../MKC LOGO .svg';

interface Props {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function MKCLogo({width = 120, height = 52, style}: Props) {
  return (
    <View style={style}>
      <Logo width={width} height={height} />
    </View>
  );
}
