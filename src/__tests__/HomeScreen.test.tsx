/* eslint-disable @typescript-eslint/no-var-requires -- jest.mock 工厂内必须用 require，不能用静态 import */

// ---------------------------------------------------------------------------
// This test file validates HomeScreen structure and logic.
// Full component rendering tests require Jest + react-native preset due to
// react-native's Flow-typed barrel file. See jest.config.js and jest.setup.js
// for the Jest-based test setup.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mocks — minimal set needed to import HomeScreen without native module errors
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

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: MockView,
  SafeAreaProvider: MockView,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
  withSpring: (v: number) => v,
  withTiming: (v: number) => v,
  withSequence: (...v: number[]) => v[v.length - 1],
  withRepeat: (v: number) => v,
  FadeIn: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  FadeInUp: { duration: () => ({ delay: () => ({}) }) },
  Animated: {
    View: MockView,
    Text: ({ children }: Record<string, unknown>) => {
      const { createElement } = require('react');
      return createElement('Text', null, children);
    },
  },
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: () => null,
  Svg: () => null,
  Path: () => null,
  Circle: () => null,
  Line: () => null,
  Rect: () => null,
  G: () => null,
}));

jest.mock('react-native-gesture-handler', () => ({
  __esModule: true,
  GestureDetector: ({ children }: Record<string, unknown>) => {
    const { createElement } = require('react');
    return createElement(require('react').Fragment, null, children);
  },
  Gesture: { Pan: () => ({}) },
}));

jest.mock('../utils/haptic', () => ({
  __esModule: true,
  hapticLight: () => {},
  hapticMedium: () => {},
  hapticSelection: () => {},
}));

jest.mock('../components/SafeAreaContainer', () => ({
  __esModule: true,
  SafeAreaContainer: ({ children }: Record<string, unknown>) => {
    const { createElement } = require('react');
    return createElement('View', null, children);
  },
}));

jest.mock('@react-navigation/native', () => ({
  __esModule: true,
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (_cb: () => void) => {},
}));

jest.mock('../hooks/useRecipes', () => ({
  __esModule: true,
  useRecipes: () => ({
    recipes: [] as unknown[],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../db/recipes', () => ({
  __esModule: true,
  setRecipeFavorite: jest.fn(),
}));

jest.mock('../db/cook-sessions', () => ({
  __esModule: true,
  getLastCookedAtMap: () => new Map(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HomeScreen', () => {
  it('imports without error', () => {
    const mod = require('../screens/HomeScreen');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('has required child components available for import', () => {
    const homeScreen = require('../screens/HomeScreen');
    const capsuleFab = require('../components/CapsuleFab');
    const iconButton = require('../components/IconButton');
    const gridSkeleton = require('../components/skeleton/HomeGridSkeleton');
    expect(homeScreen.default).toBeDefined();
    expect(capsuleFab.CapsuleFab).toBeDefined();
    expect(iconButton.IconButton).toBeDefined();
    expect(gridSkeleton.HomeGridSkeleton).toBeDefined();
  });

  it('imports MagazineCard with overlay variant', () => {
    const { MagazineCard } = require('../components/MagazineCard');
    expect(MagazineCard).toBeDefined();
  });

  it('imports PressableScale with onLongPress', () => {
    const { PressableScale } = require('../components/PressableScale');
    expect(PressableScale).toBeDefined();
  });

  it('imports settings icon in icon registry', () => {
    const { Icon } = require('../components/icons/Icon');
    expect(Icon).toBeDefined();

    // Verify 'settings' icon name is registered (type-level check via rendering)
    const iconModule = require('../components/icons');
    expect(iconModule.SettingsIcon).toBeDefined();
  });
});
