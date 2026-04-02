import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

interface Memory {
  id: number;
  title: string;
  memory_date: string;
  location: string | null;
  weather: string | null;
  mood: string | null;
  media_urls: string[];
  audio_url: string | null;
}

export default function MemoryDetailScreen() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: number }>();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const videoRef = useRef<Video>(null);

  // 动画值
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(100);
  const islandScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    fetchMemory();
  }, [id]);

  useEffect(() => {
    if (memory) {
      startAnimation();
    }
  }, [memory]);

  useEffect(() => {
    return () => {
      // 清理音频
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const fetchMemory = async () => {
    try {
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：GET /api/v1/memories/:id
       * Path 参数：id: number
       */
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memories/${id}`);
      const result = await response.json();
      if (result.success) {
        setMemory(result.data);
      }
    } catch (error) {
      console.error('获取回忆详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAnimation = () => {
    // 穿梭效果
    scale.value = withSequence(
      withTiming(20, { duration: 600, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) })
    );

    opacity.value = withDelay(800, withTiming(1, { duration: 400 }));

    translateY.value = withDelay(800, withSpring(0, { damping: 15, stiffness: 100 }));

    // 灵动岛动画
    islandScale.value = withDelay(
      1000,
      withSpring(1, { damping: 12, stiffness: 120 })
    );

    // 内容显示
    contentOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));

    // 标记动画完成
    setTimeout(() => setAnimationComplete(true), 1500);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: contentOpacity.value,
  }));

  const islandStyle = useAnimatedStyle(() => ({
    transform: [{ scale: islandScale.value }],
  }));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const handlePlayAudio = async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else if (memory?.audio_url) {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: memory.audio_url },
            { shouldPlay: true }
          );
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
            }
          });
        } else {
          await soundRef.current.playAsync();
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('播放音频失败:', error);
    }
  };

  if (loading) {
    return (
      <Screen style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B6EF6" />
          <Text style={styles.loadingText}>加载回忆中...</Text>
        </View>
      </Screen>
    );
  }

  if (!memory) {
    return (
      <Screen style={styles.container}>
        <View style={styles.loadingContainer}>
          <Feather name="alert-circle" size={48} color="#8E8BA3" />
          <Text style={styles.loadingText}>回忆不存在</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {/* 穿梭背景 */}
      <Animated.View style={[styles.tunnelBackground, animatedStyle]}>
        <LinearGradient
          colors={['#7B6EF6', '#5CE0D8', '#F2A7E0']}
          style={styles.tunnelGradient}
        />
      </Animated.View>

      {/* 灵动岛 */}
      <Animated.View style={[styles.island, islandStyle]}>
        <View style={styles.islandContent}>
          {/* 音频控制 */}
          {memory.audio_url && (
            <TouchableOpacity
              style={styles.islandButton}
              onPress={handlePlayAudio}
            >
              <LinearGradient
                colors={['#7B6EF6', '#5CE0D8']}
                style={styles.islandButtonGradient}
              >
                <Feather
                  name={isPlaying ? 'pause' : 'play'}
                  size={16}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* 天气 */}
          {memory.weather && (
            <View style={styles.islandTag}>
              <Feather name="cloud" size={14} color="#5CE0D8" />
              <Text style={styles.islandTagText}>{memory.weather}</Text>
            </View>
          )}

          {/* 心情 */}
          {memory.mood && (
            <View style={[styles.islandTag, { backgroundColor: 'rgba(242,167,224,0.15)' }]}>
              <MaterialCommunityIcons name="heart" size={14} color="#F2A7E0" />
              <Text style={[styles.islandTagText, { color: '#F2A7E0' }]}>{memory.mood}</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* 内容区域 */}
      <Animated.ScrollView
        style={[styles.scrollView, contentStyle]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 标题区域 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="#EEEAF6" />
          </TouchableOpacity>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{memory.title}</Text>
          <View style={styles.metaContainer}>
            <Feather name="calendar" size={14} color="#8E8BA3" />
            <Text style={styles.metaText}>{formatDate(memory.memory_date)}</Text>
          </View>
          {memory.location && (
            <View style={styles.metaContainer}>
              <Feather name="map-pin" size={14} color="#8E8BA3" />
              <Text style={styles.metaText}>{memory.location}</Text>
            </View>
          )}
        </View>

        {/* 媒体内容 */}
        <View style={styles.mediaContainer}>
          {memory.media_urls.map((url, index) => {
            // 判断是图片还是视频
            const isVideo = url.includes('.mp4') || url.includes('.mov');

            if (isVideo) {
              return (
                <View key={index} style={styles.mediaItem}>
                  <Video
                    ref={videoRef}
                    source={{ uri: url }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    useNativeControls
                    isLooping
                  />
                </View>
              );
            }

            return (
              <View key={index} style={styles.mediaItem}>
                <Image
                  source={{ uri: url }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>
            );
          })}
        </View>

        {/* 底部留白 */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1026',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8BA3',
    marginTop: 12,
    fontSize: 14,
  },
  tunnelBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tunnelGradient: {
    width: '100%',
    height: '100%',
  },
  island: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  islandContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#7B6EF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  islandButton: {
    shadowColor: '#7B6EF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  islandButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92,224,216,0.12)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  islandTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5CE0D8',
  },
  scrollView: {
    flex: 1,
    marginTop: 120,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EEEAF6',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#8E8BA3',
    marginLeft: 8,
  },
  mediaContainer: {
    gap: 16,
  },
  mediaItem: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#7B6EF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 300,
  },
  video: {
    width: '100%',
    height: 300,
  },
});
