import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useCallback } from 'react';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

import DynamicIsland from '@/components/DynamicIsland';
import GlowingCluster from '@/components/GlowingCluster';
import EmotionPicker, { EmotionType } from '@/components/EmotionPicker';
import PetOverlay from '@/components/PetOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 记忆节点类型
interface MemoryNode {
  id: string;
  title: string;
  coverImage: string;
  date: string;
  location: string;
  isMultiUser: boolean;
  userCount: number;
  emotion?: EmotionType;
  isAphasia?: boolean;
  emotionCount?: number;
}

// 提醒类型
interface Alert {
  id: string;
  type: 'heartRate' | 'emotion' | 'family';
  title: string;
  message: string;
  memberName?: string;
  intensity?: 'low' | 'medium' | 'high';
  timestamp: Date;
}

// 模拟数据
const mockMemories: MemoryNode[] = [
  {
    id: '1',
    title: '家庭聚餐',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    date: '2024年12月25日',
    location: '北京·外婆家',
    isMultiUser: true,
    userCount: 5,
    emotion: 'joy',
    isAphasia: false,
    emotionCount: 12,
  },
  {
    id: '2',
    title: '想念爷爷',
    coverImage: '',
    date: '2024年12月24日',
    location: '',
    isMultiUser: false,
    userCount: 1,
    emotion: 'missing',
    isAphasia: true,
    emotionCount: 3,
  },
  {
    id: '3',
    title: '周末郊游',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    date: '2024年12月20日',
    location: '颐和园',
    isMultiUser: false,
    userCount: 1,
    emotion: 'calm',
    isAphasia: false,
  },
  {
    id: '4',
    title: '平静的午后',
    coverImage: '',
    date: '2024年12月18日',
    location: '',
    isMultiUser: false,
    userCount: 1,
    emotion: 'gratitude',
    isAphasia: true,
    emotionCount: 5,
  },
];

// 模拟提醒
const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'heartRate',
    title: '情绪波动提醒',
    message: '检测到心率变化',
    memberName: '奶奶',
    intensity: 'medium',
    timestamp: new Date(Date.now() - 5 * 60000),
  },
];

// 情感图标映射
const EMOTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  joy: 'sunny',
  calm: 'leaf',
  missing: 'heart',
  love: 'heart-circle',
  excitement: 'sparkles',
  gratitude: 'flower',
  anxiety: 'cloud',
  sadness: 'rainy',
};

const EMOTION_COLORS: Record<string, string> = {
  joy: '#FFD700',
  calm: '#81C784',
  missing: '#FF7B8A',
  love: '#FF5252',
  excitement: '#7C6AFF',
  gratitude: '#FFB74D',
  anxiety: '#90CAF9',
  sadness: '#B0BEC5',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const [memories] = useState<MemoryNode[]>(mockMemories);
  const [alerts] = useState<Alert[]>(mockAlerts);
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);

  // 快速情感记录
  const handleEmotionSelect = useCallback((emotion: EmotionType) => {
    setSelectedEmotion(emotion);
    setShowEmotionPicker(false);
    // 导航到新增回忆页，传递选中的情感
    router.push('/add-memory', { emotion });
  }, [router]);

  // 渲染情感节点（无图片的情感快照）
  function EmotionNode({ item }: { item: MemoryNode }) {
    const color = item.emotion ? EMOTION_COLORS[item.emotion] : '#7C6AFF';
    const icon = item.emotion ? EMOTION_ICONS[item.emotion] : 'heart';

    return (
      <Animated.View entering={FadeInUp.springify()}>
        <TouchableOpacity
          style={[styles.emotionCard, { backgroundColor: `${color}15` }]}
          onPress={() => router.push('/memory-detail', { memoryId: item.id })}
          activeOpacity={0.8}
        >
          <View style={[styles.emotionIconContainer, { backgroundColor: `${color}30` }]}>
            <Ionicons name={icon} size={32} color={color} />
          </View>
          <View style={styles.emotionInfo}>
            <Text style={[styles.emotionTitle, { color }]}>
              {item.title}
            </Text>
            <View style={styles.emotionMeta}>
              <Text style={styles.emotionDate}>{item.date}</Text>
              {item.isAphasia && (
                <View style={[styles.aphasiaTag, { backgroundColor: `${color}30` }]}>
                  <Ionicons name="hand-left" size={10} color={color} />
                  <Text style={[styles.aphasiaText, { color }]}>非语言</Text>
                </View>
              )}
            </View>
          </View>
          {item.emotionCount && (
            <View style={[styles.emotionCountBadge, { backgroundColor: color }]}>
              <Ionicons name="heart" size={10} color="#FFF" />
              <Text style={styles.emotionCountText}>{item.emotionCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // 渲染图片记忆节点
  function ImageNode({ item }: { item: MemoryNode }) {
    return (
      <Animated.View entering={FadeInDown.springify()}>
        <TouchableOpacity
          style={styles.imageCard}
          onPress={() => router.push('/memory-detail', { memoryId: item.id })}
          activeOpacity={0.9}
        >
          {/* 图片 */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.coverImage }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            
            {/* 顶部标签 */}
            <View style={styles.cardOverlay}>
              {item.isMultiUser && item.userCount > 1 && (
                <View style={styles.multiUserBadge}>
                  <GlowingCluster userCount={item.userCount} size={40} />
                </View>
              )}
              {item.emotion && (
                <View style={[styles.emotionBadge, { backgroundColor: `${EMOTION_COLORS[item.emotion]}30` }]}>
                  <Ionicons 
                    name={EMOTION_ICONS[item.emotion]} 
                    size={14} 
                    color={EMOTION_COLORS[item.emotion]} 
                  />
                </View>
              )}
            </View>
          </View>
          
          {/* 内容 */}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={12} color="#999" />
                <Text style={styles.metaText}>{item.date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location" size={12} color="#999" />
                <Text style={styles.metaText}>{item.location}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // 渲染节点
  function renderItem({ item }: { item: MemoryNode }) {
    if (!item.coverImage) {
      return <EmotionNode item={item} />;
    }
    return <ImageNode item={item} />;
  }

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部灵动岛 */}
      <DynamicIsland 
        alerts={alerts}
        weather="sunny"
        mood="happy"
      />
      
      {/* 标题栏 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>欢迎回来</Text>
          <Text style={styles.username}>Voxora 家庭空间</Text>
        </View>
        <TouchableOpacity 
          style={styles.familyButton}
          onPress={() => router.push('/family')}
        >
          <Ionicons name="people" size={22} color="#7C6AFF" />
        </TouchableOpacity>
      </View>

      {/* 快速情感记录按钮 */}
      <View style={styles.quickActionContainer}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setShowEmotionPicker(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7C6AFF', '#9D91FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionGradient}
          >
            <Ionicons name="heart-circle" size={20} color="#FFF" />
            <Text style={styles.quickActionText}>快速情感记录</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 时间线标题 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>回忆时间线</Text>
        <Text style={styles.sectionSubtitle}>每个时刻都值得被珍藏</Text>
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

      {/* 宠物悬浮组件 */}
      <PetOverlay />

      {/* 情感选择弹窗 */}
      <Modal
        visible={showEmotionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmotionPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEmotionPicker(false)}
        >
          <View style={styles.emotionModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>选择此刻的心情</Text>
            <Text style={styles.modalSubtitle}>
              即使不说话，家人也能感受到你的情感
            </Text>
            <EmotionPicker
              selectedEmotion={selectedEmotion || undefined}
              onSelect={handleEmotionSelect}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

// 导入 LinearGradient
import { LinearGradient } from 'expo-linear-gradient';

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F8FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 13,
    color: '#999',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
  familyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  // 图片卡片样式
  imageCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0F0F3',
  },
  cardOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  multiUserBadge: {
    // 样式由 GlowingCluster 组件内部处理
  },
  emotionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  // 情感卡片样式
  emotionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  emotionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  emotionInfo: {
    flex: 1,
  },
  emotionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emotionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emotionDate: {
    fontSize: 12,
    color: '#999',
  },
  aphasiaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  aphasiaText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emotionCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  emotionCountText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  // 弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  emotionModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
});
