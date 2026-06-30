import RNFS from 'react-native-fs';
import { generateUuid } from './uuid';

const COVER_DIR = `${RNFS.DocumentDirectoryPath}/recipe-covers`;

/**
 * Copy a temp content URI (from DocumentPicker) to the app's permanent storage.
 * Returns a `file://` URI that persists across app restarts.
 */
export async function saveCoverImagePermanent(tempUri: string): Promise<string> {
  await RNFS.mkdir(COVER_DIR);

  const fileName = `${generateUuid()}.jpg`;
  const destPath = `${COVER_DIR}/${fileName}`;

  await RNFS.copyFile(tempUri, destPath);

  return `file://${destPath}`;
}

/**
 * Delete a cover image file from permanent storage.
 * Accepts both `file://` prefixed and raw paths; no-ops for null/undefined.
 */
export async function deleteCoverImage(filePath: string | undefined | null): Promise<void> {
  if (!filePath) return;

  const path = filePath.replace(/^file:\/\//, '');
  try {
    const exists = await RNFS.exists(path);
    if (exists) {
      await RNFS.unlink(path);
    }
  } catch {
    // File already gone or unreadable — nothing to clean up
  }
}

/**
 * Delete files in the recipe-covers directory that are no longer referenced
 * by any recipe in the database. Call once on app startup.
 *
 * @param activeCoverUris — Set of `file://...` URIs currently referenced in SQLite.
 */
export async function cleanupOrphanCovers(activeCoverUris: Set<string>): Promise<number> {
  const dirExists = await RNFS.exists(COVER_DIR);
  if (!dirExists) return 0;

  const files = await RNFS.readDir(COVER_DIR);
  let deletedCount = 0;

  for (const file of files) {
    const fileUri = `file://${file.path}`;
    if (!activeCoverUris.has(fileUri)) {
      try {
        await RNFS.unlink(file.path);
        deletedCount++;
      } catch {
        // skip files that can't be deleted
      }
    }
  }

  return deletedCount;
}
