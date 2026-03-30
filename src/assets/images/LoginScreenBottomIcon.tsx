import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import Icon from '../loginScreenBottomIcon.svg';

interface Props {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function LoginScreenBottomIcon({width = 221, height = 228, style}: Props) {
  return (
    <View style={style}>
      <Icon width={width} height={height} />
    </View>
  );
}
