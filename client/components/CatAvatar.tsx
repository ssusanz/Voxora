import { View, StyleSheet, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface CatAvatarProps {
  size?: number;
  mood?: 'happy' | 'sleepy' | 'excited' | 'hungry';
}

// 可爱的猫咪图片 - 使用高清猫咪照片
const CAT_IMAGES = {
  happy: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop&crop=face',
  sleepy: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop&crop=face',
  excited: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&h=200&fit=crop&crop=face',
  hungry: 'https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=200&h=200&fit=crop&crop=face',
};

export function CatAvatar({ size = 80, mood = 'happy' }: CatAvatarProps) {
  // 呼吸动画
  const breathe = useSharedValue(0);
  
  // 眨眼动画
  const blink = useSharedValue(0);
  
  // 尾巴摇摆
  const tailWag = useSharedValue(0);
  
  // 耳朵抖动
  const earTwitch = useSharedValue(0);

  useEffect(() => {
    // 呼吸动画 - 缓慢的上下浮动
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 眨眼动画 - 随机眨眼
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000;
      setTimeout(() => {
        blink.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();

    // 尾巴摇摆
    tailWag.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 耳朵抖动（兴奋时）
    if (mood === 'excited') {
      earTwitch.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        true
      );
    }
  }, [mood]);

  // 猫咪容器动画
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + breathe.value * 0.03 },
      { translateY: breathe.value * -2 },
    ],
  }));

  // 尾巴动画
  const tailStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${tailWag.value * 15}deg` },
    ],
  }));

  // 耳朵动画
  const leftEarStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${earTwitch.value * -5}deg` },
    ],
  }));

  const rightEarStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${earTwitch.value * 5}deg` },
    ],
  }));

  const catImage = CAT_IMAGES[mood];
  const innerSize = size * 0.85;

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, containerStyle]}>
      {/* 背景光晕 */}
      <View style={[styles.glow, { 
        width: size * 1.3, 
        height: size * 1.3,
        borderRadius: size * 0.65,
        backgroundColor: mood === 'excited' ? '#FFB74D' : mood === 'sleepy' ? '#90CAF9' : '#FFE0B2'
      }]} />
      
      {/* 猫咪身体 */}
      <View style={[styles.catBody, { width: innerSize, height: innerSize, borderRadius: innerSize * 0.5 }]}>
        {/* 左耳 */}
        <Animated.View style={[styles.ear, styles.leftEar, { 
          width: size * 0.25, 
          height: size * 0.3,
          borderBottomLeftRadius: size * 0.15,
          borderBottomRightRadius: size * 0.1,
        }, leftEarStyle]}>
          <View style={[styles.earInner, { 
            width: size * 0.12, 
            height: size * 0.15,
            borderRadius: size * 0.06,
          }]} />
        </Animated.View>
        
        {/* 右耳 */}
        <Animated.View style={[styles.ear, styles.rightEar, { 
          width: size * 0.25, 
          height: size * 0.3,
          borderBottomLeftRadius: size * 0.1,
          borderBottomRightRadius: size * 0.15,
        }, rightEarStyle]} />
        
        {/* 猫咪图片 */}
        <Image 
          source={{ uri: catImage }}
          style={[styles.catImage, { 
            width: innerSize * 0.9, 
            height: innerSize * 0.9,
            borderRadius: innerSize * 0.45,
          }]}
          resizeMode="cover"
        />
        
        {/* 腮红装饰 */}
        <View style={[styles.blush, styles.leftBlush, { 
          left: innerSize * 0.08,
          top: innerSize * 0.55,
        }]} />
        <View style={[styles.blush, styles.rightBlush, { 
          right: innerSize * 0.08,
          top: innerSize * 0.55,
        }]} />
      </View>
      
      {/* 尾巴 */}
      <Animated.View style={[styles.tail, tailStyle, { 
        right: -size * 0.15,
        bottom: size * 0.3,
      }]} />
      
      {/* 装饰星星 */}
      {mood === 'happy' && (
        <>
          <View style={[styles.star, { top: -5, left: size * 0.1 }]}>
            <View style={styles.sparkle} />
          </View>
          <View style={[styles.star, { top: size * 0.15, right: -5 }]}>
            <View style={styles.sparkle} />
          </View>
        </>
      )}
      
      {/* 能量光环 */}
      <View style={[styles.aura, { 
        width: size * 1.5,
        height: size * 1.5,
        borderRadius: size * 0.75,
      }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    opacity: 0.3,
  },
  catBody: {
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  ear: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FFF9E6',
    zIndex: 1,
  },
  leftEar: {
    left: '15%',
    transform: [{ rotate: '-15deg' }],
  },
  rightEar: {
    right: '15%',
    transform: [{ rotate: '15deg' }],
  },
  earInner: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    marginLeft: -6,
    backgroundColor: '#FFE4E1',
  },
  catImage: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  blush: {
    position: 'absolute',
    width: 12,
    height: 8,
    backgroundColor: '#FFB6C1',
    borderRadius: 4,
    opacity: 0.5,
  },
  leftBlush: {},
  rightBlush: {},
  tail: {
    position: 'absolute',
    width: 20,
    height: 40,
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
    transformOrigin: 'top center',
  },
  star: {
    position: 'absolute',
  },
  sparkle: {
    width: 8,
    height: 8,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  aura: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    opacity: 0.5,
  },
});
