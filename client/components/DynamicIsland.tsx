import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  SlideInDown
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/utils/localeFormat';

interface Alert {
  id: string;
  type: 'heartRate' | 'emotion' | 'family';
  title: string;
  message: string;
  memberName?: string;
  /** 若设置，则首行用 t(memberKey) 替代 memberName（演示/固定角色名多语言） */
  memberKey?: string;
  /** 若设置，则用 t(titleKey) 作为无成员名时的首行文案 */
  titleKey?: string;
  /** 若设置，则次行用 t(messageKey) 替代 message */
  messageKey?: string;
  intensity?: 'low' | 'medium' | 'high';
  timestamp: Date;
}

interface DynamicIslandProps {
  alerts?: Alert[];
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  mood?: 'happy' | 'calm' | 'excited' | 'sad';
  onAlertPress?: (alert: Alert) => void;
}

// 天气图标映射
const WEATHER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  sunny: 'sunny',
  cloudy: 'cloudy',
  rainy: 'rainy',
  snowy: 'snow',
};

// 心情图标映射
const MOOD_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  happy: 'happy',
  calm: 'leaf',
  excited: 'sparkles',
  sad: 'rainy',
};

// 心情颜色映射
const MOOD_COLORS: Record<string, string> = {
  happy: '#FFD700',
  calm: '#81C784',
  excited: '#7C6AFF',
  sad: '#90CAF9',
};

export default function DynamicIsland({ 
  alerts = [], 
  weather = 'sunny', 
  mood = 'happy',
  onAlertPress 
}: DynamicIslandProps) {
  const { t } = useTranslation();
  // 直接派生当前提醒，不需要 setState
  const currentAlert = alerts.length > 0 ? alerts[0] : null;

  const alertTitleLine =
    currentAlert?.memberKey != null && currentAlert.memberKey !== ''
      ? String(t(currentAlert.memberKey))
      : currentAlert?.memberName
        ? currentAlert.memberName
        : currentAlert?.titleKey != null && currentAlert.titleKey !== ''
          ? String(t(currentAlert.titleKey))
          : currentAlert?.title ?? '';

  const alertMessageLine =
    currentAlert?.messageKey != null && currentAlert.messageKey !== ''
      ? String(t(currentAlert.messageKey))
      : currentAlert?.message ?? '';
  
  // 脉冲动画
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (alerts.length > 0) {
      // 脉冲动画
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0.2, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [alerts.length]);

  const islandStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // 获取提醒颜色
  const getAlertColor = () => {
    if (!currentAlert) return MOOD_COLORS[mood];
    switch (currentAlert.type) {
      case 'heartRate': return '#FF7B8A';
      case 'emotion': return '#7C6AFF';
      case 'family': return '#FFB74D';
      default: return MOOD_COLORS[mood];
    }
  };

  // 获取提醒图标
  const getAlertIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!currentAlert) return MOOD_ICONS[mood];
    switch (currentAlert.type) {
      case 'heartRate': return 'heart';
      case 'emotion': return 'heart-circle';
      case 'family': return 'people';
      default: return 'heart';
    }
  };

  return (
    <Animated.View 
      entering={SlideInDown.duration(500)}
      style={[styles.container, islandStyle]}
    >
      {/* 光晕效果 */}
      {currentAlert && (
        <Animated.View style={[
          styles.glow, 
          { backgroundColor: getAlertColor() },
          glowStyle
        ]} />
      )}
      
      <TouchableOpacity 
        style={styles.island}
        onPress={() => currentAlert && onAlertPress?.(currentAlert)}
        activeOpacity={0.9}
      >
        {/* 左侧天气/心情 */}
        <View style={styles.leftSection}>
          <View style={[styles.iconBadge, { backgroundColor: `${MOOD_COLORS[mood]}20` }]}>
            <Ionicons name={WEATHER_ICONS[weather]} size={16} color={MOOD_COLORS[mood]} />
          </View>
          <View style={[styles.iconBadge, { backgroundColor: `${MOOD_COLORS[mood]}20` }]}>
            <Ionicons name={MOOD_ICONS[mood]} size={16} color={MOOD_COLORS[mood]} />
          </View>
        </View>
        
        {/* 中间提醒内容 */}
        <View style={styles.centerSection}>
          {currentAlert ? (
            <>
              <View style={styles.alertIcon}>
                <Ionicons name={getAlertIcon()} size={18} color={getAlertColor()} />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertTitle} numberOfLines={1}>
                  {alertTitleLine}
                </Text>
                <Text style={styles.alertMessage} numberOfLines={1}>
                  {alertMessageLine}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.defaultText}>Voxora</Text>
          )}
        </View>
        
        {/* 右侧指示器 */}
        <View style={styles.rightSection}>
          {currentAlert ? (
            <View style={[styles.alertIndicator, { backgroundColor: getAlertColor() }]}>
              <Ionicons name="pulse" size={12} color="#FFF" />
            </View>
          ) : (
            <View style={styles.statusDot} />
          )}
        </View>
      </TouchableOpacity>
      
      {/* 底部时间戳 */}
      {currentAlert && (
        <Text style={styles.timestamp}>
          {formatRelativeTime(currentAlert.timestamp, t)}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    opacity: 0.3,
  },
  island: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  leftSection: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  alertIcon: {
    marginRight: 8,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  alertMessage: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  defaultText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  rightSection: {
    marginLeft: 10,
  },
  alertIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 4,
  },
});
