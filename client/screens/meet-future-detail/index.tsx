import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import VoiceInput from '@/components/VoiceInput';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { getBackendBaseUrl } from '@/utils/backend';
import {
  getFuturePlanById,
  updateFuturePlan,
  type FuturePlan,
  type FuturePlanEntry,
} from '@/utils/meetFutureStorage';
import { useToast } from '@/hooks/useToast';

const AUTHOR_KEYS = ['me', 'grandma', 'dad', 'mom'] as const;
type AuthorKey = (typeof AUTHOR_KEYS)[number];

function entryId(): string {
  return `fe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function MeetFutureDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ planId?: string }>();
  const planId = typeof params.planId === 'string' ? params.planId.trim() : '';
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();

  const [plan, setPlan] = useState<FuturePlan | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [authorKey, setAuthorKey] = useState<AuthorKey>('me');
  const [showVoice, setShowVoice] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);

  const authorLabel = useCallback(
    (key: AuthorKey) => {
      const map: Record<AuthorKey, string> = {
        me: t('home.futureMemberMe'),
        grandma: t('home.futureMemberGrandma'),
        dad: t('home.futureMemberDad'),
        mom: t('home.futureMemberMom'),
      };
      return map[key];
    },
    [t]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    if (!planId) {
      setMissing(true);
      setPlan(null);
      setLoading(false);
      return;
    }
    const p = await getFuturePlanById(planId);
    if (!p) {
      setMissing(true);
      setPlan(null);
      setLoading(false);
      return;
    }
    setMissing(false);
    setPlan({
      ...p,
      entries: Array.isArray(p.entries) ? p.entries : [],
    });
    setLoading(false);
  }, [planId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  useEffect(() => {
    const tmr = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    return () => clearTimeout(tmr);
  }, [plan?.entries?.length]);

  useEffect(() => {
    if (!titleEditing) return;
    const t = setTimeout(() => titleInputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [titleEditing]);

  const beginTitleEdit = useCallback(() => {
    if (!plan) return;
    setTitleDraft(plan.title);
    setTitleEditing(true);
  }, [plan]);

  const cancelTitleEdit = useCallback(() => {
    setTitleEditing(false);
    setTitleDraft('');
  }, []);

  const commitTitleEdit = useCallback(async () => {
    if (!planId) return;
    const next = titleDraft.trim();
    if (!next) {
      showError(t('home.futureDetailTitleEmpty'));
      return;
    }
    if (plan && next === plan.title) {
      setTitleEditing(false);
      setTitleDraft('');
      return;
    }
    await updateFuturePlan(planId, (prev) => ({ ...prev, title: next }));
    await reload();
    setTitleEditing(false);
    setTitleDraft('');
  }, [planId, plan, titleDraft, t, showError, reload]);

  const pushEntry = useCallback(
    async (text: string, source: 'text' | 'voice') => {
      const trimmed = text.trim();
      if (!trimmed || !planId) return;
      const label = authorLabel(authorKey);
      const row: FuturePlanEntry = {
        id: entryId(),
        authorLabel: label,
        text: trimmed,
        createdAt: new Date().toISOString(),
        source,
      };
      await updateFuturePlan(planId, (prev) => ({
        ...prev,
        entries: [...(prev.entries || []), row],
      }));
      await reload();
      setDraft('');
    },
    [planId, authorKey, authorLabel, reload]
  );

  const onSummarize = useCallback(async () => {
    if (!plan || !planId) return;
    const entries = plan.entries || [];
    if (entries.length === 0) {
      showError(t('home.futureDetailNoEntries'));
      return;
    }
    setSummarizing(true);
    try {
      const base = getBackendBaseUrl();
      const res = await fetch(`${base}/api/v1/future-plans/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: plan.title,
          kind: t(`home.futureKind_${plan.kind}`),
          entries: entries.map((e) => ({ authorLabel: e.authorLabel, text: e.text })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; summary?: string; error?: string };
      if (!res.ok || !json.ok || typeof json.summary !== 'string') {
        throw new Error(typeof json.error === 'string' ? json.error : 'bad_response');
      }
      await updateFuturePlan(planId, (prev) => ({
        ...prev,
        summary: json.summary,
        summaryUpdatedAt: new Date().toISOString(),
      }));
      await reload();
      showSuccess(t('home.futureDetailSummaryDone'));
    } catch {
      showError(t('home.futureDetailSummaryFail'));
    } finally {
      setSummarizing(false);
    }
  }, [plan, planId, t, showError, showSuccess, reload]);

  const kindLabel = useMemo(() => {
    if (!plan) return '';
    return t(`home.futureKind_${plan.kind}`);
  }, [plan, t]);

  if (!planId || missing || (!plan && !loading)) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backHit} accessibilityRole="button">
            <Ionicons name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t('home.futureDetailTitle')}</Text>
          <View style={styles.backHit} />
        </View>
        <View style={styles.centerMsg}>
          <Text style={styles.missingText}>{t('home.futureDetailMissing')}</Text>
        </View>
      </Screen>
    );
  }

  if (loading || !plan) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backHit} accessibilityRole="button">
            <Ionicons name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t('home.futureDetailTitle')}</Text>
          <View style={styles.backHit} />
        </View>
        <View style={styles.centerMsg}>
          <ActivityIndicator size="large" color="#7C6AFF" />
        </View>
      </Screen>
    );
  }

  const entries = plan.entries || [];

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backHit} accessibilityRole="button">
            <Ionicons name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>
          <View style={styles.topTitleCol}>
            {titleEditing ? (
              <TextInput
                ref={titleInputRef}
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder={t('home.futureFieldTitlePh')}
                placeholderTextColor="#AAA"
                style={styles.topTitleInput}
                maxLength={120}
                returnKeyType="done"
                onSubmitEditing={() => void commitTitleEdit()}
                accessibilityLabel={t('home.futureFieldTitle')}
              />
            ) : (
              <Text style={styles.topTitle} numberOfLines={2}>
                {plan.title}
              </Text>
            )}
            <Text style={styles.topMeta} numberOfLines={1}>
              {kindLabel}
              {plan.dateLabel ? ` · ${plan.dateLabel}` : ''}
            </Text>
          </View>
          {titleEditing ? (
            <View style={styles.topTitleActions}>
              <TouchableOpacity
                onPress={cancelTitleEdit}
                style={styles.backHit}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void commitTitleEdit()}
                style={styles.backHit}
                accessibilityRole="button"
                accessibilityLabel={t('common.save')}
              >
                <Ionicons name="checkmark" size={26} color="#7C6AFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={beginTitleEdit}
              style={styles.backHit}
              accessibilityRole="button"
              accessibilityLabel={t('home.futureDetailEditTitle')}
            >
              <Ionicons name="pencil" size={20} color="#7C6AFF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: insets.bottom + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>{t('home.futureDetailDiscussLabel')}</Text>
          <Text style={styles.sectionSub}>{t('home.futureDetailDiscussSub')}</Text>

          {plan.summary ? (
            <LinearGradient
              colors={['#E8F5E9', '#F1F8E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <View style={styles.summaryHead}>
                <Ionicons name="document-text" size={20} color="#2E7D32" />
                <Text style={styles.summaryTitle}>{t('home.futureDetailSummaryBlock')}</Text>
              </View>
              <Text style={styles.summaryBody}>{plan.summary}</Text>
              {plan.summaryUpdatedAt ? (
                <Text style={styles.summaryTime}>
                  {t('home.futureDetailSummaryAt', {
                    time: new Date(plan.summaryUpdatedAt).toLocaleString(i18n.language),
                  })}
                </Text>
              ) : null}
            </LinearGradient>
          ) : null}

          {entries.length === 0 ? (
            <View style={styles.emptyBubble}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>{t('home.futureDetailEmptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('home.futureDetailEmptyBody')}</Text>
            </View>
          ) : (
            entries.map((e) => (
              <View key={e.id} style={[styles.bubbleRow, e.source === 'voice' && styles.bubbleRowVoice]}>
                <View style={styles.bubbleAvatar}>
                  <Text style={styles.bubbleAvatarText}>{e.authorLabel.slice(0, 1)}</Text>
                </View>
                <View style={styles.bubble}>
                  <View style={styles.bubbleHead}>
                    <Text style={styles.bubbleAuthor}>{e.authorLabel}</Text>
                    {e.source === 'voice' ? (
                      <View style={styles.voiceTag}>
                        <Ionicons name="mic" size={12} color="#7C6AFF" />
                        <Text style={styles.voiceTagText}>{t('home.futureDetailVoiceTag')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.bubbleText}>{e.text}</Text>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={[styles.summarizeBtn, summarizing && styles.summarizeBtnDisabled]}
            onPress={() => void onSummarize()}
            disabled={summarizing}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#43A047', '#81C784']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summarizeGrad}
            >
              {summarizing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#FFF" />
                  <Text style={styles.summarizeText}>{t('home.futureDetailSummarize')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.summarizeHint}>{t('home.futureDetailSummarizeHint')}</Text>
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          <Text style={styles.composerLabel}>{t('home.futureDetailSpeakingAs')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.authorRow}>
            {AUTHOR_KEYS.map((k) => {
              const on = authorKey === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setAuthorKey(k)}
                  style={[styles.authorChip, on && styles.authorChipOn]}
                >
                  <Text style={[styles.authorChipText, on && styles.authorChipTextOn]}>{authorLabel(k)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('home.futureDetailInputPh')}
              placeholderTextColor="#AAA"
              style={styles.input}
              multiline
              maxLength={800}
            />
            <TouchableOpacity style={styles.micBtn} onPress={() => setShowVoice(true)} accessibilityRole="button">
              <Ionicons name="mic" size={22} color="#7C6AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
              onPress={() => void pushEntry(draft, 'text')}
              disabled={!draft.trim()}
            >
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <VoiceInput
        visible={showVoice}
        onClose={() => setShowVoice(false)}
        mode="transcribe"
        title={t('home.futureDetailVoiceTitle')}
        subtitle={t('home.futureDetailVoiceSub')}
        onTranscribed={(text) => {
          setShowVoice(false);
          void pushEntry(text, 'voice');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F6F7FB',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8EE',
    backgroundColor: '#F6F7FB',
  },
  backHit: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitleCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
  },
  topTitleInput: {
    width: '100%',
    fontSize: 17,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D0C8F0',
  },
  topTitleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#888',
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B3EBA',
    letterSpacing: 0.5,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#777',
    lineHeight: 19,
    marginBottom: 14,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(67,160,71,0.25)',
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B5E20',
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#2E3A2F',
  },
  summaryTime: {
    marginTop: 10,
    fontSize: 11,
    color: '#689F38',
  },
  emptyBubble: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bubbleRowVoice: {
    opacity: 1,
  },
  bubbleAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bubbleAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5B3EBA',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  bubbleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  bubbleAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7C6AFF',
  },
  voiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124,106,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  voiceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  summarizeBtn: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summarizeBtnDisabled: {
    opacity: 0.7,
  },
  summarizeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  summarizeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  summarizeHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 8,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E8',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  composerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    marginBottom: 6,
  },
  authorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  authorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F0F0F5',
    borderWidth: 1,
    borderColor: '#E8E8EE',
  },
  authorChipOn: {
    backgroundColor: '#EDE7FF',
    borderColor: '#7C6AFF',
  },
  authorChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  authorChipTextOn: {
    color: '#5B3EBA',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E4E4EC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#222',
    backgroundColor: '#FAFAFC',
  },
  micBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(124,106,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  centerMsg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  missingText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
});
