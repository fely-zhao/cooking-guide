import { create as createRenderer, act } from 'react-test-renderer';
import React from 'react';
import KeepAwake from 'react-native-keep-awake';
import { useKeepAwake } from '../hooks/useKeepAwake';

jest.mock('react-native-keep-awake', () => ({
  __esModule: true,
  default: class {
    static activate = jest.fn();
    static deactivate = jest.fn();
  },
}));

const activate = (KeepAwake as unknown as { activate: jest.Mock }).activate;
const deactivate = (KeepAwake as unknown as { deactivate: jest.Mock }).deactivate;

function TestComponent({ active }: { active: boolean }) {
  useKeepAwake(active);
  return null;
}

describe('useKeepAwake', () => {
  beforeEach(() => {
    activate.mockClear();
    deactivate.mockClear();
  });

  it('activates when active and deactivates on unmount', () => {
    let renderer: ReturnType<typeof createRenderer>;
    act(() => {
      renderer = createRenderer(<TestComponent active />);
    });
    expect(activate).toHaveBeenCalledTimes(1);
    expect(deactivate).not.toHaveBeenCalled();

    act(() => {
      renderer.unmount();
    });

    expect(deactivate).toHaveBeenCalledTimes(1);
  });

  it('does not activate when inactive', () => {
    act(() => {
      createRenderer(<TestComponent active={false} />);
    });
    expect(activate).not.toHaveBeenCalled();
    expect(deactivate).not.toHaveBeenCalled();
  });

  it('deactivates when toggled from active to inactive', () => {
    let renderer: ReturnType<typeof createRenderer>;
    act(() => {
      renderer = createRenderer(<TestComponent active />);
    });
    expect(activate).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.update(<TestComponent active={false} />);
    });

    expect(deactivate).toHaveBeenCalledTimes(1);
  });
});
