import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import GreyIcon from '../greyLockIcon.svg';
import WhiteIcon from '../whiteLockIcon.svg';

interface Props {
  width?: number;
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function GreyLockIcon({width = 15, height = 15, color, style}: Props) {
  const Icon = color === '#FFFFFF' ? WhiteIcon : GreyIcon;
  return (
    <View style={style}>
      <Icon width={width} height={height} />
    </View>
  );
}
