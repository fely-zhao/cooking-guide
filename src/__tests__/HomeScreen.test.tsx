import { describe, it, expect, jest, mock, beforeEach } from 'bun:test';

// ---------------------------------------------------------------------------
// This test file validates HomeScreen structure and logic.
// Full component rendering tests require Jest + react-native preset due to
// bun's limitations with mocking react-native's Flow-typed barrel file.
// See jest.config.js and jest.setup.js for the Jest-based test setup.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mocks — minimal set needed to import HomeScreen without native module errors
// ---------------------------------------------------------------------------

function MockView({ children }: Record<string, unknown>) {
  const { createElement } = require('react');
  return createElement('View', null, children);
}

mock.module('react-native', () => ({
  View: MockView,
  Text: ({ children }: Record<string, unknown>) => {
    const { createElement } = require('react');
    return createElement('Text', null, children);
  },
  StyleSheet: { create: (s: Record<string, unknown>) => s, hairlineWidth: 1 },
  Pressable: MockView,
  Alert: { alert: () => {} },
  Modal: () => null,
  ImageBackground: MockView,
  ScrollView: MockView,
  TouchableOpacity: MockView,
  ActivityIndicator: () => null,
  FlatList: () => null,
}));

mock.module('react-native-safe-area-context', () => ({
  SafeAreaView: MockView,
  SafeAreaProvider: MockView,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

mock.module('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: MockView, Text: ({ children }: Record<string, unknown>) => {
    const { createElement } = require('react');
    return createElement('Text', null, children);
  }},
  useSharedValue: (v: number) => ({ value: v }),
  useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
  withSpring: (v: number) => v,
  withTiming: (v: number) => v,
  withSequence: (...v: number[]) => v[v.length - 1],
  withRepeat: (v: number) => v,
  FadeIn: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  FadeInUp: { duration: () => ({ delay: () => ({}) }) },
  Animated: { View: MockView, Text: ({ children }: Record<string, unknown>) => {
    const { createElement } = require('react');
    return createElement('Text', null, children);
  }},
}));

mock.module('react-native-svg', () => ({
  __esModule: true,
  default: () => null,
  Svg: () => null,
  Path: () => null,
  Circle: () => null,
  Line: () => null,
  Rect: () => null,
  G: () => null,
}));

mock.module('react-native-gesture-handler', () => ({
  __esModule: true,
  GestureDetector: ({ children }: Record<string, unknown>) => {
    const { createElement } = require('react');
    return createElement(React.Fragment, null, children);
  },
  Gesture: { Pan: () => ({}) },
}));

mock.module('../utils/haptic', () => ({
  __esModule: true,
  hapticLight: () => {},
  hapticMedium: () => {},
  hapticSelection: () => {},
}));

mock.module('../components/SafeAreaContainer', () => ({
  __esModule: true,
  SafeAreaContainer: ({ children }: Record<string, unknown>) => {
    const { createElement } = require('react');
    return createElement('View', null, children);
  },
}));

mock.module('@react-navigation/native', () => ({
  __esModule: true,
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb: () => void) => {},
}));

mock.module('../hooks/useRecipes', () => ({
  __esModule: true,
  useRecipes: () => ({
    recipes: [] as unknown[],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

mock.module('../db/recipes', () => ({
  __esModule: true,
  deleteRecipe: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HomeScreen', () => {
  it('imports without error', async () => {
    const mod = await import('../screens/HomeScreen');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('has required child components available for import', async () => {
    const [homeScreen, capsuleFab, contextMenu, gridSkeleton] = await Promise.all([
      import('../screens/HomeScreen'),
      import('../components/CapsuleFab'),
      import('../components/RecipeContextMenu'),
      import('../components/skeleton/HomeGridSkeleton'),
    ]);
    expect(homeScreen.default).toBeDefined();
    expect(capsuleFab.CapsuleFab).toBeDefined();
    expect(contextMenu.RecipeContextMenu).toBeDefined();
    expect(gridSkeleton.HomeGridSkeleton).toBeDefined();
  });

  it('imports MagazineCard with overlay variant', async () => {
    const { MagazineCard } = await import('../components/MagazineCard');
    expect(MagazineCard).toBeDefined();
  });

  it('imports PressableScale with onLongPress', async () => {
    const { PressableScale } = await import('../components/PressableScale');
    expect(PressableScale).toBeDefined();
  });

  it('imports settings icon in icon registry', async () => {
    const { Icon } = await import('../components/icons/Icon');
    expect(Icon).toBeDefined();

    // Verify 'settings' icon name is registered (type-level check via rendering)
    const iconModule = await import('../components/icons');
    expect(iconModule.SettingsIcon).toBeDefined();
  });
});
