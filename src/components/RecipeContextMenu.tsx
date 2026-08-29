import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Alert } from 'react-native';
import type { Recipe } from '../types/cooking';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from './Button';

interface RecipeContextMenuProps {
  visible: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onToggleFavorite: (recipeId: string) => void;
  onEdit: (recipeId: string) => void;
  onDelete: (recipeId: string) => void;
}

export function RecipeContextMenu({
  visible,
  recipe,
  onClose,
  onToggleFavorite,
  onEdit,
  onDelete,
}: RecipeContextMenuProps) {
  // Modal 常驻挂载（用 visible 控制显隐，不条件渲染整个组件）：
  // Android 上 Modal 挂载/卸载会触发窗口焦点切换与背后 Activity 重绘，
  // 表现为长按时背后内容闪一下；常驻可避免反复挂载。
  const handleDelete = () => {
    if (!recipe) {
      return;
    }
    Alert.alert('删除菜谱', `确定要删除「${recipe.name}」吗？此操作不可恢复。`, [
      { text: '取消', style: 'cancel', onPress: onClose },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          onClose();
          onDelete(recipe.id);
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {recipe && (
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
            <Text style={styles.title}>{recipe.name}</Text>

            <View style={styles.menuList}>
              <Button
                title={recipe.isFavorite ? '取消收藏' : '收藏菜谱'}
                variant="text"
                onPress={() => {
                  onClose();
                  onToggleFavorite(recipe.id);
                }}
                style={styles.menuButton}
              />

              <View style={styles.divider} />

              <Button
                title="编辑菜谱"
                variant="text"
                onPress={() => {
                  onClose();
                  onEdit(recipe.id);
                }}
                style={styles.menuButton}
              />

              <View style={styles.divider} />

              <Button
                title="删除菜谱"
                variant="text"
                textStyle={{ color: colors.danger }}
                onPress={handleDelete}
                style={styles.menuButton}
              />
            </View>

            <Button
              title="取消"
              variant="secondary"
              onPress={onClose}
              style={styles.cancelButton}
            />
          </Pressable>
        </Pressable>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    padding: spacing.xxl,
  },
  title: {
    ...typography.h4,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  menuList: {
    marginBottom: spacing.lg,
  },
  menuButton: {
    width: '100%',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  cancelButton: {
    width: '100%',
  },
});
