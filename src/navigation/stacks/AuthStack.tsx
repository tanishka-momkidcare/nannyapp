import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SignInScreen, SignUpScreen, OTPScreen, LocationPermissionScreen, LocationSelectionScreen, AreaSearchScreen} from '../../screens';
import type {AuthStackParamList} from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Unprotected stack — accessible only when user is NOT logged in.
 * Contains: SignIn, SignUp, OTP verification.
 */
export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="SignIn">
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="OTPVerification" component={OTPScreen} />
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <Stack.Screen name="LocationSelection" component={LocationSelectionScreen} />
      <Stack.Screen name="AreaSearch" component={AreaSearchScreen} />
    </Stack.Navigator>
  );
}
