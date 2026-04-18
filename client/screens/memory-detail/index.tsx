import { Screen } from '@/components/Screen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  Modal,
  Platform,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideInLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  Extrapolation
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';

import EmotionMessageCard from '@/components/EmotionMessageCard';
import GlowingCluster from '@/components/GlowingCluster';
import VoiceInput from '@/components/VoiceInput';
import { useToast } from '@/hooks/useToast';
import { getBackendBaseUrl } from '@/utils/backend';
import { formatDateLocalized } from '@/utils/localeFormat';
import { useMemoryDisplayText } from '@/hooks/useMemoryDisplayText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 情感反应类型
interface EmotionReaction {
  id: string;
  memberName: string;
  memberAvatar: string;
  emotion: string;
  emotionColor: string;
  emotionIcon: string;
  message?: string;
  timestamp: Date;
}

// 家庭成员类型
interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  relationship: string;
}

// 回忆数据
interface MemoryDetail {
  id: string;
  title: string;
  coverImage?: string;
  date: string;
  location: string;
  isMultiUser: boolean;
  userCount: number;
  emotion?: string;
  emotionColor?: string;
  emotionIcon?: string;
  emotionCount?: number;
  reactions: EmotionReaction[];
  familyMembers: FamilyMember[];
  isSealed?: boolean;
  isUnlocked?: boolean;
}

// 模拟数据
const mockMemory: MemoryDetail = {
  id: '1',
  title: '家庭聚餐',
  coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
  date: '2024年12月25日 18:30',
  location: '北京·外婆家',
  isMultiUser: true,
  userCount: 5,
  emotion: 'joy',
  emotionColor: '#FFD700',
  emotionIcon: 'sunny',
  emotionCount: 12,
  reactions: [
    {
      id: '1',
      memberName: '奶奶',
      memberAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      emotion: 'love',
      emotionColor: '#FF5252',
      emotionIcon: 'heart-circle',
      message: '看到你们真开心',
      timestamp: new Date(Date.now() - 10 * 60000),
    },
    {
      id: '2',
      memberName: '爸爸',
      memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      emotion: 'calm',
      emotionColor: '#81C784',
      emotionIcon: 'leaf',
      timestamp: new Date(Date.now() - 30 * 60000),
    },
  ],
  familyMembers: [
    { id: '1', name: '奶奶', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', relationship: '奶奶' },
    { id: '2', name: '爸爸', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', relationship: '爸爸' },
    { id: '3', name: '妈妈', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', relationship: '妈妈' },
    { id: '4', name: '小明', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200', relationship: '哥哥' },
  ],
};

const EMOTION_MESSAGES: Record<string, string> = {
  joy: '幸福的',
  calm: '平静的',
  love: '充满爱的',
  gratitude: '感恩的',
  excitement: '兴奋的',
  happy: '开心的',
  relaxed: '放松的',
  excited: '兴奋的',
  joyful: '欢乐的',
  missing: '思念的',
  anxiety: '焦虑的',
  sadness: '伤感的',
};

const EMOTION_ICONS_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  joy: 'sunny',
  calm: 'leaf',
  love: 'heart-circle',
  gratitude: 'flower',
  excitement: 'sparkles',
  happy: 'happy',
  relaxed: 'leaf',
  excited: 'sparkles',
  joyful: 'sunny',
  missing: 'heart',
  anxiety: 'cloud',
  sadness: 'rainy',
};

// 判断是否为视频 URL
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m4v', '.3gp'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('video');
};

/** 照片墙视频缩略：静音、不自动播放，避免 expo-av 弃用 */
function PhotoWallVideoThumb({ uri, style }: { uri: string; style: StyleProp<ImageStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = false;
  });
  useEffect(() => {
    player.pause();
  }, [player, uri]);
  return <VideoView player={player} style={style} contentFit="cover" nativeControls={false} />;
}

export default function MemoryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ memoryId: string }>();
  const { showSuccess, showError, showInfo } = useToast();
  const { t, i18n } = useTranslation();

  // 真实数据状态
  const [realMemory, setRealMemory] = useState<{
    id: string;
    title: string;
    coverImage: string;
    date: string;
    location: string;
    images: string[];
    mood: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 模拟数据（保持其他功能使用 mock）
  const [memory] = useState<MemoryDetail>(mockMemory);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryImageUrl, setSummaryImageUrl] = useState<string | null>(null);
  const [summaryIsStub, setSummaryIsStub] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showVoiceInteraction, setShowVoiceInteraction] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false); // 更多菜单
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null); // Toast 提示

  const { title: memoryTitleDisplay, location: memoryLocationDisplay } = useMemoryDisplayText({
    title: realMemory?.title ?? memory.title ?? '',
    location: realMemory?.location ?? '',
  });

  // 显示 Toast
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  // 编辑回忆
  const handleEditMemory = useCallback(() => {
    setShowMoreMenu(false);
    const memoryId = params.memoryId || (realMemory ? 'unknown' : '');
    if (memoryId && memoryId !== 'unknown') {
      // 跳转到编辑页面，传递回忆数据
      router.push('/add-memory', { 
        editId: memoryId,
        title: realMemory?.title || '',
        mood: realMemory?.mood || '',
        location: realMemory?.location || '',
        date: realMemory?.date || '',
        images: realMemory?.images || [],
      });
    } else {
      showToast(t('memoryDetail.memoryIdNotFound'), 'error');
    }
  }, [params.memoryId, realMemory, router, showToast]);

  // 从 API 获取回忆数据
  const fetchMemoryDetail = useCallback(async (memoryId?: string) => {
    // 优先使用传入的 memoryId，否则从 params 获取
    const id = memoryId || params.memoryId;
    if (!id) {
      console.log('memoryId 不存在，使用默认列表第一个');
      // 如果没有 memoryId，从列表获取第一个回忆
      try {
        const listRes = await fetch(`${getBackendBaseUrl()}/api/v1/memories?limit=1`);
        const listData = await listRes.json();
        if (listData.data && listData.data.length > 0) {
          const firstMemory = listData.data[0];
          const dateStr = firstMemory.date
            ? formatDateLocalized(firstMemory.date, i18n.language, 'dateOnly')
            : '';
          setRealMemory({
            id: String(firstMemory.id ?? ''),
            title: firstMemory.title || '',
            coverImage: firstMemory.cover_image || '',
            date: dateStr,
            location: firstMemory.location || '',
            images: firstMemory.images || [],
            mood: firstMemory.mood || 'happy',
          });
          console.log('使用默认回忆:', firstMemory.title);
        }
      } catch (e) {
        console.error('获取回忆列表失败:', e);
      }
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const url = `${getBackendBaseUrl()}/api/v1/memories/${encodeURIComponent(id)}`;
      console.log('请求回忆详情:', url);

      const response = await fetch(url);
      const data = await response.json();

      if (data && !data.error) {
        const dateStr = data.date ? formatDateLocalized(data.date, i18n.language, 'dateOnly') : '';
        setRealMemory({
          id: String(data.id ?? id),
          title: data.title || '',
          coverImage: data.cover_image || '',
          date: dateStr,
          location: data.location || '',
          images: data.images || [],
          mood: data.mood || 'happy',
        });
        console.log('回忆详情加载成功:', data.title);
      } else {
        console.error('回忆详情加载失败:', data.error);
        // 尝试获取默认回忆
        fetchMemoryDetail();
      }
    } catch (error) {
      console.error('获取回忆详情失败:', error);
      // 尝试获取默认回忆
      fetchMemoryDetail();
    } finally {
      setIsLoading(false);
    }
  }, [params.memoryId, t, i18n.language]);

  // 页面聚焦时获取数据（返回时自动刷新）
  useFocusEffect(
    useCallback(() => {
      fetchMemoryDetail();
    }, [fetchMemoryDetail])
  );
  
  // 动画值
  const imageScale = useSharedValue(0.95);
  const imageOpacity = useSharedValue(0);
  
  useEffect(() => {
    imageScale.value = withDelay(200, withSpring(1));
    imageOpacity.value = withDelay(200, withSpring(1));
  }, []);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
    opacity: imageOpacity.value,
  }));

  // 发送情感反应
  const handleSendReaction = useCallback(async () => {
    if (selectedReaction) {
      try {
        const memoryId = params.memoryId || realMemory?.id || memory.id;
        /**
         * 服务端文件：server/src/routes/memories.ts
         * 接口：POST /api/v1/memories/:id/reactions
         * Path 参数：id: string
         * Body 参数：memberId: string, message: string, emotion: string
         */
        const response = await fetch(`${getBackendBaseUrl()}/api/v1/memories/${memoryId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memberId: 'user_1',
            message: commentText,
            emotion: selectedReaction,
          }),
        });

        if (!response.ok) {
          throw new Error('发送情感失败');
        }

        setShowReactionModal(false);
        setSelectedReaction(null);
        setCommentText('');
        showSuccess(t('memoryDetail.sendSuccess'));
      } catch (error) {
        console.error('发送情感失败:', error);
        showError(t('memoryDetail.sendFailed'));
      }
    }
  }, [selectedReaction, commentText, params.memoryId, realMemory, memory.id, showSuccess, showError]);

  // 隐藏回忆
  const handleHideMemory = useCallback(async () => {
    const memoryId = params.memoryId || (realMemory ? 'unknown' : '');
    if (!memoryId) {
      showToast(t('memoryDetail.cannotHide'), 'error');
      setShowMoreMenu(false);
      return;
    }

    try {
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：POST /api/v1/memories/:id/hide
       * Path 参数：id: string
       */
      const response = await fetch(
        `${getBackendBaseUrl()}/api/v1/memories/${memoryId}/hide`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('隐藏失败');
      }

      setShowMoreMenu(false);
      showToast(t('memoryDetail.hideSuccess'));
      // 返回上一页
      setTimeout(() => router.back(), 500);
    } catch (error) {
      console.error('隐藏回忆失败:', error);
      showToast(t('memoryDetail.hideFailed'), 'error');
    }
  }, [params.memoryId, realMemory, router, showToast]);

  // 生成回忆总结
  const handleGenerateSummary = useCallback(async () => {
    const memoryId = params.memoryId || realMemory?.id;
    if (!memoryId) {
      showError(t('memoryDetail.memoryIdNotFound'));
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryImageUrl(null);
    setSummaryIsStub(false);
    try {
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：POST /api/v1/memories/:id/summarize
       * Path 参数：id: string
       */
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/memories/${memoryId}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        const msg =
          (typeof errorData.message === 'string' && errorData.message) ||
          (typeof errorData.error === 'string' && errorData.error) ||
          '生成总结失败';
        // 避免 throw：HTTP 业务错误不应走 catch，否则 Metro 会打一整段 ERROR 堆栈
        if (response.status >= 500) {
          console.warn('生成总结失败:', msg);
        }
        showError(msg);
        return;
      }

      const data = (await response.json()) as {
        summary?: string;
        imageUrl?: string | null;
        stub?: boolean;
      };
      setSummaryText(typeof data.summary === 'string' ? data.summary : '');
      setSummaryImageUrl(data.imageUrl ?? null);
      setSummaryIsStub(Boolean(data.stub));
      setShowSummaryModal(true);
    } catch (error: any) {
      console.error('生成总结失败:', error);
      showError(error?.message || t('memoryDetail.summaryFailed'));
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [params.memoryId, realMemory, showError]);

  // 处理语音输入完成
  const handleVoiceInputComplete = useCallback((transcript: string) => {
    setVoiceTranscript(transcript);
    setShowVoiceInteraction(false);

    // 如果已经选择了家庭成员，直接添加到家人回应
    if (selectedFamilyMember) {
      addVoiceReaction(transcript, selectedFamilyMember);
    } else {
      // 否则显示家庭成员选择器
      setShowMemberSelector(true);
    }
  }, [selectedFamilyMember]);

  // 添加语音互动到家人回应
  const addVoiceReaction = useCallback(async (transcript: string, member: FamilyMember) => {
    const memoryId = params.memoryId || realMemory?.id;
    if (!memoryId) {
      showError(t('memoryDetail.memoryIdNotFound'));
      return;
    }

    try {
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：POST /api/v1/memories/:id/reactions
       * Path 参数：id: string
       * Body 参数：memberId: string, message: string, emotion: string
       */
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/memories/${memoryId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member.id,
          message: transcript,
          emotion: 'calm', // 默认情感，可以后续通过 AI 分析
        }),
      });

      if (!response.ok) {
        throw new Error('添加互动失败');
      }

      // 模拟添加到本地列表
      const newReaction: EmotionReaction = {
        id: Date.now().toString(),
        memberName: member.name,
        memberAvatar: member.avatar,
        emotion: 'calm',
        emotionColor: '#81C784',
        emotionIcon: 'leaf',
        message: transcript,
        timestamp: new Date(),
      };

      memory.reactions.unshift(newReaction);
      setSelectedFamilyMember(null);
      showSuccess(t('memoryDetail.addSuccess'));
    } catch (error) {
      console.error('添加互动失败:', error);
      showError(t('memoryDetail.interactionFailed'));
    }
  }, [params.memoryId, realMemory, memory, showSuccess, showError]);

  // 选择家庭成员
  const handleSelectMember = useCallback((member: FamilyMember) => {
    setSelectedFamilyMember(member);
    setShowMemberSelector(false);

    if (voiceTranscript) {
      addVoiceReaction(voiceTranscript, member);
      setVoiceTranscript(null);
    }
  }, [voiceTranscript]);

  // 情感颜色映射
  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      joy: '#FFD700',
      calm: '#81C784',
      love: '#FF5252',
      gratitude: '#FFB74D',
      excitement: '#7C6AFF',
      missing: '#FF7B8A',
      happy: '#FFD700',
      relaxed: '#81C784',
      excited: '#7C6AFF',
      joyful: '#FFD700',
      anxiety: '#90CAF9',
      sadness: '#B0BEC5',
    };
    return colors[emotion] || '#7C6AFF';
  };

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部导航 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>回忆详情</Text>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setShowMoreMenu(!showMoreMenu)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* 更多菜单 */}
      {showMoreMenu && (
        <>
          <TouchableOpacity 
            style={styles.menuOverlay} 
            activeOpacity={1}
            onPress={() => setShowMoreMenu(false)}
          />
          <View style={styles.moreMenuDropdown}>
            <TouchableOpacity style={styles.moreMenuItem} onPress={handleEditMemory}>
              <Ionicons name="create-outline" size={20} color="#666" />
              <Text style={styles.moreMenuText}>{t('memoryDetail.editMemory')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreMenuItem} onPress={handleHideMemory}>
              <Ionicons name="eye-off-outline" size={20} color="#666" />
              <Text style={styles.moreMenuText}>{t('memoryDetail.hideMemory')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 主图区域 - 使用真实数据 */}
        {isLoading ? (
          <View style={[styles.imageContainer, styles.loadingContainer]}>
            <View style={styles.loadingSpinner}>
              <Ionicons name="images-outline" size={48} color="#CCC" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          </View>
        ) : realMemory?.coverImage ? (
          <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
            <Image
              source={{ uri: realMemory.coverImage }}
              style={styles.mainImage}
              resizeMode="cover"
            />
            {/* 渐变遮罩 */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
            
            {/* 标题叠加 - 使用真实数据 */}
            <View style={styles.titleOverlay}>
              <Text style={styles.mainTitle}>{memoryTitleDisplay}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{realMemory.date}</Text>
                </View>
                {memoryLocationDisplay ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{memoryLocationDisplay}</Text>
                </View>
                ) : null}
              </View>
            </View>
            
            {/* 情感标签 - 使用真实数据 */}
            {realMemory.mood && (
              <Animated.View 
                entering={FadeInDown.delay(400)}
                style={[styles.emotionBadge, { backgroundColor: `${getEmotionColor(realMemory.mood)}40` }]}
              >
                <Ionicons 
                  name={EMOTION_ICONS_MAP[realMemory.mood] || 'heart'} 
                  size={16} 
                  color={getEmotionColor(realMemory.mood)} 
                />
                <Text style={[styles.emotionBadgeText, { color: getEmotionColor(realMemory.mood) }]}>
                  {t(`memoryDetail.emotions.${realMemory.mood}`) || t('memoryDetail.emotions.warm')}
                </Text>
              </Animated.View>
            )}
            
            {/* 多人参与标识 */}
            {memory.isMultiUser && (
              <Animated.View entering={FadeIn.delay(500)} style={styles.multiUserContainer}>
                <GlowingCluster userCount={memory.userCount} size={50} />
              </Animated.View>
            )}
          </Animated.View>
        ) : (
          // 无图片的情感快照展示
          <Animated.View 
            entering={FadeIn}
            style={[styles.emotionSnapshot, { backgroundColor: `${memory.emotionColor}20` }]}
          >
            <View style={[styles.snapshotIcon, { backgroundColor: `${memory.emotionColor}30` }]}>
              <Ionicons 
                name={memory.emotionIcon as any} 
                size={48} 
                color={memory.emotionColor} 
              />
            </View>
            <Text style={[styles.snapshotTitle, { color: memory.emotionColor }]}>
              {memoryTitleDisplay}
            </Text>
            <Text style={styles.snapshotDate}>{realMemory?.date || memory.date}</Text>
          </Animated.View>
        )}

        {/* 情感统计 - 在封面图下方 */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.emotionStats}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={20} color="#FF7B8A" />
            <Text style={styles.statValue}>{realMemory ? memory.emotionCount : 0}</Text>
            <Text style={styles.statLabel}>{t('memoryDetail.emotionResonance')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="people" size={20} color="#7C6AFF" />
            <Text style={styles.statValue}>{realMemory ? memory.userCount : 0}</Text>
            <Text style={styles.statLabel}>{t('memoryDetail.participants')}</Text>
          </View>
        </Animated.View>

        {/* 照片墙 - 在情感统计下方 */}
        {realMemory?.images && realMemory.images.length > 0 && (
          <Animated.View entering={FadeInUp.delay(400)} style={styles.photoWallSection}>
            <Text style={styles.sectionTitle}>{t('memoryDetail.photoWall')}</Text>
            <View style={styles.photoWallGrid}>
              {realMemory.images.map((imageUrl, index) => {
                const isVideo = isVideoUrl(imageUrl);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoWallItem,
                      realMemory.images.length === 1 && styles.photoWallItemSingle,
                      realMemory.images.length === 2 && styles.photoWallItemHalf,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      // 点击图片打开查看器（暂时只展示单张）
                      router.push('/photo-viewer', {
                        images: JSON.stringify(realMemory.images),
                        initialIndex: index,
                      });
                    }}
                  >
                    {isVideo ? (
                      <PhotoWallVideoThumb uri={imageUrl} style={styles.photoWallImage} />
                    ) : (
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.photoWallImage}
                        resizeMode="cover"
                      />
                    )}
                    {/* 视频标识 */}
                    {isVideo && (
                      <View style={styles.videoIndicator}>
                        <Ionicons name="play-circle" size={28} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* 情感映射图 */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('memoryDetail.emotionMap')}</Text>
          <View style={styles.emotionMapContainer}>
            {/* 中心情感 */}
            <View style={styles.emotionMapCenter}>
              <View style={[styles.emotionCenterDot, { backgroundColor: memory.emotionColor }]} />
              <View style={[styles.emotionCenterRing, { borderColor: `${memory.emotionColor}50` }]} />
              <View style={[styles.emotionCenterRing, styles.emotionCenterRing2, { borderColor: `${memory.emotionColor}30` }]} />
            </View>
            {/* 周围家庭成员 */}
            {memory.familyMembers.slice(0, 4).map((member, index) => {
              const angle = (index * 90 - 90) * (Math.PI / 180);
              const radius = 70;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <View 
                  key={member.id}
                  style={[
                    styles.emotionMapMember, 
                    { 
                      left: SCREEN_WIDTH / 2 - 25 + x, 
                      top: 180 + y,
                      opacity: 0.4 + Math.random() * 0.6,
                    }
                  ]}
                >
                  <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                </View>
              );
            })}
          </View>
          <Text style={styles.emotionMapHint}>
            {t('memoryDetail.emotionFlowing')}
          </Text>
        </Animated.View>

        {/* 远程互动区 */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('memoryDetail.familyResponses')}</Text>
          {memory.reactions.map((reaction, index) => (
            <Animated.View 
              key={reaction.id}
              entering={SlideInRight.delay(index * 100)}
            >
              <EmotionMessageCard
                memberName={reaction.memberName}
                memberAvatar={reaction.memberAvatar}
                emotion={reaction.emotion}
                emotionColor={getEmotionColor(reaction.emotion)}
                message={reaction.message}
                timestamp={reaction.timestamp}
              />
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* 底部操作栏 */}
      <Animated.View
        entering={FadeIn.delay(600)}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          style={styles.reactionButton}
          onPress={() => setShowReactionModal(true)}
        >
          <Ionicons name="heart-circle-outline" size={22} color="#7C6AFF" />
          <Text style={styles.reactionButtonText}>{t('memoryDetail.sendEmotion')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.summaryButton, isGeneratingSummary && styles.summaryButtonDisabled]}
          onPress={handleGenerateSummary}
          disabled={isGeneratingSummary}
        >
          <Ionicons name="sparkles" size={22} color={isGeneratingSummary ? '#999' : '#FF7B8A'} />
          <Text style={[styles.summaryButtonText, isGeneratingSummary && styles.summaryButtonTextDisabled]}>
            {isGeneratingSummary ? t('memoryDetail.generating') : t('memoryDetail.generateSummary')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={() => {
            if (!selectedFamilyMember) {
              setShowMemberSelector(true);
            } else {
              setShowVoiceInteraction(true);
            }
          }}
        >
          <Ionicons name="mic" size={22} color="#FF9500" />
          <Text style={styles.voiceButtonText}>{t('memoryDetail.voiceInteraction')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={22} color="#666" />
        </TouchableOpacity>
      </Animated.View>

      {/* 情感反应弹窗 */}
      <Modal
        visible={showReactionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReactionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionModal(false)}
        >
          <View style={[styles.reactionModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('memoryDetail.selectEmotion')}</Text>
            
            {/* 情感选项 */}
            <View style={styles.emotionOptions}>
              {['love', 'joy', 'calm', 'gratitude', 'excitement'].map((emotion) => (
                <TouchableOpacity
                  key={emotion}
                  style={[
                    styles.emotionOption,
                    selectedReaction === emotion && styles.emotionOptionSelected,
                    selectedReaction === emotion && { 
                      backgroundColor: `${getEmotionColor(emotion)}20`,
                      borderColor: getEmotionColor(emotion)
                    }
                  ]}
                  onPress={() => setSelectedReaction(emotion)}
                >
                  <Ionicons 
                    name={emotion === 'love' ? 'heart' : emotion === 'joy' ? 'sunny' : emotion === 'calm' ? 'leaf' : emotion === 'gratitude' ? 'flower' : 'sparkles'} 
                    size={28} 
                    color={getEmotionColor(emotion)} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 文字留言（可选） */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder={t('memoryDetail.addComment')}
                placeholderTextColor="#CCC"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={100}
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </View>
            
            {/* 发送按钮 */}
            <TouchableOpacity
              style={[
                styles.sendReactionButton,
                !selectedReaction && styles.sendReactionButtonDisabled
              ]}
              onPress={handleSendReaction}
              disabled={!selectedReaction}
            >
              <Text style={styles.sendReactionText}>{t('memoryDetail.sendReaction')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 一键回忆总结弹窗 */}
      <Modal
        visible={showSummaryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSummaryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSummaryModal(false)}
        >
          <Animated.View
            entering={FadeInDown}
            style={[styles.summaryModal, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255, 123, 138, 0.15)' }]}>
                <Ionicons name="sparkles" size={28} color="#FF7B8A" />
              </View>
              <Text style={styles.summaryTitle}>{t('memoryDetail.summaryTitle')}</Text>
              {summaryIsStub ? (
                <Text style={styles.summaryStubHint}>{t('memoryDetail.stubSummaryHint')}</Text>
              ) : null}
            </View>

            <ScrollView style={styles.summaryContentScroll}>
              {/* 生成的图片 */}
              {summaryImageUrl && (
                <View style={styles.summaryImageContainer}>
                  <Image
                    source={{ uri: summaryImageUrl }}
                    style={styles.summaryImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* 文字总结 */}
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryText}>{summaryText}</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeSummaryButton}
              onPress={() => setShowSummaryModal(false)}
            >
              <Text style={styles.closeSummaryButtonText}>{t('memoryDetail.close')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 语音互动 Modal */}
      <VoiceInput
        visible={showVoiceInteraction}
        onClose={() => setShowVoiceInteraction(false)}
        onTranscribed={handleVoiceInputComplete}
      />

      {/* 家庭成员选择器 Modal */}
      <Modal
        visible={showMemberSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMemberSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMemberSelector(false)}
        >
          <View style={[styles.memberSelectorModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('memoryDetail.selectFamilyMember')}</Text>
            <Text style={styles.memberSelectorSubtitle}>{t('memoryDetail.selectMember')}</Text>

            <ScrollView style={styles.memberList}>
              {memory.familyMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberItem,
                    selectedFamilyMember?.id === member.id && styles.memberItemSelected
                  ]}
                  onPress={() => handleSelectMember(member)}
                >
                  <Image source={{ uri: member.avatar }} style={styles.memberAvatarLarge} />
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRelation}>{member.relationship}</Text>
                  {selectedFamilyMember?.id === member.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#FF9500" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelMemberButton}
              onPress={() => setShowMemberSelector(false)}
            >
              <Text style={styles.cancelMemberButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Toast 提示 */}
      {toast && (
        <View style={[styles.toast, toast.type === 'error' && styles.toastError]}>
          <Ionicons 
            name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
            size={20} 
            color="#FFF" 
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 更多菜单
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 99,
  },
  moreMenuDropdown: {
    position: 'absolute',
    top: 100, // 使用固定值，header 高度 + padding
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    minWidth: 160,
    overflow: 'hidden',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  moreMenuText: {
    fontSize: 15,
    color: '#333',
  },
  // Toast 提示
  toast: {
    position: 'absolute',
    bottom: 120,
    left: 40,
    right: 40,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 200,
  },
  toastError: {
    backgroundColor: '#E53935',
  },
  toastText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  emotionBadge: {
    position: 'absolute',
    top: 100,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  emotionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  multiUserContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
  },
  // 情感快照
  emotionSnapshot: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  snapshotIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  snapshotTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  snapshotDate: {
    fontSize: 14,
    color: '#999',
  },
  // 情感统计
  emotionStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  // 照片墙
  photoWallSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  photoWallGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWallItem: {
    width: (SCREEN_WIDTH - 56) / 3, // 三等分，减去左右padding和gap
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F3',
  },
  photoWallItemSingle: {
    width: SCREEN_WIDTH - 40,
    aspectRatio: 16 / 9,
  },
  photoWallItemHalf: {
    width: (SCREEN_WIDTH - 56) / 2,
    aspectRatio: 4 / 3,
  },
  photoWallImage: {
    width: '100%',
    height: '100%',
  },
  // 视频标识
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 4,
  },
  // 加载中
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
  },
  loadingSpinner: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  // 情感映射
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  emotionMapContainer: {
    height: 360,
    position: 'relative',
    backgroundColor: '#F8F8FA',
    borderRadius: 20,
  },
  emotionMapCenter: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 30,
    top: 150,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionCenterDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  emotionCenterRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
  },
  emotionCenterRing2: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  emotionMapMember: {
    position: 'absolute',
    width: 50,
    height: 50,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  emotionMapHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    marginTop: 16,
  },
  // 底部操作栏
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
    gap: 16,
  },
  reactionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  reactionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reactionModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  emotionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  emotionOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8F8FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emotionOptionSelected: {
    borderWidth: 2,
  },
  commentInputContainer: {
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  commentInput: {
    fontSize: 15,
    color: '#333',
    minHeight: 44,
    maxHeight: 100,
  },
  sendReactionButton: {
    backgroundColor: '#7C6AFF',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendReactionButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendReactionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  // 一键回忆按钮
  summaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 123, 138, 0.1)',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  summaryButtonDisabled: {
    backgroundColor: '#F8F8FA',
    opacity: 0.6,
  },
  summaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7B8A',
  },
  summaryButtonTextDisabled: {
    color: '#999',
  },
  // 语音互动按钮
  voiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  voiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  // 一键回忆弹窗
  summaryModal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginHorizontal: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  summaryStubHint: {
    marginTop: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#888',
    textAlign: 'center',
  },
  summaryContentScroll: {
    maxHeight: 400,
  },
  summaryImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F8F8FA',
  },
  summaryImage: {
    width: '100%',
    height: '100%',
  },
  summaryTextContainer: {
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    textAlign: 'center',
  },
  closeSummaryButton: {
    backgroundColor: '#7C6AFF',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeSummaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  // 家庭成员选择器
  memberSelectorModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  memberSelectorSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  memberList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  memberItemSelected: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  memberAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberRelation: {
    fontSize: 13,
    color: '#999',
  },
  cancelMemberButton: {
    backgroundColor: '#F8F8FA',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelMemberButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
});
