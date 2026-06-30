import { PermissionsAndroid } from 'react-native';
import { STTError } from './stt-error';

let permissionsGranted = false;

export async function ensureMicPermission(): Promise<void> {
  if (permissionsGranted) return;

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new STTError('麦克风权限被拒绝');
  }
  permissionsGranted = true;
}
