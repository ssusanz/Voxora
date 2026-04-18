import { Screen } from '@/components/Screen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  Share,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useToast } from '@/hooks/useToast';
import { getBackendBaseUrl } from '@/utils/backend';
import { useMemoryDisplayText } from '@/hooks/useMemoryDisplayText';

// 回忆数据接口
interface Memory {
  id: string;
  title: string;
  coverImage: string;
  date: string;
  location: string;
}

function isHttpImageUri(uri: string): boolean {
  const u = typeof uri === 'string' ? uri.trim() : '';
  return /^https?:\/\//i.test(u);
}

/** 分享用：相对路径拼后端 origin，已是 http(s) 则原样返回 */
function absoluteVlogVideoUrl(raw: string | null | undefined): string | null {
  const u = typeof raw === 'string' ? raw.trim() : '';
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const base = getBackendBaseUrl().replace(/\/$/, '');
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${base}${path}`;
}

/** 避免 `source.uri` 为空触发 RN / expo-image 告警 */
function MemoryCoverThumb({ uri, style }: { uri: string; style: StyleProp<ImageStyle> }) {
  if (!isHttpImageUri(uri)) {
    return (
      <View style={[style, styles.coverPlaceholder]}>
        <Ionicons name="image-outline" size={26} color="#BBB" />
      </View>
    );
  }
  return <Image source={{ uri: uri.trim() }} style={style} />;
}

function VlogMemoryListItem({
  item,
  selected,
  onPress,
}: {
  item: Memory;
  selected: boolean;
  onPress: () => void;
}) {
  const { title, location } = useMemoryDisplayText(item);
  const metaLine = location ? `${item.date} · ${location}` : item.date;
  return (
    <TouchableOpacity
      style={[styles.memoryItem, selected && styles.memoryItemSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MemoryCoverThumb uri={item.coverImage} style={styles.memoryImage} />
      <View style={styles.memoryInfo}>
        <Text style={styles.memoryTitle}>{title}</Text>
        <Text style={styles.memoryMeta}>{metaLine}</Text>
      </View>
      <View style={[styles.checkIcon, selected && styles.checkIconSelected]}>
        {selected && <Ionicons name="checkmark" size={20} color="#FFF" />}
      </View>
    </TouchableOpacity>
  );
}

function VlogPreviewItem({
  memory,
  index,
  onRemove,
}: {
  memory: Memory;
  index: number;
  onRemove: () => void;
}) {
  const { title } = useMemoryDisplayText(memory);
  return (
    <View style={styles.previewItem}>
      <Text style={styles.previewIndex}>{index + 1}</Text>
      <MemoryCoverThumb uri={memory.coverImage} style={styles.previewImage} />
      <Text style={styles.previewItemTitle} numberOfLines={1}>
        {title}
      </Text>
      <TouchableOpacity
        style={styles.previewRemove}
        onPress={onRemove}
      >
        <Ionicons name="close-circle" size={20} color="#999" />
      </TouchableOpacity>
    </View>
  );
}

/** 使用 expo-video，避免 expo-av Video 弃用警告 */
function VlogResultVideoView({
  uri,
  formatDurationLine,
}: {
  uri: string;
  formatDurationLine: (secondsRounded: number) => string;
}) {
  const player = useVideoPlayer(uri);
  const [durationSec, setDurationSec] = useState(0);

  useEffect(() => {
    const sync = () => {
      if (player.duration > 0) {
        setDurationSec(Math.round(player.duration));
      }
    };
    sync();
    const sub = player.addListener('statusChange', sync);
    return () => sub.remove();
  }, [player, uri]);

  return (
    <View style={styles.videoContainer}>
      <VideoView style={styles.video} player={player} nativeControls contentFit="contain" />
      {durationSec > 0 ? (
        <Text style={styles.videoDuration}>{formatDurationLine(durationSec)}</Text>
      ) : null}
    </View>
  );
}

export default function VlogScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { showSuccess, showError, showInfo } = useToast();
  const { t, i18n } = useTranslation();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [selectedMemories, setSelectedMemories] = useState<Memory[]>([]);
  const [vlogTitle, setVlogTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  /** 服务端返回或用户填写的标题，用于系统分享文案 */
  const [generatedShareTitle, setGeneratedShareTitle] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);

  const formatDurationLine = useCallback(
    (secondsRounded: number) =>
      `${t('vlog.duration')}: ${secondsRounded}${t('common.seconds')}`,
    [t]
  );

  const fetchMemories = useCallback(async () => {
    try {
      setListLoading(true);
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/memories?limit=80`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error('load memories failed');
      }
      const mapped: Memory[] = (result.data || []).map((item: Record<string, unknown>) => {
        const imgs = Array.isArray(item.images) ? item.images : [];
        const firstHttp = imgs.find(
          (x) => typeof x === 'string' && /^https?:\/\//i.test(x as string)
        ) as string | undefined;
        const cover =
          (typeof item.cover_image === 'string' && item.cover_image) || firstHttp || '';
        return {
          id: String(item.id ?? ''),
          title: String(item.title ?? ''),
          coverImage: cover,
          date: String(item.date ?? item.created_at ?? ''),
          location: String(item.location ?? ''),
        };
      });
      setMemories(mapped.filter((m) => m.id));
    } catch (e) {
      console.error('Vlog 页加载回忆失败:', e);
      setMemories([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchMemories();
    }, [fetchMemories])
  );

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
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/vlogs/generate`, {
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
        const errBody = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        const code = typeof errBody.error === 'string' ? errBody.error : '';
        const msg =
          code === 'VLOG_GENERATION_DISABLED'
            ? t('vlog.generationNotConfigured')
            : code === 'VLOG_FFMPEG_MISSING'
              ? t('vlog.ffmpegMissing')
              : code === 'VLOG_NO_IMAGES'
                ? t('vlog.noImagesForVlog')
                : code === 'VLOG_RENDER_FAILED' && typeof errBody.message === 'string'
                  ? errBody.message
                  : (typeof errBody.message === 'string' && errBody.message) ||
                    (typeof errBody.error === 'string' && errBody.error) ||
                    t('vlog.generateFailed');
        if (response.status >= 500 && response.status !== 501) {
          console.warn('生成Vlog失败:', msg);
        }
        showError(msg);
        return;
      }

      const data = (await response.json()) as {
        videoUrl?: string;
        title?: string;
      };
      setGeneratedVideoUrl(typeof data.videoUrl === 'string' ? data.videoUrl : null);
      const apiTitle = typeof data.title === 'string' ? data.title.trim() : '';
      const userTitle = vlogTitle.trim();
      setGeneratedShareTitle(apiTitle || userTitle || t('vlog.memoryTitle'));
      setShowResultModal(true);
      showSuccess(t('vlog.generated'));
    } catch (error: any) {
      console.error('生成Vlog失败:', error);
      showError(error?.message || t('vlog.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  }, [selectedMemories, vlogTitle, t, showError, showInfo, showSuccess]);

  const handleShareVlog = useCallback(async () => {
    const absolute = absoluteVlogVideoUrl(generatedVideoUrl);
    if (!absolute) {
      showError(t('vlog.shareNoUrl'));
      return;
    }
    const title = generatedShareTitle.trim() || t('vlog.memoryTitle');
    const body = t('vlog.shareMessage', { title, url: absolute });

    try {
      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (nav && typeof nav.share === 'function') {
          try {
            await nav.share({ title, text: body, url: absolute });
            return;
          } catch (e: unknown) {
            const name =
              e && typeof e === 'object' && 'name' in e ? String((e as { name?: string }).name) : '';
            if (name === 'AbortError') return;
          }
        }
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(absolute);
          showSuccess(t('vlog.linkCopied'));
          return;
        }
        showError(t('vlog.shareFailed'));
        return;
      }

      const content =
        Platform.OS === 'ios'
          ? { title, message: body, url: absolute }
          : { title, message: body };

      await Share.share(content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (/cancel|abort|dismiss|User did not share/i.test(msg)) return;
      showError(t('vlog.shareFailed'));
    }
  }, [generatedVideoUrl, generatedShareTitle, t, showError, showSuccess]);

  const isMemorySelected = (memoryId: string) => {
    return selectedMemories.some(m => m.id === memoryId);
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

          {listLoading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color="#7C6AFF" />
          ) : memories.length === 0 ? (
            <Text style={styles.emptyListHint}>{t('vlog.emptyMemoryList')}</Text>
          ) : (
            <FlatList
              data={memories}
              extraData={i18n.language}
              renderItem={({ item }) => (
                <VlogMemoryListItem
                  item={item}
                  selected={isMemorySelected(item.id)}
                  onPress={() => toggleMemorySelection(item)}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
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
                <VlogPreviewItem
                  key={memory.id}
                  memory={memory}
                  index={index}
                  onRemove={() => toggleMemorySelection(memory)}
                />
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

            {generatedVideoUrl?.trim() ? (
              <VlogResultVideoView
                key={generatedVideoUrl}
                uri={generatedVideoUrl.trim()}
                formatDurationLine={formatDurationLine}
              />
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
                style={[styles.resultButton, !generatedVideoUrl?.trim() && styles.resultButtonDisabled]}
                onPress={() => void handleShareVlog()}
                disabled={!generatedVideoUrl?.trim()}
              >
                <Ionicons name="share-social" size={20} color="#FFF" style={styles.shareIcon} />
                <Text style={styles.resultButtonText}>{t('vlog.share')}</Text>
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
  emptyListHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 20,
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
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEFEF',
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
  resultButtonDisabled: {
    opacity: 0.45,
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
