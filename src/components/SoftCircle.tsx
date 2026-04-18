import React from 'react';
import { View, ViewStyle } from 'react-native';

type Props = {
    size?: number;
    color1?: string;
    color2?: string;
    color3?: string;
    style?: ViewStyle;
};

export function SoftCircle({
    size = 220,
    color1 = '#D6F0F7',
    color2 = '#C5E8EB',
    color3 = '#B6DAE1',
    style,
}: Props) {
    const s2 = size * 0.8;
    const s3 = size * 0.6;

    return (
        <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color1, opacity: 0.5, position: 'absolute' }} />
            <View style={{ width: s2, height: s2, borderRadius: s2 / 2, backgroundColor: color2, opacity: 0.35, position: 'absolute' }} />
            <View style={{ width: s3, height: s3, borderRadius: s3 / 2, backgroundColor: color3, opacity: 0.42 }} />
        </View>
    );
}
