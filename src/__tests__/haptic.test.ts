import RNHapticFeedback, { HapticFeedbackTypes } from 'react-native-haptic-feedback';
import {
  hapticLight,
  hapticMedium,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
  hapticError,
} from '../utils/haptic';

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    selection: 'selection',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError',
  },
}));

const trigger = (RNHapticFeedback as unknown as { trigger: jest.Mock }).trigger;

describe('haptic utils', () => {
  beforeEach(() => {
    trigger.mockClear();
  });

  it.each([
    ['hapticLight', hapticLight, HapticFeedbackTypes.impactLight],
    ['hapticMedium', hapticMedium, HapticFeedbackTypes.impactMedium],
    ['hapticSelection', hapticSelection, HapticFeedbackTypes.selection],
    ['hapticSuccess', hapticSuccess, HapticFeedbackTypes.notificationSuccess],
    ['hapticWarning', hapticWarning, HapticFeedbackTypes.notificationWarning],
    ['hapticError', hapticError, HapticFeedbackTypes.notificationError],
  ] as const)('%s triggers %s', (_name, fn, expectedType) => {
    fn();
    expect(trigger).toHaveBeenCalledWith(expectedType, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  });

  it('does not throw when trigger fails', () => {
    trigger.mockImplementationOnce(() => {
      throw new Error('native error');
    });

    expect(() => hapticLight()).not.toThrow();
  });
});
