export interface Ingredient {
  id: string;
  name: string;
  amount: string;
}

export interface Step {
  id: string;
  text: string;
  tag: 'instant' | 'wait_user' | 'wait_timer';
  durationSeconds?: number;
  subSteps: Step[];
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  servings: number;
  coverImage?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CookSession {
  id: string;
  recipeId: string;
  startedAt: string;
  finishedAt?: string;
  completed: boolean;
}
