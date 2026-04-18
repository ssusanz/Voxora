import { useCallback, useState, type ReactNode } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type InlineDeleteRevealProps = {
  onDelete: () => void | Promise<void>;
  deleteEnabled?: boolean;
  /** 在此函数中给可长按区域绑定 `onLongPress={openBar}` */
  children: (openBar: () => void) => ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 深色背景（如全屏看图）：图标用浅色 */
  immersive?: boolean;
};

/**
 * 长按后在内容下方居中显示：返回（仅收起）与垃圾箱（执行删除）。
 */
export function InlineDeleteReveal({
  onDelete,
  deleteEnabled = true,
  children,
  style,
  immersive = false,
}: InlineDeleteRevealProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openBar = useCallback(() => {
    if (deleteEnabled) setRevealed(true);
  }, [deleteEnabled]);

  const dismiss = useCallback(() => {
    setRevealed(false);
  }, []);

  const runDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete();
      setRevealed(false);
    } finally {
      setDeleting(false);
    }
  }, [onDelete, deleting]);

  return (
    <View style={[styles.wrap, style]}>
      {children(openBar)}
      {revealed ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.iconHit,
              pressed && (immersive ? styles.iconHitPressedImmersive : styles.iconHitPressed),
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={24} color={immersive ? 'rgba(255,255,255,0.92)' : '#555'} />
          </Pressable>
          <Pressable
            onPress={() => void runDelete()}
            disabled={deleting}
            style={({ pressed }) => [
              styles.iconHit,
              pressed && !deleting && (immersive ? styles.iconHitPressedImmersive : styles.iconHitPressed),
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            hitSlop={12}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={immersive ? '#FFB4B4' : '#D32F2F'} />
            ) : (
              <Ionicons
                name="trash-outline"
                size={24}
                color={immersive ? '#FF8A8A' : '#D32F2F'}
              />
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingTop: 10,
    paddingBottom: 4,
  },
  iconHit: {
    padding: 8,
    borderRadius: 10,
  },
  iconHitPressed: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  iconHitPressedImmersive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
