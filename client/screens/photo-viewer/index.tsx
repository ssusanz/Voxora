import { Screen } from '@/components/Screen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Pressable,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import { InlineDeleteReveal } from '@/components/InlineDeleteReveal';
import { removeMediaUrlFromMemory } from '@/utils/memoryRemote';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function parseImagesParam(json?: string): string[] {
  try {
    const raw = json ? JSON.parse(json) : [];
    return Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function ViewerVideo({ uri, style }: { uri: string; style: StyleProp<ImageStyle> }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={style} contentFit="contain" nativeControls />;
}

export default function PhotoViewerScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ images?: string; initialIndex?: string; memoryId?: string }>();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const parsed = useMemo(() => parseImagesParam(params.images), [params.images]);
  const [slides, setSlides] = useState<string[]>(() => parsed);
  const [currentIndex, setCurrentIndex] = useState(0);
  const indexInitialized = useRef(false);

  useEffect(() => {
    setSlides(parsed);
  }, [parsed]);

  useEffect(() => {
    if (indexInitialized.current || slides.length === 0) return;
    const raw = params.initialIndex !== undefined ? String(params.initialIndex) : '0';
    const idx = parseInt(raw, 10);
    const safe = Number.isFinite(idx) ? idx : 0;
    setCurrentIndex(Math.min(Math.max(0, safe), slides.length - 1));
    indexInitialized.current = true;
  }, [slides.length, params.initialIndex]);

  const memoryId = typeof params.memoryId === 'string' ? params.memoryId.trim() : '';

  const currentImage = slides[currentIndex];
  const isVideo =
    currentImage?.toLowerCase().endsWith('.mp4') || currentImage?.toLowerCase().endsWith('.mov');

  const handleGoBack = () => {
    router.back();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const runDeleteCurrentSlide = useCallback(async () => {
    if (!memoryId || !currentImage) return;
    const res = await removeMediaUrlFromMemory(memoryId, currentImage);
    if (res === 'error') {
      showError(t('common.deleteFailed'));
      return;
    }
    if (res === 'memory_deleted') {
      showSuccess(t('common.deleteSuccess'));
      router.back();
      return;
    }
    const removedUrl = currentImage;
    const next = slides.filter((u) => u !== removedUrl);
    setSlides(next);
    setCurrentIndex((i) => (next.length === 0 ? 0 : Math.min(i, next.length - 1)));
    showSuccess(t('common.deleteSuccess'));
  }, [memoryId, currentImage, t, router, showError, showSuccess]);

  if (!slides || slides.length === 0) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} style={styles.screen}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.emptyContainer}>
            <Ionicons name="image-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>{t('common.noImages')}</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.navButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentIndex + 1} / {slides.length}
          </Text>
          <View style={styles.navButton} />
        </View>

        {/* 图片/视频显示区：有 memoryId 时长按出现下方删除条 */}
        <InlineDeleteReveal
          style={styles.mediaContainer}
          onDelete={runDeleteCurrentSlide}
          deleteEnabled={!!memoryId}
          immersive
        >
          {(openBar) => (
            <Pressable
              style={styles.mediaPressable}
              onLongPress={memoryId ? openBar : undefined}
              delayLongPress={450}
            >
              {isVideo && currentImage ? (
                <ViewerVideo uri={currentImage} style={styles.media} />
              ) : (
                <Image source={{ uri: currentImage }} style={styles.media} resizeMode="contain" />
              )}
            </Pressable>
          )}
        </InlineDeleteReveal>

        {/* 底部导航按钮 */}
        {slides.length > 1 && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              onPress={handlePrev}
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              disabled={currentIndex === 0}
            >
              <Ionicons name="chevron-back" size={32} color={currentIndex === 0 ? '#666' : '#FFF'} />
              <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
                {t('common.previous')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={[styles.navButton, currentIndex === slides.length - 1 && styles.navButtonDisabled]}
              disabled={currentIndex === slides.length - 1}
            >
              <Text
                style={[
                  styles.navButtonText,
                  currentIndex === slides.length - 1 && styles.navButtonTextDisabled,
                ]}
              >
                {t('common.next')}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={32}
                color={currentIndex === slides.length - 1 ? '#666' : '#FFF'}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  navButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    zIndex: 1000,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
});
