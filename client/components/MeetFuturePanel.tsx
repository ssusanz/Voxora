import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { InlineDeleteReveal } from '@/components/InlineDeleteReveal';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  loadFuturePlans,
  saveFuturePlans,
  type FuturePlan,
  type FuturePlanKind,
} from '@/utils/meetFutureStorage';

export type { FuturePlan, FuturePlanKind } from '@/utils/meetFutureStorage';

const KIND_ORDER: FuturePlanKind[] = ['trip', 'birthday', 'party', 'gathering'];

function kindIcon(kind: FuturePlanKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'trip':
      return 'airplane';
    case 'birthday':
      return 'gift';
    case 'party':
      return 'balloon';
    default:
      return 'people';
  }
}

function randomId(): string {
  return `fp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type MeetFuturePanelProps = {
  /** 与首页时光长廊列表一致，避免底部 Tab 遮挡 */
  bottomSpacerHeight: number;
};

export function MeetFuturePanel({ bottomSpacerHeight }: MeetFuturePanelProps) {
  const { t } = useTranslation();
  const router = useSafeRouter();
  const [plans, setPlans] = useState<FuturePlan[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftKind, setDraftKind] = useState<FuturePlanKind>('trip');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const loaded = await loadFuturePlans();
          if (cancelled) return;
          const next = loaded.map((x) => ({
            ...x,
            kind: KIND_ORDER.includes(x.kind) ? x.kind : 'gathering',
            entries: Array.isArray(x.entries) ? x.entries : [],
          }));
          setPlans(next);
        } catch {
          setPlans([]);
        } finally {
          if (!cancelled) setHydrated(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const persist = useCallback(async (next: FuturePlan[]) => {
    setPlans(next);
    try {
      await saveFuturePlans(next);
    } catch {
      /* ignore */
    }
  }, []);

  const [heroPick] = useState(() => Math.floor(Math.random() * 5));

  const heroLines = useMemo(
    () => [
      t('home.futureHero0'),
      t('home.futureHero1'),
      t('home.futureHero2'),
      t('home.futureHero3'),
      t('home.futureHero4'),
    ],
    [t]
  );

  const saveDraft = useCallback(() => {
    const title = draftTitle.trim();
    if (!title) return;
    const row: FuturePlan = {
      id: randomId(),
      kind: draftKind,
      title,
      dateLabel: draftDate.trim(),
      status: 'brainstorm',
      entries: [],
    };
    void persist([row, ...plans]);
    setDraftTitle('');
    setDraftDate('');
    setDraftKind('trip');
    setShowAdd(false);
  }, [draftTitle, draftDate, draftKind, plans, persist]);

  const removePlan = useCallback(
    async (id: string) => {
      await persist(plans.filter((p) => p.id !== id));
    },
    [plans, persist]
  );

  const toggleLock = useCallback(
    (id: string) => {
      void persist(
        plans.map((p) =>
          p.id === id ? { ...p, status: p.status === 'locked' ? 'brainstorm' : 'locked' } : p
        )
      );
    },
    [plans, persist]
  );

  if (!hydrated) {
    return (
      <View style={styles.loadingShell}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomSpacerHeight + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(420)} style={styles.heroWrap}>
          <LinearGradient
            colors={['#2D1B4E', '#5B39B8', '#FF7B8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroEmoji}>✨🧭🎈</Text>
            <Text style={styles.heroLine}>{heroLines[heroPick % heroLines.length]}</Text>
            <View style={styles.heroChips}>
              <View style={styles.heroChip}>
                <Ionicons name="chatbubbles" size={14} color="rgba(255,255,255,0.95)" />
                <Text style={styles.heroChipText}>{t('home.futureChipDiscuss')}</Text>
              </View>
              <View style={styles.heroChip}>
                <Ionicons name="list" size={14} color="rgba(255,255,255,0.95)" />
                <Text style={styles.heroChipText}>{t('home.futureChipPlan')}</Text>
              </View>
              <View style={styles.heroChip}>
                <Ionicons name="happy" size={14} color="rgba(255,255,255,0.95)" />
                <Text style={styles.heroChipText}>{t('home.futureChipTease')}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.fakeFamilyRow}>
          {[0, 1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              entering={FadeInRight.delay(80 + i * 70).springify()}
              style={[
                styles.avatarBubble,
                { backgroundColor: ['#7C6AFF', '#FF7B8A', '#4FC3F7', '#FFD54F'][i] },
                i > 0 && styles.avatarBubbleOverlap,
              ]}
            />
          ))}
          <Text style={styles.fakeFamilyText}>{t('home.futureFamilyHint')}</Text>
        </View>

        {plans.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(120)} style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyTitle}>{t('home.futureEmptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('home.futureEmptyBody')}</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
              <LinearGradient
                colors={['#FF7B8A', '#FF9E80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyCtaGrad}
              >
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.emptyCtaText}>{t('home.futureEmptyCta')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          plans.map((plan, idx) => (
            <Animated.View key={plan.id} entering={FadeInDown.delay(60 + idx * 40)}>
              <InlineDeleteReveal onDelete={() => removePlan(plan.id)}>
                {(openBar) => (
                  <Pressable
                    onPress={() => router.push('/meet-future-detail', { planId: plan.id })}
                    onLongPress={openBar}
                    delayLongPress={420}
                  >
                    <LinearGradient
                      colors={
                        plan.status === 'locked'
                          ? ['#E8E6FF', '#FFF5F7']
                          : ['#FFFFFF', '#F3F0FF']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.planCard}
                    >
                      <View style={styles.planTop}>
                        <View style={[styles.planIconWrap, { backgroundColor: 'rgba(124,106,255,0.15)' }]}>
                          <Ionicons name={kindIcon(plan.kind)} size={22} color="#5B3EBA" />
                        </View>
                        <View style={styles.planTextCol}>
                          <Text style={styles.planTitle} numberOfLines={2}>
                            {plan.title}
                          </Text>
                          {plan.dateLabel ? (
                            <View style={styles.planMetaRow}>
                              <Ionicons name="calendar-outline" size={14} color="#888" />
                              <Text style={styles.planMeta}>{plan.dateLabel}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Pressable
                          onPress={() => toggleLock(plan.id)}
                          style={styles.lockHit}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={t('home.futureToggleLock')}
                        >
                          <Ionicons
                            name={plan.status === 'locked' ? 'lock-closed' : 'lock-open-outline'}
                            size={22}
                            color={plan.status === 'locked' ? '#7C6AFF' : '#BBB'}
                          />
                        </Pressable>
                      </View>
                      <View style={styles.planCardFooter}>
                        <View style={styles.planCardFooterLeft}>
                          <View
                            style={[
                              styles.statusPill,
                              plan.status === 'locked' ? styles.statusPillLocked : styles.statusPillOpen,
                            ]}
                          >
                            <Text style={styles.statusPillText}>
                              {plan.status === 'locked'
                                ? t('home.futureStatusLocked')
                                : t('home.futureStatusBrainstorm')}
                            </Text>
                          </View>
                          <Text style={styles.planTapHint}>{t('home.futureOpenDiscussion')}</Text>
                        </View>
                        <Text style={styles.planKindTag}>{t(`home.futureKind_${plan.kind}`)}</Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                )}
              </InlineDeleteReveal>
            </Animated.View>
          ))
        )}

        {plans.length > 0 ? (
          <TouchableOpacity style={styles.addAnother} onPress={() => setShowAdd(true)} activeOpacity={0.88}>
            <Ionicons name="add-circle" size={22} color="#7C6AFF" />
            <Text style={styles.addAnotherText}>{t('home.futureAddAnother')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAdd(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('home.futureModalTitle')}</Text>
            <Text style={styles.modalHint}>{t('home.futureModalHint')}</Text>

            <Text style={styles.inputLabel}>{t('home.futureFieldTitle')}</Text>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder={t('home.futureFieldTitlePh')}
              placeholderTextColor="#AAA"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>{t('home.futureFieldWhen')}</Text>
            <TextInput
              value={draftDate}
              onChangeText={setDraftDate}
              placeholder={t('home.futureFieldWhenPh')}
              placeholderTextColor="#AAA"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>{t('home.futureFieldKind')}</Text>
            <View style={styles.kindRow}>
              {KIND_ORDER.map((k) => {
                const active = draftKind === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setDraftKind(k)}
                    style={[styles.kindChip, active && styles.kindChipActive]}
                  >
                    <Ionicons
                      name={kindIcon(k)}
                      size={16}
                      color={active ? '#FFF' : '#666'}
                    />
                    <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                      {t(`home.futureKind_${k}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalGhost} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalGhostText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimary} onPress={saveDraft} activeOpacity={0.9}>
                <LinearGradient colors={['#7C6AFF', '#9D91FF']} style={styles.modalPrimaryGrad}>
                  <Text style={styles.modalPrimaryText}>{t('home.futureSave')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingShell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  heroWrap: {
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#5B3EBA',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  heroCard: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 22,
  },
  heroEmoji: {
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroLine: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  fakeFamilyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 8,
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarBubbleOverlap: {
    marginLeft: -10,
  },
  fakeFamilyText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,106,255,0.12)',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyCta: {
    marginTop: 18,
    borderRadius: 999,
    overflow: 'hidden',
  },
  emptyCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  planCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,106,255,0.12)',
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planTextCol: {
    flex: 1,
    minWidth: 0,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D2640',
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  planMeta: {
    fontSize: 13,
    color: '#777',
  },
  lockHit: {
    padding: 4,
  },
  planCardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  planCardFooterLeft: {
    flex: 1,
    minWidth: 0,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillOpen: {
    backgroundColor: 'rgba(255,123,138,0.18)',
  },
  statusPillLocked: {
    backgroundColor: 'rgba(124,106,255,0.18)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B3EBA',
  },
  planKindTag: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    flexShrink: 0,
    textAlign: 'right',
    marginBottom: 1,
  },
  planTapHint: {
    marginTop: 8,
    fontSize: 11,
    color: '#9B8FC9',
    fontWeight: '600',
  },
  addAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  addAnotherText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
  },
  modalHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
  },
  inputLabel: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8E8EE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: '#222',
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0E0E8',
    backgroundColor: '#FAFAFC',
  },
  kindChipActive: {
    backgroundColor: '#7C6AFF',
    borderColor: '#7C6AFF',
  },
  kindChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  kindChipTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 22,
    gap: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalGhost: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalGhostText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  modalPrimary: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  modalPrimaryGrad: {
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
