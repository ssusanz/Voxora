import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat,
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';

// 呼吸灯效果组件
export function BreathingIndicator({ 
  isActive = true, 
  color = '#7C6AFF',
  size = 12 
}: { 
  isActive?: boolean; 
  color?: string;
  size?: number;
}) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (isActive) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1500 }),
          withTiming(0.8, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      opacity.value = withTiming(0.2, { duration: 500 });
      scale.value = withTiming(0.8, { duration: 500 });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[
      styles.breathingIndicator, 
      { 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        backgroundColor: color 
      },
      animatedStyle
    ]} />
  );
}

// 成员节点组件
export function MemberNode({ 
  name, 
  avatar, 
  isCreator = false,
  isAphasia = false,
  activityLevel = 0.8,
  mood = 'happy',
  onPress
}: {
  name: string;
  avatar?: string;
  isCreator?: boolean;
  isAphasia?: boolean;
  activityLevel?: number;
  mood?: 'happy' | 'calm' | 'excited' | 'sad';
  onPress?: () => void;
}) {
  const moodColors = {
    happy: '#FFD700',
    calm: '#81C784',
    excited: '#7C6AFF',
    sad: '#90CAF9',
  };
  
  const color = moodColors[mood];
  const isActive = activityLevel > 0.3;

  return (
    <TouchableOpacity style={styles.memberNode} onPress={onPress} activeOpacity={0.8}>
      {/* 连接线 */}
      <View style={[styles.connector, { backgroundColor: isCreator ? '#7C6AFF' : '#E0E0E0' }]} />
      
      {/* 头像容器 */}
      <View style={[
        styles.avatarContainer,
        isCreator && styles.creatorAvatar,
        isAphasia && styles.aphasiaAvatar
      ]}>
        {/* 呼吸灯（仅非语言用户） */}
        {isAphasia && (
          <BreathingIndicator 
            isActive={isActive} 
            color={color}
            size={10}
          />
        )}
        
        {/* 头像 */}
        <View style={[styles.avatar, { backgroundColor: `${color}30` }]}>
          <Ionicons 
            name={isCreator ? "star" : "person"} 
            size={isCreator ? 20 : 18} 
            color={color} 
          />
        </View>
        
        {/* 创建者徽章 */}
        {isCreator && (
          <View style={styles.creatorBadge}>
            <Ionicons name="medal" size={10} color="#FFF" />
          </View>
        )}
        
        {/* 非语言用户徽章 */}
        {isAphasia && (
          <View style={[styles.aphasiaBadge, { backgroundColor: color }]}>
            <Ionicons name="hand-left" size={8} color="#FFF" />
          </View>
        )}
      </View>
      
      {/* 名字 */}
      <Text style={[styles.memberName, isCreator && styles.creatorName]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

// 拓扑图组件
export default function FamilyTopology({ 
  members, 
  creatorId,
  onMemberPress
}: {
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    isAphasia?: boolean;
    activityLevel?: number;
    mood?: 'happy' | 'calm' | 'excited' | 'sad';
  }>;
  creatorId: string;
  onMemberPress?: (memberId: string) => void;
}) {
  const creator = members.find(m => m.id === creatorId);
  const otherMembers = members.filter(m => m.id !== creatorId);
  
  // 计算位置（环形排列）
  const getPosition = (index: number, total: number) => {
    const angle = ((index / total) * 2 * Math.PI) - Math.PI / 2;
    const radius = 120;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  return (
    <View style={styles.topologyContainer}>
      {/* 中心 - 创建者 */}
      {creator && (
        <View style={[styles.centerNode, { top: 150, left: 150 }]}>
          <MemberNode
            name={creator.name}
            isCreator={true}
            isAphasia={creator.isAphasia}
            activityLevel={creator.activityLevel}
            mood={creator.mood}
            onPress={() => onMemberPress?.(creator.id)}
          />
        </View>
      )}
      
      {/* 周围节点 */}
      {otherMembers.map((member, index) => {
        const pos = getPosition(index, otherMembers.length);
        return (
          <Animated.View 
            key={member.id}
            entering={FadeIn.delay(index * 100)}
            style={[
              styles.surroundingNode,
              {
                top: 150 + pos.y,
                left: 150 + pos.x,
              }
            ]}
          >
            <MemberNode
              name={member.name}
              isAphasia={member.isAphasia}
              activityLevel={member.activityLevel}
              mood={member.mood}
              onPress={() => onMemberPress?.(member.id)}
            />
          </Animated.View>
        );
      })}
      
      {/* 连接线 SVG（简化版，使用 View 模拟） */}
      {otherMembers.map((member, index) => {
        const pos = getPosition(index, otherMembers.length);
        return (
          <View
            key={`line-${member.id}`}
            style={[
              styles.connectionLine,
              {
                transform: [
                  { translateX: pos.x / 2 },
                  { translateY: pos.y / 2 },
                  { rotate: `${(index / otherMembers.length) * 360 + 90}deg` },
                ],
                width: Math.sqrt(pos.x * pos.x + pos.y * pos.y) * 0.8,
              }
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  topologyContainer: {
    width: 300,
    height: 300,
    alignSelf: 'center',
    position: 'relative',
  },
  centerNode: {
    position: 'absolute',
    transform: [{ translateX: -40 }, { translateY: -50 }],
    alignItems: 'center',
  },
  surroundingNode: {
    position: 'absolute',
    transform: [{ translateX: -40 }, { translateY: -50 }],
    alignItems: 'center',
  },
  memberNode: {
    alignItems: 'center',
    width: 80,
  },
  connector: {
    position: 'absolute',
    height: 2,
    width: 40,
    top: 25,
    right: 50,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatar: {
    // 额外样式
  },
  aphasiaAvatar: {
    // 额外样式
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  creatorBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFB74D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  aphasiaBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  breathingIndicator: {
    position: 'absolute',
    top: -5,
    left: -5,
    zIndex: -1,
  },
  memberName: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    maxWidth: 70,
    textAlign: 'center',
  },
  creatorName: {
    fontWeight: '700',
    color: '#7C6AFF',
  },
  connectionLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#E0E0E0',
    top: '50%',
    left: '50%',
    transformOrigin: 'left center',
  },
});

// 导入 FadeIn 动画
import { FadeIn } from 'react-native-reanimated';
