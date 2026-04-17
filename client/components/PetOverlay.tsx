import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatAvatar } from './CatAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 宠物数据
interface PetData {
  name: string;
  level: number;
  experience: number;
  maxExperience: number;
  mood: 'happy' | 'excited' | 'sleepy' | 'hungry';
  energy: number;
  maxEnergy: number;
  evolutionStage: number;
}

// 情绪送信消息类型
interface EmotionMessage {
  id: string;
  emotion: string;
  emotionColor: string;
  emotionIcon: string;
  targetMember: string;
  timestamp: Date;
  status: 'pending' | 'delivered';
}

// 默认宠物数据
const defaultPet: PetData = {
  name: '小星',
  level: 5,
  experience: 680,
  maxExperience: 1000,
  mood: 'happy',
  energy: 85,
  maxEnergy: 100,
  evolutionStage: 2,
};

// 家庭成员列表
const familyMembers = [
  { id: '1', name: '奶奶', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200' },
  { id: '2', name: '爸爸', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: '3', name: '妈妈', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200' },
  { id: '4', name: '小明', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200' },
];

// 情绪选项
const emotionOptions = [
  { id: 'love', icon: 'heart', color: '#FF5252', label: '爱' },
  { id: 'joy', icon: 'sunny', color: '#FFD700', label: '开心' },
  { id: 'missing', icon: 'heart-circle', color: '#FF7B8A', label: '想念' },
  { id: 'calm', icon: 'leaf', color: '#81C784', label: '平静' },
  { id: 'gratitude', icon: 'flower', color: '#FFB74D', label: '感谢' },
  { id: 'encourage', icon: 'star', color: '#7C6AFF', label: '鼓励' },
];

interface PetOverlayProps {
  petData?: PetData;
  onPetClick?: () => void;
}

export default function PetOverlay({ petData = defaultPet, onPetClick }: PetOverlayProps) {
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmotionModal, setShowEmotionModal] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [sentMessages, setSentMessages] = useState<EmotionMessage[]>([]);
  
  // 动画状态
  const scale = useSharedValue(1);
  const bounceValue = useSharedValue(0);
  
  // 反应动画
  const [showReaction, setShowReaction] = useState(false);
  const [reactionType, setReactionType] = useState<'heart' | 'star' | 'sparkle'>('heart');
  const reactionScale = useSharedValue(0);
  const reactionOpacity = useSharedValue(0);
  const reactionTranslateY = useSharedValue(0);

  // 待机动画
  useEffect(() => {
    const interval = setInterval(() => {
      bounceValue.value = withSequence(
        withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      );
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // 点击交互 - 切换展开/收起
  const handlePress = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (newExpanded) {
      scale.value = withSpring(1.05, { damping: 12 });
    } else {
      scale.value = withSpring(1, { damping: 12 });
    }
    
    // 显示反应动画
    const reactions: ('heart' | 'star' | 'sparkle')[] = ['heart', 'star', 'sparkle'];
    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
    setReactionType(randomReaction);
    setShowReaction(true);
    
    reactionScale.value = 0;
    reactionOpacity.value = 1;
    reactionTranslateY.value = 0;
    
    reactionScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withTiming(1, { duration: 300 })
    );
    
    reactionTranslateY.value = withTiming(-50, { duration: 800, easing: Easing.out(Easing.ease) });
    reactionOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0, { duration: 300 }))
    );
    
    setTimeout(() => setShowReaction(false), 800);
    
    if (onPetClick) {
      onPetClick();
    }
  };

  // 打开情绪送信弹窗
  const handleOpenEmotionModal = () => {
    setShowEmotionModal(true);
    setSelectedEmotion(null);
    setSelectedMember(null);
  };

  // 发送情绪送信
  const handleSendEmotion = () => {
    if (selectedEmotion && selectedMember) {
      const emotion = emotionOptions.find(e => e.id === selectedEmotion);
      const member = familyMembers.find(m => m.id === selectedMember);
      
      if (emotion && member) {
        const newMessage: EmotionMessage = {
          id: Date.now().toString(),
          emotion: emotion.id,
          emotionColor: emotion.color,
          emotionIcon: emotion.icon,
          targetMember: member.name,
          timestamp: new Date(),
          status: 'pending',
        };
        
        setSentMessages(prev => [...prev, newMessage]);
        
        // 模拟送达
        setTimeout(() => {
          setSentMessages(prev => 
            prev.map(msg => 
              msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
            )
          );
        }, 2000);
      }
      
      setShowEmotionModal(false);
      setSelectedEmotion(null);
      setSelectedMember(null);
    }
  };

  // 猫咪容器动画
  const petAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (1 + bounceValue.value * 0.01) },
      { translateY: bounceValue.value },
    ],
  }));

  // 反应动画样式
  const reactionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: reactionScale.value },
      { translateY: reactionTranslateY.value },
    ],
    opacity: reactionOpacity.value,
  }));

  // 获取心情文字
  const getMoodText = (): string => {
    switch (petData.mood) {
      case 'happy': return '开心';
      case 'excited': return '兴奋';
      case 'sleepy': return '困了';
      case 'hungry': return '饿了';
      default: return '开心';
    }
  };

  // 获取心情颜色
  const getMoodColor = (): string => {
    switch (petData.mood) {
      case 'happy': return '#FFD700';
      case 'excited': return '#FF7B8A';
      case 'sleepy': return '#90CAF9';
      case 'hungry': return '#4CAF50';
      default: return '#FFD700';
    }
  };

  // 获取心情图标
  const getMoodIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (petData.mood) {
      case 'happy': return 'happy';
      case 'excited': return 'star';
      case 'sleepy': return 'moon';
      case 'hungry': return 'restaurant';
      default: return 'happy';
    }
  };

  // 获取反应图标
  const getReactionIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (reactionType) {
      case 'heart': return 'heart';
      case 'star': return 'star';
      case 'sparkle': return 'sparkles';
      default: return 'heart';
    }
  };

  const getReactionColor = (): string => {
    switch (reactionType) {
      case 'heart': return '#FF7B8A';
      case 'star': return '#FFD700';
      case 'sparkle': return '#7C6AFF';
      default: return '#FF7B8A';
    }
  };

  // 计算经验条进度
  const expProgress = petData.experience / petData.maxExperience;

  return (
    <View style={[styles.container, { bottom: 80 + insets.bottom }]}>
      {/* 宠物卡片 */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
      >
        <Animated.View style={[styles.petBall, petAnimatedStyle]}>
          {/* 背景光晕 */}
          <View style={[styles.glow, { backgroundColor: getMoodColor() }]} />
          
          {/* 猫咪头像 */}
          <View style={styles.catContainer}>
            <CatAvatar size={60} mood={petData.mood} />
            
            {/* 反应动画 */}
            {showReaction && (
              <Animated.View style={[styles.reaction, reactionAnimatedStyle]}>
                <Ionicons name={getReactionIcon()} size={28} color={getReactionColor()} />
              </Animated.View>
            )}
          </View>
          
          {/* 展开详情面板 */}
          {isExpanded && (
            <View style={styles.infoPanel}>
              {/* 名字和等级 */}
              <View style={styles.nameRow}>
                <Text style={styles.petName}>{petData.name}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lv.{petData.level}</Text>
                </View>
              </View>
              
              {/* 经验条 */}
              <View style={styles.expContainer}>
                <View style={styles.expBarBg}>
                  <View style={[styles.expBarFill, { width: `${expProgress * 100}%` }]} />
                </View>
                <Text style={styles.expText}>{petData.experience}/{petData.maxExperience}</Text>
              </View>
              
              {/* 心情和能量 */}
              <View style={styles.statusRow}>
                <View style={[styles.statusTag, { backgroundColor: `${getMoodColor()}20` }]}>
                  <Ionicons name={getMoodIcon()} size={12} color={getMoodColor()} />
                  <Text style={[styles.statusText, { color: getMoodColor() }]}>
                    {getMoodText()}
                  </Text>
                </View>
                <View style={styles.statusTag}>
                  <Ionicons name="flash" size={12} color="#7C6AFF" />
                  <Text style={[styles.statusText, { color: '#7C6AFF' }]}>
                    {petData.energy}
                  </Text>
                </View>
              </View>
              
              {/* 情绪送信按钮 */}
              <TouchableOpacity 
                style={styles.emotionButton}
                onPress={handleOpenEmotionModal}
              >
                <Ionicons name="mail-open" size={14} color="#7C6AFF" />
                <Text style={styles.emotionButtonText}>情绪送信</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* 展开指示器 */}
          <View style={styles.expandHint}>
            <Ionicons 
              name={isExpanded ? 'chevron-forward' : 'chevron-back'} 
              size={12} 
              color="#FFF" 
            />
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* 情绪送信弹窗 */}
      <Modal
        visible={showEmotionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmotionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEmotionModal(false)}
        >
          <View 
            style={[styles.emotionModal, { paddingBottom: insets.bottom + 20 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>情绪送信</Text>
            <Text style={styles.modalSubtitle}>
              选择一份情感，传递给家人
            </Text>
            
            {/* 情绪选择 */}
            <View style={styles.emotionGrid}>
              {emotionOptions.map((emotion) => (
                <TouchableOpacity
                  key={emotion.id}
                  style={[
                    styles.emotionOption,
                    selectedEmotion === emotion.id && styles.emotionOptionSelected,
                    selectedEmotion === emotion.id && {
                      backgroundColor: `${emotion.color}20`,
                      borderColor: emotion.color
                    }
                  ]}
                  onPress={() => setSelectedEmotion(emotion.id)}
                >
                  <View style={[styles.emotionIconCircle, { backgroundColor: emotion.color }]}>
                    <Ionicons name={emotion.icon as any} size={24} color="#FFF" />
                  </View>
                  <Text style={[styles.emotionLabel, selectedEmotion === emotion.id && { color: emotion.color }]}>
                    {emotion.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 成员选择 */}
            <Text style={styles.memberSectionTitle}>发送给</Text>
            <View style={styles.memberList}>
              {familyMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberOption,
                    selectedMember === member.id && styles.memberOptionSelected
                  ]}
                  onPress={() => setSelectedMember(member.id)}
                >
                  <View style={styles.memberAvatarContainer}>
                    <View style={[styles.memberAvatarBg, selectedMember === member.id && styles.memberAvatarBgSelected]}>
                      <Text style={styles.memberInitial}>
                        {member.name.charAt(0)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.memberName, selectedMember === member.id && styles.memberNameSelected]}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 发送按钮 */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!selectedEmotion || !selectedMember) && styles.sendButtonDisabled
              ]}
              onPress={handleSendEmotion}
              disabled={!selectedEmotion || !selectedMember}
            >
              <Ionicons name="paper-plane" size={18} color="#FFF" />
              <Text style={styles.sendButtonText}>发送情感</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  petBall: {
    backgroundColor: '#FFF9E6',
    borderRadius: 35,
    padding: 5,
    shadowColor: '#FFB74D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 50,
    height: 50,
    borderRadius: 25,
    opacity: 0.25,
  },
  catContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  reaction: {
    position: 'absolute',
    top: -5,
    left: 16,
  },
  infoPanel: {
    paddingLeft: 12,
    paddingRight: 8,
    maxWidth: 140,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  petName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  levelBadge: {
    backgroundColor: '#7C6AFF',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 6,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFF',
  },
  expContainer: {
    marginBottom: 6,
  },
  expBarBg: {
    height: 4,
    backgroundColor: '#F0F0F3',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 3,
  },
  expBarFill: {
    height: '100%',
    backgroundColor: '#7C6AFF',
    borderRadius: 2,
  },
  expText: {
    fontSize: 9,
    color: '#999',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#F8F8FA',
    borderRadius: 8,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emotionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  emotionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  expandHint: {
    position: 'absolute',
    bottom: -2,
    left: 20,
    backgroundColor: '#FFD700',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  emotionOption: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emotionOptionSelected: {
    borderWidth: 2,
  },
  emotionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emotionLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  memberSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  memberList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  memberOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
  },
  memberOptionSelected: {
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
  },
  memberAvatarContainer: {
    marginBottom: 6,
  },
  memberAvatarBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarBgSelected: {
    backgroundColor: '#7C6AFF',
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  memberName: {
    fontSize: 12,
    color: '#666',
  },
  memberNameSelected: {
    color: '#7C6AFF',
    fontWeight: '600',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C6AFF',
    borderRadius: 24,
    paddingVertical: 14,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
