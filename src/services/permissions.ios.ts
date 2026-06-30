import { AudioManager } from 'react-native-audio-api';
import { STTError } from './stt-error';

let permissionsGranted = false;

export async function ensureMicPermission(): Promise<void> {
  if (permissionsGranted) return;

  const status = await AudioManager.requestRecordingPermissions();
  if (status !== 'Granted') {
    throw new STTError('麦克风权限被拒绝');
  }
  permissionsGranted = true;
}
