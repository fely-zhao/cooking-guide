import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { createRecipe } from '../db/recipes';
import { withTransaction } from '../db/transaction';
import i18n from '../i18n';

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
 * Open a file picker for the user to select a JSON backup file,
 * then import all recipes from it into the database.
 * Returns the number of imported recipes.
 */
export async function importRecipesFromFile(): Promise<number> {
  try {
    const result = await DocumentPicker.pickSingle({
      type: [DocumentPicker.types.json],
    });

    const content = await RNFS.readFile(result.uri, 'utf8');
    const data: ExportData = JSON.parse(content);

    if (!data.version || !Array.isArray(data.recipes)) {
      throw new Error(i18n.t('errors.invalidBackup'));
    }

    let importedCount = 0;

    withTransaction(() => {
      for (const r of data.recipes) {
        createRecipe({
          name: r.name,
          servings: r.servings || 1,
          ingredients: r.ingredients.map(i => ({
            id: '',
            name: i.name,
            amount: i.amount,
          })),
          steps: r.steps.map(s => ({
            id: '',
            text: s.text,
            tag: s.tag as 'instant' | 'wait_user' | 'wait_timer',
            durationSeconds: s.durationSeconds ?? undefined,
            subSteps: [],
          })),
        });
        importedCount++;
      }
    });

    return importedCount;
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      return 0; // user cancelled
    }
    throw err;
  }
}
