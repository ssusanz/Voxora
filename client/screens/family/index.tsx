import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';

import FamilyTopology from '@/components/FamilyTopology';
import Whiteboard from '@/components/Whiteboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 家庭成员类型
interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  relationship: string;
  emotionalState?: string;
  emotionColor?: string;
}

/** 演示提醒：用固定「距今整分钟数」展示相对时间文案，避免在 render/useMemo 中读取系统时钟 */
interface FamilyAlert {
  id: string;
  memberName: string;
  type: 'heartRate' | 'emotion' | 'milestone';
  message: string;
  ageMinutes: number;
  isRead: boolean;
}

// 呼吸灯组件
function BreathingLight({ members, t }: { members: FamilyMember[]; t: (key: string) => string }) {
  const opacity = useSharedValue(0.3);

  // 脉动动画
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.breathingContainer}>
      <Text style={styles.breathingTitle}>{t('family.breathingTitle')}</Text>
      <View style={styles.breathingLights}>
        {members.slice(0, 4).map((member, index) => (
          <Animated.View
            key={member.id}
            entering={FadeIn.delay(index * 100)}
            style={styles.breathingLightItem}
          >
            <Animated.View
              style={[styles.breathingLight, pulseStyle, { backgroundColor: member.emotionColor }]}
            />
            <Image source={{ uri: member.avatar }} style={styles.breathingAvatar} />
            <Text style={styles.breathingName} numberOfLines={1}>{member.name}</Text>
          </Animated.View>
        ))}
      </View>
      <Text style={styles.breathingHint}>{t('family.breathingHint')}</Text>
    </View>
  );
}

export default function FamilySpaceScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  
  const WHITEBOARD_STORAGE_KEY = 'voxora:whiteboard:v1';

  const members = useMemo((): FamilyMember[] => {
    return [
      {
        id: '1',
        name: t('family.demoMembers.grandma'),
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
        relationship: t('family.demoMembers.grandma'),
        emotionalState: 'joy',
        emotionColor: '#FFD700',
      },
      {
        id: '2',
        name: t('family.demoMembers.dad'),
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        relationship: t('family.demoMembers.dad'),
        emotionalState: 'calm',
        emotionColor: '#81C784',
      },
      {
        id: '3',
        name: t('family.demoMembers.mom'),
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
        relationship: t('family.demoMembers.mom'),
        emotionalState: 'love',
        emotionColor: '#FF5252',
      },
      {
        id: '4',
        name: t('family.demoMembers.child'),
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200',
        relationship: t('family.demoMembers.child'),
        emotionalState: 'excitement',
        emotionColor: '#7C6AFF',
      },
    ];
  }, [t, i18n.language]);

  const alerts = useMemo((): FamilyAlert[] => {
    return [
      {
        id: '1',
        memberName: t('family.demoMembers.grandma'),
        type: 'emotion',
        message: t('family.demoAlertMissYou'),
        ageMinutes: 5,
        isRead: false,
      },
      {
        id: '2',
        memberName: t('family.demoMembers.mom'),
        type: 'heartRate',
        message: t('family.emotionStable2'),
        ageMinutes: 30,
        isRead: false,
      },
      {
        id: '3',
        memberName: t('family.demoMembers.dad'),
        type: 'milestone',
        message: t('family.addedPhoto'),
        ageMinutes: 120,
        isRead: true,
      },
    ];
  }, [t, i18n.language]);

  const [activeTab, setActiveTab] = useState<'topology' | 'whiteboard'>('topology');
  const [whiteboardContent, setWhiteboardContent] = useState<{ id: string; content: string; author: string; timestamp: Date }[]>([]);

  // 从本地存储恢复白板内容（避免刷新/重载丢失）
  const loadWhiteboard = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(WHITEBOARD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { id: string; content: string; author: string; timestamp: string }[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWhiteboardContent(
            parsed.map((m) => ({
              id: String(m.id),
              content: String(m.content ?? ''),
              author: String(m.author ?? ''),
              timestamp: new Date(m.timestamp),
            }))
          );
          return;
        }
      }
    } catch (e) {
      console.log('恢复家庭白板失败（可忽略）');
    }
    const base = Date.now();
    setWhiteboardContent([
      {
        id: '1',
        content: t('family.demoWhiteboardMsg1'),
        author: t('family.demoMembers.grandma'),
        timestamp: new Date(base - 25 * 60 * 1000),
      },
      {
        id: '2',
        content: t('family.demoWhiteboardMsg2'),
        author: t('family.demoMembers.mom'),
        timestamp: new Date(base - 2 * 60 * 60 * 1000),
      },
    ]);
  }, [t]);

  const persistWhiteboard = useCallback(async (items: { id: string; content: string; author: string; timestamp: Date }[]) => {
    try {
      await AsyncStorage.setItem(
        WHITEBOARD_STORAGE_KEY,
        JSON.stringify(items.map((m) => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })))
      );
    } catch (e) {
      console.log('保存家庭白板失败（可忽略）');
    }
  }, []);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  // 切换 Tab
  const handleTabChange = useCallback((tab: 'topology' | 'whiteboard') => {
    setActiveTab(tab);
  }, []);

  // 首次加载时恢复（避免刷新/热重载导致“刚输入就丢”）
  useEffect(() => {
    const id = setTimeout(() => {
      loadWhiteboard();
    }, 0);
    return () => clearTimeout(id);
  }, [loadWhiteboard]);

  const formatMinutesAgoLabel = useCallback(
    (ageMinutes: number): string => {
      const m = Math.floor(ageMinutes);
      if (m < 1) return t('family.justNow');
      if (m < 60) return t('family.minutesAgo', { minutes: m });
      const h = Math.floor(m / 60);
      if (h < 24) return t('family.hoursAgo', { hours: h });
      return t('family.daysAgo', { days: Math.floor(h / 24) });
    },
    [t]
  );

  // 获取提醒图标
  const getAlertIcon = (type: string): string => {
    switch (type) {
      case 'heartRate': return 'pulse';
      case 'emotion': return 'heart';
      case 'milestone': return 'star';
      default: return 'ellipse';
    }
  };

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部标题 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('family.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('family.membersConnected', { count: members.length })}
          </Text>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      {/* 情感状态栏 */}
      <Animated.View entering={FadeInDown} style={styles.emotionBar}>
        <View style={styles.emotionBarContent}>
          {members.map((member, index) => (
            <View 
              key={member.id}
              style={[
                styles.emotionAvatarStack,
                { marginLeft: index === 0 ? 0 : -12 }
              ]}
            >
              <Image source={{ uri: member.avatar }} style={styles.emotionAvatar} />
              {member.emotionColor && (
                <View style={[styles.emotionDot, { backgroundColor: member.emotionColor }]} />
              )}
            </View>
          ))}
          <View style={styles.emotionBarText}>
            <Text style={styles.emotionBarMain}>{t('family.emotionIndex')}</Text>
            <Text style={styles.emotionBarSub}>{t('family.emotionStable')}</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 呼吸灯 */}
        <BreathingLight members={members} t={t} />

        {/* 切换标签 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'topology' && styles.tabActive]}
            onPress={() => handleTabChange('topology')}
          >
            <Ionicons 
              name="git-network" 
              size={18} 
              color={activeTab === 'topology' ? '#7C6AFF' : '#999'} 
            />
            <Text style={[styles.tabText, activeTab === 'topology' && styles.tabTextActive]}>
              {t('family.familyTopology')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'whiteboard' && styles.tabActive]}
            onPress={() => handleTabChange('whiteboard')}
          >
            <Ionicons 
              name="create-outline" 
              size={18} 
              color={activeTab === 'whiteboard' ? '#7C6AFF' : '#999'} 
            />
            <Text style={[styles.tabText, activeTab === 'whiteboard' && styles.tabTextActive]}>
              {t('family.familyBoard')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 内容区 */}
        {activeTab === 'topology' ? (
          <Animated.View entering={FadeIn} style={styles.topologyContainer}>
            <FamilyTopology 
              members={members.map(m => ({ ...m, id: m.id }))}
              creatorId={members[0]?.id || ''}
              onMemberPress={(memberId) => {
                const member = members.find(m => m.id === memberId);
                if (member) console.log('点击成员:', member.name);
              }}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={styles.whiteboardContainer}>
            <Whiteboard 
              items={whiteboardContent.map(msg => ({
                id: msg.id,
                type: 'text' as const,
                content: msg.content,
                author: msg.author,
                timestamp: msg.timestamp,
              }))}
              onAddText={(text: string) => {
                setWhiteboardContent(prev => {
                  const next = [...prev, {
                    id: Date.now().toString(),
                    content: text,
                    author: t('family.whiteboardYou'),
                    timestamp: new Date(),
                  }];
                  persistWhiteboard(next);
                  return next;
                });
              }}
            />
          </Animated.View>
        )}

        {/* 实时提醒 */}
        <View style={styles.alertsSection}>
          <View style={styles.alertsHeader}>
            <Text style={styles.sectionTitle}>{t('family.realTimeAlerts')}</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {alerts.slice(0, 3).map((alert, index) => (
            <Animated.View 
              key={alert.id}
              entering={FadeInUp.delay(index * 80)}
              style={[styles.alertItem, !alert.isRead && styles.alertItemUnread]}
            >
              <View style={styles.alertIconContainer}>
                <Ionicons 
                  name={getAlertIcon(alert.type) as any} 
                  size={18} 
                  color="#7C6AFF" 
                />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertMember}>{alert.memberName}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
              <Text style={styles.alertTime}>{formatMinutesAgoLabel(alert.ageMinutes)}</Text>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionBar: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: -8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emotionBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionAvatarStack: {
    position: 'relative',
  },
  emotionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  emotionDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  emotionBarText: {
    marginLeft: 16,
    flex: 1,
  },
  emotionBarMain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emotionBarSub: {
    fontSize: 12,
    color: '#7C6AFF',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  // 呼吸灯
  breathingContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  breathingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  breathingLights: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breathingLightItem: {
    alignItems: 'center',
    width: 70,
  },
  breathingLight: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  breathingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    marginTop: -45,
  },
  breathingName: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  breathingHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  // 标签切换
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#7C6AFF',
    fontWeight: '600',
  },
  topologyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  whiteboardContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  // 提醒
  alertsSection: {
    marginTop: 20,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#FF7B8A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  alertItemUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#7C6AFF',
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertMember: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  alertMessage: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  alertTime: {
    fontSize: 11,
    color: '#999',
  },
});
