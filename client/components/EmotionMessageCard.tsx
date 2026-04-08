import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  SlideInRight,
  SlideOutRight
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';

interface EmotionMessageCardProps {
  memberName: string;
  memberAvatar: string;
  emotion: string;
  emotionColor: string;
  message?: string;
  timestamp: Date;
  onDismiss?: () => void;
  onRespond?: (emotion: string) => void;
}

// 情感配置
const EMOTION_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  love: { icon: 'heart', color: '#FF5252', label: '爱' },
  joy: { icon: 'sunny', color: '#FFD700', label: '开心' },
  calm: { icon: 'leaf', color: '#81C784', label: '平静' },
  gratitude: { icon: 'flower', color: '#FFB74D', label: '感恩' },
  excitement: { icon: 'sparkles', color: '#7C6AFF', label: '兴奋' },
  missing: { icon: 'heart-circle', color: '#FF7B8A', label: '想念' },
};

// 响应选项
const RESPONSE_OPTIONS = ['love', 'joy', 'calm'];

// 格式化时间
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function EmotionMessageCardCore({ card, onDismiss, onRespond }: {
  card: {
    fromMember: string;
    emotion: string;
    message?: string;
    timestamp: Date;
  };
  onDismiss?: () => void;
  onRespond?: (emotion: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const scale = useSharedValue(1);
  
  const config = EMOTION_CONFIG[card.emotion] || EMOTION_CONFIG.love;
  
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleRespond = useCallback((emotion: string) => {
    if (onRespond) {
      onRespond(emotion);
    }
    scale.value = withTiming(0, { duration: 300 });
    setTimeout(() => setIsVisible(false), 300);
  }, [onRespond]);

  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    }
    scale.value = withTiming(0, { duration: 300 });
    setTimeout(() => setIsVisible(false), 300);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <Animated.View 
      entering={SlideInRight.springify().damping(15)}
      exiting={SlideOutRight.duration(300)}
      style={[styles.container, cardStyle]}
    >
      {/* 卡片主体 */}
      <TouchableOpacity 
        style={styles.card}
        onPress={handleDismiss}
        activeOpacity={0.95}
      >
        {/* 顶部装饰条 */}
        <View style={[styles.topBar, { backgroundColor: config.color }]} />
        
        {/* 发送者信息 */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: `${config.color}30` }]}>
            <Ionicons name="person" size={20} color={config.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.memberName}>{card.fromMember}</Text>
            <Text style={styles.timestamp}>{formatTime(card.timestamp)}</Text>
          </View>
        </View>
        
        {/* 情感图标 */}
        <View style={styles.emotionSection}>
          <View style={[styles.emotionCircle, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={config.icon} size={40} color={config.color} />
          </View>
          <Text style={[styles.emotionLabel, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        
        {/* 消息内容 */}
        {card.message && (
          <Text style={styles.message}>{card.message}</Text>
        )}
        
        {/* 分隔线 */}
        <View style={styles.divider} />
        
        {/* 响应选项 */}
        <View style={styles.responseSection}>
          <Text style={styles.responseTitle}>送TA回应</Text>
          <View style={styles.responseButtons}>
            {RESPONSE_OPTIONS.map((emotion) => {
              const emotionConfig = EMOTION_CONFIG[emotion];
              return (
                <TouchableOpacity
                  key={emotion}
                  style={[styles.responseButton, { backgroundColor: `${emotionConfig.color}20` }]}
                  onPress={() => handleRespond(emotion)}
                >
                  <Ionicons name={emotionConfig.icon} size={20} color={emotionConfig.color} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        
        {/* 关闭按钮 */}
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <Ionicons name="close" size={16} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 导出兼容性版本
export default function EmotionMessageCard(props: EmotionMessageCardProps) {
  const card = {
    fromMember: props.memberName,
    emotion: props.emotion,
    message: props.message,
    timestamp: props.timestamp,
  };
  
  return (
    <EmotionMessageCardCore 
      card={card}
      onDismiss={props.onDismiss}
      onRespond={props.onRespond}
    />
  );
}

export { EmotionMessageCardCore };

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emotionSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emotionCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emotionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F3',
    marginVertical: 14,
  },
  responseSection: {
    alignItems: 'center',
  },
  responseTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  responseButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  responseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
