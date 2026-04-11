import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  HomeScreen,
  ProfileSettingsScreen,
  ProfileScreen,
  JobsScreen,
  CourseScreen,
  IDCardScreen,
} from '../../screens';
import {GlassPillTabBar} from '../../components/GlassPillTabBar';
import {TabBarVisibilityProvider} from '../../context';
import type {AppStackParamList, BottomTabParamList} from '../types';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function BottomTabs() {
  return (
    <TabBarVisibilityProvider>
      <Tab.Navigator
        tabBar={props => <GlassPillTabBar {...props} />}
        screenOptions={{headerShown: false}}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Jobs" component={JobsScreen} />
        <Tab.Screen name="IDCard" component={IDCardScreen} />
        <Tab.Screen name="Course" component={CourseScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </TabBarVisibilityProvider>
  );
}

/**
 * Protected stack — accessible only when user IS logged in.
 * Bottom tabs live inside MainTabs; full-screen pages sit above.
 */
export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{animation: 'fade'}}
      />
    </Stack.Navigator>
  );
}
