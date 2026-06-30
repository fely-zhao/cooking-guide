import React from 'react';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RecipeInputStackParamList, RootStackParamList } from './types';
import RecipeInputScreen from '../screens/RecipeInputScreen';
import ManualInputScreen from '../screens/ManualInputScreen';
import ImageInputScreen from '../screens/ImageInputScreen';
import UrlInputScreen from '../screens/UrlInputScreen';
import VoiceInputScreen from '../screens/VoiceInputScreen';

const Stack = createNativeStackNavigator<RecipeInputStackParamList>();

type RecipeInputRouteProp = RouteProp<RootStackParamList, 'RecipeInput'>;

export default function RecipeInputNavigator() {
  const route = useRoute<RecipeInputRouteProp>();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="InputMethodSelect"
        component={RecipeInputScreen}
        initialParams={route.params ?? { mode: 'create' }}
      />
      <Stack.Screen name="ManualInput" component={ManualInputScreen} />
      <Stack.Screen name="ImageInput" component={ImageInputScreen} />
      <Stack.Screen name="UrlInput" component={UrlInputScreen} />
      <Stack.Screen name="VoiceInput" component={VoiceInputScreen} />
    </Stack.Navigator>
  );
}
