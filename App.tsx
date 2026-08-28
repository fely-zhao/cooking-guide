import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { getAllRecipes } from './src/db/recipes';
import { cleanupOrphanCovers } from './src/utils/cover-image';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    try {
      const recipes = getAllRecipes();
      const activeCovers = new Set(recipes.map(r => r.coverImage).filter((v): v is string => !!v));
      cleanupOrphanCovers(activeCovers);
    } catch {
      // Silently skip — startup cleanup is best-effort
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          translucent
          backgroundColor="transparent"
        />
        <ErrorBoundary>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
