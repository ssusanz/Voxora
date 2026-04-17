import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useToast } from '@/hooks/useToast';

// 回忆数据接口
interface Memory {
  id: string;
  title: string;
  coverImage: string;
  date: string;
  location: string;
}

// 模拟数据
const mockMemories: Memory[] = [
  {
    id: '1',
    title: '家庭聚餐',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    date: '2024-12-25',
    location: '北京·外婆家',
  },
  {
    id: '2',
    title: '周末郊游',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    date: '2024-12-20',
    location: '颐和园',
  },
  {
    id: '3',
    title: '宝宝周岁',
    coverImage: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800',
    date: '2024-12-15',
    location: '北京·外婆家',
  },
  {
    id: '4',
    title: '生日派对',
    coverImage: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800',
    date: '2024-12-10',
    location: '家中',
  },
];

export default function VlogScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { showSuccess, showError, showInfo } = useToast();
  const { t } = useTranslation();

  const [selectedMemories, setSelectedMemories] = useState<Memory[]>([]);
  const [vlogTitle, setVlogTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);

  const handleVideoPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    setVideoStatus(status);
  };

  const toggleMemorySelection = useCallback((memory: Memory) => {
    setSelectedMemories(prev => {
      const isSelected = prev.some(m => m.id === memory.id);
      if (isSelected) {
        return prev.filter(m => m.id !== memory.id);
      } else {
        return [...prev, memory];
      }
    });
  }, []);

  const handleGenerateVlog = useCallback(async () => {
    if (selectedMemories.length === 0) {
      showInfo(t('vlog.selectAtLeastOne'));
      return;
    }

    setIsGenerating(true);
    try {
      /**
       * 服务端文件：server/src/routes/vlogs.ts
       * 接口：POST /api/v1/vlogs/generate
       * Body 参数：memoryIds: string[], title: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/vlogs/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memoryIds: selectedMemories.map(m => m.id),
          title: vlogTitle || t('vlog.memoryTitle'),
        }),
      });

      if (!response.ok) {
        throw new Error('生成Vlog失败');
      }

      const data = await response.json();
      setGeneratedVideoUrl(data.videoUrl);
      setShowResultModal(true);
    } catch (error) {
      console.error('生成Vlog失败:', error);
      showError(t('vlog.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  }, [selectedMemories, vlogTitle]);

  const isMemorySelected = (memoryId: string) => {
    return selectedMemories.some(m => m.id === memoryId);
  };

  const renderMemoryItem = ({ item }: { item: Memory }) => {
    const selected = isMemorySelected(item.id);
    return (
      <TouchableOpacity
        style={[styles.memoryItem, selected && styles.memoryItemSelected]}
        onPress={() => toggleMemorySelection(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.coverImage }}
          style={styles.memoryImage}
        />
        <View style={styles.memoryInfo}>
          <Text style={styles.memoryTitle}>{item.title}</Text>
          <Text style={styles.memoryMeta}>{item.date} · {item.location}</Text>
        </View>
        <View style={[styles.checkIcon, selected && styles.checkIconSelected]}>
          {selected && <Ionicons name="checkmark" size={20} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部导航 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('vlog.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 说明文字 */}
        <View style={styles.introSection}>
          <View style={[styles.introIcon, { backgroundColor: 'rgba(124, 106, 255, 0.15)' }]}>
            <Ionicons name="information-circle" size={24} color="#7C6AFF" />
          </View>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>{t('vlog.selectMemories')}</Text>
            <Text style={styles.introDesc}>{t('vlog.introDesc')}</Text>
          </View>
        </View>

        {/* Vlog标题输入 */}
        <View style={styles.titleSection}>
          <Text style={styles.sectionLabel}>{t('vlog.vlogTitle')}</Text>
          <TextInput
            style={styles.titleInput}
            placeholder={t('vlog.enterTitle')}
            placeholderTextColor="#CCC"
            value={vlogTitle}
            onChangeText={setVlogTitle}
            maxLength={50}
          />
        </View>

        {/* 回忆列表 */}
        <View style={styles.memoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('vlog.selectMemories')}</Text>
            <Text style={styles.selectedCount}>
              {t('vlog.selectedCount', { count: selectedMemories.length })}
            </Text>
          </View>

          <FlatList
            data={mockMemories}
            renderItem={renderMemoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* 生成按钮 */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            selectedMemories.length === 0 && styles.generateButtonDisabled,
            isGenerating && styles.generateButtonLoading,
          ]}
          onPress={handleGenerateVlog}
          disabled={selectedMemories.length === 0 || isGenerating}
        >
          {isGenerating ? (
            <>
              <Ionicons name="hourglass-outline" size={22} color="#FFF" />
              <Text style={styles.generateButtonText}>{t('vlog.generating')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="videocam" size={22} color="#FFF" />
              <Text style={styles.generateButtonText}>
                {t('vlog.generate')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* 已选择的回忆预览 */}
        {selectedMemories.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>{t('vlog.selectMemories')}</Text>
            <View style={styles.previewList}>
              {selectedMemories.map((memory, index) => (
                <View key={memory.id} style={styles.previewItem}>
                  <Text style={styles.previewIndex}>{index + 1}</Text>
                  <Image
                    source={{ uri: memory.coverImage }}
                    style={styles.previewImage}
                  />
                  <Text style={styles.previewItemTitle} numberOfLines={1}>
                    {memory.title}
                  </Text>
                  <TouchableOpacity
                    style={styles.previewRemove}
                    onPress={() => toggleMemorySelection(memory)}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 结果弹窗 */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.resultOverlay}>
          <View style={styles.resultModal}>
            <View style={styles.resultHeader}>
              <View style={[styles.resultIcon, { backgroundColor: 'rgba(124, 106, 255, 0.15)' }]}>
                <Ionicons name="checkmark-circle" size={40} color="#7C6AFF" />
              </View>
              <Text style={styles.resultTitle}>{t('vlog.generated')}</Text>
            </View>

            {generatedVideoUrl ? (
              <View style={styles.videoContainer}>
                <Video
                  source={{ uri: generatedVideoUrl }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  onPlaybackStatusUpdate={handleVideoPlaybackStatusUpdate}
                />
                {videoStatus && videoStatus.isLoaded && (
                  <Text style={styles.videoDuration}>
                    {t('vlog.generating')}: {videoStatus.durationMillis ? `${Math.round(videoStatus.durationMillis / 1000)}${t('common.seconds') || '秒'}` : t('common.loading')}
                  </Text>
                )}
              </View>
            ) : (
              <ActivityIndicator size="large" color="#7C6AFF" />
            )}

            <Text style={styles.resultDesc}>{t('vlog.resultDesc')}</Text>

            <View style={styles.resultButtons}>
              <TouchableOpacity
                style={[styles.resultButton, styles.resultButtonSecondary]}
                onPress={() => setShowResultModal(false)}
              >
                <Text style={styles.resultButtonTextSecondary}>{t('vlog.back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resultButton}
                onPress={() => {
                  showInfo(t('vlog.shareDev'));
                }}
              >
                <Ionicons name="share-social" size={20} color="#FFF" style={styles.shareIcon} />
                <Text style={styles.resultButtonText}>分享</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F8FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  introSection: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  introText: {
    flex: 1,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  introDesc: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  titleSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 15,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memoriesSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedCount: {
    fontSize: 14,
    color: '#7C6AFF',
    fontWeight: '500',
  },
  memoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memoryItemSelected: {
    backgroundColor: 'rgba(124, 106, 255, 0.05)',
    borderColor: '#7C6AFF',
  },
  memoryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  memoryInfo: {
    flex: 1,
  },
  memoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  memoryMeta: {
    fontSize: 13,
    color: '#999',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconSelected: {
    backgroundColor: '#7C6AFF',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C6AFF',
    borderRadius: 24,
    paddingVertical: 16,
    marginBottom: 16,
  },
  generateButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  generateButtonLoading: {
    backgroundColor: '#9D91FF',
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  previewSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewItem: {
    width: 80,
    alignItems: 'center',
    marginBottom: 12,
    marginRight: 12,
  },
  previewIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C6AFF',
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 4,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  previewItemTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  previewRemove: {
    padding: 2,
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  resultModal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoDuration: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  resultDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  resultButton: {
    flex: 1,
    backgroundColor: '#7C6AFF',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resultButtonSecondary: {
    backgroundColor: '#F8F8FA',
    flex: 1,
  },
  resultButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },
  resultButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  shareIcon: {
    marginRight: 4,
  },
});
