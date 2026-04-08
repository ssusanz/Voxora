import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  SharedValue
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 回忆数据
interface MemoryDetail {
  id: string;
  title: string;
  date: string;
  location: string;
  weather: string;
  mood: string;
  images: string[];
  audioUrl?: string;
  participants: { id: string; name: string; avatar: string }[];
  likes: number;
  comments: { id: string; userId: string; userName: string; content: string; timestamp: string }[];
  isSealed: boolean;
  unlockDate?: string;
}

const mockMemoryDetail: MemoryDetail = {
  id: '1',
  title: '家庭聚餐',
  date: '2024年12月25日 18:30',
  location: '北京·外婆家',
  weather: 'sunny',
  mood: 'happy',
  images: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
  ],
  participants: [
    { id: '1', name: '爸爸', avatar: '' },
    { id: '2', name: '妈妈', avatar: '' },
    { id: '3', name: '小美', avatar: '' },
  ],
  likes: 24,
  comments: [
    { id: '1', userId: '2', userName: '妈妈', content: '这张拍得真好看！', timestamp: '2小时前' },
    { id: '2', userId: '3', userName: '小美', content: '想念那天的红烧肉', timestamp: '1小时前' },
  ],
  isSealed: false,
};

const weatherIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  sunny: 'sunny',
  cloudy: 'cloudy',
  rainy: 'rainy',
  snowy: 'snow',
  clear: 'moon',
};

const moodIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  happy: 'happy',
  excited: 'heart',
  peaceful: 'leaf',
  relaxed: 'cafe',
  grateful: 'star',
};

// 流星粒子组件
function Star({ x, y, size, speed, progress }: { x: number; y: number; size: number; speed: number; progress: { value: number } }) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH + 50, { duration: speed * 1000 }),
      -1
    );
  }, []);

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: progress.value < 0.8 ? 1 : 0,
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        { left: x, top: y, width: size, height: size },
        starStyle
      ]}
    />
  );
}

// 预定义的星星位置（避免每次渲染时重新生成）
const PREDEFINED_STARS = [
  { x: 0.15, y: 0.1, size: 2, speed: 1.5 },
  { x: 0.35, y: 0.25, size: 3, speed: 2.2 },
  { x: 0.55, y: 0.15, size: 1.5, speed: 1.8 },
  { x: 0.75, y: 0.3, size: 2.5, speed: 2.5 },
  { x: 0.9, y: 0.2, size: 2, speed: 1.6 },
  { x: 0.1, y: 0.4, size: 3, speed: 2.0 },
  { x: 0.25, y: 0.55, size: 2, speed: 1.7 },
  { x: 0.45, y: 0.45, size: 1.8, speed: 2.3 },
  { x: 0.65, y: 0.6, size: 2.2, speed: 1.9 },
  { x: 0.85, y: 0.5, size: 1.5, speed: 2.1 },
  { x: 0.2, y: 0.7, size: 2.8, speed: 1.4 },
  { x: 0.4, y: 0.8, size: 2, speed: 2.4 },
  { x: 0.6, y: 0.75, size: 1.7, speed: 1.6 },
  { x: 0.8, y: 0.85, size: 2.5, speed: 2.0 },
  { x: 0.05, y: 0.9, size: 2.3, speed: 1.8 },
];

// 空间穿梭动画
function SpaceTransition({ onComplete }: { onComplete: () => void }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.8 ? 1 : 1 - (progress.value - 0.8) * 5,
  }));

  return (
    <Animated.View style={[styles.transitionContainer, containerStyle]}>
      {PREDEFINED_STARS.map((star, index) => (
        <Star
          key={index}
          x={star.x * SCREEN_WIDTH}
          y={star.y * 400}
          size={star.size}
          speed={star.speed}
          progress={progress}
        />
      ))}
      <View style={styles.transitionOverlay}>
        <Text style={styles.transitionText}>穿梭时光...</Text>
      </View>
    </Animated.View>
  );
}

// 灵动岛
function DynamicIslandDetail({ 
  weather, 
  mood, 
  hasAudio,
  isLive 
}: { 
  weather: string; 
  mood: string; 
  hasAudio?: boolean;
  isLive?: boolean;
}) {
  const glow = useSharedValue(1);

  useEffect(() => {
    if (isLive) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
    }
  }, [isLive]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: glow.value - 0.8,
  }));

  return (
    <Animated.View style={styles.dynamicIsland}>
      {isLive && (
        <Animated.View style={[styles.liveGlow, glowStyle]} />
      )}
      <View style={styles.islandContent}>
        <View style={styles.islandLeft}>
          <View style={styles.islandIcon}>
            <Ionicons name={weatherIcons[weather] || 'sunny'} size={16} color="#7C6AFF" />
          </View>
          <View style={styles.islandIcon}>
            <Ionicons name={moodIcons[mood] || 'happy'} size={16} color="#FF7B8A" />
          </View>
          {hasAudio && (
            <TouchableOpacity style={styles.audioPlayBtn}>
              <Ionicons name="play" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.islandRight}>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>2人在看</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// 互动按钮
function InteractionButtons({ 
  onLike, 
  onPoke,
  onHeart,
  likes 
}: { 
  onLike: () => void; 
  onPoke: () => void;
  onHeart: () => void;
  likes: number;
}) {
  const [liked, setLiked] = useState(false);
  const likeScale = useSharedValue(1);

  const handleLike = () => {
    setLiked(!liked);
    likeScale.value = withSequence(
      withSpring(1.3),
      withSpring(1)
    );
    onLike();
  };

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  return (
    <View style={styles.interactionContainer}>
      <TouchableOpacity style={styles.interactionBtn} onPress={handleLike}>
        <Animated.View style={likeStyle}>
          <Ionicons 
            name={liked ? 'heart' : 'heart-outline'} 
            size={24} 
            color={liked ? '#FF7B8A' : '#8B8680'} 
          />
        </Animated.View>
        <Text style={styles.interactionText}>{likes + (liked ? 1 : 0)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.interactionBtn} onPress={onPoke}>
        <View style={styles.pokeIcon}>
          <Ionicons name="hand-left-outline" size={22} color="#7C6AFF" />
        </View>
        <Text style={styles.interactionText}>戳一戳</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.interactionBtn} onPress={onHeart}>
        <View style={styles.heartIcon}>
          <Ionicons name="heart" size={22} color="#FF7B8A" />
        </View>
        <Text style={styles.interactionText}>送爱心</Text>
      </TouchableOpacity>
    </View>
  );
}

// 评论项
function CommentItem({ comment }: { comment: MemoryDetail['comments'][0] }) {
  return (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentInitial}>{comment.userName.charAt(0)}</Text>
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{comment.userName}</Text>
          <Text style={styles.commentTime}>{comment.timestamp}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
      </View>
    </View>
  );
}

// 图片画廊
function ImageGallery({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={styles.galleryContainer}>
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(index);
          }}
        >
          {images.map((uri, index) => (
            <Image 
              key={index}
              source={{ uri }} 
              style={styles.galleryImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      </View>
      <View style={styles.pagination}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeIndex && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function MemoryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ memoryId: string }>();
  const [memory, setMemory] = useState<MemoryDetail | null>(null);
  const [showTransition, setShowTransition] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // 模拟加载数据
    setTimeout(() => {
      setMemory(mockMemoryDetail);
    }, 500);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // 模拟实时状态
      setIsLive(true);
      return () => setIsLive(false);
    }, [])
  );

  const handleTransitionComplete = () => {
    setShowTransition(false);
  };

  const handleLike = () => {
    // 调用 API 点赞
  };

  const handlePoke = () => {
    // 发送戳一戳动画
  };

  const handleHeart = () => {
    // 发送爱心动画
  };

  if (!memory) {
    return (
      <Screen safeAreaEdges={['top']} style={styles.screen}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right']} style={styles.screen}>
      {showTransition && (
        <SpaceTransition onComplete={handleTransitionComplete} />
      )}
      
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 头部 */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2D3436" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{memory.title}</Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#2D3436" />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 灵动岛 */}
          <Animated.View entering={FadeIn.delay(400)}>
            <DynamicIslandDetail 
              weather={memory.weather} 
              mood={memory.mood}
              hasAudio={!!memory.audioUrl}
              isLive={isLive}
            />
          </Animated.View>

          {/* 图片画廊 */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <ImageGallery images={memory.images} />
          </Animated.View>

          {/* 回忆信息 */}
          <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.infoSection}>
            <Text style={styles.memoryTitle}>{memory.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="#8B8680" />
                <Text style={styles.metaText}>{memory.date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#8B8680" />
                <Text style={styles.metaText}>{memory.location}</Text>
              </View>
            </View>

            {/* 参与者 */}
            <View style={styles.participantsSection}>
              <Text style={styles.participantsLabel}>参与者</Text>
              <View style={styles.participantsList}>
                {memory.participants.map((p) => (
                  <View key={p.id} style={styles.participantItem}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantInitial}>{p.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.participantName}>{p.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* 互动按钮 */}
          <Animated.View entering={FadeInUp.delay(700).duration(400)}>
            <InteractionButtons 
              onLike={handleLike}
              onPoke={handlePoke}
              onHeart={handleHeart}
              likes={memory.likes}
            />
          </Animated.View>

          {/* 评论区 */}
          <Animated.View entering={FadeInUp.delay(800).duration(400)} style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>评论</Text>
              <Text style={styles.commentsCount}>{memory.comments.length}条</Text>
            </View>
            {memory.comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F3F0',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8B8680',
  },
  transitionContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D1026',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  transitionOverlay: {
    marginTop: 200,
  },
  transitionText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(124, 106, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(245, 243, 240, 0.9)',
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3436',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 80,
  },
  dynamicIsland: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 5,
  },
  liveGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#7C6AFF',
    borderRadius: 28,
    opacity: 0.15,
  },
  islandContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  islandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  islandIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  islandRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  galleryContainer: {
    marginBottom: 20,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8D6D3',
  },
  paginationDotActive: {
    backgroundColor: '#7C6AFF',
    width: 18,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  memoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#8B8680',
  },
  participantsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  participantsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B8680',
    marginBottom: 12,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  participantItem: {
    alignItems: 'center',
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  participantName: {
    fontSize: 12,
    color: '#2D3436',
  },
  interactionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 40,
  },
  interactionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  pokeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 123, 138, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactionText: {
    fontSize: 12,
    color: '#8B8680',
  },
  commentsSection: {
    paddingHorizontal: 24,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3436',
  },
  commentsCount: {
    fontSize: 13,
    color: '#8B8680',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFB74D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  commentTime: {
    fontSize: 11,
    color: '#B2AEAA',
  },
  commentText: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
  },
});
