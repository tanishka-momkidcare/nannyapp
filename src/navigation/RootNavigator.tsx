import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {useAuth, useTheme} from '../context';
import {OnboardingStack, AuthStack, AppStack} from './stacks';

/**
 * Root navigator — decides which stack to render based on auth state.
 *
 * Flow:
 *   1. First launch  → OnboardingStack  (unprotected)
 *   2. Not logged in → AuthStack         (unprotected)
 *   3. Logged in     → AppStack          (protected)
 *
 * React Navigation automatically resets the stack when switching between
 * these groups, so a logged-out user can never access protected screens.
 */
export function RootNavigator() {
  const {isLoggedIn, isLoading, hasSeenOnboarding} = useAuth();
  const {colors} = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loader, {backgroundColor: colors.background}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!hasSeenOnboarding ? (
        <OnboardingStack />
      ) : !isLoggedIn ? (
        <AuthStack />
      ) : (
        <AppStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
