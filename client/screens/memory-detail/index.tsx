import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useState, useCallback, useEffect } from 'react';
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

import EmotionMessageCard from '@/components/EmotionMessageCard';
import GlowingCluster from '@/components/GlowingCluster';

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
};

export default function MemoryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ memoryId: string }>();
  
  const [memory] = useState<MemoryDetail>(mockMemory);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
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
  const handleSendReaction = useCallback(() => {
    if (selectedReaction) {
      console.log('发送情感反应:', selectedReaction, commentText);
      setShowReactionModal(false);
      setSelectedReaction(null);
      setCommentText('');
    }
  }, [selectedReaction, commentText]);

  // 情感颜色映射
  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      joy: '#FFD700',
      calm: '#81C784',
      love: '#FF5252',
      gratitude: '#FFB74D',
      excitement: '#7C6AFF',
      missing: '#FF7B8A',
    };
    return colors[emotion] || '#7C6AFF';
  };

  const emotionMessage = memory.emotion ? EMOTION_MESSAGES[memory.emotion] : '';

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部导航 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>回忆详情</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 主图区域 */}
        {memory.coverImage ? (
          <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
            <Image
              source={{ uri: memory.coverImage }}
              style={styles.mainImage}
              resizeMode="cover"
            />
            {/* 渐变遮罩 */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
            
            {/* 标题叠加 */}
            <View style={styles.titleOverlay}>
              <Text style={styles.mainTitle}>{memory.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{memory.date}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{memory.location}</Text>
                </View>
              </View>
            </View>
            
            {/* 情感标签 */}
            {memory.emotion && (
              <Animated.View 
                entering={FadeInDown.delay(400)}
                style={[styles.emotionBadge, { backgroundColor: `${memory.emotionColor}40` }]}
              >
                <Ionicons 
                  name={memory.emotionIcon as any} 
                  size={16} 
                  color={memory.emotionColor} 
                />
                <Text style={[styles.emotionBadgeText, { color: memory.emotionColor }]}>
                  {emotionMessage}
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
              {memory.title}
            </Text>
            <Text style={styles.snapshotDate}>{memory.date}</Text>
          </Animated.View>
        )}

        {/* 情感统计 */}
        {memory.emotionCount && (
          <Animated.View entering={FadeInUp.delay(300)} style={styles.emotionStats}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={20} color="#FF7B8A" />
              <Text style={styles.statValue}>{memory.emotionCount}</Text>
              <Text style={styles.statLabel}>情感共鸣</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color="#7C6AFF" />
              <Text style={styles.statValue}>{memory.userCount}</Text>
              <Text style={styles.statLabel}>参与者</Text>
            </View>
          </Animated.View>
        )}

        {/* 情感映射图 */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>情感映射</Text>
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
            情感在家庭成员间流动、共享
          </Text>
        </Animated.View>

        {/* 远程互动区 */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>家人回应</Text>
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
          <Text style={styles.reactionButtonText}>发送情感</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.commentButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#666" />
          <Text style={styles.commentButtonText}>留言</Text>
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
            <Text style={styles.modalTitle}>选择你的情感回应</Text>
            
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
                placeholder="添加一句话（可选）..."
                placeholderTextColor="#CCC"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={100}
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
              <Text style={styles.sendReactionText}>发送情感</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    marginTop: -20,
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
  commentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8FA',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  commentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
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
});
