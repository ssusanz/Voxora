import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string;
  color: string;
  action?: () => void;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const menuItems: MenuItem[] = [
    { id: '1', icon: 'person-outline', title: '个人资料', subtitle: '头像、昵称、签名', color: '#7C6AFF' },
    { id: '2', icon: 'settings-outline', title: '设置', subtitle: '通知、隐私、主题', color: '#8B8680' },
    { id: '3', icon: 'shield-checkmark-outline', title: '安全', subtitle: '密码、指纹解锁', color: '#4CAF50' },
    { id: '4', icon: 'wallet-outline', title: '存储', subtitle: '已用 2.3GB / 5GB', color: '#FFB74D' },
    { id: '5', icon: 'help-circle-outline', title: '帮助与反馈', subtitle: '常见问题、联系客服', color: '#29B6F6' },
    { id: '6', icon: 'information-circle-outline', title: '关于 Voxora', subtitle: '版本 1.0.0', color: '#AB47BC' },
  ];

  const handleMenuPress = (item: MenuItem) => {
    Alert.alert(item.title, `你点击了 ${item.title}`);
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* 用户卡片 */}
          <Animated.View entering={FadeInUp.duration(500)} style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>小</Text>
              </View>
              <View style={styles.onlineBadge}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>小明</Text>
              <Text style={styles.userEmail}>xiaoming@example.com</Text>
              <View style={styles.familyBadge}>
                <Ionicons name="people" size={12} color="#7C6AFF" />
                <Text style={styles.familyText}>小明一家</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="pencil" size={18} color="#7C6AFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* 统计卡片 */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>128</Text>
              <Text style={styles.statLabel}>回忆</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>456</Text>
              <Text style={styles.statLabel}>获赞</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>89</Text>
              <Text style={styles.statLabel}>互动</Text>
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
              onPress={() => Alert.alert('退出登录', '确定要退出登录吗？')}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              <Text style={styles.logoutText}>退出登录</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
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
});
