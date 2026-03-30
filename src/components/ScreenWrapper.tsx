import React from 'react';
import {StatusBar, StyleSheet, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../context';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenWrapper({children, style}: Props) {
  const {colors, isDark} = useTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}, style]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
