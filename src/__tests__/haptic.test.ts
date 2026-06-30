import { describe, it, expect, jest, mock, beforeEach } from 'bun:test';

const HapticFeedbackTypes = {
  impactLight: 'impactLight',
  impactMedium: 'impactMedium',
  selection: 'selection',
  notificationSuccess: 'notificationSuccess',
  notificationWarning: 'notificationWarning',
  notificationError: 'notificationError',
} as const;

const trigger = jest.fn();

mock.module('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger },
  trigger,
  HapticFeedbackTypes,
}));

const { hapticLight, hapticMedium, hapticSelection, hapticSuccess, hapticWarning, hapticError } =
  await import('../utils/haptic');

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
