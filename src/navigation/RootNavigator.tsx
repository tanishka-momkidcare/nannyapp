import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth, useTheme} from '../context';
import {WelcomeScreen, SignInScreen, SignUpScreen, HomeScreen, OTPScreen} from '../screens';
import type {AuthStackParamList, AppStackParamList, OnboardingStackParamList} from './types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{headerShown: false}}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
    </OnboardingStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}} initialRouteName="SignIn">
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="OTPVerification" component={OTPScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{headerShown: false}}>
      <AppStack.Screen name="Home" component={HomeScreen} />
    </AppStack.Navigator>
  );
}

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
        <OnboardingNavigator />
      ) : !isLoggedIn ? (
        <AuthNavigator />
      ) : (
        <AppNavigator />
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
