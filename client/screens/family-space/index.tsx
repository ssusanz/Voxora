import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  VoxoraDemoState,
  appendWhiteboardNote,
  getDemoState,
  getMemoryById,
  sendExpressionSignal,
  bindMemoryToNfcTag,
} from '@/utils/voxoraDemoStore';

const orbitPositions = [
  { top: 28, left: 20 },
  { top: 32, right: 20 },
  { bottom: 20, left: 36 },
  { bottom: 20, right: 36 },
] as const;

export default function FamilySpaceScreen() {
  const router = useSafeRouter();
  const [state, setState] = useState<VoxoraDemoState | null>(null);
  const [whiteboardInput, setWhiteboardInput] = useState('');
  const [nfcTagId, setNfcTagId] = useState('');
  const [bindMemoryId, setBindMemoryId] = useState('');
  const [bindEmotion, setBindEmotion] = useState('想念');

  const reload = useCallback(async () => {
    const next = await getDemoState();
    setState(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const aphasiaMember = useMemo(
    () => state?.familyMembers.find((item) => item.isAphasia) ?? null,
    [state]
  );

  const contributionCount = useMemo(
    () => state?.memories.filter((item) => item.isAphasiaAuthor).length ?? 0,
    [state]
  );

  const topEmotion = useMemo(() => {
    if (!state) return '平静';
    const counter = new Map<string, number>();
    state.memories
      .filter((item) => item.isAphasiaAuthor)
      .forEach((item) => {
        item.emotionTags.forEach((emotion) => {
          counter.set(emotion, (counter.get(emotion) ?? 0) + 1);
        });
      });
    return [...counter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '平静';
  }, [state]);

  const onSaveWhiteboard = async () => {
    if (!whiteboardInput.trim()) return;
    await appendWhiteboardNote(whiteboardInput);
    setWhiteboardInput('');
    reload();
  };

  const onQuickVoiceToText = async () => {
    const phrase = '本周目标：每天至少一次无声情绪留言';
    await appendWhiteboardNote(phrase);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reload();
  };

  const onQuickDoodle = async () => {
    const doodle = '涂鸦目标：星光、拥抱、握手';
    await appendWhiteboardNote(doodle);
    await Haptics.selectionAsync();
    reload();
  };

  const onBindNfc = async () => {
    if (!nfcTagId.trim() || !bindMemoryId.trim()) {
      Alert.alert('参数不足', '请填写标签 ID 与回忆 ID。');
      return;
    }
    const memory = await getMemoryById(bindMemoryId.trim());
    if (!memory) {
      Alert.alert('回忆不存在', '请先确认回忆 ID。');
      return;
    }

    await bindMemoryToNfcTag(memory.id, nfcTagId, bindEmotion.trim() || '想念');
    Alert.alert('绑定完成', `标签 ${nfcTagId} 已绑定到「${memory.title}」。`);
    setNfcTagId('');
    setBindMemoryId('');
    reload();
  };

  const onSendSignal = async () => {
    await sendExpressionSignal('m_aphasia', bindEmotion.trim() || '想念');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('已发送', '小精灵将带着情绪卡片出现在家人屏幕边缘。');
    reload();
  };

  if (!state) {
    return (
      <Screen backgroundColor="#070B1C" statusBarStyle="light">
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>正在进入家庭空间...</Text>
        </View>
      </Screen>
    );
  }

  const creator = state.familyMembers.find((item) => item.role === '创建者') ?? state.familyMembers[0];
  const others = state.familyMembers.filter((item) => item.id !== creator.id);

  return (
    <Screen backgroundColor="#070B1C" statusBarStyle="light" style={styles.container}>
      <LinearGradient colors={['#2E2A66', '#0D1C3F', '#070B1C']} style={styles.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#F6F2FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>家庭空间</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topologyCard}>
          <Text style={styles.sectionTitle}>关系拓扑图</Text>
          <View style={styles.topologyArea}>
            <View style={styles.centerNode}>
              <MaterialCommunityIcons name={creator.avatarIcon} size={24} color="#FFFFFF" />
              <Text style={styles.nodeName}>{creator.name}</Text>
              <Text style={styles.nodeRole}>{creator.role}</Text>
            </View>

            {others.map((member, index) => {
              const pos = orbitPositions[index % orbitPositions.length];
              const isBreathing = member.isAphasia;
              return (
                <View key={member.id} style={[styles.orbitNode, pos, isBreathing && styles.breathingNode]}>
                    <MaterialCommunityIcons name={member.avatarIcon} size={22} color="#FFFFFF" />
                  <Text style={styles.nodeName}>{member.name}</Text>
                  <Text style={styles.nodeRole}>{member.recentMood}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.memberCard}>
          <Text style={styles.sectionTitle}>失语症成员专属相片卡</Text>
          <Text style={styles.memberTitle}>
            {aphasiaMember?.name ?? '未命名成员'}
          </Text>
          <Text style={styles.memberMeta}>非言语贡献回忆：{contributionCount}</Text>
          <Text style={styles.memberMeta}>最高频情绪标签：{topEmotion}</Text>
          <Text style={styles.memberMeta}>活跃度：{aphasiaMember?.activityLevel ?? 'medium'}</Text>
        </View>

        <View style={styles.whiteboardCard}>
          <Text style={styles.sectionTitle}>家庭白板（语音转文字 / 涂鸦）</Text>
          <View style={styles.whiteboardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onQuickVoiceToText}>
              <Feather name="mic" size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>语音转文字</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onQuickDoodle}>
              <Feather name="edit-3" size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>手绘涂鸦</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.whiteboardInputRow}>
            <TextInput
              style={styles.input}
              value={whiteboardInput}
              onChangeText={setWhiteboardInput}
              placeholder="输入家庭共同目标..."
              placeholderTextColor="#8E88B0"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={onSaveWhiteboard}>
              <Feather name="plus" size={16} color="#0D1026" />
            </TouchableOpacity>
          </View>

          <View style={styles.noteList}>
            {state.whiteboardNotes.map((note) => (
              <View key={note} style={styles.noteItem}>
                <Feather name="check-circle" size={14} color="#80ED99" />
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.petSystemCard}>
          <Text style={styles.sectionTitle}>虚拟宠物无声送信系统</Text>
          <Text style={styles.memberMeta}>当前能量：{state.petEnergy}%</Text>
          <View style={styles.petActions}>
            <TextInput
              style={styles.input}
              value={bindEmotion}
              onChangeText={setBindEmotion}
              placeholder="输入想发送的情绪（如 想念）"
              placeholderTextColor="#8E88B0"
            />
            <TouchableOpacity style={styles.signalBtn} onPress={onSendSignal}>
              <MaterialCommunityIcons name="cards-heart-outline" size={16} color="#070B1C" />
              <Text style={styles.signalText}>发送情绪卡</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nfcCard}>
          <Text style={styles.sectionTitle}>NFC 情绪节点绑定</Text>
          <TextInput
            style={styles.input}
            value={nfcTagId}
            onChangeText={setNfcTagId}
            placeholder="标签 ID（如 bedside-miss-you）"
            placeholderTextColor="#8E88B0"
          />
          <TextInput
            style={styles.input}
            value={bindMemoryId}
            onChangeText={setBindMemoryId}
            placeholder="回忆 ID（从时间轴卡片进入详情后可见）"
            placeholderTextColor="#8E88B0"
          />
          <TouchableOpacity style={styles.bindBtn} onPress={onBindNfc}>
            <Feather name="link-2" size={16} color="#0D1026" />
            <Text style={styles.bindText}>绑定到实体摆件</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070B1C',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#D7D0F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F6F2FF',
    fontWeight: '700',
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    gap: 12,
  },
  sectionTitle: {
    color: '#F4EEFF',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 8,
  },
  topologyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  topologyArea: {
    height: 250,
    borderRadius: 16,
    backgroundColor: 'rgba(7,11,28,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNode: {
    width: 94,
    height: 94,
    borderRadius: 50,
    backgroundColor: 'rgba(138,123,255,0.35)',
    borderWidth: 1.5,
    borderColor: '#8A7BFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  orbitNode: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  breathingNode: {
    shadowColor: '#80ED99',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    borderColor: '#80ED99',
  },
  nodeAvatar: {
    fontSize: 22,
  },
  nodeName: {
    color: '#F6F2FF',
    fontWeight: '700',
    fontSize: 12,
  },
  nodeRole: {
    color: '#CFC7ED',
    fontSize: 11,
  },
  memberCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    gap: 6,
  },
  memberTitle: {
    color: '#F6F2FF',
    fontSize: 18,
    fontWeight: '700',
  },
  memberMeta: {
    color: '#D6D0F2',
    fontSize: 13,
    lineHeight: 19,
  },
  whiteboardCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    gap: 9,
  },
  whiteboardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(138,123,255,0.7)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  whiteboardInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(7,11,28,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F7F4FF',
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#80ED99',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteList: {
    gap: 6,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  noteText: {
    color: '#E4DEFB',
    flex: 1,
    fontSize: 13,
  },
  petSystemCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    gap: 9,
  },
  petActions: {
    gap: 8,
  },
  signalBtn: {
    borderRadius: 12,
    backgroundColor: '#FFD166',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  signalText: {
    color: '#070B1C',
    fontWeight: '800',
    fontSize: 13,
  },
  nfcCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    gap: 9,
  },
  bindBtn: {
    borderRadius: 12,
    backgroundColor: '#80ED99',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  bindText: {
    color: '#070B1C',
    fontWeight: '800',
    fontSize: 13,
  },
});
