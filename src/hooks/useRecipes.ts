import { useState, useCallback, useEffect } from 'react';
import { getAllRecipes } from '../db/recipes';
import type { Recipe } from '../types/cooking';

interface UseRecipesResult {
  recipes: Recipe[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useRecipes(): UseRecipesResult {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const data = getAllRecipes();
      setRecipes(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { recipes, loading, error, refetch: load };
}
