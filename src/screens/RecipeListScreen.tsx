import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import type { RootStackNavigationProp } from '../navigation/types';
import { useRecipes } from '../hooks/useRecipes';
import type { Recipe } from '../types/cooking';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { HeaderBar } from '../components/HeaderBar';
import { IconButton } from '../components/IconButton';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { MagazineCard } from '../components/MagazineCard';
import { RecipeCardSkeleton } from '../components/skeleton';
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

interface CategoryFilterBarProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

function CategoryFilterBar({ activeFilter, onFilterChange }: CategoryFilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBarContent}
    >
      {FILTERS.map(filter => {
        const isActive = activeFilter === filter.key;
        return (
          <PressableScale
            key={filter.key}
            scale={0.95}
            haptic="selection"
            onPress={() => onFilterChange(filter.key)}
            style={[styles.filterPill, isActive && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
              {filter.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

interface CompactItemProps {
  recipe: Recipe;
  index: number;
  onPress: () => void;
}

function CompactCardItem({ recipe, index, onPress }: CompactItemProps) {
  return (
    <Animated.View
      style={styles.compactCardWrapper}
      entering={FadeInUp.duration(400).delay(Math.min(index * 80, 600))}
    >
      <MagazineCard
        title={recipe.name}
        subtitle={formatSubtitle(recipe)}
        size="compact"
        onPress={onPress}
      />
    </Animated.View>
  );
}

export default function RecipeListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { recipes, loading, refetch } = useRecipes();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

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
        // 收藏功能尚未实现，暂时展示全部
        return recipes;
      case 'all':
      default:
        return recipes;
    }
  }, [recipes, activeFilter]);

  const featuredRecipe = filteredRecipes[0];
  const compactRecipes = filteredRecipes.slice(1);

  const handleCreateRecipe = useCallback(() => {
    navigation.navigate('RecipeInput', { mode: 'create' });
  }, [navigation]);

  const handleRecipePress = useCallback(
    (recipeId: string) => {
      navigation.navigate('RecipeDetail', { recipeId });
    },
    [navigation],
  );

  const renderListHeader = () => (
    <View>
      <CategoryFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      {featuredRecipe && (
        <Animated.View entering={FadeInUp.duration(500)} style={styles.featuredWrapper}>
          <MagazineCard
            title={featuredRecipe.name}
            subtitle={formatSubtitle(featuredRecipe)}
            size="featured"
            onPress={() => handleRecipePress(featuredRecipe.id)}
          />
        </Animated.View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return <RecipeCardSkeleton />;
    }

    return (
      <View style={styles.emptyState}>
        <EmptyRecipeIllustration size={120} />
        <Text style={styles.emptyTitle}>暂无菜谱</Text>
        <Text style={styles.emptySubtitle}>添加第一道菜，开始你的厨房之旅</Text>
        <Button title="添加第一道菜" variant="primary" onPress={handleCreateRecipe} />
      </View>
    );
  };

  const renderCompactItem = ({ item, index }: { item: Recipe; index: number }) => (
    <CompactCardItem recipe={item} index={index} onPress={() => handleRecipePress(item.id)} />
  );

  return (
    <SafeAreaContainer>
      <HeaderBar title="我的菜谱" />

      <FlatList
        data={compactRecipes}
        keyExtractor={item => item.id}
        numColumns={2}
        renderItem={renderCompactItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={filteredRecipes.length === 0 ? renderEmpty : null}
        contentContainerStyle={filteredRecipes.length === 0 ? styles.listEmpty : styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      <Animated.View style={styles.fabContainer} entering={FadeIn.duration(400).delay(300)}>
        <IconButton
          name="plus"
          variant="primary"
          size={28}
          onPress={handleCreateRecipe}
          style={styles.fabButton}
        />
      </Animated.View>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.scrollBottomPadding,
  },
  listEmpty: {
    flex: 1,
  },
  filterBarContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  filterPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: colors.text.inverse,
  },
  featuredWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  compactCardWrapper: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  fabContainer: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xxl,
    ...shadows.float,
    borderRadius: spacing.radius.full,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: spacing.radius.full,
  },
});
