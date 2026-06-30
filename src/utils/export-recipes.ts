import RNFS from 'react-native-fs';
import { getAllRecipes } from '../db/recipes';

interface ExportData {
  version: number;
  exportedAt: string;
  recipes: Array<{
    name: string;
    servings: number;
    ingredients: Array<{ name: string; amount: string }>;
    steps: Array<{
      text: string;
      tag: string;
      durationSeconds: number | null;
    }>;
  }>;
}

/**
 * Export all recipes to a JSON file in the Android Downloads folder.
 * Returns the file path on success.
 */
export async function exportRecipesToJson(): Promise<string> {
  const recipes = getAllRecipes();

  const exportData: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes: recipes.map(r => ({
      name: r.name,
      servings: r.servings,
      ingredients: r.ingredients.map(i => ({
        name: i.name,
        amount: i.amount,
      })),
      steps: r.steps.map(s => ({
        text: s.text,
        tag: s.tag,
        durationSeconds: s.durationSeconds ?? null,
      })),
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `cooking-recipes-${timestamp}.json`;
  const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

  await RNFS.writeFile(filePath, json, 'utf8');
  return filePath;
}
