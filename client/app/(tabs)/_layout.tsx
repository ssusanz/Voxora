import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState } from 'react';

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
function AddButton(props: AddButtonProps) {
  const router = useSafeRouter();
  const [showMenu, setShowMenu] = useState(false);

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
        onPress={() => setShowMenu(true)}
        activeOpacity={0.8}
        style={styles.addButtonWrapper}
      >
        <LinearGradient
          colors={['#7C6AFF', '#9D91FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
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
              <Text style={styles.menuText}>新增回忆</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleVlogPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(255, 123, 138, 0.15)' }]}>
                <Ionicons name="videocam" size={24} color="#FF7B8A" />
              </View>
              <Text style={styles.menuText}>Vlog</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.menuCloseText}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function TabLayout() {
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
            title: '首页',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="home" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="family"
          options={{
            title: '家庭',
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
            title: '瞬间',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="images" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: '我的',
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
  addButtonWrapper: {
    position: 'relative',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
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
