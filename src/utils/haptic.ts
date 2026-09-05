import RNHapticFeedback, { HapticFeedbackTypes } from 'react-native-haptic-feedback';

const DEFAULT_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
} as const;

function trigger(type: HapticFeedbackTypes): void {
  try {
    RNHapticFeedback.trigger(type, DEFAULT_OPTIONS);
  } catch (err) {
    console.error('Haptic feedback failed:', err);
  }
}

export function hapticLight(): void {
  trigger(HapticFeedbackTypes.impactLight);
}

export function hapticMedium(): void {
  trigger(HapticFeedbackTypes.impactMedium);
}

export function hapticSuccess(): void {
  trigger(HapticFeedbackTypes.notificationSuccess);
}

export function hapticWarning(): void {
  trigger(HapticFeedbackTypes.notificationWarning);
}

export function hapticSelection(): void {
  trigger(HapticFeedbackTypes.selection);
}
