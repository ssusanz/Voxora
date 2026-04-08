import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';

// 情感类型定义
export type EmotionType = 'joy' | 'calm' | 'missing' | 'love' | 'excitement' | 'gratitude' | 'anxiety' | 'sadness';

interface Emotion {
  id: EmotionType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

// 预设情感配置
const EMOTIONS: Emotion[] = [
  { id: 'joy', icon: 'sunny', label: '喜悦', color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)', description: '开心的事情' },
  { id: 'calm', icon: 'leaf', label: '平静', color: '#81C784', bgColor: 'rgba(129, 199, 132, 0.15)', description: '放松的状态' },
  { id: 'missing', icon: 'heart', label: '想念', color: '#FF7B8A', bgColor: 'rgba(255, 123, 138, 0.15)', description: '思念家人' },
  { id: 'love', icon: 'heart-circle', label: '爱', color: '#FF5252', bgColor: 'rgba(255, 82, 82, 0.15)', description: '满满的爱意' },
  { id: 'excitement', icon: 'sparkles', label: '兴奋', color: '#7C6AFF', bgColor: 'rgba(124, 106, 255, 0.15)', description: '超级开心' },
  { id: 'gratitude', icon: 'flower', label: '感恩', color: '#FFB74D', bgColor: 'rgba(255, 183, 77, 0.15)', description: '感谢有你' },
  { id: 'anxiety', icon: 'cloud', label: '焦虑', color: '#90CAF9', bgColor: 'rgba(144, 202, 249, 0.15)', description: '需要安慰' },
  { id: 'sadness', icon: 'rainy', label: '难过', color: '#B0BEC5', bgColor: 'rgba(176, 190, 197, 0.15)', description: '心情低落' },
];

interface EmotionPickerProps {
  selectedEmotion?: EmotionType;
  onSelect: (emotion: EmotionType) => void;
  title?: string;
}

function EmotionItem({ emotion, isSelected, onPress }: { 
  emotion: Emotion; 
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.1, { damping: 10 });
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1, { damping: 10 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.emotionItem, animatedStyle]}>
        <Animated.View style={[
          styles.emotionGlow, 
          { backgroundColor: emotion.color },
          glowStyle
        ]} />
        <View style={[styles.emotionIcon, { backgroundColor: emotion.bgColor }]}>
          <Ionicons name={emotion.icon} size={28} color={emotion.color} />
        </View>
        <Text style={[styles.emotionLabel, isSelected && { color: emotion.color, fontWeight: '600' }]}>
          {emotion.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function EmotionPicker({ 
  selectedEmotion, 
  onSelect, 
  title = '选择此刻的心情' 
}: EmotionPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.scrollWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {EMOTIONS.map((emotion) => (
            <EmotionItem
              key={emotion.id}
              emotion={emotion}
              isSelected={selectedEmotion === emotion.id}
              onPress={() => onSelect(emotion.id)}
            />
          ))}
        </ScrollView>
      </View>
      {selectedEmotion && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedDescription}>
            {EMOTIONS.find(e => e.id === selectedEmotion)?.description}
          </Text>
        </View>
      )}
    </View>
  );
}

// 导出表情常量供其他组件使用
export { EMOTIONS };
export type { Emotion };

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  scrollWrapper: {
    marginHorizontal: -4,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 12,
  },
  emotionItem: {
    alignItems: 'center',
    position: 'relative',
    padding: 8,
  },
  emotionGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    borderRadius: 20,
    opacity: 0,
  },
  emotionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emotionLabel: {
    fontSize: 12,
    color: '#666',
  },
  selectedInfo: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  selectedDescription: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
