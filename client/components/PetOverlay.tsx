import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  
  // 动画状态
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const bounceValue = useSharedValue(0);
  
  // 交互反馈
  const [showReaction, setShowReaction] = useState(false);
  const [reactionType, setReactionType] = useState<'heart' | 'star' | 'sparkle'>('heart');
  const reactionScale = useSharedValue(0);
  const reactionOpacity = useSharedValue(0);
  const reactionTranslateY = useSharedValue(0);

  // 待机动画
  const startIdleAnimation = useCallback(() => {
    bounceValue.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, []);

  // 点击交互
  const handlePress = useCallback(() => {
    // 点击缩放动画
    scale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1.1, { damping: 8 }),
      withSpring(1, { damping: 10 })
    );
    
    // 旋转动画
    rotate.value = withSequence(
      withTiming(-10, { duration: 100 }),
      withSpring(10, { damping: 5 }),
      withSpring(0, { damping: 10 })
    );
    
    // 上下弹跳
    translateY.value = withSequence(
      withTiming(-20, { duration: 150 }),
      withSpring(0, { damping: 6 })
    );
    
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
    
    reactionTranslateY.value = withTiming(-60, { duration: 800, easing: Easing.out(Easing.ease) });
    reactionOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0, { duration: 300 }))
    );
    
    setTimeout(() => setShowReaction(false), 800);
    
    // 调用外部回调
    if (onPetClick) {
      onPetClick();
    }
  }, [onPetClick]);

  // 长按交互
  const handleLongPress = useCallback(() => {
    // 开心旋转动画
    scale.value = withSequence(
      withSpring(1.3, { damping: 6 }),
      withRepeat(
        withSequence(
          withTiming(-15, { duration: 150 }),
          withTiming(15, { duration: 150 })
        ),
        3
      ),
      withSpring(1, { damping: 10 })
    );
    
    rotate.value = 0;
  }, []);

  // 宠物容器动画样式
  const petAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value + bounceValue.value },
      { rotate: `${rotate.value}deg` },
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

  // 获取心情图标
  const getMoodIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (petData.mood) {
      case 'happy': return 'star';
      case 'excited': return 'sparkles';
      case 'sleepy': return 'moon';
      case 'hungry': return 'leaf';
      default: return 'star';
    }
  };

  // 获取心情颜色
  const getMoodColor = (): string => {
    switch (petData.mood) {
      case 'happy': return '#FFD700';
      case 'excited': return '#FF7B8A';
      case 'sleepy': return '#9E9E9E';
      case 'hungry': return '#4CAF50';
      default: return '#FFD700';
    }
  };

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
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        <Animated.View style={[styles.petCard, petAnimatedStyle]}>
          {/* 背景光晕 */}
          <View style={[styles.glow, { backgroundColor: getMoodColor() }]} />
          
          {/* 宠物头像 */}
          <View style={[styles.petAvatarContainer, { backgroundColor: '#FFF9E6' }]}>
            <Ionicons name={getMoodIcon()} size={32} color={getMoodColor()} />
            
            {/* 粒子效果 */}
            {[...Array(4)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    left: 15 + Math.cos((i / 4) * Math.PI * 2) * 25,
                    top: 15 + Math.sin((i / 4) * Math.PI * 2) * 25,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={8} color="#FFD700" />
              </Animated.View>
            ))}
            
            {/* 反应动画 */}
            {showReaction && (
              <Animated.View style={[styles.reaction, reactionAnimatedStyle]}>
                <Ionicons name={getReactionIcon()} size={24} color={getReactionColor()} />
              </Animated.View>
            )}
          </View>
          
          {/* 宠物信息 */}
          <View style={styles.petInfo}>
            <View style={styles.petHeader}>
              <Text style={styles.petName}>{petData.name}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Lv.{petData.level}</Text>
              </View>
            </View>
            
            {/* 经验条 */}
            <View style={styles.expBarContainer}>
              <View style={styles.expBarBackground}>
                <View style={[styles.expBarFill, { width: `${expProgress * 100}%` }]} />
              </View>
              <Text style={styles.expText}>{petData.experience}/{petData.maxExperience}</Text>
            </View>
            
            {/* 心情和能量 */}
            <View style={styles.statusRow}>
              <View style={styles.moodTag}>
                <Ionicons name={getMoodIcon()} size={10} color={getMoodColor()} />
                <Text style={[styles.moodText, { color: getMoodColor() }]}>
                  {getMoodText()}
                </Text>
              </View>
              <View style={styles.energyTag}>
                <Ionicons name="flash" size={10} color="#7C6AFF" />
                <Text style={styles.energyText}>{petData.energy}</Text>
              </View>
            </View>
          </View>
          
          {/* 点击提示 */}
          <View style={styles.tapHint}>
            <Ionicons name="hand-left" size={12} color="#9E9E9E" />
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
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 12,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.2,
  },
  petAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 10,
  },
  particle: {
    position: 'absolute',
    opacity: 0.6,
  },
  reaction: {
    position: 'absolute',
    top: -10,
    left: 13,
  },
  petInfo: {
    flex: 1,
    minWidth: 100,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  petName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  levelBadge: {
    backgroundColor: '#7C6AFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  expBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  expBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#F0F0F3',
    borderRadius: 2,
    overflow: 'hidden',
  },
  expBarFill: {
    height: '100%',
    backgroundColor: '#7C6AFF',
    borderRadius: 2,
  },
  expText: {
    fontSize: 9,
    color: '#9E9E9E',
    marginLeft: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  moodText: {
    fontSize: 10,
    marginLeft: 3,
    fontWeight: '500',
  },
  energyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  energyText: {
    fontSize: 10,
    color: '#7C6AFF',
    marginLeft: 3,
    fontWeight: '500',
  },
  tapHint: {
    position: 'absolute',
    bottom: -18,
    alignSelf: 'center',
    opacity: 0.5,
  },
});
