import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParseRecipeResponse } from '../types/api';

export type RootStackParamList = {
  Home: undefined;
  RecipeList: undefined;
  RecipeDetail: { recipeId: string };
  RecipeInput: { mode: 'create' | 'edit'; recipeId?: string } | undefined;
  RecipeEdit: { recipeId: string };
  Cooking: { recipeId: string };
  Settings: undefined;
};

export type RecipeInputStackParamList = {
  InputMethodSelect: { mode: 'create' | 'edit'; recipeId?: string };
  ManualInput: { recipeId?: string; onSave?: (data: ParseRecipeResponse) => void };
  ImageInput: { recipeId?: string; onSave?: (data: ParseRecipeResponse) => void };
  UrlInput: { recipeId?: string; onSave?: (data: ParseRecipeResponse) => void };
  VoiceInput: { recipeId?: string; onSave?: (data: ParseRecipeResponse) => void };
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type RecipeInputNavigationProp = NativeStackNavigationProp<RecipeInputStackParamList>;
