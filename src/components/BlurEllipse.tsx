import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Defs, RadialGradient, Stop, Ellipse} from 'react-native-svg';

type Props = {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  style?: ViewStyle;
};

export function BlurEllipse({
  width = 222,
  height = 126,
  color = '#C5D9F9',
  opacity = .48,
  style,
}: Props) {
  // Add padding so the feathered edge has room to fade out
  const pad = 40;
  const svgW = width + pad * 2;
  const svgH = height + pad * 2;

  return (
    <View style={[{width: svgW, height: svgH}, style]}>
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <Defs>
          <RadialGradient id="blur" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.6" stopColor={color} stopOpacity={opacity * 0.6} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={svgW / 2}
          cy={svgH / 2}
          rx={svgW / 2}
          ry={svgH / 2}
          fill="url(#blur)"
        />
      </Svg>
    </View>
  );
}
