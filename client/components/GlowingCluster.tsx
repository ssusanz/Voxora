import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat,
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface GlowingClusterProps {
  userCount: number;
  size?: number;
  isActive?: boolean;
}

function Star({ index, total, size }: { index: number; total: number; size: number }) {
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(0.8);
  
  // 计算星星位置
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = size * 0.35;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  useEffect(() => {
    const delay = index * 200;
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 + index * 100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1500 + index * 100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 + index * 150 }),
        withTiming(0.8, { duration: 1000 + index * 150 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x },
      { translateY: y },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.star, animatedStyle]}>
      <Ionicons name="star" size={10} color="#FFD700" />
    </Animated.View>
  );
}

function CentralGlow({ size, isActive }: { size: number; isActive: boolean }) {
  const glowOpacity = useSharedValue(0.3);
  const glowScale = useSharedValue(1);
  
  useEffect(() => {
    if (isActive) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1200 }),
          withTiming(1, { duration: 1200 })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0.2, { duration: 500 });
      glowScale.value = withTiming(1, { duration: 500 });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <Animated.View style={[
      styles.centralGlow, 
      { width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25 },
      animatedStyle
    ]}>
      <View style={[styles.centralCore, { 
        width: size * 0.3, 
        height: size * 0.3, 
        borderRadius: size * 0.15 
      }]} />
    </Animated.View>
  );
}

export default function GlowingCluster({ userCount, size = 80, isActive = true }: GlowingClusterProps) {
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.5);
  
  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 500 });
    containerScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const stars = Array.from({ length: Math.min(userCount, 8) }, (_, i) => i);

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, containerStyle]}>
      {/* 外层光晕 */}
      <View style={[styles.outerGlow, { 
        width: size * 1.2, 
        height: size * 1.2, 
        borderRadius: size * 0.6,
        opacity: isActive ? 0.15 : 0.05,
      }]} />
      
      {/* 中央发光核心 */}
      <CentralGlow size={size} isActive={isActive} />
      
      {/* 周围的星星 */}
      {stars.map((index) => (
        <Star key={index} index={index} total={stars.length} size={size} />
      ))}
      
      {/* 中心图标 */}
      <View style={[styles.centerIcon, { 
        width: size * 0.35, 
        height: size * 0.35,
        borderRadius: size * 0.175,
      }]}>
        <Ionicons 
          name={userCount > 3 ? "people" : "heart"} 
          size={size * 0.18} 
          color="#FFF" 
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerGlow: {
    position: 'absolute',
    backgroundColor: '#FFD700',
  },
  centralGlow: {
    position: 'absolute',
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centralCore: {
    backgroundColor: '#FFA500',
  },
  star: {
    position: 'absolute',
  },
  centerIcon: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
});
