import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  VoxoraDemoState,
  dismissWearableAlert,
  getDemoState,
  interactWithMemory,
  quickCreateEmotionSnapshot,
  resolveMemoryByNfcTag,
  simulateWearableAlert,
  acknowledgeExpressionSignal,
} from '@/utils/voxoraDemoStore';

const quickEmotionList = [
  { label: '喜悦', icon: 'emoticon-happy-outline', color: '#F9C74F' },
  { label: '平静', icon: 'weather-night', color: '#4CC9F0' },
  { label: '想念', icon: 'heart-outline', color: '#B388EB' },
] as const;

export default function HomeScreen() {
  const router = useSafeRouter();
  const [state, setState] = useState<VoxoraDemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanTagId, setScanTagId] = useState('');

  const reload = useCallback(async () => {
    const next = await getDemoState();
    setState(next);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onRefresh = () => {
    setRefreshing(true);
    reload();
  };

  const onQuickEmotion = async (emotion: string) => {
    await quickCreateEmotionSnapshot(emotion);
    reload();
  };

  const onInteract = async (memoryId: string) => {
    await interactWithMemory(memoryId);
    reload();
  };

  const onScanNfc = async () => {
    const found = await resolveMemoryByNfcTag(scanTagId);
    if (!found) {
      Alert.alert('未找到绑定', '该 NFC 标签尚未绑定回忆节点。');
      return;
    }
    setScanTagId('');
    router.push('/memory-detail', { id: found.id });
  };

  const onAcknowledgeSignal = async () => {
    await acknowledgeExpressionSignal();
    reload();
  };

  const onDismissWearableAlert = async () => {
    await dismissWearableAlert();
    reload();
  };

  if (loading || !state) {
    return (
      <Screen backgroundColor="#070B1C" statusBarStyle="light">
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#8A7BFF" size="large" />
          <Text style={styles.loadingText}>正在加载 Voxora 家庭空间...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#070B1C" statusBarStyle="light" style={styles.container}>
      <LinearGradient colors={['#2E2A64', '#0D1C3F', '#070B1C']} style={styles.aurora} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8A7BFF" />
        }
      >
        <View style={styles.dynamicIsland}>
          <View style={styles.dynamicTop}>
            <View>
              <Text style={styles.appTitle}>Voxora</Text>
              <Text style={styles.appSubtitle}>失语症包容式家庭回忆空间</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={simulateWearableAlert}>
              <Feather name="activity" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {state.wearableAlert && (
            <View style={styles.alertRow}>
              <MaterialCommunityIcons name="heart-pulse" size={16} color="#FFD6A5" />
              <Text style={styles.alertText}>{state.wearableAlert.message}</Text>
              <TouchableOpacity onPress={onDismissWearableAlert}>
                <Feather name="x" size={16} color="#F4F0FF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>失语症快捷表达</Text>
          <View style={styles.quickEmotionRow}>
            {quickEmotionList.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.quickEmotionCard, { borderColor: `${item.color}88` }]}
                onPress={() => onQuickEmotion(item.label)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                <Text style={styles.quickEmotionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.petCard}>
          <View style={styles.petHeader}>
            <Text style={styles.petTitle}>虚拟宠物成长能量</Text>
            <Text style={styles.petEnergy}>{state.petEnergy}%</Text>
          </View>
          <View style={styles.energyTrack}>
            <View style={[styles.energyFill, { width: `${state.petEnergy}%` }]} />
          </View>
          <Text style={styles.petHint}>每次无声表达、签到、互动都会为小精灵充能。</Text>
        </View>

        {state.expressionSignal && !state.expressionSignal.acknowledged && (
          <TouchableOpacity style={styles.signalCard} onPress={onAcknowledgeSignal}>
            <Text style={styles.signalTitle}>无声送信已抵达</Text>
            <Text style={styles.signalText}>
              安安发来一张「{state.expressionSignal.emotion}」情绪卡，点击确认并回应。
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NFC 情感实体入口</Text>
          <View style={styles.nfcCard}>
            <TextInput
              value={scanTagId}
              onChangeText={setScanTagId}
              placeholder="输入标签 ID（示例：bedside-miss-you）"
              placeholderTextColor="#7F7AA5"
              style={styles.nfcInput}
            />
            <TouchableOpacity onPress={onScanNfc} style={styles.nfcButton}>
              <Feather name="radio" size={16} color="#0D1026" />
              <Text style={styles.nfcButtonText}>模拟靠近</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>家庭回忆节点流（时间逆序）</Text>
          {state.memories.map((memory, index) => {
            const glowing = memory.interactionCount > 0;
            const isArchived = memory.archivedUntil
              ? +new Date(memory.archivedUntil) > +new Date(memory.createdAt)
              : false;

            return (
              <View style={styles.timelineItem} key={memory.id}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, glowing && styles.timelineDotGlow]} />
                  {index < state.memories.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <TouchableOpacity
                  style={[styles.memoryCard, glowing && styles.memoryCardGlow]}
                  onPress={() => router.push('/memory-detail', { id: memory.id })}
                  activeOpacity={0.9}
                >
                  <View style={styles.memoryTop}>
                    <Text style={styles.memoryType}>{memory.type === 'emotion' ? '情感快照' : '图像回忆'}</Text>
                    {memory.isAphasiaAuthor && <Text style={styles.a11yBadge}>失语症成员</Text>}
                  </View>
                  <Text style={styles.memoryTitle}>{memory.title}</Text>
                  <Text style={styles.memoryMeta}>
                    {memory.memoryDate} · {memory.emotionTags.join(' / ') || '无标签'}
                  </Text>
                  {isArchived && (
                    <Text style={styles.archiveHint}>封存中，将于 {memory.archivedUntil} 解锁</Text>
                  )}
                  <View style={styles.memoryFooter}>
                    <TouchableOpacity onPress={() => onInteract(memory.id)} style={styles.interactButton}>
                      <MaterialCommunityIcons name="star-four-points" size={14} color="#FFFFFF" />
                      <Text style={styles.interactText}>点亮星团</Text>
                    </TouchableOpacity>
                    <Text style={styles.interactionCount}>互动 {memory.interactionCount}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push('/add-memory')}>
          <Feather name="plus-circle" size={18} color="#FFFFFF" />
          <Text style={styles.bottomButtonText}>新增回忆</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButtonAlt} onPress={() => router.push('/family-space')}>
          <Feather name="users" size={18} color="#0D1026" />
          <Text style={styles.bottomButtonAltText}>家庭空间</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070B1C',
  },
  aurora: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 340,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#C6C3E0',
    marginTop: 14,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 14,
  },
  dynamicIsland: {
    marginTop: 8,
    borderRadius: 24,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dynamicTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  appTitle: {
    color: '#F7F5FF',
    fontSize: 28,
    fontWeight: '700',
  },
  appSubtitle: {
    color: '#C6C3E0',
    marginTop: 2,
    fontSize: 13,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(138,123,255,0.5)',
  },
  alertRow: {
    marginTop: 12,
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(255,214,165,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,165,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    flex: 1,
    color: '#FFF4E6',
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#ECE9FF',
    fontSize: 16,
    fontWeight: '700',
  },
  quickEmotionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickEmotionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  quickEmotionText: {
    color: '#EFEAFF',
    fontWeight: '600',
  },
  petCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 14,
    gap: 10,
  },
  petHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  petTitle: {
    color: '#EFEAFF',
    fontWeight: '700',
  },
  petEnergy: {
    color: '#80ED99',
    fontWeight: '800',
    fontSize: 16,
  },
  energyTrack: {
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  energyFill: {
    height: '100%',
    backgroundColor: '#80ED99',
  },
  petHint: {
    color: '#BFB9DA',
    fontSize: 12,
  },
  signalCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(179,136,235,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(179,136,235,0.7)',
    gap: 6,
  },
  signalTitle: {
    color: '#F4EEFF',
    fontWeight: '700',
  },
  signalText: {
    color: '#EFE5FF',
    lineHeight: 18,
  },
  nfcCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  nfcInput: {
    flex: 1,
    color: '#F4F1FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(7,11,28,0.8)',
  },
  nfcButton: {
    borderRadius: 12,
    backgroundColor: '#80ED99',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nfcButtonText: {
    color: '#0D1026',
    fontWeight: '700',
    fontSize: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 7,
    backgroundColor: '#8A7BFF',
  },
  timelineDotGlow: {
    shadowColor: '#FFD166',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 7,
    backgroundColor: '#FFD166',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 6,
  },
  memoryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  memoryCardGlow: {
    borderColor: 'rgba(255,209,102,0.8)',
    shadowColor: '#FFD166',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  memoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoryType: {
    color: '#C2BAE3',
    fontSize: 12,
    fontWeight: '600',
  },
  a11yBadge: {
    color: '#0D1026',
    fontSize: 11,
    backgroundColor: '#80ED99',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    fontWeight: '700',
  },
  memoryTitle: {
    color: '#F7F4FF',
    fontSize: 18,
    fontWeight: '700',
  },
  memoryMeta: {
    color: '#C2BAE3',
    fontSize: 13,
  },
  archiveHint: {
    color: '#FFD6A5',
    fontSize: 12,
  },
  memoryFooter: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interactButton: {
    backgroundColor: 'rgba(138,123,255,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  interactText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  interactionCount: {
    color: '#E2DDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomActions: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    gap: 10,
  },
  bottomButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#8A7BFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bottomButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomButtonAlt: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#80ED99',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bottomButtonAltText: {
    color: '#0D1026',
    fontWeight: '800',
  },
});
