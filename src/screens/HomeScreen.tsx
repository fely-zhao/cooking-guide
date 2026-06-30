import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import type { RootStackNavigationProp } from '../navigation/types';
import { useRecipes } from '../hooks/useRecipes';
import { deleteRecipe } from '../db/recipes';
import type { Recipe } from '../types/cooking';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { IconButton } from '../components/IconButton';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { MagazineCard } from '../components/MagazineCard';
import { CapsuleFab } from '../components/CapsuleFab';
import { RecipeContextMenu } from '../components/RecipeContextMenu';
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
  onPress: () => void;
  onLongPress: () => void;
  onPlayPress: () => void;
}

function CompactCardItem({ recipe, index, onPress, onLongPress, onPlayPress }: CompactItemProps) {
  return (
    <Animated.View
      style={styles.compactCardWrapper}
      entering={FadeInUp.duration(400).delay(Math.min(index * 80, 600))}
    >
      <MagazineCard
        title={recipe.name}
        subtitle={formatSubtitle(recipe)}
        image={recipe.coverImage ? { uri: recipe.coverImage } : undefined}
        size="compact"
        variant="overlay"
        onPress={onPress}
        onLongPress={onLongPress}
        onPlayPress={onPlayPress}
      />
    </Animated.View>
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
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const filteredRecipes = useMemo(() => {
    switch (activeFilter) {
      case 'recent':
        return [...recipes].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      case 'favorite':
        return recipes;
      case 'all':
      default:
        return recipes;
    }
  }, [recipes, activeFilter]);

  const featuredRecipe = filteredRecipes[0];
  const compactRecipes = filteredRecipes.slice(1);

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
      navigation.navigate('RecipeEdit', { recipeId });
    },
    [navigation],
  );

  const handleDeleteRecipe = useCallback(
    (recipeId: string) => {
      deleteRecipe(recipeId);
      refetch();
    },
    [refetch],
  );

  const handleLongPress = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setMenuVisible(true);
  }, []);

  // -----------------------------------------------------------------------
  // FlatList header — greeting + hero + filter bar
  // -----------------------------------------------------------------------

  const renderListHeader = () => (
    <Animated.View entering={FadeInUp.duration(500)}>
      {/* Greeting + Headline */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.headline}>今天想做什么？</Text>
      </View>

      {/* Featured hero card */}
      {featuredRecipe && (
        <Animated.View entering={FadeInUp.duration(500).delay(50)} style={styles.featuredWrapper}>
          <MagazineCard
            title={featuredRecipe.name}
            subtitle={formatSubtitle(featuredRecipe)}
            image={featuredRecipe.coverImage ? { uri: featuredRecipe.coverImage } : undefined}
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
      onPress={() => handleRecipePress(item.id)}
      onLongPress={() => handleLongPress(item)}
      onPlayPress={() => handleStartCooking(item.id)}
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
  // Empty state (State B) — no cards, no filter, no FAB
  // -----------------------------------------------------------------------

  if (filteredRecipes.length === 0) {
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
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      <CapsuleFab title="录入新菜谱" onPress={handleCreateRecipe} />

      <RecipeContextMenu
        visible={menuVisible}
        recipe={selectedRecipe}
        onClose={() => setMenuVisible(false)}
        onEdit={handleEditRecipe}
        onDelete={handleDeleteRecipe}
      />
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
    width: 20,
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
