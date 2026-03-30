import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {WelcomeScreen} from '../../screens';
import type {OnboardingStackParamList} from '../types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Onboarding stack — shown only on first launch before auth.
 */
export function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
    </Stack.Navigator>
  );
}
