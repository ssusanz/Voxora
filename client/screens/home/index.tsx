import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useEffect, useCallback } from 'react';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import PetOverlay from '@/components/PetOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

// 模拟数据
interface MemoryNode {
  id: string;
  title: string;
  coverImage: string;
  date: string;
  location: string;
  isMultiUser: boolean;
  userCount: number;
  weather: string;
  mood: string;
}

const mockMemoryNodes: MemoryNode[] = [
  {
    id: '1',
    title: '家庭聚餐',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    date: '2024年12月25日',
    location: '北京·家里',
    isMultiUser: true,
    userCount: 5,
    weather: 'sunny',
    mood: 'happy'
  },
  {
    id: '2',
    title: '周末郊游',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    date: '2024年12月20日',
    location: '颐和园',
    isMultiUser: false,
    userCount: 1,
    weather: 'cloudy',
    mood: 'relaxed'
  },
  {
    id: '3',
    title: '宝宝周岁',
    coverImage: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800',
    date: '2024年12月15日',
    location: '北京·外婆家',
    isMultiUser: true,
    userCount: 8,
    weather: 'snowy',
    mood: 'excited'
  },
  {
    id: '4',
    title: '中秋赏月',
    coverImage: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=800',
    date: '2024年9月17日',
    location: '家里阳台',
    isMultiUser: true,
    userCount: 4,
    weather: 'clear',
    mood: 'peaceful'
  },
];

// 星团组件 - 多人共享记忆的发光效果
function StarCluster({ userCount }: { userCount: number }) {
  const glowOpacity = useSharedValue(0.6);
  
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.6, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.starClusterContainer}>
      <Animated.View style={[styles.starGlow, glowStyle]} />
      <View style={styles.starCore}>
        <Ionicons name="sparkles" size={16} color="#FFD700" />
        <Text style={styles.starCount}>{userCount}</Text>
      </View>
    </View>
  );
}

// 天气图标映射
const weatherIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  sunny: 'sunny',
  cloudy: 'cloudy',
  snowy: 'snow',
  rainy: 'rainy',
  clear: 'moon',
};

// 心情图标映射
const moodIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  happy: 'happy',
  excited: 'heart',
  peaceful: 'leaf',
  relaxed: 'cafe',
  sad: 'rainy',
};

// 记忆节点卡片
function MemoryCard({ item, onPress, index }: { item: MemoryNode; onPress: () => void; index: number }) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={[styles.cardWrapper, cardStyle]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.card}>
          <Image source={{ uri: item.coverImage }} style={styles.cardImage} />
          <View style={styles.cardOverlay}>
            {item.isMultiUser && <StarCluster userCount={item.userCount} />}
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.iconRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name={weatherIcons[item.weather] || 'sunny'} size={14} color="#7C6AFF" />
                </View>
                <View style={styles.iconBadge}>
                  <Ionicons name={moodIcons[item.mood] || 'happy'} size={14} color="#FF7B8A" />
                </View>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color="#8B8680" />
                <Text style={styles.metaText}>{item.date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={12} color="#8B8680" />
                <Text style={styles.metaText}>{item.location}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 顶部灵动岛
function DynamicIsland() {
  const [hasNotification, setHasNotification] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 模拟新成员加入通知
      const timer = setTimeout(() => {
        setHasNotification(true);
        setTimeout(() => setHasNotification(false), 3000);
      }, 2000);
      return () => clearTimeout(timer);
    }, [])
  );

  return (
    <Animated.View 
      entering={FadeInUp.duration(500)}
      style={[
        styles.dynamicIsland,
        hasNotification && styles.dynamicIslandActive
      ]}
    >
      <View style={styles.islandContent}>
        {hasNotification ? (
          <>
            <Ionicons name="sparkles" size={14} color="#7C6AFF" />
            <Text style={styles.islandText}>小美 加入家庭空间</Text>
          </>
        ) : (
          <>
            <View style={styles.familyAvatars}>
              <View style={[styles.avatar, styles.avatar1]} />
              <View style={[styles.avatar, styles.avatar2]} />
              <View style={[styles.avatar, styles.avatar3]} />
            </View>
            <Text style={styles.islandText}>家庭正在线</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const [memories, setMemories] = useState<MemoryNode[]>([]);

  useFocusEffect(
    useCallback(() => {
      // 模拟从 API 获取数据
      setMemories(mockMemoryNodes);
    }, [])
  );

  const handleMemoryPress = (memoryId: string) => {
    router.push('/memory-detail', { memoryId });
  };

  const renderItem = ({ item, index }: { item: MemoryNode; index: number }) => (
    <MemoryCard 
      item={item} 
      index={index}
      onPress={() => handleMemoryPress(item.id)} 
    />
  );

  return (
    <Screen 
      safeAreaEdges={['left', 'right', 'bottom']}
      style={styles.screen}
    >
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* 头部 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>晚上好</Text>
            <Text style={styles.username}>小明一家</Text>
          </View>
          <TouchableOpacity style={styles.familyButton}>
            <Ionicons name="people" size={22} color="#7C6AFF" />
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
        </View>

        {/* 灵动岛 */}
        <DynamicIsland />

        {/* 时间线标题 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>回忆时光</Text>
          <Text style={styles.sectionSubtitle}>捕捉每一个珍贵时刻</Text>
        </View>

        {/* 记忆流 */}
        <FlatList
          data={memories}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      </View>
      
      {/* 宠物悬浮组件 */}
      <PetOverlay onPetClick={() => console.log('Pet clicked!')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F3F0',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#8B8680',
    fontWeight: '500',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
    marginTop: 2,
  },
  familyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#F5F3F0',
  },
  dynamicIsland: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  dynamicIslandActive: {
    backgroundColor: '#F0EDFF',
  },
  islandContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandText: {
    fontSize: 13,
    color: '#2D3436',
    fontWeight: '500',
    marginLeft: 8,
  },
  familyAvatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: -6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatar1: {
    backgroundColor: '#7C6AFF',
  },
  avatar2: {
    backgroundColor: '#FF7B8A',
  },
  avatar3: {
    backgroundColor: '#FFB74D',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8B8680',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 120,
  },
  cardWrapper: {
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    borderRadius: 24,
  },
  card: {
    backgroundColor: '#F5F3F0',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E8E6E3',
  },
  cardOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3436',
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8B8680',
  },
  starClusterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    opacity: 0.3,
  },
  starCore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  starCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB74D',
  },
});
