import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import VoiceInput from '@/components/VoiceInput';
import { useToast } from '@/hooks/useToast';
import {
  interpretTabVoiceIntent,
  routeForTabVoiceTarget,
  type TabVoiceTarget,
} from '@/utils/voiceTabCommand';
import { fetchMemoriesForVoiceMatch, pickMemoryByVoiceQuery } from '@/utils/voiceMemoryMatch';

function TabBarIcon({ name, color, focused }: { name: keyof typeof Ionicons.glyphMap; color: string; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap} size={24} color={color} />
    </View>
  );
}

type AddButtonProps = {
  accessibilityState?: { selected?: boolean };
  onPress?: () => void;
};

// 将 AddButton 组件定义在 TabLayout 外部，避免每次渲染时重新创建
function AddButton(_props: AddButtonProps) {
  const { t, i18n } = useTranslation();
  const router = useSafeRouter();
  const { showSuccess, showInfo, showError } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showVoiceCommand, setShowVoiceCommand] = useState(false);
  const longPressConsumed = useRef(false);

  const toastKeyForTarget = useCallback((target: TabVoiceTarget): string => {
    const map: Record<TabVoiceTarget, string> = {
      'add-memory': 'tab.voiceOpenAddMemory',
      vlog: 'tab.voiceOpenVlog',
      moments: 'tab.voiceOpenMoments',
      family: 'tab.voiceOpenFamily',
      home: 'tab.voiceOpenHome',
      profile: 'tab.voiceOpenProfile',
    };
    return map[target];
  }, []);

  const onVoiceTranscribed = useCallback(
    async (text: string) => {
      const intent = interpretTabVoiceIntent(text);
      if (!intent) {
        showInfo(t('tab.voiceCommandUnknown'));
        return;
      }
      if (intent.type === 'route') {
        showSuccess(t(toastKeyForTarget(intent.target)));
        router.push(routeForTabVoiceTarget(intent.target));
        return;
      }

      const query = intent.query.trim();
      if (!query) {
        showInfo(t('tab.voiceMemoryQueryEmpty'));
        return;
      }

      try {
        const memories = await fetchMemoriesForVoiceMatch();
        const picked = pickMemoryByVoiceQuery(memories, query);
        if (picked === 'none') {
          showInfo(t('tab.voiceMemoryNotFound'));
          return;
        }
        if (picked === 'ambiguous') {
          showInfo(t('tab.voiceMemoryAmbiguous'));
          return;
        }
        if (intent.type === 'find-memory') {
          showSuccess(t('tab.voiceOpenFindMemory'));
          router.push('/memory-detail', { memoryId: picked.id });
        } else {
          showSuccess(t('tab.voiceOpenVlogForMemory'));
          router.push('/vlog', { memoryId: picked.id });
        }
      } catch {
        showError(t('tab.voiceMemoryLoadFailed'));
      }
    },
    [router, showError, showInfo, showSuccess, t, toastKeyForTarget]
  );

  const handleAddMemoryPress = () => {
    setShowMenu(false);
    router.push('/add-memory');
  };

  const handleVlogPress = () => {
    setShowMenu(false);
    router.push('/vlog');
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityHint={String(t('tab.addVoiceLongPressHint'))}
        delayLongPress={420}
        onPressIn={() => {
          longPressConsumed.current = false;
        }}
        onLongPress={() => {
          longPressConsumed.current = true;
          setShowVoiceCommand(true);
        }}
        onPress={() => {
          if (longPressConsumed.current) {
            longPressConsumed.current = false;
            return;
          }
          setShowMenu(true);
        }}
        activeOpacity={0.8}
        style={styles.addButtonWrapper}
      >
        <LinearGradient
          colors={['#7C6AFF', '#9D91FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addButton}
        >
          <View style={styles.addFabIconStack}>
            <Ionicons name="mic" size={18} color="#FFFFFF" />
            <Ionicons name="pencil" size={15} color="#FFFFFF" style={styles.addFabPen} />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleAddMemoryPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(124, 106, 255, 0.15)' }]}>
                <Ionicons name="add-circle" size={24} color="#7C6AFF" />
              </View>
              <Text style={styles.menuText}>{t('addMemory.fabLabel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleVlogPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(255, 123, 138, 0.15)' }]}>
                <Ionicons name="videocam" size={24} color="#FF7B8A" />
              </View>
              <Text style={styles.menuText}>{t('vlog.title')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.menuCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <VoiceInput
        key={`voice-cmd-${i18n.resolvedLanguage ?? i18n.language}`}
        visible={showVoiceCommand}
        onClose={() => setShowVoiceCommand(false)}
        mode="transcribe"
        title={t('tab.voiceCommandTitle', { defaultValue: '语音指令' })}
        subtitle={t('tab.voiceCommandSubtitle', {
          defaultValue: '说出想去的位置，例如「我要增加一个记忆」「打开瞬间」',
        })}
        onTranscribed={onVoiceTranscribed}
      />
    </>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [background, muted, accent] = useCSSVariable([
    '--color-background',
    '--color-muted',
    '--color-accent',
  ]) as string[];

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: background,
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.05)',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: Platform.OS === 'web' ? 90 : 90 + insets.bottom,
            paddingBottom: Platform.OS === 'web' ? 20 : insets.bottom + 12,
            paddingTop: 10,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            shadowColor: '#7C6AFF',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 10,
          },
          tabBarActiveTintColor: accent,
          tabBarInactiveTintColor: muted,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
            marginBottom: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tab.home'),
            tabBarLabel: t('tab.home'),
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="home" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="family"
          options={{
            title: t('tab.family'),
            tabBarLabel: t('tab.family'),
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="people" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="add-placeholder"
          options={{
            tabBarButton: () => <AddButton />,
          }}
        />
        <Tabs.Screen
          name="moments"
          options={{
            title: t('tab.moments'),
            tabBarLabel: t('tab.moments'),
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="images" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tab.profile'),
            tabBarLabel: t('tab.profile'),
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="person" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** 与两侧 Tab 图标行对齐；略小的 marginTop 让按钮比上一版稍靠上 */
  addButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? 2 : 1,
  },
  addFabIconStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFabPen: {
    marginTop: 1,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    width: 240,
    alignItems: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuCloseButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 4,
  },
  menuCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
});
