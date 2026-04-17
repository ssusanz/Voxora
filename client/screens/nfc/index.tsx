import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useToast } from '@/hooks/useToast';

const nfcIcon = Platform.OS === 'ios' ? 'hardware-chip' : 'hardware-chip-outline';

// 家庭 NFC 标签类型
interface NFCTag {
  id: string;
  name: string;
  location: string;
  linkedMemoryId?: string;
  emotion?: string;
  emotionColor?: string;
  lastUsed?: Date;
}

// 模拟 NFC 标签数据
const mockTags: NFCTag[] = [
  { id: '1', name: '客厅照片墙', location: '客厅', emotion: 'joy', emotionColor: '#FFD700' },
  { id: '2', name: '厨房冰箱', location: '厨房', emotion: 'love', emotionColor: '#FF5252' },
  { id: '3', name: '卧室床头柜', location: '主卧', emotion: 'calm', emotionColor: '#81C784' },
  { id: '4', name: '书房书架', location: '书房', emotion: 'gratitude', emotionColor: '#FFB74D' },
];

// 模拟最近交互
interface NFCInteraction {
  id: string;
  tagName: string;
  tagLocation: string;
  action: 'read' | 'write';
  emotion?: string;
  emotionColor?: string;
  timestamp: Date;
}

const mockInteractions: NFCInteraction[] = [
  { id: '1', tagName: '客厅照片墙', tagLocation: '客厅', action: 'read', emotion: 'joy', emotionColor: '#FFD700', timestamp: new Date(Date.now() - 10 * 60000) },
  { id: '2', tagName: '厨房冰箱', tagLocation: '厨房', action: 'write', emotion: 'love', emotionColor: '#FF5252', timestamp: new Date(Date.now() - 2 * 60 * 60000) },
];

// 扫描动画组件
function ScanAnimation({ isScanning }: { isScanning: boolean }) {
  const scanLineY = useSharedValue(0);

  useState(() => {
    if (isScanning) {
      scanLineY.value = withRepeat(
        withTiming(200, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  });

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  if (!isScanning) return null;

  return (
    <View style={styles.scanAnimationContainer}>
      <Animated.View style={[styles.scanLine, scanLineStyle]} />
      <View style={styles.scanCorners}>
        <View style={[styles.scanCorner, styles.scanCornerTL]} />
        <View style={[styles.scanCorner, styles.scanCornerTR]} />
        <View style={[styles.scanCorner, styles.scanCornerBL]} />
        <View style={[styles.scanCorner, styles.scanCornerBR]} />
      </View>
    </View>
  );
}

export default function NFCScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { showSuccess, showError, showInfo } = useToast();
  const { t } = useTranslation();
  
  const [isScanning, setIsScanning] = useState(false);
  const [tags] = useState<NFCTag[]>(mockTags);
  const [interactions] = useState<NFCInteraction[]>(mockInteractions);
  const [selectedTag, setSelectedTag] = useState<NFCTag | null>(null);

  // 开始扫描
  const handleStartScan = useCallback(async () => {
    if (Platform.OS === 'web') {
      showInfo(t('nfc.webNotSupported'));
      return;
    }

    setIsScanning(true);
    
    // 模拟扫描过程
    setTimeout(() => {
      setIsScanning(false);
      // 随机选择一个标签模拟发现
      const randomTag = tags[Math.floor(Math.random() * tags.length)];
      setSelectedTag(randomTag);
    }, 3000);
  }, [tags, showInfo, t]);

  // 写入情感到标签
  const handleWriteEmotion = useCallback((tag: NFCTag, emotion: string, color: string) => {
    console.log(`写入情感 ${emotion} 到标签 ${tag.name}`);
    setSelectedTag(null);
  }, []);

  // 格式化时间
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('family.justNow');
    if (minutes < 60) return t('family.minutesAgo', { minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('family.hoursAgo', { hours });
    return t('family.daysAgo', { days: Math.floor(hours / 24) });
  };

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nfc.title')}</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* NFC 扫描区 */}
        <Animated.View entering={FadeIn} style={styles.scanSection}>
          <View style={styles.scanContainer}>
            {/* 扫描动画 */}
            <ScanAnimation isScanning={isScanning} />
            
            {/* NFC 图标 */}
            <View style={styles.nfcIconContainer}>
              <View style={[styles.nfcCircle, isScanning && styles.nfcCircleActive]}>
                <Ionicons 
                  name={nfcIcon as any} 
                  size={48} 
                  color={isScanning ? '#7C6AFF' : '#CCC'} 
                />
              </View>
              {isScanning && (
                <View style={styles.nfcRings}>
                  <View style={styles.nfcRing} />
                  <View style={[styles.nfcRing, styles.nfcRing2]} />
                </View>
              )}
            </View>
            
            {/* 扫描按钮 */}
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonActive]}
              onPress={handleStartScan}
              disabled={isScanning}
            >
              <Ionicons 
                name={isScanning ? 'scan' : 'radio-button-on'} 
                size={20} 
                color="#FFF" 
              />
              <Text style={styles.scanButtonText}>
                {isScanning ? t('nfc.scanning') : t('nfc.startScan')}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.scanHint}>
              将手机靠近家庭 NFC 标签，触碰即可记录情感或查看回忆
            </Text>
          </View>
        </Animated.View>

        {/* 标签列表 */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('nfc.myTags')}</Text>
          <Text style={styles.sectionSubtitle}>
            将情感写入物理空间，让回忆触手可及
          </Text>
          
          <View style={styles.tagList}>
            {tags.map((tag, index) => (
              <Animated.View 
                key={tag.id}
                entering={FadeInDown.delay(index * 80)}
                style={styles.tagCard}
              >
                <TouchableOpacity 
                  style={styles.tagContent}
                  onPress={() => setSelectedTag(tag)}
                >
                  <View style={[styles.tagIcon, { backgroundColor: `${tag.emotionColor}20` }]}>
                    <Ionicons 
                      name="pricetag" 
                      size={22} 
                      color={tag.emotionColor} 
                    />
                  </View>
                  <View style={styles.tagInfo}>
                    <Text style={styles.tagName}>{tag.name}</Text>
                    <View style={styles.tagMeta}>
                      <View style={[styles.tagLocationBadge, { backgroundColor: `${tag.emotionColor}15` }]}>
                        <Ionicons name="location" size={10} color={tag.emotionColor} />
                        <Text style={[styles.tagLocationText, { color: tag.emotionColor }]}>
                          {tag.location}
                        </Text>
                      </View>
                      {tag.lastUsed && (
                        <Text style={styles.tagLastUsed}>
                          {formatTime(tag.lastUsed)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#CCC" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* 最近交互 */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('nfc.recentInteractions')}</Text>
          {interactions.map((interaction, index) => (
            <Animated.View 
              key={interaction.id}
              entering={FadeInUp.delay(index * 60)}
              style={styles.interactionCard}
            >
              <View style={styles.interactionIcon}>
                <Ionicons 
                  name={interaction.action === 'read' ? 'download-outline' : 'cloud-upload-outline'} 
                  size={18} 
                  color="#7C6AFF" 
                />
              </View>
              <View style={styles.interactionInfo}>
                <Text style={styles.interactionTitle}>
                  {interaction.action === 'read' ? t('nfc.read') : t('nfc.write')} 
                  <Text style={{ fontWeight: '700' }}> {interaction.tagName}</Text>
                </Text>
                <Text style={styles.interactionLocation}>{interaction.tagLocation}</Text>
              </View>
              <View style={styles.interactionRight}>
                {interaction.emotion && (
                  <View style={[styles.interactionEmotion, { backgroundColor: `${interaction.emotionColor}20` }]}>
                    <Text style={[styles.interactionEmotionText, { color: interaction.emotionColor }]}>
                      {interaction.emotion}
                    </Text>
                  </View>
                )}
                <Text style={styles.interactionTime}>{formatTime(interaction.timestamp)}</Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* 使用说明 */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.helpSection}>
          <View style={styles.helpHeader}>
            <Ionicons name="information-circle" size={20} color="#7C6AFF" />
            <Text style={styles.helpTitle}>使用指南</Text>
          </View>
          <View style={styles.helpList}>
            <View style={styles.helpItem}>
              <View style={styles.helpNumber}>
                <Text style={styles.helpNumberText}>1</Text>
              </View>
              <Text style={styles.helpText}>在家庭物品上放置 NFC 标签</Text>
            </View>
            <View style={styles.helpItem}>
              <View style={styles.helpNumber}>
                <Text style={styles.helpNumberText}>2</Text>
              </View>
              <Text style={styles.helpText}>打开 App 并靠近 NFC 标签</Text>
            </View>
            <View style={styles.helpItem}>
              <View style={styles.helpNumber}>
                <Text style={styles.helpNumberText}>3</Text>
              </View>
              <Text style={styles.helpText}>选择情感并写入，或读取已有回忆</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* 标签详情弹窗 */}
      {selectedTag && (
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedTag(null)}
        >
          <Animated.View 
            entering={FadeIn}
            style={[styles.tagModal, { paddingBottom: insets.bottom + 20 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            
            <View style={styles.modalTagHeader}>
              <View style={[styles.modalTagIcon, { backgroundColor: `${selectedTag.emotionColor}20` }]}>
                <Ionicons name="pricetag" size={28} color={selectedTag.emotionColor} />
              </View>
              <View style={styles.modalTagInfo}>
                <Text style={styles.modalTagName}>{selectedTag.name}</Text>
                <View style={styles.modalTagLocation}>
                  <Ionicons name="location" size={12} color="#999" />
                  <Text style={styles.modalTagLocationText}>{selectedTag.location}</Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.modalSectionTitle}>写入情感</Text>
            <View style={styles.emotionWriteGrid}>
              {['love', 'joy', 'calm', 'missing'].map((emotion) => {
                const colors: Record<string, string> = {
                  love: '#FF5252',
                  joy: '#FFD700',
                  calm: '#81C784',
                  missing: '#FF7B8A',
                };
                const icons: Record<string, string> = {
                  love: 'heart',
                  joy: 'sunny',
                  calm: 'leaf',
                  missing: 'heart-circle',
                };
                const labels: Record<string, string> = {
                  love: t('emotions.love'),
                  joy: t('emotions.joy'),
                  calm: t('emotions.calm'),
                  missing: t('emotions.missing'),
                };
                
                return (
                  <TouchableOpacity
                    key={emotion}
                    style={[
                      styles.emotionWriteOption,
                      { backgroundColor: `${colors[emotion]}15` }
                    ]}
                    onPress={() => handleWriteEmotion(selectedTag, emotion, colors[emotion])}
                  >
                    <Ionicons name={icons[emotion] as any} size={24} color={colors[emotion]} />
                    <Text style={[styles.emotionWriteLabel, { color: colors[emotion] }]}>
                      {labels[emotion]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity 
              style={styles.readButton}
              onPress={() => {
                console.log('读取标签:', selectedTag.id);
                setSelectedTag(null);
              }}
            >
              <Ionicons name="download-outline" size={20} color="#7C6AFF" />
              <Text style={styles.readButtonText}>{t('memoryDetail.viewDetails')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F8FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // 扫描区
  scanSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  scanContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scanAnimationContainer: {
    position: 'absolute',
    top: 32,
    left: 32,
    right: 32,
    bottom: 120,
    overflow: 'hidden',
    borderRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#7C6AFF',
    opacity: 0.5,
  },
  scanCorners: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#7C6AFF',
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  nfcIconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  nfcCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcCircleActive: {
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
  },
  nfcRings: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  nfcRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 80,
    marginLeft: -40,
    marginTop: -40,
    borderWidth: 2,
    borderColor: '#7C6AFF',
    borderRadius: 40,
    opacity: 0.3,
  },
  nfcRing2: {
    width: 110,
    height: 110,
    marginLeft: -55,
    marginTop: -55,
    borderWidth: 1,
    opacity: 0.15,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C6AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
    marginBottom: 16,
  },
  scanButtonActive: {
    backgroundColor: '#9D91FF',
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  scanHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  // 标签列表
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  tagList: {
    gap: 12,
  },
  tagCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  tagIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  tagMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tagLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  tagLocationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagLastUsed: {
    fontSize: 11,
    color: '#999',
  },
  // 最近交互
  interactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  interactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  interactionInfo: {
    flex: 1,
  },
  interactionTitle: {
    fontSize: 14,
    color: '#333',
  },
  interactionLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  interactionRight: {
    alignItems: 'flex-end',
  },
  interactionEmotion: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 4,
  },
  interactionEmotionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  interactionTime: {
    fontSize: 11,
    color: '#999',
  },
  // 使用说明
  helpSection: {
    margin: 20,
    backgroundColor: 'rgba(124, 106, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  helpList: {
    gap: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  // 弹窗
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  tagModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTagIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalTagInfo: {
    flex: 1,
  },
  modalTagName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  modalTagLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalTagLocationText: {
    fontSize: 13,
    color: '#999',
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emotionWriteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  emotionWriteOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    gap: 10,
  },
  emotionWriteLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  readButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C6AFF',
  },
});
