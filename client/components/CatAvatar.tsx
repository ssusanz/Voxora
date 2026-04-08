import { View, StyleSheet, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface CatAvatarProps {
  size?: number;
  mood?: 'happy' | 'sleepy' | 'excited' | 'hungry';
}

// 金渐层猫咪图片 - 英短金渐层
const CAT_IMAGES = {
  happy: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop&crop=face',
  sleepy: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=200&h=200&fit=crop&crop=face',
  excited: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&h=200&fit=crop&crop=face',
  hungry: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop&crop=face',
};

export function CatAvatar({ size = 60, mood = 'happy' }: CatAvatarProps) {
  // 呼吸动画
  const breathe = useSharedValue(0);
  
  // 眨眼动画
  const blink = useSharedValue(0);
  
  // 尾巴摇摆
  const tailWag = useSharedValue(0);

  useEffect(() => {
    // 呼吸动画 - 缓慢的上下浮动
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 眨眼动画 - 随机眨眼
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 5000;
      setTimeout(() => {
        blink.value = withSequence(
          withTiming(1, { duration: 120 }),
          withTiming(0, { duration: 120 })
        );
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();

    // 尾巴摇摆
    tailWag.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // 猫咪容器动画
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + breathe.value * 0.04 },
      { translateY: breathe.value * -2 },
    ],
  }));

  // 尾巴动画
  const tailStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${tailWag.value * 12}deg` },
    ],
  }));

  // 眨眼动画
  const eyeStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: 1 - blink.value * 0.9 },
    ],
  }));

  const catImage = CAT_IMAGES[mood];
  const bodySize = size * 0.95;

  // 心情对应的光晕颜色
  const getGlowColor = () => {
    switch (mood) {
      case 'happy': return 'rgba(255, 183, 77, 0.4)';
      case 'excited': return 'rgba(255, 123, 138, 0.4)';
      case 'sleepy': return 'rgba(144, 202, 249, 0.4)';
      case 'hungry': return 'rgba(76, 175, 80, 0.4)';
      default: return 'rgba(255, 183, 77, 0.4)';
    }
  };

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, containerStyle]}>
      {/* 外层光晕 */}
      <View style={[styles.outerGlow, { 
        width: size * 1.4, 
        height: size * 1.4,
        borderRadius: size * 0.7,
        backgroundColor: getGlowColor(),
      }]} />
      
      {/* 内层光晕 */}
      <View style={[styles.innerGlow, { 
        width: size * 1.15, 
        height: size * 1.15,
        borderRadius: size * 0.575,
        backgroundColor: getGlowColor(),
      }]} />
      
      {/* 猫咪身体 */}
      <View style={[styles.catBody, { 
        width: bodySize, 
        height: bodySize, 
        borderRadius: bodySize * 0.5,
      }]}>
        {/* 左耳 */}
        <View style={[styles.ear, styles.leftEar, { 
          width: size * 0.28, 
          height: size * 0.32,
        }]}>
          <View style={[styles.earInner, { 
            width: size * 0.14, 
            height: size * 0.16,
          }]} />
        </View>
        
        {/* 右耳 */}
        <View style={[styles.ear, styles.rightEar, { 
          width: size * 0.28, 
          height: size * 0.32,
        }]}>
          <View style={[styles.earInner, { 
            width: size * 0.14, 
            height: size * 0.16,
          }]} />
        </View>
        
        {/* 猫咪图片 */}
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: catImage }}
            style={[styles.catImage, { 
              width: bodySize * 0.92, 
              height: bodySize * 0.92,
              borderRadius: bodySize * 0.46,
            }]}
            resizeMode="cover"
          />
          
          {/* 眨眼遮罩 */}
          <Animated.View style={[styles.blinkOverlay, eyeStyle, { 
            width: bodySize * 0.92, 
            height: bodySize * 0.92,
            borderRadius: bodySize * 0.46,
          }]}>
            <View style={[styles.eyeLeft, {
              left: bodySize * 0.22,
              top: bodySize * 0.32,
            }]} />
            <View style={[styles.eyeRight, {
              right: bodySize * 0.22,
              top: bodySize * 0.32,
            }]} />
          </Animated.View>
        </View>
        
        {/* 腮红 */}
        <View style={[styles.blush, styles.leftBlush, { 
          left: bodySize * 0.05,
          top: bodySize * 0.5,
        }]} />
        <View style={[styles.blush, styles.rightBlush, { 
          right: bodySize * 0.05,
          top: bodySize * 0.5,
        }]} />
      </View>
      
      {/* 尾巴 */}
      <Animated.View style={[styles.tail, tailStyle, { 
        right: -size * 0.08,
        bottom: size * 0.25,
        width: size * 0.18,
        height: size * 0.45,
        borderRadius: size * 0.09,
      }]} />
      
      {/* 装饰粒子 - 根据心情显示 */}
      {mood === 'happy' && (
        <>
          <View style={[styles.particle, { top: -3, left: size * 0.15 }]} />
          <View style={[styles.particle, { top: size * 0.2, right: -3 }]} />
          <View style={[styles.particle, { bottom: -3, left: size * 0.3 }]} />
        </>
      )}
      
      {mood === 'excited' && (
        <>
          <View style={[styles.particle, styles.particleActive, { top: -5, left: size * 0.1 }]} />
          <View style={[styles.particle, styles.particleActive, { top: size * 0.15, right: -5 }]} />
          <View style={[styles.particle, styles.particleActive, { bottom: -5, right: size * 0.1 }]} />
        </>
      )}
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
    opacity: 0.5,
  },
  innerGlow: {
    position: 'absolute',
    opacity: 0.7,
  },
  catBody: {
    backgroundColor: '#FFE4B5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  ear: {
    position: 'absolute',
    top: -6,
    backgroundColor: '#FFE4B5',
    zIndex: 1,
  },
  leftEar: {
    left: '12%',
    transform: [{ rotate: '-18deg' }],
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 6,
  },
  rightEar: {
    right: '12%',
    transform: [{ rotate: '18deg' }],
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 12,
  },
  earInner: {
    position: 'absolute',
    bottom: 3,
    left: '50%',
    marginLeft: -7,
    backgroundColor: '#FFB6C1',
    borderRadius: 6,
  },
  imageWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catImage: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  blinkOverlay: {
    position: 'absolute',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  eyeLeft: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FFE4B5',
    borderRadius: 3,
  },
  eyeRight: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FFE4B5',
    borderRadius: 3,
  },
  blush: {
    position: 'absolute',
    width: 10,
    height: 6,
    backgroundColor: '#FFB6C1',
    borderRadius: 3,
    opacity: 0.45,
  },
  leftBlush: {},
  rightBlush: {},
  tail: {
    position: 'absolute',
    backgroundColor: '#FFE4B5',
    transformOrigin: 'top center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FFD700',
    borderRadius: 3,
    opacity: 0.6,
  },
  particleActive: {
    width: 8,
    height: 8,
    opacity: 0.8,
  },
});
