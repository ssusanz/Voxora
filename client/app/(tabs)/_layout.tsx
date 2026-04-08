import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { useSafeRouter } from '@/hooks/useSafeRouter';

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

function AddButton(props: AddButtonProps) {
  const router = useSafeRouter();

  const handleAddPress = () => {
    router.push('/add-memory');
  };

  return (
    <TouchableOpacity onPress={handleAddPress} activeOpacity={0.8} style={styles.addButtonWrapper}>
      <LinearGradient
        colors={['#7C6AFF', '#9D91FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.addButton}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </LinearGradient>
    </TouchableOpacity>
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
            height: Platform.OS === 'web' ? 70 : 60 + insets.bottom,
            paddingBottom: Platform.OS === 'web' ? 12 : insets.bottom,
            paddingTop: 8,
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
            marginTop: 2,
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
            tabBarButton: (props) => <AddButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="pet"
          options={{
            title: '宠物',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="paw" color={color} focused={focused} />
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
});
