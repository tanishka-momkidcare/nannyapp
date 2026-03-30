import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider, AuthProvider} from './src/context';
import {RootNavigator} from './src/navigation';

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
