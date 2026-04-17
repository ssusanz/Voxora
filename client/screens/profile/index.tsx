import { Screen } from '@/components/Screen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useToast } from '@/hooks/useToast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { createFormDataFile } from '@/utils';
import { getBackendBaseUrl } from '@/utils/backend';
import { getCurrentUser, getMemories, updateUser, type User } from '@/services/api';

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string;
  color: string;
  action?: () => void;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface StatsData {
  memories: number;
  likes: number;
  interactions: number;
}

type LocalProfileOverrides = {
  name?: string;
  email?: string;
  avatarUri?: string;
};

const LOCAL_PROFILE_KEY = 'voxora:profile:localOverrides:v1';

function isProbablyValidEmail(email: string) {
  // Intentionally lightweight — this app doesn't have real auth yet.
  const trimmed = email.trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (local.includes(' ') || domain.includes(' ')) return false;
  if (!domain.includes('.')) return false;
  const tld = domain.split('.').pop() || '';
  return tld.length >= 2;
}

function mergeUserProfile(remote: User, local?: LocalProfileOverrides | null): UserData {
  return {
    id: remote.id,
    name: (local?.name || remote.name || '').trim(),
    email: (local?.email || remote.email || '').trim(),
    avatar: (local?.avatarUri || remote.avatar || '').trim(),
  };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [statsData, setStatsData] = useState<StatsData>({
    memories: 0,
    likes: 0,
    interactions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftAvatarUri, setDraftAvatarUri] = useState<string | undefined>(undefined);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const loadLocalOverrides = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as LocalProfileOverrides;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const persistLocalOverrides = useCallback(async (next: LocalProfileOverrides) => {
    const cleaned: LocalProfileOverrides = {
      ...(next.name?.trim() ? { name: next.name.trim() } : {}),
      ...(next.email?.trim() ? { email: next.email.trim() } : {}),
      ...(next.avatarUri?.trim() ? { avatarUri: next.avatarUri.trim() } : {}),
    };

    await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(cleaned));
  }, []);

  // 获取用户数据
  const fetchUserData = useCallback(async () => {
    try {
      const remote = await getCurrentUser();
      const local = await loadLocalOverrides();
      setUserData(mergeUserProfile(remote, local));
    } catch (error) {
      console.error('获取用户数据失败:', error);
    }
  }, [loadLocalOverrides]);

  // 获取统计数据
  const fetchStatsData = useCallback(async () => {
    try {
      const data = await getMemories(undefined, 1, 1000);
      const memories = data.data || [];
      const totalLikes = memories.reduce((sum: number, m: any) => sum + (m.likes || 0), 0);

      setStatsData({
        memories: memories.length,
        likes: totalLikes,
        interactions: memories.length * 3, // 模拟互动数
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, []);

  const openProfileEditor = useCallback(() => {
    setDraftName(userData?.name || '');
    setDraftEmail(userData?.email || '');
    setDraftAvatarUri(userData?.avatar || undefined);
    setShowProfileEditor(true);
  }, [userData?.avatar, userData?.email, userData?.name]);

  const tryUploadAvatar = useCallback(async (localUri: string): Promise<string | null> => {
    try {
      const fileName = `avatar_${Date.now()}.jpg`;
      const file = await createFormDataFile(localUri, fileName, 'image/jpeg');
      const formDataFile = new FormData();
      formDataFile.append('file', file as any);

      const uploadRes = await fetch(`${getBackendBaseUrl()}/api/v1/upload/image`, {
        method: 'POST',
        body: formDataFile,
      });

      if (!uploadRes.ok) return null;
      const uploadData = await uploadRes.json();
      return typeof uploadData?.url === 'string' ? uploadData.url : null;
    } catch {
      return null;
    }
  }, []);

  const handlePickAvatar = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(t('addMemory.permissionDenied'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setDraftAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('选择头像失败:', error);
      showError(t('addMemory.selectFailed'));
    }
  }, [showError, t]);

  const handleSaveProfile = useCallback(async () => {
    const name = draftName.trim();
    const email = draftEmail.trim();

    if (!name) {
      showError(t('profile.nameRequired'));
      return;
    }

    if (email && !isProbablyValidEmail(email)) {
      showError(t('profile.emailInvalid'));
      return;
    }

    setIsSavingProfile(true);
    try {
      let avatarForServer = draftAvatarUri?.trim() || '';
      if (avatarForServer && !avatarForServer.startsWith('http')) {
        const uploadedUrl = await tryUploadAvatar(avatarForServer);
        if (uploadedUrl) {
          avatarForServer = uploadedUrl;
          setDraftAvatarUri(uploadedUrl);
        }
      }

      const updatedRemote = await updateUser({
        name,
        ...(avatarForServer ? { avatar: avatarForServer } : {}),
      });

      await persistLocalOverrides({
        name,
        ...(email ? { email } : {}),
        ...(avatarForServer ? { avatarUri: avatarForServer } : {}),
      });

      setUserData(
        mergeUserProfile(updatedRemote, {
          name,
          ...(email ? { email } : {}),
          ...(avatarForServer ? { avatarUri: avatarForServer } : {}),
        })
      );

      setShowProfileEditor(false);
      showSuccess(t('profile.saveSuccess'));
    } catch (error) {
      console.error('保存资料失败:', error);
      showError(t('profile.saveFailed'));
    } finally {
      setIsSavingProfile(false);
    }
  }, [
    draftAvatarUri,
    draftEmail,
    draftName,
    persistLocalOverrides,
    showError,
    showSuccess,
    t,
    tryUploadAvatar,
  ]);

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        await Promise.all([fetchUserData(), fetchStatsData()]);
        setIsLoading(false);
      };
      loadData();
    }, [fetchUserData, fetchStatsData])
  );

  const menuItems: MenuItem[] = [
    { id: '1', icon: 'person-outline', title: t('profile.personalInfo'), subtitle: t('profile.personalInfoSub'), color: '#7C6AFF' },
    { id: '2', icon: 'settings-outline', title: t('profile.settings'), subtitle: t('profile.theme') + '、' + t('profile.notifications'), color: '#8B8680' },
    { id: '3', icon: 'shield-checkmark-outline', title: t('profile.security'), subtitle: t('profile.securitySub'), color: '#4CAF50' },
    { id: '4', icon: 'wallet-outline', title: t('profile.storage'), subtitle: t('profile.storageSub'), color: '#FFB74D' },
    { id: '5', icon: 'help-circle-outline', title: t('profile.help'), subtitle: t('profile.help'), color: '#29B6F6' },
    { id: '6', icon: 'information-circle-outline', title: t('profile.about') + ' Voxora', subtitle: t('profile.version') + ' 1.0.0', color: '#AB47BC' },
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.id === '1') {
      openProfileEditor();
      return;
    }
    showInfo(t('profile.comingSoon'));
  };

  if (isLoading) {
    return (
      <Screen safeAreaEdges={['left', 'right', 'bottom']} style={styles.screen}>
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C6AFF" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* 右上角语言切换按钮 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => setShowLanguageSwitcher(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="language-outline" size={22} color="#7C6AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* 用户卡片 */}
          <Animated.View entering={FadeInUp.duration(500)} style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {userData?.avatar ? (
                  <Image source={{ uri: userData.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{userData?.name?.charAt(0) || '小'}</Text>
                )}
              </View>
              <View style={styles.onlineBadge}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{userData?.name || t('family.familyBond')}</Text>
              <Text style={styles.userEmail}>{userData?.email || 'user@example.com'}</Text>
              <View style={styles.familyBadge}>
                <Ionicons name="people" size={12} color="#7C6AFF" />
                <Text style={styles.familyText}>{t('family.title')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={openProfileEditor} activeOpacity={0.7}>
              <Ionicons name="pencil" size={18} color="#7C6AFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* 统计卡片 */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{statsData.memories}</Text>
              <Text style={styles.statLabel}>{t('profile.memories')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{statsData.likes}</Text>
              <Text style={styles.statLabel}>{t('profile.likes')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{statsData.interactions}</Text>
              <Text style={styles.statLabel}>{t('profile.interactions')}</Text>
            </View>
          </Animated.View>

          {/* 菜单列表 */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === menuItems.length - 1 && styles.menuItemLast
                ]}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#B2AEAA" />
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* 退出登录 */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={() => showInfo(t('profile.logoutDev'))}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              <Text style={styles.logoutText}>{t('profile.logout')}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </View>

      {/* 语言切换弹窗 */}
      <LanguageSwitcher
        visible={showLanguageSwitcher}
        onClose={() => setShowLanguageSwitcher(false)}
      />

      <Modal visible={showProfileEditor} transparent animationType="fade" onRequestClose={() => setShowProfileEditor(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowProfileEditor(false)} />
          <View style={[styles.modalCard, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.editTitle')}</Text>
              <TouchableOpacity onPress={() => setShowProfileEditor(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#2D3436" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAvatarRow}>
              <TouchableOpacity style={styles.modalAvatar} onPress={handlePickAvatar} activeOpacity={0.85}>
                {draftAvatarUri ? (
                  <Image source={{ uri: draftAvatarUri }} style={styles.modalAvatarImage} />
                ) : (
                  <Text style={styles.modalAvatarText}>{(draftName.trim().charAt(0) || '?').toUpperCase()}</Text>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHint}>{t('profile.avatarHint')}</Text>
                <Text style={styles.modalHintMuted}>{t('profile.emailLocalNote')}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>{t('profile.nameLabel')}</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder={t('profile.namePlaceholder')}
              placeholderTextColor="#B2AEAA"
              style={styles.fieldInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>{t('profile.emailLabel')}</Text>
            <TextInput
              value={draftEmail}
              onChangeText={setDraftEmail}
              placeholder={t('profile.emailPlaceholder')}
              placeholderTextColor="#B2AEAA"
              style={styles.fieldInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowProfileEditor(false)}
                disabled={isSavingProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, isSavingProfile && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
                activeOpacity={0.85}
              >
                {isSavingProfile ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonPrimaryText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F3F0',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3436',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B8680',
  },
  languageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scrollContent: {
    paddingTop: 8,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#8B8680',
    marginBottom: 6,
  },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  familyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7C6AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8B8680',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8E6E3',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3F0',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#8B8680',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
  },
  modalAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  modalHintMuted: {
    fontSize: 12,
    color: '#8B8680',
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B8680',
    marginBottom: 8,
    marginTop: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#E8E6E3',
    backgroundColor: '#F5F3F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3436',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#F5F3F0',
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3436',
  },
  modalButtonPrimary: {
    backgroundColor: '#7C6AFF',
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
