import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import type { RootStackNavigationProp } from '../navigation/types';
import { useRecipes } from '../hooks/useRecipes';
import { setRecipeFavorite } from '../db/recipes';
import { getLastCookedAtMap } from '../db/cook-sessions';
import type { Recipe } from '../types/cooking';
import { Icon } from '../components/icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { IconButton } from '../components/IconButton';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { MagazineCard } from '../components/MagazineCard';
import { CapsuleFab } from '../components/CapsuleFab';
import { HomeGridSkeleton } from '../components/skeleton';
import { EmptyRecipeIllustration } from '../components/illustrations';

type FilterOption = 'all' | 'recent' | 'favorite';

interface FilterConfig {
  key: FilterOption;
  label: string;
}

const FILTERS: FilterConfig[] = [
  { key: 'all', label: '全部' },
  { key: 'recent', label: '最近' },
  { key: 'favorite', label: '收藏' },
];

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} 天前`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} 个月前`;
}

function formatSubtitle(recipe: Recipe): string {
  return formatRelativeTime(recipe.updatedAt);
}

function byCreatedAtDesc(a: Recipe, b: Recipe): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '早上好，主厨';
  if (hour < 18) return '下午好，主厨';
  return '晚上好，主厨';
}

// ---------------------------------------------------------------------------
// CompactCardItem
// ---------------------------------------------------------------------------

interface CompactItemProps {
  recipe: Recipe;
  index: number;
  animate: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPlayPress: () => void;
  menuVisible: boolean;
  onToggleFavorite: () => void;
  onEditPress: () => void;
  onCloseMenu: () => void;
}

function CompactCardItem({
  recipe,
  index,
  animate,
  onPress,
  onLongPress,
  onPlayPress,
  menuVisible,
  onToggleFavorite,
  onEditPress,
  onCloseMenu,
}: CompactItemProps) {
  return (
    <Animated.View
      style={styles.compactCardWrapper}
      entering={animate ? FadeInUp.duration(400).delay(Math.min(index * 80, 600)) : undefined}
    >
      <MagazineCard
        title={recipe.name}
        subtitle={formatSubtitle(recipe)}
        image={recipe.coverImage ? { uri: recipe.coverImage } : undefined}
        badge={recipe.isFavorite ? <FavoriteBadge /> : undefined}
        size="compact"
        variant="overlay"
        onPress={onPress}
        onLongPress={onLongPress}
        onPlayPress={onPlayPress}
        menuVisible={menuVisible}
        isFavorite={recipe.isFavorite}
        onToggleFavorite={onToggleFavorite}
        onEditPress={onEditPress}
        onCloseMenu={onCloseMenu}
      />
    </Animated.View>
  );
}

function FavoriteBadge() {
  return (
    <View style={styles.favoriteBadge}>
      <Icon name="heart-filled" size={14} color={colors.text.inverse} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// FilterBar — minimal cold-gray text row, no colored backgrounds
// ---------------------------------------------------------------------------

interface FilterBarProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <View style={styles.filterBar}>
      {FILTERS.map(filter => {
        const isActive = activeFilter === filter.key;
        return (
          <PressableScale
            key={filter.key}
            scale={0.95}
            haptic="selection"
            onPress={() => onFilterChange(filter.key)}
            style={styles.filterTab}
          >
            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
              {filter.label}
            </Text>
            {isActive && <View style={styles.filterUnderline} />}
          </PressableScale>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { recipes, loading, refetch } = useRecipes();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  // 长按菜单改为卡片内覆盖层，只记卡片 id；null 表示无菜单打开
  const [menuRecipeId, setMenuRecipeId] = useState<string | null>(null);
  // 进入动画只在首次进首页播放；筛选/收藏刷新会重建 FlatList 行导致 entering 重放，
  // 视觉上是全屏卡片反复淡入（像闪烁），所以首帧后关闭
  const [cardsAnimate, setCardsAnimate] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setCardsAnimate(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const filteredRecipes = useMemo(() => {
    switch (activeFilter) {
      case 'recent': {
        // 最近做过：只显示有烹饪记录的菜谱，按最后烹饪时间取前 10
        const lastCookedAt = getLastCookedAtMap();
        return recipes
          .filter(r => lastCookedAt.has(r.id))
          .sort((a, b) => (lastCookedAt.get(b.id) ?? 0) - (lastCookedAt.get(a.id) ?? 0))
          .slice(0, 10);
      }
      case 'favorite':
        return recipes.filter(r => r.isFavorite).sort(byCreatedAtDesc);
      case 'all':
      default:
        return [...recipes].sort(byCreatedAtDesc);
    }
  }, [recipes, activeFilter]);

  // 大卡片固定推荐最新添加的菜谱，与 tab 无关（新菜优先曝光，任何 tab 下焦点位不空）
  const featuredRecipe = useMemo(() => [...recipes].sort(byCreatedAtDesc)[0], [recipes]);

  // 列表 = 完整筛选结果（含大卡片菜谱）：大卡片是焦点位，列表是全量清单，
  // 避免互斥方案下切 tab 时列表数量对不上、单条收藏时列表空白的割裂
  const compactRecipes = filteredRecipes;

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleCreateRecipe = useCallback(() => {
    navigation.navigate('RecipeInput', { mode: 'create' });
  }, [navigation]);

  const handleSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleRecipePress = useCallback(
    (recipeId: string) => {
      navigation.navigate('RecipeDetail', { recipeId });
    },
    [navigation],
  );

  const handleStartCooking = useCallback(
    (recipeId: string) => {
      navigation.navigate('Cooking', { recipeId });
    },
    [navigation],
  );

  const handleEditRecipe = useCallback(
    (recipeId: string) => {
      // 先关菜单再跳转，否则从编辑页返回时菜单还开着
      setMenuRecipeId(null);
      navigation.navigate('RecipeEdit', { recipeId });
    },
    [navigation],
  );

  const handleLongPress = useCallback((recipe: Recipe) => {
    setMenuRecipeId(recipe.id);
  }, []);

  const handleCloseMenu = useCallback(() => setMenuRecipeId(null), []);

  const handleToggleFavorite = useCallback(
    (recipeId: string) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) return;
      setMenuRecipeId(null);
      setRecipeFavorite(recipeId, !recipe.isFavorite);
      refetch();
    },
    [recipes, refetch],
  );

  // -----------------------------------------------------------------------
  // FlatList header — greeting + hero + filter bar
  // -----------------------------------------------------------------------

  const renderListHeader = () => (
    <Animated.View entering={cardsAnimate ? FadeInUp.duration(500) : undefined}>
      {/* Greeting + Headline */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.headline}>今天想做什么？</Text>
      </View>

      {/* Featured hero card */}
      {featuredRecipe && (
        <Animated.View
          entering={cardsAnimate ? FadeInUp.duration(500).delay(50) : undefined}
          style={styles.featuredWrapper}
        >
          <MagazineCard
            title={featuredRecipe.name}
            subtitle={formatSubtitle(featuredRecipe)}
            image={featuredRecipe.coverImage ? { uri: featuredRecipe.coverImage } : undefined}
            badge={featuredRecipe.isFavorite ? <FavoriteBadge /> : undefined}
            size="featured"
            onPress={() => handleRecipePress(featuredRecipe.id)}
            onPlayPress={() => handleStartCooking(featuredRecipe.id)}
          />
        </Animated.View>
      )}

      {/* Filter bar */}
      <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
    </Animated.View>
  );

  const renderCompactItem = ({ item, index }: { item: Recipe; index: number }) => (
    <CompactCardItem
      recipe={item}
      index={index}
      animate={cardsAnimate}
      onPress={() => handleRecipePress(item.id)}
      onLongPress={() => handleLongPress(item)}
      onPlayPress={() => handleStartCooking(item.id)}
      menuVisible={menuRecipeId === item.id}
      onToggleFavorite={() => handleToggleFavorite(item.id)}
      onEditPress={() => handleEditRecipe(item.id)}
      onCloseMenu={handleCloseMenu}
    />
  );

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaContainer>
        <HomeGridSkeleton />
      </SafeAreaContainer>
    );
  }

  // -----------------------------------------------------------------------
  // Empty state (State B) — no recipes at all: no cards, no filter, no FAB
  //（某个 tab 无结果时页面结构不变，由 FlatList 的 ListEmptyComponent 在列表区展示提示）
  // -----------------------------------------------------------------------

  if (recipes.length === 0) {
    return (
      <SafeAreaContainer>
        {/* Settings icon — ghost style, top-right */}
        <Animated.View
          style={[styles.settingsButton, { top: insets.top + spacing.sm }]}
          entering={FadeIn.duration(400)}
        >
          <IconButton
            name="settings"
            variant="default"
            color={colors.text.lighter}
            size={22}
            onPress={handleSettings}
          />
        </Animated.View>

        {/* Greeting + Headline — same top style + horizontal padding as populated state (FlatList provides lg padding, header adds sm) */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={styles.header}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.headline}>今天想做什么？</Text>
          </View>
        </View>

        {/* Empty content — fills remaining space, centered */}
        <View style={styles.emptyState}>
          <EmptyRecipeIllustration size={120} />
          <Text style={styles.emptyTitle}>暂无菜谱</Text>
          <Text style={styles.emptySubtitle}>添加第一道菜，开始你的厨房之旅</Text>
          <Button title="添加第一道菜" variant="primary" onPress={handleCreateRecipe} />
        </View>
      </SafeAreaContainer>
    );
  }

  // -----------------------------------------------------------------------
  // Populated state (State A) — full layout
  // -----------------------------------------------------------------------

  return (
    <SafeAreaContainer>
      {/* Settings icon — ghost style, top-right */}
      <Animated.View
        style={[styles.settingsButton, { top: insets.top + spacing.sm }]}
        entering={FadeIn.duration(400)}
      >
        <IconButton
          name="settings"
          variant="default"
          color={colors.text.lighter}
          size={22}
          onPress={handleSettings}
        />
      </Animated.View>

      <FlatList
        data={compactRecipes}
        keyExtractor={item => item.id}
        numColumns={2}
        renderItem={renderCompactItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={styles.tabEmptyState}>
            <EmptyRecipeIllustration size={120} />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'favorite' ? '暂无收藏' : '还没有烹饪记录'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'favorite' ? '长按菜谱即可收藏' : '做过的菜会出现在这里'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      <CapsuleFab title="录入新菜谱" onPress={handleCreateRecipe} />
    </SafeAreaContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // --- Layout ---
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.scrollBottomPadding + 80,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  compactCardWrapper: {
    width: '47%',
  },

  // --- Settings icon ---
  settingsButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },

  // --- Header (greeting + headline) ---
  header: {
    marginTop: spacing.screenTopPadding,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  greeting: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  headline: {
    ...typography.h1,
    color: colors.text.primary,
  },

  // --- Featured hero card ---
  featuredWrapper: {
    marginBottom: spacing.xl,
  },

  favoriteBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: spacing.radius.full,
    padding: spacing.xs,
  },

  // --- Filter bar ---
  filterBar: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  filterTab: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterText: {
    ...typography.body,
    color: colors.text.muted,
  },
  filterTextActive: {
    color: colors.text.primary,
  },
  filterUnderline: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: colors.text.primary,
  },

  // --- Empty state ---
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.screenTopPadding,
    paddingHorizontal: spacing.xxxl,
    gap: spacing.lg,
  },
  tabEmptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.text.lighter,
    textAlign: 'center',
  },
});
