import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface FloatingButtonProps {
  onPress: () => void;
  iconName?: string;
  iconSize?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function FloatingButton({
  onPress,
  iconName = 'chatbubble-ellipses',
  iconSize = 28,
  iconColor = '#FFFFFF',
  style,
}: FloatingButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={styles.circle}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={15}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.3)"
        />
        <View style={styles.glassOverlay} />
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 999,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
    }),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
