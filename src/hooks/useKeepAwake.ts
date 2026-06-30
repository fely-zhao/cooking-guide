import { useEffect } from 'react';
import KeepAwake from 'react-native-keep-awake';

export function useKeepAwake(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    KeepAwake.activate();

    return () => {
      KeepAwake.deactivate();
    };
  }, [active]);
}
