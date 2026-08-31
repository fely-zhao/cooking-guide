/* eslint-disable @typescript-eslint/no-var-requires -- jest.mock 工厂内必须用 require，不能用静态 import */

// ---------------------------------------------------------------------------
// LoadingOverlay / AiProcessingOverlay 渲染守卫回归测试。
// 背景：重构时 AiProcessingOverlay 丢失 `if (!visible) return null` 守卫，
// 导致厨师帽遮罩常驻屏幕、循环动画持续占用线程（真机全程卡顿）。
// react-test-renderer 19 为并发渲染，create() 必须用 act() 包裹才能 flush。
// ---------------------------------------------------------------------------

function MockView({ children }: Record<string, unknown>) {
  const { createElement } = require('react');
  return createElement('View', null, children);
}

jest.mock('react-native', () => ({
  View: MockView,
  Text: ({ children }: Record<string, unknown>) => {
    const { createElement } = require('react');
    return createElement('Text', null, children);
  },
  StyleSheet: {
    create: (s: Record<string, unknown>) => s,
    absoluteFill: {},
  },
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: MockView,
    Text: ({ children }: Record<string, unknown>) => {
      const { createElement } = require('react');
      return createElement('Text', null, children);
    },
  },
  useSharedValue: (v: number) => ({ value: v }),
  useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
  withRepeat: (v: number) => v,
  withTiming: (v: number) => v,
  interpolate: (_v: number, _in: number[], out: number[]) => out[0],
  Easing: { inOut: (f: unknown) => f, quad: 'quad', linear: 'linear' },
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: () => null,
  Svg: () => null,
  Path: () => null,
  Circle: () => null,
  Rect: () => null,
}));

import { act } from 'react';
import TestRenderer from 'react-test-renderer';
const { createElement } = require('react');
const { LoadingOverlay, AiProcessingOverlay } = require('../components/LoadingOverlay');

function makeRenderer() {
  const created: TestRenderer.ReactTestRenderer[] = [];

  function render(ui: React.ReactElement) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(ui);
    });
    created.push(tree);
    return tree;
  }

  function cleanup() {
    while (created.length) {
      const tree = created.pop();
      act(() => {
        tree?.unmount();
      });
    }
  }

  return { render, cleanup };
}

describe('LoadingOverlay', () => {
  beforeAll(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  });

  const { render, cleanup } = makeRenderer();
  afterEach(cleanup);

  it('visible=false 时不渲染任何内容', () => {
    const tree = render(createElement(LoadingOverlay, { visible: false }));
    expect(tree.toJSON()).toBeNull();
  });

  it('visible=true 时渲染自定义提示文案', () => {
    const tree = render(createElement(LoadingOverlay, { visible: true, message: '保存中…' }));
    expect(JSON.stringify(tree.toJSON())).toContain('保存中…');
  });

  it('visible=true 缺省文案为「加载中…」', () => {
    const tree = render(createElement(LoadingOverlay, { visible: true }));
    expect(JSON.stringify(tree.toJSON())).toContain('加载中…');
  });
});

describe('AiProcessingOverlay', () => {
  beforeAll(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  });

  const { render, cleanup } = makeRenderer();
  afterEach(cleanup);

  it('visible=false 时不渲染任何内容（回归：守卫丢失导致遮罩常驻）', () => {
    const tree = render(createElement(AiProcessingOverlay, { visible: false }));
    expect(tree.toJSON()).toBeNull();
  });

  it('visible=true 时渲染 AI 解析步骤文案', () => {
    const tree = render(createElement(AiProcessingOverlay, { visible: true }));
    expect(JSON.stringify(tree.toJSON())).toContain('正在识别食材…');
  });
});
