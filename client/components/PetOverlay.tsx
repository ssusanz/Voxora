import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
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
import { useState, useCallback } from 'react';
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

interface PetOverlayProps {
  petData?: PetData;
  onPetClick?: () => void;
}

export default function PetOverlay({ petData = defaultPet, onPetClick }: PetOverlayProps) {
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 动画状态
  const scale = useSharedValue(1);
  const bounceValue = useSharedValue(0);
  
  // 展开动画
  const cardWidth = useSharedValue(70);
  const cardOpacity = useSharedValue(1);
  
  // 反应动画
  const [showReaction, setShowReaction] = useState(false);
  const [reactionType, setReactionType] = useState<'heart' | 'star' | 'sparkle'>('heart');
  const reactionScale = useSharedValue(0);
  const reactionOpacity = useSharedValue(0);
  const reactionTranslateY = useSharedValue(0);

  // 待机动画
  const startIdleAnimation = useCallback(() => {
    bounceValue.value = withSequence(
      withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
    );
  }, []);

  // 点击交互 - 切换展开/收起
  const handlePress = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (newExpanded) {
      // 展开动画
      scale.value = withSpring(1.05, { damping: 12 });
      cardWidth.value = withSpring(200, { damping: 15 });
    } else {
      // 收起动画
      scale.value = withSpring(1, { damping: 12 });
      cardWidth.value = withSpring(70, { damping: 15 });
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
  }, [isExpanded, onPetClick]);

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

  // 启动待机动画
  startIdleAnimation();

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
            <Animated.View style={styles.infoPanel}>
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
            </Animated.View>
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
    color: '#9E9E9E',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expandHint: {
    position: 'absolute',
    left: -8,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
