import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import {
  MemoryNode,
  bindMemoryToNfcTag,
  getDemoState,
  getMemoryById,
  setActiveViewers,
  stressLevelColor,
} from '@/utils/voxoraDemoStore';

const fallbackGradient = ['#2F2968', '#1B2650', '#0A1026'] as const;

export default function MemoryDetailScreen() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const [memory, setMemory] = useState<MemoryNode | null>(null);
  const [activeViewers, setViewers] = useState(1);
  const [bindingTag, setBindingTag] = useState('bedside-miss-you');
  const [loading, setLoading] = useState(true);

  const tunnelScale = useSharedValue(0.05);
  const tunnelOpacity = useSharedValue(0);
  const contentTranslate = useSharedValue(80);
  const contentOpacity = useSharedValue(0);
  const islandScale = useSharedValue(0.2);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) {
        if (!cancelled) setLoading(false);
        return;
      }
      const [found, state] = await Promise.all([getMemoryById(id), getDemoState()]);
      if (cancelled) return;
      setMemory(found);
      setViewers(state.activeViewers);
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    tunnelScale.value = withSequence(
      withTiming(1.4, { duration: 520, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 350, easing: Easing.inOut(Easing.cubic) })
    );
    tunnelOpacity.value = withTiming(1, { duration: 500 });
    islandScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 120 }));
    contentTranslate.value = withDelay(420, withSpring(0, { damping: 12, stiffness: 90 }));
    contentOpacity.value = withDelay(420, withTiming(1, { duration: 420 }));
  }, [contentOpacity, contentTranslate, islandScale, tunnelOpacity, tunnelScale]);

  const tunnelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tunnelScale.value }],
    opacity: tunnelOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslate.value }],
    opacity: contentOpacity.value,
  }));

  const islandStyle = useAnimatedStyle(() => ({
    transform: [{ scale: islandScale.value }],
  }));

  const dynamicIslandGradient = useMemo((): readonly [string, string, string] => {
    if (!memory) return fallbackGradient;
    if (!memory.isAphasiaAuthor) return fallbackGradient;
    const stressColor = stressLevelColor(memory.bioStressLevel);
    return [stressColor, '#1B2650', '#0A1026'] as const;
  }, [memory]);

  const onChangeViewers = async (next: number) => {
    await setActiveViewers(next);
    setViewers(next);
    if (next > 1) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const onRemoteHandshake = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('远程握手', '你已向共同查看的家人发送握手反馈。');
  };

  const onSendHeart = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('爱心已送达', '已发送一枚无声爱心。');
  };

  const onBindNfc = async () => {
    if (!memory) return;
    const cleanTag = bindingTag.trim();
    if (!cleanTag) {
      Alert.alert('标签为空', '请输入要绑定的 NFC 标签 ID。');
      return;
    }
    const emotion = memory.emotionTags[0] ?? '想念';
    await bindMemoryToNfcTag(memory.id, cleanTag, emotion);
    Alert.alert('绑定成功', `标签 ${cleanTag} 已绑定到该回忆节点。`);
  };

  if (loading) {
    return (
      <Screen backgroundColor="#070B1C" statusBarStyle="light">
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8A7BFF" />
          <Text style={styles.loadingText}>正在穿梭进入记忆详情...</Text>
        </View>
      </Screen>
    );
  }

  if (!memory) {
    return (
      <Screen backgroundColor="#070B1C" statusBarStyle="light">
        <View style={styles.centerBox}>
          <Feather name="alert-circle" size={42} color="#D3CCE8" />
          <Text style={styles.loadingText}>回忆节点不存在或已失效。</Text>
          <TouchableOpacity style={styles.backHomeButton} onPress={() => router.replace('/index')}>
            <Text style={styles.backHomeText}>返回主页</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#070B1C" statusBarStyle="light" style={styles.container}>
      <Animated.View style={[styles.tunnelBg, tunnelStyle]}>
        <LinearGradient colors={['#8A7BFF', '#4CC9F0', '#B388EB']} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      <Animated.View style={[styles.dynamicIsland, islandStyle]}>
        <LinearGradient colors={dynamicIslandGradient as [string, string, string]} style={styles.dynamicIslandGradient}>
          <View style={styles.islandTop}>
            <Text style={styles.islandTitle}>实时情感映射</Text>
            <Text style={styles.islandStress}>
              压力等级：{memory.bioStressLevel === 'high' ? '高' : memory.bioStressLevel === 'medium' ? '中' : '低'}
            </Text>
          </View>
          <Text style={styles.islandMeta}>
            天气：{memory.sensory.weather ?? '未记录'} · 情绪：{memory.emotionTags.join(' / ') || '未标记'}
          </Text>
          <View style={styles.viewerRow}>
            <TouchableOpacity
              style={styles.viewerBtn}
              onPress={() => onChangeViewers(Math.max(1, activeViewers - 1))}
            >
              <Feather name="minus" size={14} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.viewerText}>共同查看人数：{activeViewers}</Text>
            <TouchableOpacity style={styles.viewerBtn} onPress={() => onChangeViewers(activeViewers + 1)}>
              <Feather name="plus" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {activeViewers > 1 && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={onRemoteHandshake}>
                <MaterialCommunityIcons name="handshake" size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>远程握手</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={onSendHeart}>
                <MaterialCommunityIcons name="heart" size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>发送爱心</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView style={[styles.scroll, contentStyle]} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.topNavButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#F7F4FF" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.typeTag}>{memory.type === 'emotion' ? '情感快照' : '图像回忆'}</Text>
          <Text style={styles.title}>{memory.title}</Text>
          <Text style={styles.metaLine}>日期：{memory.memoryDate}</Text>
          <Text style={styles.metaLine}>颜色：{memory.sensory.color ?? '未记录'}</Text>
          <Text style={styles.metaLine}>书籍：{memory.sensory.book ?? '未记录'}</Text>
          <Text style={styles.metaLine}>环境音：{memory.sensory.soundRecorded ? '已记录' : '未记录'}</Text>
          {memory.archivedUntil && <Text style={styles.archive}>封存至：{memory.archivedUntil}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>NFC 情绪实体绑定</Text>
          <Text style={styles.nfcHint}>将当前回忆绑定到实体摆件标签，手机靠近即可跳转。</Text>
          <View style={styles.nfcInputRow}>
            <View style={styles.nfcTagBox}>
              <Text style={styles.nfcTagText}>{bindingTag}</Text>
            </View>
            <TouchableOpacity style={styles.bindBtn} onPress={onBindNfc}>
              <Text style={styles.bindBtnText}>立即绑定</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickTagRow}>
            {['bedside-miss-you', 'dining-joy', 'study-calm'].map((tag) => (
              <TouchableOpacity key={tag} style={styles.quickTagChip} onPress={() => setBindingTag(tag)}>
                <Text style={styles.quickTagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070B1C',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#D1CBE8',
    fontSize: 14,
  },
  backHomeButton: {
    backgroundColor: '#8A7BFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tunnelBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  dynamicIsland: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 22,
    overflow: 'hidden',
  },
  dynamicIslandGradient: {
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    gap: 8,
  },
  islandTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  islandTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  islandStress: {
    color: '#E8E2FF',
    fontWeight: '600',
    fontSize: 12,
  },
  islandMeta: {
    color: '#DDD5FA',
    fontSize: 12,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewerBtn: {
    width: 26,
    height: 26,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  viewerText: {
    color: '#F5F2FF',
    fontWeight: '600',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scroll: {
    flex: 1,
    marginTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 12,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  topNavButton: {
    width: 36,
    height: 36,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    gap: 7,
  },
  typeTag: {
    color: '#AFA5DC',
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    color: '#FAF7FF',
    fontWeight: '800',
    fontSize: 24,
  },
  metaLine: {
    color: '#DBD3F6',
    fontSize: 13,
    lineHeight: 18,
  },
  archive: {
    color: '#FFD6A5',
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#F3EEFF',
    fontWeight: '700',
    fontSize: 15,
  },
  nfcHint: {
    color: '#C6BDE7',
    fontSize: 12,
    lineHeight: 17,
  },
  nfcInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  nfcTagBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(10,16,38,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  nfcTagText: {
    color: '#EEE8FF',
    fontSize: 12,
  },
  bindBtn: {
    borderRadius: 10,
    backgroundColor: '#80ED99',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bindBtnText: {
    color: '#091128',
    fontWeight: '800',
    fontSize: 12,
  },
  quickTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTagChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quickTagText: {
    color: '#E7DFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
