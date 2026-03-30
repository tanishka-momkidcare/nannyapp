import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '../../screens';
import type {AppStackParamList} from '../types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Protected stack — accessible only when user IS logged in.
 * Add all authenticated screens here.
 */
export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
