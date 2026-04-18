import { Screen } from '@/components/Screen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useCallback, useMemo } from 'react';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import DynamicIsland from '@/components/DynamicIsland';
import GlowingCluster from '@/components/GlowingCluster';
import EmotionPicker, { EmotionType } from '@/components/EmotionPicker';
import PetOverlay from '@/components/PetOverlay';
import { getBackendBaseUrl } from '@/utils/backend';
import { formatDateLocalized } from '@/utils/localeFormat';
import { useMemoryDisplayText } from '@/hooks/useMemoryDisplayText';
import { useToast } from '@/hooks/useToast';
import { InlineDeleteReveal } from '@/components/InlineDeleteReveal';
import { MeetFuturePanel } from '@/components/MeetFuturePanel';
import { deleteMemoryById } from '@/utils/memoryRemote';

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
  isQuickMood?: boolean; // 是否是快速心情记录
  userId?: string;
  familyId?: string;
  userName?: string; // 用户名称
}

// 提醒类型
interface Alert {
  id: string;
  type: 'heartRate' | 'emotion' | 'family';
  title: string;
  message: string;
  memberName?: string;
  memberKey?: string;
  titleKey?: string;
  messageKey?: string;
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
    memberKey: 'home.demoMembers.grandma',
    messageKey: 'home.heartRateChange',
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
  const { t, i18n } = useTranslation();
  /** 底部 Tab 实测高度（含安全区），比手写 90+insets 更准；绝对定位 Tab 会盖住列表需留出尾部空白 */
  const bottomTabBarHeight = useBottomTabBarHeight();
  /** 宠物球、长按删除条、卡片阴影与手感留白（与 Tab 叠加区错开） */
  const timelineFooterHeight = bottomTabBarHeight + 96;
  const timelineListFooter = useMemo(
    () => <View style={{ height: timelineFooterHeight }} collapsable={false} />,
    [timelineFooterHeight]
  );
  const router = useSafeRouter();
  const { showSuccess, showError } = useToast();
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts] = useState<Alert[]>(mockAlerts);
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  /** 首页中段：时光长廊（回忆流） / 遇见未来（家庭规划白板） */
  const [corridorTab, setCorridorTab] = useState<'memories' | 'future'>('memories');

  // 从 API 获取回忆数据
  const fetchMemories = useCallback(async () => {
    try {
      setIsLoading(true);
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：GET /api/v1/memories
       * Query 参数：familyId?: string, page?: number, limit?: number
       */
      const baseUrl = getBackendBaseUrl();
      const listUrl = `${baseUrl}/api/v1/memories?limit=50`;
      const response = await fetch(listUrl);
      const result = (await response.json().catch(() => ({}))) as {
        data?: unknown[];
        error?: string;
      };

      if (!response.ok) {
        const msg =
          (typeof result.error === 'string' && result.error) ||
          `HTTP ${response.status}`;
        console.warn('[home] 获取回忆列表失败:', msg, 'url=', listUrl);
        setMemories([]);
        return;
      }

      if (Array.isArray(result.data)) {
        // 转换后端数据格式为前端格式
        const mappedMemories: MemoryNode[] = result.data.map((item: any) => ({
          id: item.id,
          title: item.title || '',
          coverImage: item.cover_image || '',
          date: item.created_at
            ? formatDateLocalized(item.created_at, i18n.language, 'long')
            : '',
          location: item.location || '',
          isMultiUser: item.is_multi_user || false,
          userCount: item.user_count || 1,
          emotion: (item.mood || 'happy') as EmotionType,
          isAphasia: item.is_sealed || false,
          emotionCount: item.likes || 0,
          isQuickMood: item.is_quick_mood || false,
          userId: item.user_id,
          familyId: item.family_id,
          userName: item.user_name || t('common.member'),
        }));
        setMemories(mappedMemories);
      } else {
        console.warn('[home] 回忆列表响应无 data 数组:', listUrl, result);
        setMemories([]);
      }
    } catch (error) {
      console.error('获取回忆失败:', error, 'baseUrl=', getBackendBaseUrl());
    } finally {
      setIsLoading(false);
    }
  }, [t, i18n.language]);

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      fetchMemories();
    }, [fetchMemories])
  );

  // 快速情感记录 - 直接创建心情记录
  const handleEmotionSelect = useCallback(async (emotion: EmotionType) => {
    try {
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：POST /api/v1/memories/quick-mood
       * Body 参数：mood: string, userId?: string, familyId?: string
       */
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/memories/quick-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: emotion }),
      });

      console.log('快速心情记录响应状态:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('快速心情记录创建成功:', result);
        // 关闭弹窗并刷新列表
        setShowEmotionPicker(false);
        setSelectedEmotion(null);
        fetchMemories();
      } else {
        const errorText = await response.text();
        console.error('创建心情记录失败:', response.status, errorText);
      }
    } catch (error) {
      console.error('创建心情记录失败:', error);
    }
  }, [fetchMemories]);

  const deleteMemoryItem = useCallback(
    async (item: MemoryNode) => {
      const r = await deleteMemoryById(item.id);
      if (!r.ok) {
        showError(r.error || t('common.deleteFailed'));
        return;
      }
      await fetchMemories();
      showSuccess(t('common.deleteSuccess'));
    },
    [t, fetchMemories, showError, showSuccess]
  );

  // 渲染心情快速记录节点（特殊样式：只展示心情、家人、添加时间，点击不跳转）
  function QuickMoodNode({ item }: { item: MemoryNode }) {
    const color = item.emotion ? EMOTION_COLORS[item.emotion] : '#7C6AFF';
    const icon = item.emotion ? EMOTION_ICONS[item.emotion] : 'heart';

    const userName = String(item.userName || t('common.member'));
    const date = String(item.date || '');
    const recordMood = String(t('home.recordMood'));

    return (
      <Animated.View entering={FadeInUp.springify()}>
        <InlineDeleteReveal onDelete={() => deleteMemoryItem(item)}>
          {(openBar) => (
            <View style={[styles.quickMoodCard, { backgroundColor: `${color}10` }]}>
              <Pressable
                style={styles.quickMoodPressable}
                onLongPress={openBar}
                delayLongPress={450}
              >
                {/* 左侧心情图标 */}
                <View style={[styles.quickMoodIconContainer, { backgroundColor: `${color}25` }]}>
                  <Ionicons name={icon} size={28} color={color} />
                </View>

                {/* 中间信息 */}
                <View style={styles.quickMoodInfo}>
                  <View style={styles.quickMoodRow}>
                    <Text style={[styles.quickMoodLabel, { color }]}>{userName}</Text>
                    <Text style={styles.quickMoodText}>{recordMood}</Text>
                  </View>
                  <Text style={styles.quickMoodTime}>{date}</Text>
                </View>

                {/* 右侧心情气泡 */}
                <View style={[styles.quickMoodBubble, { backgroundColor: `${color}20` }]}>
                  <Ionicons name={icon} size={16} color={color} />
                </View>
              </Pressable>
            </View>
          )}
        </InlineDeleteReveal>
      </Animated.View>
    );
  }

  // 渲染普通情感节点（无图片的情感快照，可点击跳转详情）
  function EmotionNode({ item }: { item: MemoryNode }) {
    const color = item.emotion ? EMOTION_COLORS[item.emotion] : '#7C6AFF';
    const icon = item.emotion ? EMOTION_ICONS[item.emotion] : 'heart';

    const { title } = useMemoryDisplayText(item);
    const date = String(item.date || '');
    const emotionCount = String(item.emotionCount || '');
    const quickMoodText = String(t('common.quickMood'));

    return (
      <Animated.View entering={FadeInUp.springify()}>
        <InlineDeleteReveal onDelete={() => deleteMemoryItem(item)}>
          {(openBar) => (
            <View style={[styles.emotionCard, { backgroundColor: `${color}15` }]}>
              <Pressable
                style={styles.emotionPressable}
                onPress={() => router.push('/memory-detail', { memoryId: item.id })}
                onLongPress={openBar}
                delayLongPress={450}
              >
                <View style={[styles.emotionIconContainer, { backgroundColor: `${color}30` }]}>
                  <Ionicons name={icon} size={32} color={color} />
                </View>
                <View style={styles.emotionInfo}>
                  <Text style={[styles.emotionTitle, { color }]}>{title}</Text>
                  <View style={styles.emotionMeta}>
                    <Text style={styles.emotionDate}>{date}</Text>
                    {item.isAphasia && (
                      <View style={[styles.aphasiaTag, { backgroundColor: `${color}30` }]}>
                        <Ionicons name="hand-left" size={10} color={color} />
                        <Text style={[styles.aphasiaText, { color }]}>{quickMoodText}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {typeof item.emotionCount === 'number' && item.emotionCount > 0 ? (
                  <View style={[styles.emotionCountBadge, { backgroundColor: color }]}>
                    <Ionicons name="heart" size={10} color="#FFF" />
                    <Text style={styles.emotionCountText}>{emotionCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          )}
        </InlineDeleteReveal>
      </Animated.View>
    );
  }

  // 渲染图片记忆节点
  function ImageNode({ item }: { item: MemoryNode }) {
    const { title, location } = useMemoryDisplayText(item);
    const date = String(item.date || '');

    return (
      <Animated.View entering={FadeInDown.springify()}>
        <InlineDeleteReveal onDelete={() => deleteMemoryItem(item)}>
          {(openBar) => (
            <View style={styles.imageCard}>
              <Pressable
                style={styles.imagePressable}
                onPress={() => router.push('/memory-detail', { memoryId: item.id })}
                onLongPress={openBar}
                delayLongPress={450}
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
                      <View
                        style={[styles.emotionBadge, { backgroundColor: `${EMOTION_COLORS[item.emotion]}30` }]}
                      >
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
                  <Text style={styles.cardTitle}>{title}</Text>
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar" size={12} color="#999" />
                      <Text style={styles.metaText}>{date}</Text>
                    </View>
                    {location ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="location" size={12} color="#999" />
                        <Text style={styles.metaText}>{location}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </View>
          )}
        </InlineDeleteReveal>
      </Animated.View>
    );
  }

  // 渲染节点
  function renderItem({ item }: { item: MemoryNode }) {
    // 快速心情记录 - 特殊样式，点击不跳转
    if (item.isQuickMood) {
      return <QuickMoodNode item={item} />;
    }
    // 普通情感快照（无图片但可点击跳转详情）
    if (!item.coverImage) {
      return <EmotionNode item={item} />;
    }
    // 图片记忆卡片
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
          <Text style={styles.greeting}>{String(t('home.subtitle'))}</Text>
          <Text style={styles.username}>{String(`Voxora ${t('family.title')}`)}</Text>
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
            <Text style={styles.quickActionText}>{String(t('home.quickMood'))}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 时光长廊 / 遇见未来 — 双卡片切换 */}
      <View style={styles.corridorSwitchRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setCorridorTab('memories')}
          style={[styles.corridorSwitchCard, corridorTab === 'memories' && styles.corridorSwitchCardActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: corridorTab === 'memories' }}
        >
          <LinearGradient
            colors={
              corridorTab === 'memories'
                ? ['#D45A3A', '#F0A060', '#FFD9B8']
                : ['#FFF8F3', '#FFEDE3']
            }
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.corridorSwitchGrad}
          >
            <Ionicons
              name="images"
              size={22}
              color={corridorTab === 'memories' ? '#FFF' : '#C45C28'}
            />
            <Text
              style={[
                styles.corridorSwitchTitle,
                corridorTab === 'memories' ? styles.corridorSwitchTitleOn : styles.corridorSwitchTitleDuskIdle,
              ]}
            >
              {t('home.corridorCardTitle')}
            </Text>
            <Text
              style={[
                styles.corridorSwitchHint,
                corridorTab === 'memories' ? styles.corridorSwitchHintOn : styles.corridorSwitchHintDuskIdle,
              ]}
              numberOfLines={2}
            >
              {t('home.corridorCardHint')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setCorridorTab('future')}
          style={[styles.corridorSwitchCard, corridorTab === 'future' && styles.corridorSwitchCardActiveFuture]}
          accessibilityRole="tab"
          accessibilityState={{ selected: corridorTab === 'future' }}
        >
          <LinearGradient
            colors={
              corridorTab === 'future'
                ? ['#2E7D32', '#52B36A', '#A8E6B8']
                : ['#EEF8F0', '#F4FBF6']
            }
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.corridorSwitchGrad}
          >
            <Ionicons
              name="rocket"
              size={22}
              color={corridorTab === 'future' ? '#FFF' : '#2E7D32'}
            />
            <Text
              style={[
                styles.corridorSwitchTitle,
                corridorTab === 'future' ? styles.corridorSwitchTitleOn : styles.corridorSwitchTitleGreenIdle,
              ]}
            >
              {t('home.futureCardTitle')}
            </Text>
            <Text
              style={[
                styles.corridorSwitchHint,
                corridorTab === 'future' ? styles.corridorSwitchHintOn : styles.corridorSwitchHintGreenIdle,
              ]}
              numberOfLines={2}
            >
              {t('home.futureCardHint')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.corridorHintRow}>
        <Text style={styles.corridorHintText}>
          {corridorTab === 'memories' ? t('home.subtitle') : t('home.futureMicroHint')}
        </Text>
      </View>

      <View style={styles.corridorBody}>
        {corridorTab === 'memories' ? (
          <FlatList
            style={styles.timelineList}
            data={memories}
            extraData={[i18n.language, corridorTab]}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={timelineListFooter}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          />
        ) : (
          <MeetFuturePanel bottomSpacerHeight={timelineFooterHeight} />
        )}
      </View>

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
            <Text style={styles.modalTitle}>{String(t('addMemory.selectEmotion'))}</Text>
            <Text style={styles.modalSubtitle}>
              {String(t('home.quickMoodTip'))}
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
  corridorSwitchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 10,
  },
  corridorSwitchCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  corridorSwitchCardActive: {
    borderColor: 'rgba(200, 100, 55, 0.55)',
  },
  corridorSwitchCardActiveFuture: {
    borderColor: 'rgba(46, 125, 50, 0.5)',
  },
  corridorSwitchGrad: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 108,
    justifyContent: 'flex-start',
    gap: 6,
  },
  corridorSwitchTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  corridorSwitchTitleOn: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  corridorSwitchTitleDuskIdle: {
    color: '#6B3F2E',
  },
  corridorSwitchTitleGreenIdle: {
    color: '#1B5E20',
  },
  corridorSwitchHint: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  corridorSwitchHintOn: {
    color: 'rgba(255,255,255,0.94)',
  },
  corridorSwitchHintDuskIdle: {
    color: '#8A5E4A',
  },
  corridorSwitchHintGreenIdle: {
    color: '#33691E',
  },
  corridorHintRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  corridorHintText: {
    fontSize: 13,
    color: '#999',
    lineHeight: 19,
  },
  corridorBody: {
    flex: 1,
  },
  timelineList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
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
  imagePressable: {
    width: '100%',
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
  // 快速心情记录卡片样式
  quickMoodCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  quickMoodPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  quickMoodIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  quickMoodInfo: {
    flex: 1,
  },
  quickMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickMoodLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  quickMoodText: {
    fontSize: 15,
    color: '#666',
  },
  quickMoodTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  quickMoodBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 情感卡片样式
  emotionCard: {
    borderRadius: 16,
  },
  emotionPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
