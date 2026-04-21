import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  HomeScreen,
  JobLocationSetupScreen,
  ProfileSettingsScreen,
  ProfileScreen,
  EditLocationScreen,
  JobsScreen,
  CourseScreen,
  IDCardScreen,
  LocationDebugScreen,
  CreateShiftScreen,
} from '../../screens';
import {LocationPermissionScreen} from '../../screens/home/LocationPermissionScreen';
import {GlassPillTabBar} from '../../components/GlassPillTabBar';
import {TabBarVisibilityProvider, useTheme} from '../../context';
import {LocationTrackingProvider} from '../../context/LocationTrackingContext';
import {useAuth} from '../../context/AuthContext';
import {fetchVendorHome} from '../../services/authApi';
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
 * Check if both fine + background location are granted (Android).
 */
async function checkAllPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const fine = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (!fine) return false;
  const apiLevel = Number(Platform.Version);
  if (apiLevel < 29) return true; // pre-Q: fine = always
  const background = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  );
  return fine && background;
}

/**
 * Protected stack — accessible only when user IS logged in.
 *
 * Single upfront resolution phase:
 *   1. Check actual device permissions (not just persisted flag)
 *   2. If permissions OK, check backend for existing job locations
 *   3. Only after both checks → render the correct screen (no flashing)
 *
 * Gate screens (conditional groups — no loopholes):
 *   - No "Always" location permission → LocationPermission
 *   - No job location on backend      → JobLocationSetup
 *   - Everything OK                   → MainTabs + other screens
 */
export function AppStack() {
  const {
    hasLocationPermission,
    hasJobLocation,
    setHasLocationPermission,
    setHasJobLocation,
  } = useAuth();
  const {colors} = useTheme();
  const [resolving, setResolving] = useState(true);

  // Single upfront check: permissions → API → done
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Step 1: Check actual device permissions
        const permsOk = await checkAllPermissions();
        if (cancelled) return;

        if (permsOk && !hasLocationPermission) {
          await setHasLocationPermission(true);
        }

        // Step 2: If permissions are fine, check backend for job locations
        if (permsOk && !hasJobLocation) {
          try {
            const home = await fetchVendorHome();
            if (cancelled) return;
            const hasLoc = !!(
              home.primaryLocation || home.secondaryLocations.length > 0
            );
            if (hasLoc) {
              await setHasJobLocation(true);
            }
          } catch {
            // API failed — fall through to setup screen
          }
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading while resolving — prevents screen flashing
  if (resolving) {
    return (
      <View style={[loadStyles.container, {backgroundColor: colors.background}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LocationTrackingProvider>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!hasLocationPermission ? (
          <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
        ) : !hasJobLocation ? (
          <>
            <Stack.Screen name="JobLocationSetup" component={JobLocationSetupScreen} />
            <Stack.Screen
              name="EditLocation"
              component={EditLocationScreen}
              options={{animation: 'slide_from_right'}}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={BottomTabs}
              options={{animation: 'fade'}}
            />
            <Stack.Screen
              name="ProfileSettings"
              component={ProfileSettingsScreen}
              options={{animation: 'fade'}}
            />
            <Stack.Screen
              name="EditLocation"
              component={EditLocationScreen}
              options={{animation: 'slide_from_right'}}
            />
            <Stack.Screen
              name="LocationDebug"
              component={LocationDebugScreen}
              options={{animation: 'slide_from_right'}}
            />
            <Stack.Screen
              name="CreateShift"
              component={CreateShiftScreen}
              options={{animation: 'slide_from_bottom'}}
            />
          </>
        )}
      </Stack.Navigator>
    </LocationTrackingProvider>
  );
}

const loadStyles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
