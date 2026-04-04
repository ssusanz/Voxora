import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';

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

export default function HomeScreen() {
  const router = useSafeRouter();
  const { t, language, toggleLanguage } = useLanguage();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMemories = async () => {
    try {
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：GET /api/v1/memories
       * 无参数
       */
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memories`);
      const result = await response.json();
      if (result.success) {
        setMemories(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMemories();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMemories();
  };

  const handleMemoryPress = (memory: Memory) => {
    router.push('/memory-detail', { id: memory.id });
  };

  const handleAddMemory = () => {
    router.push('/add-memory');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Screen style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B6EF6" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {/* 极光背景 */}
      <LinearGradient
        colors={['rgba(123,110,246,0.15)', 'rgba(92,224,216,0.08)', 'transparent']}
        style={styles.auroraBackground}
      />

      {/* 标题区域 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>{t.appName}</Text>
            <Text style={styles.subtitle}>{t.home.subtitle}</Text>
          </View>
          {/* 语言切换按钮 */}
          <TouchableOpacity
            style={styles.languageButton}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(123,110,246,0.3)', 'rgba(92,224,216,0.2)']}
              style={styles.languageButtonGradient}
            >
              <Feather 
                name="globe" 
                size={16} 
                color="#EEEAF6" 
                style={{ marginRight: 6 }}
              />
              <Text style={styles.languageButtonText}>
                {t.language.switchTo}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* 时间轴 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7B6EF6"
          />
        }
      >
        {memories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="heart" size={64} color="rgba(123,110,246,0.3)" />
            <Text style={styles.emptyText}>{t.home.emptyTitle}</Text>
            <Text style={styles.emptySubtext}>{t.home.emptySubtitle}</Text>
          </View>
        ) : (
          memories.map((memory, index) => (
            <View key={memory.id} style={styles.timelineItem}>
              {/* 时间轴线 */}
              <View style={styles.timelineLeft}>
                <View style={styles.timelineDot}>
                  <LinearGradient
                    colors={['#7B6EF6', '#5CE0D8']}
                    style={styles.timelineDotGradient}
                  />
                </View>
                {index < memories.length - 1 && <View style={styles.timelineLine} />}
              </View>

              {/* 回忆卡片 */}
              <TouchableOpacity
                style={styles.memoryCard}
                onPress={() => handleMemoryPress(memory)}
                activeOpacity={0.8}
              >
                {/* 照片 */}
                {memory.media_urls && memory.media_urls.length > 0 && (
                  <Image
                    source={{ uri: memory.media_urls[0] }}
                    style={styles.memoryImage}
                    resizeMode="cover"
                  />
                )}

                {/* 内容 */}
                <View style={styles.memoryContent}>
                  <Text style={styles.memoryTitle} numberOfLines={2}>
                    {memory.title}
                  </Text>
                  <View style={styles.memoryMeta}>
                    <Feather name="calendar" size={12} color="#8E8BA3" />
                    <Text style={styles.memoryMetaText}>
                      {formatDate(memory.memory_date)}
                    </Text>
                    {memory.location && (
                      <>
                        <Feather name="map-pin" size={12} color="#8E8BA3" style={{ marginLeft: 12 }} />
                        <Text style={styles.memoryMetaText}>{memory.location}</Text>
                      </>
                    )}
                  </View>
                  {(memory.weather || memory.mood) && (
                    <View style={styles.memoryTags}>
                      {memory.weather && (
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{memory.weather}</Text>
                        </View>
                      )}
                      {memory.mood && (
                        <View style={[styles.tag, { backgroundColor: 'rgba(242,167,224,0.15)' }]}>
                          <Text style={[styles.tagText, { color: '#F2A7E0' }]}>{memory.mood}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 悬浮添加按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddMemory}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#7B6EF6', '#5CE0D8']}
          style={styles.fabGradient}
        >
          <Feather name="plus" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1026',
  },
  auroraBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#EEEAF6',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8BA3',
    marginTop: 4,
    letterSpacing: 1,
  },
  languageButton: {
    shadowColor: '#7B6EF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  languageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  languageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EEEAF6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8BA3',
    marginTop: 20,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B6880',
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#7B6EF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineDotGradient: {
    width: '100%',
    height: '100%',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(123,110,246,0.2)',
    marginTop: 8,
  },
  memoryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#7B6EF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  memoryImage: {
    width: '100%',
    height: 180,
  },
  memoryContent: {
    padding: 20,
  },
  memoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EEEAF6',
    marginBottom: 8,
    lineHeight: 24,
  },
  memoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memoryMetaText: {
    fontSize: 12,
    color: '#8E8BA3',
    marginLeft: 4,
  },
  memoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(92,224,216,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#5CE0D8',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    shadowColor: '#7B6EF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
