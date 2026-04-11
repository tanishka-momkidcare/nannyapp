/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

/**
 * Headless JS Task — Android only.
 * Called by the native foreground service when the JS bridge is restarted
 * after app kill. Ensures location tracking context can reinitialize.
 */
if (Platform.OS === 'android') {
  AppRegistry.registerHeadlessTask('LocationHeadlessTask', () => async (taskData) => {
    // The foreground service handles location uploads directly.
    // This task exists so the RN bridge can do any JS-side processing
    // (e.g. fraud checks) if needed in the future.
    if (__DEV__) {
      console.log('[HeadlessTask] Triggered with data:', taskData);
    }
  });
}
