import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, Image, ActivityIndicator, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';
import { getBackendBaseUrl } from '@/utils/backend';
import { formatDateLocalized } from '@/utils/localeFormat';
import { useMemoryDisplayText } from '@/hooks/useMemoryDisplayText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 手账风格装饰元素配置（使用固定旋转角度，不使用随机）
const DECORATIONS = [
  { id: 'd1', icon: 'sparkles' as keyof typeof Ionicons.glyphMap, style: { top: 50, left: 20, transform: [{ rotate: '-15deg' }] } },
  { id: 'd2', icon: 'flower' as keyof typeof Ionicons.glyphMap, style: { top: 120, right: 30, transform: [{ rotate: '10deg' }] } },
  { id: 'd3', icon: 'camera' as keyof typeof Ionicons.glyphMap, style: { bottom: 100, left: 40, transform: [{ rotate: '-8deg' }] } },
  { id: 'd4', icon: 'star' as keyof typeof Ionicons.glyphMap, style: { top: 200, right: 50, transform: [{ rotate: '5deg' }] } },
  { id: 'd5', icon: 'heart' as keyof typeof Ionicons.glyphMap, style: { bottom: 180, right: 20, transform: [{ rotate: '-12deg' }] } },
  { id: 'd6', icon: 'leaf' as keyof typeof Ionicons.glyphMap, style: { top: 300, left: 15, transform: [{ rotate: '8deg' }] } },
];

// 固定的阴影颜色数组
const SHADOW_COLORS = ['#7C6AFF', '#FF7B8A', '#FFD700', '#81C784', '#FFB74D'];
// 固定的旋转角度数组
const ROTATION_ANGLES = [-3, -1, 0, 1, 2, -2, 3, -4];

// 媒体类型
type MediaType = 'image' | 'video';

// 照片项类型
interface PhotoItem {
  id: string;
  url: string;
  memoryId: string;
  memoryTitle: string;
  date: string;
  aspectRatio: number;
  index: number; // 在回忆中的索引
  mediaType: MediaType; // 媒体类型
  /** 用于“唤醒回忆”：当当前帧是视频时，回退到封面/其它图片 URL */
  awakenFallbackImageUrl?: string;
}

// 回忆类型（包含所有照片）
interface MemoryWithPhotos {
  id: string;
  title: string;
  date: string;
  photos: PhotoItem[];
}

// 判断是否为视频 URL
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m4v', '.3gp'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('video');
};

function pickAwakenImageUrl(photos: PhotoItem[], index: number): string | null {
  if (!photos || photos.length === 0) return null;
  const clamped = Math.max(0, Math.min(index, photos.length - 1));
  const current = photos[clamped];
  if (!current) return null;

  const isHttp = (u: string) => /^https?:\/\//i.test(u.trim());
  const isUsableImage = (u: string) => isHttp(u) && !isVideoUrl(u);

  const curUrl = String(current.url || '').trim();
  if (isUsableImage(curUrl)) return curUrl;

  // Prefer nearest non-video image around current index
  for (let d = 1; d < photos.length; d++) {
    const left = photos[clamped - d];
    const right = photos[clamped + d];
    const leftUrl = left ? String(left.url || '').trim() : '';
    const rightUrl = right ? String(right.url || '').trim() : '';
    if (left && isUsableImage(leftUrl)) return leftUrl;
    if (right && isUsableImage(rightUrl)) return rightUrl;
  }

  const fallback = String(current.awakenFallbackImageUrl || '').trim();
  if (isUsableImage(fallback)) return fallback;

  // Last resort: any usable image in the carousel
  for (const p of photos) {
    const u = String(p.url || '').trim();
    if (isUsableImage(u)) return u;
  }

  return null;
}

// 照片卡片组件（手账风格拍立得样式）
function PhotoCard({ 
  item, 
  onPress,
  cardStyle 
}: { 
  item: PhotoItem; 
  onPress: () => void;
  cardStyle: any;
}) {
  // 使用固定的旋转角度和阴影颜色，根据 item.id 的字符码生成
  const rotation = useMemo(() => {
    const charCode = item.id.charCodeAt(0) || 0;
    return ROTATION_ANGLES[charCode % ROTATION_ANGLES.length];
  }, [item.id]);
  
  const shadowColor = useMemo(() => {
    const charCode = item.id.charCodeAt(0) || 0;
    return SHADOW_COLORS[charCode % SHADOW_COLORS.length];
  }, [item.id]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        cardStyle,
        {
          transform: [{ rotate: `${rotation}deg` }],
          shadowColor: shadowColor,
        },
      ]}
    >
      <View style={styles.photoCardInner}>
        {/* 拍立得照片框 */}
        <View style={styles.polaroidContainer}>
          <Image
            source={{ uri: item.url }}
            style={[styles.photoImage, { aspectRatio: item.aspectRatio }]}
            resizeMode="cover"
          />
          {/* 视频标识 */}
          {item.mediaType === 'video' && (
            <View style={styles.videoIndicator}>
              <Ionicons name="play-circle" size={24} color="#FFF" />
            </View>
          )}
          {/* 照片底部装饰 */}
          <View style={styles.polaroidFooter}>
            <View style={styles.polaroidDots}>
              <View style={[styles.dot, { backgroundColor: '#FF7B8A' }]} />
              <View style={[styles.dot, { backgroundColor: '#FFD700' }]} />
              <View style={[styles.dot, { backgroundColor: '#7C6AFF' }]} />
            </View>
          </View>
        </View>
        {/* 日期标签 */}
        <View style={styles.dateTag}>
          <Text style={styles.dateTagText}>{item.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// 单个媒体项渲染组件（用于 PhotoViewer）
// 由于 renderItem 使用了 key={item.id}，组件会在 item 变化时完全重新创建
function MediaItem({ item, isActive }: { item: PhotoItem; isActive?: boolean }) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 监听 isActive 变化来控制播放
  useEffect(() => {
    let isMounted = true;
    
    const controlVideo = async () => {
      // 添加延迟确保视图已挂载
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isMounted || !videoRef.current) return;

      try {
        if (isActive) {
          // 滑动到当前视频时自动播放
          await videoRef.current.playAsync();
          if (isMounted) setIsPlaying(true);
        } else {
          // 滑动离开时暂停
          await videoRef.current.pauseAsync();
          if (isMounted) setIsPlaying(false);
        }
      } catch (error) {
        // 忽略视图已卸载的错误
        console.log('视频控制跳过（视图未就绪）');
      }
    };

    controlVideo();

    return () => {
      isMounted = false;
    };
  }, [isActive]);

  if (item.mediaType === 'video') {
    return (
      <View style={styles.viewerSlide}>
        <Video
          ref={videoRef}
          source={{ uri: item.url }}
          style={styles.viewerImage}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isActive}
          isLooping
          useNativeControls
          posterSource={!isPlaying ? { uri: item.url } : undefined}
          posterStyle={styles.viewerImage}
          onError={(error) => {
            console.log('视频播放错误（可忽略）');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.viewerSlide}>
      <Image
        source={{ uri: item.url }}
        style={styles.viewerImage}
        resizeMode="contain"
      />
    </View>
  );
}

// 照片查看器组件（支持左右滑动）
function PhotoViewer({ 
  visible, 
  photos,
  initialIndex,
  onClose,
  onAwakenSuccess,
}: { 
  visible: boolean;
  photos: PhotoItem[];
  initialIndex: number;
  onClose: () => void;
  onAwakenSuccess?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isAwakening, setIsAwakening] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const safePhotos = photos ?? [];

  // NOTE(video-generation): 接入真实的视频生成服务（替换当前 demo 禁用逻辑）
  // 后端 `/api/v1/video/awaken` 当前返回 501（图生视频需后续接入自建或全球化服务）。
  // 为避免用户误以为“唤醒失败是图片 URL 问题”，这里默认禁用入口（方案 A）。
  const AWAKEN_VIDEO_ENABLED = false;

  // 重置到初始索引
  useEffect(() => {
    setCurrentIndex(initialIndex);
    if (!visible) return;
    if (!flatListRef.current) return;
    if (initialIndex < 0) return;
    if (!safePhotos || initialIndex >= safePhotos.length) return;

    // FlatList sometimes isn't ready immediately when the modal opens.
    // Defer and swallow failures to avoid masking other runtime errors.
    const id = setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      } catch (e) {
        // ignore
      }
    }, 0);
    return () => clearTimeout(id);
  }, [initialIndex, visible, safePhotos]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);
  
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50
  }), []);

  // 唤醒回忆（定义在条件 return 之前）
  const handleAwaken = useCallback(async () => {
    if (!safePhotos || safePhotos.length === 0) return;
    const targetPhoto = safePhotos[currentIndex];
    if (!targetPhoto) return;
    const imageUrl = pickAwakenImageUrl(safePhotos, currentIndex);
    if (!imageUrl) {
      showError(t('moments.awakenFailed'));
      console.error('唤醒回忆失败: 找不到可用的图片 URL（当前可能是纯视频）', {
        memoryId: targetPhoto.memoryId,
        currentIndex,
      });
      return;
    }
    try {
      // Strict validation: backend will also parse, but fail fast here.
      // This catches URLs that start with http(s) but are still invalid.
      // eslint-disable-next-line no-new
      new URL(imageUrl);
    } catch {
      showError(t('moments.awakenFailed'));
      console.error('唤醒回忆失败: Invalid URL (imageUrl)', imageUrl);
      return;
    }

    setIsAwakening(true);
    
    try {
      /**
       * 服务端文件：server/src/routes/video.ts
       * 接口：POST /api/v1/video/awaken
       * Body 参数：imageUrl: string, memoryId?: string, prompt?: string
       */
      const baseUrl = getBackendBaseUrl();
      const endpoint = `${baseUrl}/api/v1/video/awaken`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          memoryId: targetPhoto.memoryId,
          prompt: '照片缓缓动起来，温暖的光线流转，仿佛时光在回溯',
        }),
      });

      const rawText = await response.text();
      const result: any = (() => {
        try {
          return rawText ? JSON.parse(rawText) : {};
        } catch {
          return { error: rawText };
        }
      })();

      if (response.ok && result.success) {
        showSuccess(t('moments.awakenSuccess'));
        // 刷新数据
        onAwakenSuccess?.();
      } else {
        const msg = result?.error || `HTTP ${response.status}`;
        console.error('唤醒回忆失败(后端返回):', {
          endpoint,
          status: response.status,
          imageUrl,
          body: result,
        });
        throw new Error(msg || '唤醒失败');
      }
    } catch (error: any) {
      console.error('唤醒回忆失败:', error);
      showError(error?.message ? `${t('moments.awakenFailed')}: ${String(error.message)}` : t('moments.awakenFailed'));
    } finally {
      setIsAwakening(false);
    }
  }, [safePhotos, currentIndex, onAwakenSuccess, t, showError, showSuccess]);

  const handleAwakenPress = useCallback(() => {
    if (!AWAKEN_VIDEO_ENABLED) {
      // NOTE: 不能用 disabled，否则 onPress 不会触发，用户看不到提示。
      showInfo(t('moments.awakenDisabledTip'));
      return;
    }
    void handleAwaken();
  }, [AWAKEN_VIDEO_ENABLED, handleAwaken, showInfo, t]);

  const boundedPhotoIndex =
    safePhotos.length > 0 ? Math.min(Math.max(0, currentIndex), safePhotos.length - 1) : 0;
  const photoForViewerTitle = safePhotos.length > 0 ? safePhotos[boundedPhotoIndex] : undefined;
  const { title: viewerMemoryTitle } = useMemoryDisplayText({
    title: photoForViewerTitle?.memoryTitle ?? '',
    location: '',
  });

  if (!safePhotos || safePhotos.length === 0) return null;

  const currentPhoto = safePhotos[currentIndex];
  const awakenImageUrl = pickAwakenImageUrl(safePhotos, currentIndex);

  const renderItem = ({ item, index }: { item: PhotoItem; index: number }) => (
    <MediaItem key={item.id} item={item} isActive={index === currentIndex} />
  );

  const onScrollToIndexFailed = (info: any) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.viewerContainer}>
        {/* 关闭按钮 */}
        <TouchableOpacity 
          style={styles.viewerCloseButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>

        {/* 照片列表 */}
        <FlatList
          ref={flatListRef}
          data={safePhotos}
          extraData={i18n.language}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={onScrollToIndexFailed}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          removeClippedSubviews={false}
        />
        
        {/* 照片信息 */}
        <View style={styles.viewerInfo}>
          <Text style={styles.viewerTitle}>{viewerMemoryTitle}</Text>
          <Text style={styles.viewerDate}>{currentPhoto?.date}</Text>
          {/* 页码指示器 */}
          {safePhotos.length > 1 && (
            <Text style={styles.viewerCounter}>
              {currentIndex + 1} / {safePhotos.length}
            </Text>
          )}
        </View>

        {/* 唤醒回忆按钮：视频帧会用相邻图片/封面作为输入 */}
        {!!awakenImageUrl && (
          <View style={styles.awakenButtonContainer}>
            <TouchableOpacity
              style={[styles.awakenButton, !AWAKEN_VIDEO_ENABLED && styles.awakenButtonDisabled]}
              onPress={handleAwakenPress}
              disabled={isAwakening}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={AWAKEN_VIDEO_ENABLED ? ['#7C6AFF', '#9D91FF'] : ['#BDBDBD', '#9E9E9E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.awakenGradient}
              >
                {isAwakening ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="play-circle" size={20} color="#FFF" />
                    <Text style={styles.awakenButtonText}>
                      {AWAKEN_VIDEO_ENABLED ? t('moments.awaken') : t('moments.awakenDisabled')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* 左右箭头指示 */}
        {safePhotos.length > 1 && (
          <>
            {currentIndex > 0 && (
              <View style={[styles.arrowHint, styles.arrowLeft]}>
                <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
              </View>
            )}
            {currentIndex < safePhotos.length - 1 && (
              <View style={[styles.arrowHint, styles.arrowRight]}>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

export default function MomentsScreen() {
  const { t, i18n } = useTranslation();
  const [memories, setMemories] = useState<MemoryWithPhotos[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<MemoryWithPhotos | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);

  // 布局配置
  const COLUMNS = 2;
  const GAP = 10;
  const PADDING = 16;
  const COLUMN_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  // 获取所有回忆中的照片
  const fetchPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：GET /api/v1/memories
       * Query 参数：familyId?: string, page?: number, limit?: number
       */
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/memories?limit=100`);
      const result = await response.json();

      if (result.data) {
        // 按回忆分组保存所有照片
        const memoriesMap: Map<string, MemoryWithPhotos> = new Map();
        
        result.data.forEach((memory: any) => {
          const memoryImages = memory.images || [];
          if (Array.isArray(memoryImages) && memoryImages.length > 0) {
            const photos: PhotoItem[] = [];

            const coverCandidate = typeof memory.cover_image === 'string' ? memory.cover_image.trim() : '';
            const firstNonVideo = memoryImages.find((u: any) => typeof u === 'string' && u.trim() && !isVideoUrl(u)) as
              | string
              | undefined;
            const awakenFallbackImageUrl =
              coverCandidate && !isVideoUrl(coverCandidate)
                ? coverCandidate
                : typeof firstNonVideo === 'string'
                  ? firstNonVideo.trim()
                  : '';
            
            memoryImages.forEach((img: string, idx: number) => {
              if (img && typeof img === 'string' && img.trim()) {
                // 判断是否为视频
                const mediaType: MediaType = isVideoUrl(img) ? 'video' : 'image';
                
                // 生成宽高比：视频用 1:1，图片用随机值
                const aspectRatio = mediaType === 'video' 
                  ? 1.0 
                  : [0.75, 1.0, 1.25, 0.8, 1.33][Math.floor(Math.random() * 5)];
                
                photos.push({
                  id: `${memory.id}-${idx}`,
                  url: img,
                  memoryId: memory.id,
                  memoryTitle: memory.title || '',
                  date: formatDateLocalized(memory.date || memory.created_at, i18n.language, 'shortMd'),
                  aspectRatio,
                  index: idx,
                  mediaType,
                  awakenFallbackImageUrl: awakenFallbackImageUrl || undefined,
                });
              }
            });

            if (photos.length > 0) {
              memoriesMap.set(memory.id, {
                id: memory.id,
                title: memory.title || '',
                date: formatDateLocalized(memory.date || memory.created_at, i18n.language, 'shortMd'),
                photos,
              });
            }
          }
        });

        setMemories(Array.from(memoriesMap.values()));
      }
    } catch (error) {
      console.error('获取照片失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [t, i18n.language]);

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      fetchPhotos();
    }, [fetchPhotos])
  );

  // 将回忆列表转换为照片列表用于瀑布流展示
  const photoList = useMemo(() => {
    const list: PhotoItem[] = [];
    memories.forEach(memory => {
      // 只取每个回忆的第一张照片用于瀑布流展示
      if (memory.photos.length > 0) {
        list.push(memory.photos[0]);
      }
    });
    return list;
  }, [memories]);

  // 分配照片到各列（贪心算法）
  const columnData = useMemo(() => {
    const columns: PhotoItem[][] = Array.from({ length: COLUMNS }, () => []);
    const columnHeights: number[] = Array(COLUMNS).fill(0);

    photoList.forEach((item) => {
      const photoHeight = COLUMN_WIDTH / item.aspectRatio + 30; // 30 = 日期标签高度
      const shortestIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      columns[shortestIndex].push(item);
      columnHeights[shortestIndex] += photoHeight + GAP;
    });

    return columns;
  }, [photoList, COLUMN_WIDTH]);

  // 处理照片点击
  const handlePhotoPress = (photo: PhotoItem) => {
    const memory = memories.find(m => m.id === photo.memoryId);
    if (memory) {
      setSelectedMemory(memory);
      const idx = memory.photos.findIndex(p => p.id === photo.id);
      setSelectedPhotoIndex(idx >= 0 ? idx : 0);
      setShowViewer(true);
    }
  };

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部标题 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('moments.title')}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="camera" size={22} color="#7C6AFF" />
        </View>
      </View>

      {/* 装饰元素 */}
      {DECORATIONS.map((dec) => (
        <View 
          key={dec.id} 
          style={[styles.decoration, dec.style]}
        >
          <Ionicons name={dec.icon} size={20} color="#7C6AFF" />
        </View>
      ))}

      {/* 照片瀑布流 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C6AFF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : memories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="camera-outline" size={60} color="#8B7355" />
          </View>
          <Text style={styles.emptyText}>{t('moments.empty')}</Text>
          <Text style={styles.emptySubtext}>{t('moments.startCapturing')}</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: PADDING }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.columnsContainer, { gap: GAP }]}>
            {columnData.map((colPhotos, colIndex) => (
              <View key={colIndex} style={[styles.column, { gap: GAP }]}>
                {colPhotos.map((item) => (
                  <PhotoCard
                    key={item.id}
                    item={item}
                    onPress={() => handlePhotoPress(item)}
                    cardStyle={{ width: COLUMN_WIDTH }}
                  />
                ))}
              </View>
            ))}
          </View>
          
          {/* 底部装饰 */}
          <View style={styles.footerDecoration}>
            <Text style={styles.footerText}>~ {t('moments.startCapturing')} ~</Text>
          </View>
        </ScrollView>
      )}

      {/* 照片查看器 */}
      <PhotoViewer
        visible={showViewer}
        photos={selectedMemory?.photos || []}
        initialIndex={selectedPhotoIndex}
        onClose={() => setShowViewer(false)}
        onAwakenSuccess={fetchPhotos}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FDF8F0', // 温暖米黄色背景，模拟手账纸
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5D4E37', // 深棕色文字
  },
  subtitle: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 4,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decoration: {
    position: 'absolute',
    zIndex: 0,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  columnsContainer: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  // 照片卡片样式
  photoCardInner: {
    marginBottom: 4,
  },
  polaroidContainer: {
    backgroundColor: '#FFF',
    borderRadius: 4,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  photoImage: {
    width: '100%',
    borderRadius: 2,
    backgroundColor: '#E8E0D5',
  },
  polaroidFooter: {
    paddingTop: 8,
    alignItems: 'center',
  },
  polaroidDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dateTag: {
    alignSelf: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(124, 106, 255, 0.08)',
    borderRadius: 10,
  },
  dateTagText: {
    fontSize: 11,
    color: '#7C6AFF',
    fontWeight: '500',
  },
  // 视频标识
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 4,
  },
  // 加载状态
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B7355',
  },
  // 空状态
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4E37',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 8,
  },
  // 底部装饰
  footerDecoration: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 13,
    color: '#8B7355',
    fontStyle: 'italic',
  },
  // 照片查看器
  viewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  viewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  viewerInfo: {
    position: 'absolute',
    bottom: 140,
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  viewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 6,
  },
  viewerDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  viewerCounter: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
  },
  // 唤醒回忆按钮
  awakenButtonContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  awakenButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  awakenButtonDisabled: {
    opacity: 0.75,
  },
  awakenGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  awakenButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  // 左右箭头提示
  arrowHint: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: {
    left: 10,
  },
  arrowRight: {
    right: 10,
  },
  // 视频播放相关
  videoPlayOverlay: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124, 106, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
