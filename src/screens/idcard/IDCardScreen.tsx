import React from 'react';
import {Platform, StatusBar, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BlurView} from '@react-native-community/blur';
import {useTheme} from '../../context';

export function IDCardScreen() {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View style={[styles.content, {paddingTop: insets.top}]}>
        <Text style={[styles.title, {color: colors.text}]}>आईडी कार्ड</Text>
        <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
          जल्द आ रहा है
        </Text>
      </View>

      {/* Glass status bar overlay */}
      <View style={[styles.statusBarOverlay, {height: insets.top}]}>
        <BlurView
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={Platform.OS === 'ios' ? 35 : 16}
          reducedTransparencyFallbackColor={
            isDark ? 'rgba(13, 27, 42, 0.10)' : 'rgba(255, 255, 255, 0.10)'
          }
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.02)'
                : 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  content: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {
    fontSize: 24,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'NotoSansDevanagari-Regular',
    marginTop: 8,
  },
});
