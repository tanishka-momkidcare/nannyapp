import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ScreenWrapper} from '../../components';
import {Spacing, Typography} from '../../constants';
import {useAuth, useTheme} from '../../context';

export function HomeScreen() {
  const {colors} = useTheme();
  const {signOut} = useAuth();

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={[Typography.h1, {color: colors.text}]}>Home</Text>
        <Text style={[Typography.body, {color: colors.textSecondary, marginTop: Spacing.sm}]}>
          Welcome to NannyApp!
        </Text>

        <TouchableOpacity
          style={[styles.logoutButton, {borderColor: colors.border}]}
          onPress={signOut}
          activeOpacity={0.8}>
          <Text style={[Typography.button, {color: colors.secondary}]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  logoutButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
});
