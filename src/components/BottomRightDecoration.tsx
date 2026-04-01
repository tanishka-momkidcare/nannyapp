import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

export interface BottomRightDecorationProps {
  icon: React.ReactNode;
  blurColor?: string;
  blurRadiusX?: number;
  blurRadiusY?: number;
  bgBottom?: number;
  bgRight?: number;
  iconBottom?: number;
  iconRight?: number;
}

export function BottomRightDecoration({
  icon,
  blurColor = '#C5D0F9',
  blurRadiusX = 260,
  blurRadiusY = 240,
  bgBottom = -340,
  bgRight = -220,
  iconBottom = -150,
  iconRight = -70,
}: BottomRightDecorationProps) {
  return (
    <View style={styles.bottomIconWrap} pointerEvents="none">
      <Svg
        width={600}
        height={600}
        style={[styles.bottomIconBgSvg, { bottom: bgBottom, right: bgRight }]}>
        <Defs>
          <RadialGradient id="blurGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={blurColor} stopOpacity="0.8" />
            <Stop offset="60%" stopColor={blurColor} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={blurColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={300}
          cy={300}
          rx={blurRadiusX}
          ry={blurRadiusY}
          fill="url(#blurGradient)"
        />
      </Svg>
      <View style={[styles.bottomIcon, { bottom: iconBottom, right: iconRight }]}>
        {icon}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomIconWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: 'hidden',
  },
  bottomIconBgSvg: {
    position: 'absolute',
  },
  bottomIcon: {
    position: 'absolute',
  },
});
