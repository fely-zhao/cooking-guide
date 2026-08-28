import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import RecipeEditScreen from '../screens/RecipeEditScreen';
import CookingScreen from '../screens/CookingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RecipeInputNavigator from './RecipeInputNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <Stack.Screen
        name="RecipeInput"
        component={RecipeInputNavigator}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="RecipeEdit" component={RecipeEditScreen} />
      <Stack.Screen name="Cooking" component={CookingScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
